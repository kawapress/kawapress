import type { ViteDevServer } from 'vite'
import type { KawaPressPlugin, PluginPage } from '../../../api/plugin'
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
    function createPagesPlugin(pages: { current: PluginPage[] }) {
      let invalidate = () => {}
      const plugin = definePlugin({
        name: 'test-pages',
        setup(api) {
          invalidate = api.invalidatePages
          api.pages(() => pages.current)
        },
      })
      return { plugin, invalidate: () => invalidate() }
    }

    it('lists plugin pages after the Markdown files, imported by their module id', async () => {
      const pages = { current: [
        { path: '/api/', markdown: '# API\n', sourcePath: '@test/api.md' },
        { path: '/en/api/core', markdown: '# Core\n', sourcePath: '@test/en/core.md' },
      ] }
      const { source } = await createPlugin([createPagesPlugin(pages).plugin])

      expect(await source()).toBe([
        'export const pages = {',
        '  "/guide/one": () => import("/src/guide/one.md"),',
        '  "/": () => import("/src/index.md"),',
        '  "/api": () => import("/@kawapress-page/@test/api.md"),',
        '  "/en/api/core": () => import("/@kawapress-page/@test/en/core.md"),',
        '}',
        'export const pageModules = {',
        '  "/guide/one": "/src/guide/one.md",',
        '  "/": "/src/index.md",',
        '  "/api": "/@kawapress-page/@test/api.md",',
        '  "/en/api/core": "/@kawapress-page/@test/en/core.md",',
        '}',
        '',
      ].join('\n'))
    })

    it('reloads the browser when invalidatePages() changes the set of pages', async () => {
      const pages = { current: [{ path: '/api', markdown: '# API\n', sourcePath: '@test/api.md' }] }
      const helper = createPagesPlugin(pages)
      const { plugin } = await createPlugin([helper.plugin])
      const server = createFakeDevServer()
      ;(plugin.configureServer as (server: ViteDevServer) => void)(server as unknown as ViteDevServer)

      pages.current = [...pages.current, { path: '/api/two', markdown: '# Two\n', sourcePath: '@test/two.md' }]
      helper.invalidate()

      await vi.waitFor(() => expect(server.send).toHaveBeenCalledWith({ type: 'full-reload' }))
      expect(server.invalidateModule).toHaveBeenCalledTimes(1)
    })

    it('refreshes a changed page module before the reload that a new page causes', async () => {
      const pages = { current: [{ path: '/api/a', markdown: '# A\n', sourcePath: '@test/a.md' }] }
      const helper = createPagesPlugin(pages)
      const { plugin } = await createPlugin([helper.plugin])
      const server = createFakeDevServer({ modules: [`${siteDirectory}/@kawapress-page/@test/a.md`] })
      ;(plugin.configResolved as (config: { root: string }) => void)({ root: siteDirectory })
      ;(plugin.configureServer as (server: ViteDevServer) => void)(server as unknown as ViteDevServer)
      await (plugin.load as (this: unknown, id: string) => Promise<string>).call(devContext(), RESOLVED_ID)

      pages.current = [
        { path: '/api/a', markdown: '# A changed\n', sourcePath: '@test/a.md' },
        { path: '/api/b', markdown: '# B\n', sourcePath: '@test/b.md' },
      ]
      helper.invalidate()

      await vi.waitFor(() => expect(server.send).toHaveBeenCalledWith({ type: 'full-reload' }))
      expect(server.invalidateModule).toHaveBeenCalledTimes(2)
      expect(server.reloadModule).not.toHaveBeenCalled()
    })

    it('replaces only the page module whose Markdown changed', async () => {
      const pages = { current: [
        { path: '/api/a', markdown: '# A\n', sourcePath: '@test/a.md' },
        { path: '/api/b', markdown: '# B\n', sourcePath: '@test/b.md' },
      ] }
      const helper = createPagesPlugin(pages)
      const { plugin } = await createPlugin([helper.plugin])
      const server = createFakeDevServer({ modules: [`${siteDirectory}/@kawapress-page/@test/a.md`, `${siteDirectory}/@kawapress-page/@test/b.md`] })
      ;(plugin.configResolved as (config: { root: string }) => void)({ root: siteDirectory })
      ;(plugin.configureServer as (server: ViteDevServer) => void)(server as unknown as ViteDevServer)
      await (plugin.load as (this: unknown, id: string) => Promise<string>).call(devContext(), RESOLVED_ID)

      pages.current = [pages.current[0]!, { ...pages.current[1]!, markdown: '# B changed\n' }]
      helper.invalidate()

      await vi.waitFor(() => expect(server.reloadModule).toHaveBeenCalledTimes(1))
      expect(server.reloadModule).toHaveBeenCalledWith({ id: `${siteDirectory}/@kawapress-page/@test/b.md` })
      expect(server.send).not.toHaveBeenCalled()
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
    watcher: {
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
