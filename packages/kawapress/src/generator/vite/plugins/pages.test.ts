import type { ViteDevServer } from 'vite'
import type { KawaPressPlugin } from '../../../api/plugin'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { definePlugin } from '../../../api/plugin'
import { resolveSiteConfig } from '../../config'
import { resolveMarkdownPageScope } from '../../pages'
import {
  PAGES_MODULE_ID,
  renderBuiltPagesModule,
  renderImportPagesModule,
  virtualPagesPlugin,
} from './pages'

const RESOLVED_ID = `\0${PAGES_MODULE_ID}`

describe('renderImportPagesModule', () => {
  it('writes one loader and one module id per page, keyed by route path', () => {
    const source = renderImportPagesModule([
      { path: '/guide/intro', id: '/src/guide/intro.md' },
      { path: '/', id: '/src/index.md' },
    ])

    expect(source).toBe([
      'export const pages = {',
      '  "/guide/intro": () => import("/src/guide/intro.md"),',
      '  "/": () => import("/src/index.md"),',
      '}',
      'export const pageModules = {',
      '  "/guide/intro": "/src/guide/intro.md",',
      '  "/": "/src/index.md",',
      '}',
      '',
    ].join('\n'))
  })

  it('keeps the order of the pages it is given', () => {
    const source = renderImportPagesModule([
      { path: '/b', id: '/b.md' },
      { path: '/a', id: '/a.md' },
    ])

    expect(source.indexOf('"/b"')).toBeLessThan(source.indexOf('"/a"'))
  })

  it('escapes ids that would otherwise break out of the module', () => {
    const source = renderImportPagesModule([{
      path: '/quotes',
      id: '/src/quo"tes.md',
    }])

    expect(source).toContain('import("/src/quo\\"tes.md")')
  })

  it('produces a module whose loaders import the page', async () => {
    const module = await import(
      `data:text/javascript,${encodeURIComponent(renderImportPagesModule([
        { path: '/guide/intro', id: '/src/guide/intro.md' },
      ]))}`,
    ) as {
      pages: Record<string, () => Promise<unknown>>
      pageModules: Record<string, string>
    }

    expect(Object.keys(module.pages)).toEqual(['/guide/intro'])
    expect(module.pages['/guide/intro']).toBeTypeOf('function')
    expect(module.pageModules['/guide/intro']).toBe('/src/guide/intro.md')
  })
})

describe('renderBuiltPagesModule', () => {
  it('reads the table URL from the HTML and waits for the table before exporting', () => {
    const source = renderBuiltPagesModule()

    expect(source).toContain('readPageTableUrl()')
    expect(source).toContain('await loadPageTable(')
    // A static `import()` would let Vite write a preload dependency table again.
    expect(source).not.toContain('import(')
  })
})

