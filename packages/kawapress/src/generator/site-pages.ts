import type { PluginPagesContext } from '../api/plugin-pages'
import type { ResolvedSiteConfig } from '../core/site'
import type { GeneratorPluginRunner } from '../plugin/generator-runner'
import type { PageWatcher } from './plugin-page-collection'
import type { PluginPageRecord } from './plugin-pages'
import { readMarkdownSource } from '../compiler/markdown-source'
import { createPageGroup } from './page-group'
import { listMarkdownPages, resolveMarkdownPageScope } from './pages'
import { createPluginPageCollection } from './plugin-page-collection'
import { describePageGroup, pluginPageModuleId } from './plugin-pages'

/** One page of the site, whether it is a Markdown file or a plugin's page. */
export interface SitePage {
  origin: 'file' | 'plugin'
  /** Absolute path of the Markdown file. Only file pages have one. */
  file?: string
  /**
   * Identifier of the source: `/guide/intro.md` for a file, below srcDir;
   * `<plugin name><pagePath>`, for example `@plugin/intro.md`, for a plugin page.
   */
  sourcePath: string
  /** Path the route comes from, for example `/guide/index.md`. File pages apply `rewrites`. */
  pagePath: string
  /** Public route path of the page, for example `/guide`. */
  routePath: string
  /**
   * The Markdown the page is compiled from, as it is now: a file page is read
   * from disk with `<!--@include-->` and `<<<` written out, a plugin page is
   * the Markdown its plugin gave, with the frontmatter it asked for merged in.
   */
  readSource: () => Promise<string>
}

/** A page of the site with what the generator itself needs to import it. */
export interface RegisteredSitePage extends SitePage {
  /** Root-relative id the page module is imported by. */
  moduleId: string
  /** Directory of the source file of a plugin page made from a file; its relative assets start there. */
  sourceDirectory?: string
}

/** What a change of the page set touched. */
export interface PagesChange {
  /** Pages were added or removed, or a route moved. */
  setChanged: boolean
  /** Plugin pages that stay in the site and whose Markdown changed. */
  changedSources: readonly string[]
}

export interface SitePageRegistry {
  /** Every page: Markdown files first, then plugin pages in plugin order. */
  list: () => Promise<RegisteredSitePage[]>
  /** Markdown files were added or removed. */
  filesChanged: () => void
  /** Calls `listener` for every change of the page set; returns the unsubscribe function. */
  subscribe: (listener: (change: PagesChange) => void) => () => void
  /**
   * Follows the files plugin pages depend on, so that a changed file runs
   * only the groups that read it again. Used by the dev server.
   */
  watchPluginPages: (watcher: PageWatcher) => void
  /** Called once every `configResolved()` ran, which is when pages may be collected. */
  markReady: () => void
}

export interface SitePageRegistryOptions {
  site: ResolvedSiteConfig
  pluginRunner: GeneratorPluginRunner
  /** Which command runs; `pages()` groups see it as `command`. */
  command: PluginPagesContext['command']
}

/**
 * The config file and the plugins run in a module graph of their own, apart
 * from the one the CLI and the dev server were started in, so this module can
 * be loaded twice. The table is shared through the global object so both
 * copies find the registry of the site a plugin received.
 */
const REGISTRIES_KEY = Symbol.for('kawapress.sitePageRegistries')
const registries = ((globalThis as Record<symbol, unknown>)[REGISTRIES_KEY] ??= new WeakMap()) as
WeakMap<ResolvedSiteConfig, SitePageRegistry>

/** Makes `site` the key `listSitePages()` and `onSitePagesChange()` find `registry` by. */
export function registerSitePages(site: ResolvedSiteConfig, registry: SitePageRegistry): void {
  registries.set(site, registry)
}

/**
 * Every page of a site: its Markdown files in the order `listMarkdownPages()`
 * reads them, then the pages plugins add, in plugin order. Two pages on one
 * route are an error that names both sources.
 *
 * `site` is the object `configResolved()` received.
 */
export async function listSitePages(site: ResolvedSiteConfig): Promise<SitePage[]> {
  const pages = await findRegistry(site).list()
  return pages.map(({ moduleId: _moduleId, ...page }) => page)
}

/**
 * Calls `listener` when the pages of a site changed: a Markdown file was
 * added or removed, or a file a plugin's `pages()` group depends on changed
 * the pages it produces. Only the dev server reports changes. Returns the function that stops the notifications.
 *
 * `site` is the object `configResolved()` received.
 */
export function onSitePagesChange(site: ResolvedSiteConfig, listener: () => void): () => void {
  return findRegistry(site).subscribe(() => listener())
}

function findRegistry(site: ResolvedSiteConfig): SitePageRegistry {
  const registry = registries.get(site)
  if (!registry) {
    throw new Error(
      'KawaPress: listSitePages() and onSitePagesChange() need the site config that configResolved() received; this object is not one.',
    )
  }
  return registry
}

