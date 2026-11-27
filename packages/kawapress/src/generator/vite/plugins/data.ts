import type {
  EnvironmentModuleNode,
  Plugin,
  ViteDevServer,
} from 'vite'
import type { DataLoader } from '../../../api/data'
import type { InternalDataLoaderContext } from '../../data/context'
import type { FileEvent, TrackedFiles } from '../../tracked-files'
import { dirname, relative, resolve } from 'node:path'
import {
  normalizePath,
  runnerImport,
} from 'vite'
import {
  getContentLoaderSpecification,
  installContentLoaderExecutor,
} from '../../../api/data'
import { createContentLoaderExecutor } from '../../../compiler/content-loader'
import { stringifyJsonForScript } from '../../../core/json'
import { installDataLoaderContext } from '../../data/context'
import {
  findDataLoaderFiles,
  normalizeDataLoaderGlob,
} from '../../data/glob'
import {
  createFileTracker,
  createGlobDependency,
  isAffectedBy,
  listWatchTargets,
} from '../../tracked-files'

const DATA_LOADER_RE = /\.data\.[cm]?[jt]s(?:$|\?)/

const HOT_UPDATE_EVENTS: Record<'create' | 'update' | 'delete', FileEvent> = {
  create: 'add',
  update: 'change',
  delete: 'unlink',
}

interface LoadedDataLoader {
  /** The loader file and the local modules it imports. */
  dependencies: Set<string>
  loader: DataLoader
  /** What the latest execution read, globbed and watched. */
  tracked: TrackedFiles
}

interface CachedHotUpdate {
  key: string
  affectedIds: string[]
}

