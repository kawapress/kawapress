import type { EnvironmentModuleNode, Plugin } from 'vite'
import { Buffer } from 'node:buffer'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { resolveSiteConfig } from '../../config'
import { createDataLoaderContext } from '../../data/context'
import { dataLoaderPlugin } from './data'

interface GeneratedDataModule<T> {
  data: T
}

describe('dataLoaderPlugin', () => {
  it('runs Node-only loaders once and reloads watched files and local dependencies', async () => {
    const root = await mkdtemp(join(process.cwd(), 'docs/.kawapress-data-loader-'))
    const loaderFile = join(root, 'content/example.data.ts')
    const helperFile = join(root, 'content/helper.ts')
    const watchedFile = join(root, 'content/data/message.txt')
    const callsFile = join(root, 'calls.txt')

    try {
      await mkdir(join(root, 'content/data'), { recursive: true })
      await Promise.all([
        writeFile(join(root, 'package.json'), '{"type":"module"}\n'),
        writeFile(helperFile, 'export const prefix = "first"\n'),
        writeFile(watchedFile, 'hello\n'),
        writeFile(loaderFile, `
import { appendFileSync, readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { prefix } from './helper.ts'

export default {
  watch: './data/*.txt',
  load(files) {
    appendFileSync(${JSON.stringify(callsFile)}, 'run\\n')
    return {
      base: globalThis.KAWAPRESS_CONFIG?.site.base,
      files: files.map(file => basename(file)),
      message: prefix + ': ' + readFileSync(files[0], 'utf8').trim(),
    }
  },
}
`),
      ])

      const plugin = await createPlugin(root)
      const firstSource = await runLoad(plugin, loaderFile)
      const repeatedSource = await runLoad(plugin, loaderFile)
      const first = await importGeneratedData<{
        base: string
        files: string[]
        message: string
      }>(firstSource)

      expect(repeatedSource).toBe(firstSource)
      expect(first.data).toEqual({
        base: '/docs/',
        files: ['message.txt'],
        message: 'first: hello',
      })
      await expect(readFile(callsFile, 'utf8')).resolves.toBe('run\n')

      await writeFile(watchedFile, 'updated\n')
      await expect(runHotUpdate(plugin, watchedFile, loaderFile, 1))
        .resolves
        .toHaveLength(1)
      const watched = await importGeneratedData<{ message: string }>(
        await runLoad(plugin, loaderFile),
      )
      expect(watched.data.message).toBe('first: updated')

      await writeFile(helperFile, 'export const prefix = "second"\n')
      await expect(runHotUpdate(plugin, helperFile, loaderFile, 2))
        .resolves
        .toHaveLength(1)
      const dependency = await importGeneratedData<{ message: string }>(
        await runLoad(plugin, loaderFile),
      )
      expect(dependency.data.message).toBe('second: updated')
      await expect(readFile(callsFile, 'utf8')).resolves.toBe(
        'run\nrun\nrun\n',
      )
    }
    finally {
      await rm(root, { force: true, recursive: true })
    }
  })

  it('rejects data that cannot cross the JSON boundary', async () => {
    const root = await mkdtemp(join(process.cwd(), 'docs/.kawapress-data-json-'))
    const loaderFile = join(root, 'invalid.data.ts')

    try {
      await Promise.all([
        writeFile(join(root, 'package.json'), '{"type":"module"}\n'),
        writeFile(loaderFile, `
export default {
  load() {
    return { createdAt: new Date('2026-01-01') }
  },
}
`),
      ])
      const plugin = await createPlugin(root)

      await expect(runLoad(plugin, loaderFile)).rejects.toThrow(
        /data returned by loader "invalid\.data\.ts" is not JSON-serializable\.[\s\S]*data\.createdAt/,
      )
    }
    finally {
      await rm(root, { force: true, recursive: true })
    }
  })

  describe('tracked reads', () => {
    async function setup(loaderSource: string, files: Record<string, string> = {}) {
      const root = await mkdtemp(join(process.cwd(), 'docs/.kawapress-data-tracked-'))
      const loaderFile = join(root, 'content/example.data.ts')
      await mkdir(join(root, 'content/catalog'), { recursive: true })
      await Promise.all([
        writeFile(join(root, 'package.json'), '{"type":"module"}\n'),
        writeFile(loaderFile, loaderSource),
        ...Object.entries(files).map(([name, text]) => writeFile(join(root, 'content', name), text)),
      ])
      const plugin = await createPlugin(root)
      let timestamp = 0
      return {
        root,
        loaderFile,
        plugin,
        load: async () => (await importGeneratedData<unknown>(await runLoad(plugin, loaderFile))).data,
        update: (file: string, type: 'create' | 'update' | 'delete') =>
          runHotUpdate(plugin, file, loaderFile, ++timestamp, type),
        path: (name: string) => join(root, 'content', name),
      }
    }

    it('gives the context form { read, glob } and resolves relative paths against the loader file', async () => {
      const t = await setup(`
export default {
  async load(context) {
    const files = await context.glob('./catalog/*.json')
    return {
      keys: Object.keys(context).sort(),
      names: files.map(file => file.split('/').pop()),
      absolute: files.every(file => file.startsWith('/')),
      texts: await Promise.all(files.map(file => context.read(file))),
      relative: await context.read('./catalog/a.json'),
    }
  },
}
`, { 'catalog/b.json': '"b"', 'catalog/a.json': '"a"' })
      try {
        await expect(t.load()).resolves.toEqual({
          keys: ['glob', 'read'],
          names: ['a.json', 'b.json'],
          absolute: true,
          texts: ['"a"', '"b"'],
          relative: '"a"',
        })
      }
      finally {
        await rm(t.root, { force: true, recursive: true })
      }
    })

    it('gives the watch form (files, context)', async () => {
      const t = await setup(`
export default {
  watch: './catalog/*.json',
  async load(files, context) {
    return {
      count: files.length,
      keys: Object.keys(context).sort(),
      text: await context.read('./catalog/a.json'),
    }
  },
}
`, { 'catalog/a.json': '"a"' })
      try {
        await expect(t.load()).resolves.toEqual({ count: 1, keys: ['glob', 'read'], text: '"a"' })
      }
      finally {
        await rm(t.root, { force: true, recursive: true })
      }
    })

    it('invalidates on a read file, on files added or removed under a glob, and ignores unrelated files', async () => {
      const t = await setup(`
export default {
  async load({ read, glob }) {
    const files = await glob('./catalog/*.json')
    return { names: files.map(file => file.split('/').pop()), note: await read('./note.txt') }
  },
}
`, { 'catalog/a.json': '1', 'note.txt': 'one' })
      try {
        await t.load()
        const note = t.path('note.txt')
        const unrelated = t.path('other.txt')
        const added = t.path('catalog/b.json')

        await writeFile(unrelated, 'x')
        await expect(t.update(unrelated, 'create')).resolves.toBeUndefined()
        await writeFile(t.path('catalog/a.json'), '2')
        await expect(t.update(t.path('catalog/a.json'), 'update')).resolves.toBeUndefined()

        await writeFile(note, 'two')
        await expect(t.update(note, 'update')).resolves.toHaveLength(1)
        await expect(t.load()).resolves.toEqual({ names: ['a.json'], note: 'two' })

        await writeFile(added, '3')
        await expect(t.update(added, 'create')).resolves.toHaveLength(1)
        await expect(t.load()).resolves.toEqual({ names: ['a.json', 'b.json'], note: 'two' })

        await rm(added)
        await expect(t.update(added, 'delete')).resolves.toHaveLength(1)
        await expect(t.load()).resolves.toEqual({ names: ['a.json'], note: 'two' })
      }
      finally {
        await rm(t.root, { force: true, recursive: true })
      }
    })

    it('records dependencies again on every execution', async () => {
      const t = await setup(`
export default {
  async load({ read }) {
    const first = await read('./first.txt')
    return first === 'again' ? 'done' : await read('./second.txt')
  },
}
`, { 'first.txt': 'again', 'second.txt': 'two' })
      try {
        await expect(t.load()).resolves.toBe('done')
        // `second.txt` was not read, so it no longer matters.
        await expect(t.update(t.path('second.txt'), 'update')).resolves.toBeUndefined()

        await writeFile(t.path('first.txt'), 'changed')
        await expect(t.update(t.path('first.txt'), 'update')).resolves.toHaveLength(1)
        await expect(t.load()).resolves.toBe('two')
        await expect(t.update(t.path('second.txt'), 'update')).resolves.toHaveLength(1)
      }
      finally {
        await rm(t.root, { force: true, recursive: true })
      }
    })
  })
})