export function createSitePageRegistry(options: SitePageRegistryOptions): SitePageRegistry {
  const { site, pluginRunner, command } = options
  const listeners = new Set<(change: PagesChange) => void>()
  let ready = false
  let filePages: Promise<RegisteredSitePage[]> | undefined
  let pages: Promise<RegisteredSitePage[]> | undefined

  const loadFilePages = async (): Promise<RegisteredSitePage[]> => {
    const scope = resolveMarkdownPageScope(site)
    const found = await listMarkdownPages(scope)
    return found.map(page => ({
      origin: 'file',
      file: page.file,
      sourcePath: page.sourcePath,
      pagePath: page.pagePath,
      routePath: page.routePath,
      readSource: async () => readMarkdownSource({ file: page.file, sourceRoot: scope.sourceRoot }).source,
      moduleId: fileModuleId(page.sourcePath, site.srcDir),
    }))
  }

  const getFilePages = (): Promise<RegisteredSitePage[]> => (filePages ??= loadFilePages())

  const assertNoFileConflicts = async (records: readonly PluginPageRecord[]): Promise<void> => {
    const owners = new Map((await getFilePages()).map(page => [page.routePath, page.sourcePath]))
    for (const record of records) {
      const owner = owners.get(record.routePath)
      if (owner) {
        throw new Error(
          `KawaPress: ${JSON.stringify(owner)} (a Markdown file) and ${describePageGroup(record.plugin, record.template)} both produce the route ${JSON.stringify(record.routePath)}.`,
        )
      }
    }
  }

  const notify = (change: PagesChange): void => {
    for (const listener of [...listeners]) {
      listener(change)
    }
  }

  const collection = createPluginPageCollection({
    groups: pluginRunner.getPageRegistrations().map(registration => createPageGroup(registration, site.root)),
    command,
    validate: assertNoFileConflicts,
    onChange(before, after) {
      pages = undefined
      const change = diffPluginPages(before, after)
      if (change.setChanged || change.changedSources.length > 0) {
        notify(change)
      }
    },
  })

  const merge = async (): Promise<RegisteredSitePage[]> => {
    if (!ready) {
      throw new Error(
        'KawaPress: the pages of the site are not known inside configResolved(). Read them in a later hook, such as vite() or pageData().',
      )
    }
    const [files, fromPlugins] = await Promise.all([getFilePages(), collection.records()])
    await assertNoFileConflicts(fromPlugins)
    return [...files, ...fromPlugins.map(toSitePage)]
  }

  const list = (): Promise<RegisteredSitePage[]> => {
    if (pages) {
      return pages
    }
    const current = merge()
    pages = current
    // A failed collection must not stay cached: the next call tries again.
    current.catch(() => {
      if (pages === current) {
        pages = undefined
        filePages = undefined
      }
    })
    return current
  }

  return {
    list,
    filesChanged() {
      filePages = undefined
      pages = undefined
      notify({ setChanged: true, changedSources: [] })
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    watchPluginPages(watcher) {
      collection.watch(watcher)
    },
    markReady() {
      ready = true
    },
  }
}

function toSitePage(page: PluginPageRecord): RegisteredSitePage {
  return {
    origin: 'plugin',
    sourcePath: page.sourcePath,
    pagePath: page.pagePath,
    routePath: page.routePath,
    readSource: async () => page.markdown,
    moduleId: pluginPageModuleId(page.sourcePath),
    ...(page.sourceDirectory === undefined ? {} : { sourceDirectory: page.sourceDirectory }),
  }
}

/**
 * Root-relative module id of a file page, for example `/src/guide/intro.md`.
 * Dev and build both resolve such an id against the site root, which is why the
 * generator can write one import per page instead of a glob at runtime.
 */
function fileModuleId(sourcePath: string, srcDir: string): string {
  return `${srcDir === '.' ? '' : `/${srcDir}`}${sourcePath}`
}

type PluginPageSnapshot = Map<string, { routePath: string, markdown: string }>

function snapshotPluginPages(records: readonly PluginPageRecord[]): PluginPageSnapshot {
  return new Map(records.map(page => [
    page.sourcePath,
    { routePath: page.routePath, markdown: page.markdown },
  ]))
}

function diffPluginPages(
  beforeRecords: readonly PluginPageRecord[],
  afterRecords: readonly PluginPageRecord[],
): PagesChange {
  const before = snapshotPluginPages(beforeRecords)
  const after = snapshotPluginPages(afterRecords)
  const sameSet = before.size === after.size
    && [...after].every(([sourcePath, page]) => before.get(sourcePath)?.routePath === page.routePath)
  return {
    setChanged: !sameSet,
    changedSources: [...after]
      .filter(([sourcePath, page]) => {
        const previous = before.get(sourcePath)
        return previous !== undefined && previous.markdown !== page.markdown
      })
      .map(([sourcePath]) => sourcePath),
  }
}