describe('virtualPagesPlugin', () => {
  let siteDirectory: string

  beforeEach(async () => {
    siteDirectory = await mkdtemp(join(tmpdir(), 'kawapress-pages-'))
    await mkdir(join(siteDirectory, 'src/guide'), { recursive: true })
    await writeFile(join(siteDirectory, 'src/index.md'), '---\nlayout: home\n---\n\n# Home\n')
    await writeFile(join(siteDirectory, 'src/guide/one.md'), '# One\n')
  })

  afterEach(async () => {
    await rm(siteDirectory, { force: true, recursive: true })
  })

  async function createPlugin(plugins: KawaPressPlugin[] = []) {
    const siteConfig = await resolveSiteConfig(
      { srcDir: 'src', plugins },
      { root: siteDirectory, command: 'dev' },
    )
    const plugin = virtualPagesPlugin({
      scope: resolveMarkdownPageScope(siteConfig),
      registry: siteConfig.pageRegistry,
    })
    const load = plugin.load as (
      this: unknown,
      id: string,
    ) => Promise<string | undefined>

    return {
      plugin,
      /** Source the plugin serves for the dev server and the SSR build. */
      async source() {
        return await load.call(devContext(), RESOLVED_ID) ?? ''
      },
      /** Source the plugin serves for the browser bundle of a build. */
      async browserSource() {
        return await load.call(buildContext('client'), RESOLVED_ID) ?? ''
      },
    }
  }

  it('keys the table by route path and imports the Markdown modules', async () => {
    const { source } = await createPlugin()

    expect(await source()).toBe([
      'export const pages = {',
      '  "/guide/one": () => import("/src/guide/one.md"),',
      '  "/": () => import("/src/index.md"),',
      '}',
      'export const pageModules = {',
      '  "/guide/one": "/src/guide/one.md",',
      '  "/": "/src/index.md",',
      '}',
      '',
    ].join('\n'))
  })

  it('reads the page table file in the browser build instead of importing pages', async () => {
    const { browserSource } = await createPlugin()

    expect(await browserSource()).toContain('loadPageTable')
    expect(await browserSource()).not.toContain('() => import(')
  })

  it('keeps importing pages for the SSR build', async () => {
    const { plugin } = await createPlugin()
    const load = plugin.load as (this: unknown, id: string) => Promise<string | undefined>

    const source = await load.call(buildContext('ssr'), RESOLVED_ID)

    expect(source).toContain('() => import("/src/guide/one.md")')
  })

  it('reloads a browser that saw the table before a page was added or removed', async () => {
    const { plugin } = await createPlugin()
    const server = createFakeDevServer()
    const configureServer = plugin.configureServer as (server: ViteDevServer) => void
    configureServer(server as unknown as ViteDevServer)

    await server.emit('add', join(siteDirectory, 'src/guide/two.md'))
    await server.emit('unlink', join(siteDirectory, 'src/guide/one.md'))
    await server.emit('add', join(siteDirectory, 'notes.txt'))

    expect(server.invalidateModule).toHaveBeenCalledTimes(2)
    expect(server.send).toHaveBeenCalledTimes(2)
    expect(server.send).toHaveBeenCalledWith({ type: 'full-reload' })
  })

  describe('plugin pages', () => {
    interface Item { id: string, markdown: string }

    /** A group `/api/[id]` whose items come from `pages.json`, read through `read()`. */
    function createPagesPlugin(items: Item[]) {
      const file = join(siteDirectory, 'pages.json')
      const save = (next: Item[]) => writeFile(file, JSON.stringify(next))
      const plugin = definePlugin({
        name: 'test',
        setup(api) {
          api.pages('/api/[id]', async ({ read }) => JSON.parse(await read('pages.json')) as Item[])
        },
      })
      return {
        plugin,
        ready: () => save(items),
        /** Writes the new items and tells the dev server the file changed. */
        async update(next: Item[], server: ReturnType<typeof createFakeDevServer>) {
          await save(next)
          await server.emit('change', file)
        },
      }
    }

    async function startPlugin(items: Item[], modules: string[] = []) {
      const helper = createPagesPlugin(items)
      await helper.ready()
      const created = await createPlugin([helper.plugin])
      const server = createFakeDevServer({ modules: modules.map(id => `${siteDirectory}/@kawapress-page/${id}`) })
      ;(created.plugin.configResolved as (config: { root: string }) => void)({ root: siteDirectory })
      ;(created.plugin.configureServer as (server: ViteDevServer) => void)(server as unknown as ViteDevServer)
      await created.source()
      return { ...helper, ...created, server }
    }

    it('lists plugin pages after the Markdown files, imported by their module id', async () => {
      const { source } = await createPlugin([definePlugin({
        name: 'test',
        setup(api) {
          api.pages('/api/', () => '# API\n')
          api.pages('/en/api/[name]', () => [{ name: 'core', markdown: '# Core\n' }])
        },
      })])

      expect(await source()).toBe([
        'export const pages = {',
        '  "/guide/one": () => import("/src/guide/one.md"),',
        '  "/": () => import("/src/index.md"),',
        '  "/api": () => import("/@kawapress-page/test/api/index.md"),',
        '  "/en/api/core": () => import("/@kawapress-page/test/en/api/core.md"),',
        '}',
        'export const pageModules = {',
        '  "/guide/one": "/src/guide/one.md",',
        '  "/": "/src/index.md",',
        '  "/api": "/@kawapress-page/test/api/index.md",',
        '  "/en/api/core": "/@kawapress-page/test/en/api/core.md",',
        '}',
        '',
      ].join('\n'))
    })

    it('reloads the browser when a read file changes the set of pages', async () => {
      const { update, server } = await startPlugin([{ id: 'one', markdown: '# One\n' }])

      await update([{ id: 'one', markdown: '# One\n' }, { id: 'two', markdown: '# Two\n' }], server)

      await vi.waitFor(() => expect(server.send).toHaveBeenCalledWith({ type: 'full-reload' }))
      expect(server.invalidateModule).toHaveBeenCalledTimes(1)
    })

    it('refreshes a changed page module before the reload that a new page causes', async () => {
      const { update, server } = await startPlugin([{ id: 'a', markdown: '# A\n' }], ['test/api/a.md'])

      await update([{ id: 'a', markdown: '# A changed\n' }, { id: 'b', markdown: '# B\n' }], server)

      await vi.waitFor(() => expect(server.send).toHaveBeenCalledWith({ type: 'full-reload' }))
      expect(server.invalidateModule).toHaveBeenCalledTimes(2)
      expect(server.reloadModule).not.toHaveBeenCalled()
    })

    it('replaces only the page module whose Markdown changed', async () => {
      const a = { id: 'a', markdown: '# A\n' }
      const { update, server } = await startPlugin(
        [a, { id: 'b', markdown: '# B\n' }],
        ['test/api/a.md', 'test/api/b.md'],
      )

      await update([a, { id: 'b', markdown: '# B changed\n' }], server)

      await vi.waitFor(() => expect(server.reloadModule).toHaveBeenCalledTimes(1))
      expect(server.reloadModule).toHaveBeenCalledWith({ id: `${siteDirectory}/@kawapress-page/test/api/b.md` })
      expect(server.send).not.toHaveBeenCalled()
    })

    it('hands the files plugin pages read to the dev server watcher', async () => {
      const { server } = await startPlugin([{ id: 'a', markdown: '# A\n' }])

      expect(server.watched).toContain(join(siteDirectory, 'pages.json'))
    })
  })

  it('stays quiet about a page change while no browser holds the table', async () => {
    const { plugin } = await createPlugin()
    const server = createFakeDevServer({ loaded: false })
    const configureServer = plugin.configureServer as (server: ViteDevServer) => void
    configureServer(server as unknown as ViteDevServer)

    await server.emit('add', join(siteDirectory, 'src/guide/two.md'))

    expect(server.send).not.toHaveBeenCalled()
  })
})