export function dataLoaderPlugin(
  context: InternalDataLoaderContext,
): Plugin {
  installDataLoaderContext(context)
  installContentLoaderExecutor(createContentLoaderExecutor(context))

  const loaders = new Map<string, LoadedDataLoader>()
  const output = new Map<string, Promise<string>>()
  let server: ViteDevServer | undefined
  let cachedHotUpdate: CachedHotUpdate | undefined

  const loadDataLoader = async (id: string): Promise<LoadedDataLoader> => {
    const cached = loaders.get(id)
    if (cached) {
      return cached
    }

    const file = cleanDataLoaderId(id)
    const loaded = await runnerImport<{ default?: unknown }>(file, {
      root: context.root,
      resolve: {
        conditions: ['module'],
      },
      ssr: {
        noExternal: ['kawapress', /^@kawapress\//],
      },
    })
    const loader = resolveDataLoader(loaded.module.default, file)
    const contentLoader = getContentLoaderSpecification(loader)
    const dependencies = new Set([
      normalizePath(file),
      ...loaded.dependencies.map(dependency => normalizePath(resolve(dependency))),
    ])
    const result: LoadedDataLoader = {
      dependencies,
      loader,
      tracked: { files: new Set(), globs: [] },
    }
    loaders.set(id, result)
    server?.watcher.add([...dependencies])
    return result
  }

  const generateDataModule = async (id: string): Promise<string> => {
    const loaded = await loadDataLoader(id)
    const data = await executeLoader(loaded, cleanDataLoaderId(id))
    const serialized = stringifyJsonForScript(data, {
      label: `data returned by loader ${JSON.stringify(displayLoaderPath(id, context.root))}`,
      path: 'data',
    })
    return `export const data = ${serialized}\n`
  }

  /** Runs `load()` and records what it reads, also when it fails. */
  const executeLoader = async (
    loaded: LoadedDataLoader,
    file: string,
  ): Promise<unknown> => {
    const { loader } = loaded
    const tracker = createFileTracker(dirname(file))
    try {
      if (loader.watch === undefined) {
        return await loader.load({ read: tracker.read, glob: tracker.glob })
      }
      const contentLoader = getContentLoaderSpecification(loader)
      const patterns = normalizeDataLoaderGlob(
        loader.watch,
        contentLoader ? context.srcDir : dirname(file),
      )
      const watchedFiles = await findDataLoaderFiles(
        patterns,
        loader.options?.globOptions,
      )
      tracker.addGlob(createGlobDependency(patterns, watchedFiles))
      watchedFiles.forEach(tracker.addFile)
      return await loader.load(watchedFiles, { read: tracker.read, glob: tracker.glob })
    }
    finally {
      loaded.tracked = tracker.snapshot()
      server?.watcher.add(listWatchTargets(loaded.tracked))
    }
  }

  const loadDataModule = (id: string): Promise<string> => {
    const cached = output.get(id)
    if (cached) {
      return cached
    }

    const pending = generateDataModule(id).catch((cause) => {
      output.delete(id)
      throw dataLoaderError(id, context.root, cause)
    })
    output.set(id, pending)
    return pending
  }

  const findAffectedLoaders = (file: string, event: FileEvent): string[] => {
    const normalizedFile = normalizePath(file)
    const affectedIds: string[] = []
    for (const [id, loaded] of loaders) {
      const dependencyChanged = loaded.dependencies.has(normalizedFile)
      if (!dependencyChanged && !isAffectedBy(loaded.tracked, event, file)) {
        continue
      }
      affectedIds.push(id)
      output.delete(id)
      if (dependencyChanged) {
        loaders.delete(id)
      }
    }
    return affectedIds
  }

  return {
    name: 'kawapress:data-loader',
    configureServer(viteServer) {
      server = viteServer
    },
    load(id) {
      if (!DATA_LOADER_RE.test(id)) {
        return null
      }
      return loadDataModule(id)
    },
    async hotUpdate(options) {
      const key = `${options.timestamp}:${options.type}:${normalizePath(options.file)}`
      if (cachedHotUpdate?.key !== key) {
        cachedHotUpdate = {
          key,
          affectedIds: findAffectedLoaders(options.file, HOT_UPDATE_EVENTS[options.type]),
        }
      }

      const { affectedIds } = cachedHotUpdate
      if (affectedIds.length === 0) {
        return
      }

      const affectedModules = affectedIds
        .map(id => this.environment.moduleGraph.getModuleById(id))
        .filter((module): module is EnvironmentModuleNode => module !== undefined)
      return uniqueModules([...options.modules, ...affectedModules])
    },
  }
}

function resolveDataLoader(value: unknown, file: string): DataLoader {
  if (typeof value !== 'object' || value === null) {
    throw new TypeError(
      `data loader ${JSON.stringify(file)} must default-export an object`,
    )
  }
  if (!('load' in value) || typeof value.load !== 'function') {
    throw new TypeError(
      `data loader ${JSON.stringify(file)} must provide a load() function`,
    )
  }
  if ('watch' in value
    && value.watch !== undefined
    && typeof value.watch !== 'string'
    && !(Array.isArray(value.watch)
      && value.watch.every(pattern => typeof pattern === 'string'))) {
    throw new TypeError(
      `data loader ${JSON.stringify(file)} watch must be a string or string array`,
    )
  }
  return value as unknown as DataLoader
}

function cleanDataLoaderId(id: string): string {
  return id.replace(/\?.*$/, '')
}

function displayLoaderPath(id: string, root: string): string {
  const file = cleanDataLoaderId(id)
  const path = relative(root, file)
  return path && !path.startsWith('..') ? normalizePath(path) : normalizePath(file)
}

function dataLoaderError(id: string, root: string, cause: unknown): Error {
  const detail = cause instanceof Error ? `\n${cause.message}` : ''
  return new Error(
    `KawaPress: data loader ${JSON.stringify(displayLoaderPath(id, root))} failed.${detail}`,
    { cause },
  )
}

function uniqueModules(
  modules: EnvironmentModuleNode[],
): EnvironmentModuleNode[] {
  return [...new Set(modules)]
}