async function createPlugin(root: string): Promise<Plugin> {
  const config = await resolveSiteConfig({
    base: '/docs/',
    srcDir: 'content',
  })
  return dataLoaderPlugin(createDataLoaderContext(root, config))
}

async function runLoad(plugin: Plugin, id: string): Promise<string> {
  const load = plugin.load
  if (typeof load !== 'function') {
    throw new TypeError('Expected a load hook')
  }
  const result = await load.call({} as never, id)
  if (typeof result !== 'string') {
    throw new TypeError('Expected generated JavaScript')
  }
  return result
}

async function runHotUpdate(
  plugin: Plugin,
  file: string,
  loaderId: string,
  timestamp: number,
  type: 'create' | 'update' | 'delete' = 'update',
): Promise<EnvironmentModuleNode[] | void> {
  const hotUpdate = plugin.hotUpdate
  if (typeof hotUpdate !== 'function') {
    throw new TypeError('Expected a hotUpdate hook')
  }

  const module = { id: loaderId } as EnvironmentModuleNode
  return hotUpdate.call({
    environment: {
      moduleGraph: {
        getModuleById(id: string) {
          return id === loaderId ? module : undefined
        },
      },
    },
  } as never, {
    file,
    modules: [],
    read: () => '',
    server: {} as never,
    timestamp,
    type,
  })
}

async function importGeneratedData<T>(
  source: string,
): Promise<GeneratedDataModule<T>> {
  const encoded = Buffer.from(source).toString('base64')
  return import(`data:text/javascript;base64,${encoded}#${Math.random()}`)
}