function devContext() {
  return { environment: { name: 'client', config: { command: 'serve' } } }
}

function buildContext(environment: 'client' | 'ssr') {
  return { environment: { name: environment, config: { command: 'build' } } }
}

/**
 * The watcher events are asynchronous in Vite, so the fake collects handlers
 * and the test awaits the ones it triggers.
 */
function createFakeDevServer(options: { loaded?: boolean, modules?: string[] } = {}) {
  const handlers = new Map<string, ((file: string) => void)[]>()
  const virtualModule = { id: RESOLVED_ID }
  const invalidateModule = vi.fn()
  const send = vi.fn()
  const reloadModule = vi.fn()
  const modules = new Set(options.modules ?? [])
  const watched: string[] = []

  return {
    invalidateModule,
    reloadModule,
    send,
    environments: {
      client: {
        name: 'client',
        moduleGraph: {
          getModuleById: (id: string) => (modules.has(id) ? { id } : undefined),
          invalidateModule,
        },
        reloadModule,
      },
    },
    watched,
    watcher: {
      add: (paths: string[]) => watched.push(...paths),
      on(event: string, handler: (file: string) => void) {
        handlers.set(event, [...handlers.get(event) ?? [], handler])
      },
    },
    moduleGraph: {
      getModuleById: (id: string) => (
        id === RESOLVED_ID && options.loaded !== false ? virtualModule : undefined
      ),
      invalidateModule,
    },
    hot: { send },
    async emit(event: string, file: string) {
      for (const handler of handlers.get(event) ?? []) {
        handler(file)
      }
      // The handlers must stay synchronous: Vite never awaits watcher listeners.
      await Promise.resolve()
    },
  }
}
