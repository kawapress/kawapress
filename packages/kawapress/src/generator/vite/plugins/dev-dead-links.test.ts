import type { ViteDevServer } from 'vite'
import type { MarkdownPageLoader } from '../../../compiler/page-loader'
import type { RegisteredSitePage, SitePageRegistry } from '../../site-pages'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { createLinkRegistry } from '../../../compiler/link-registry'
import { devDeadLinksPlugin } from './dev-dead-links'

const ROOT = '/site'
const FILE = join(ROOT, 'guide.md')

function createHarness(options: {
  deadLinks?: Parameters<typeof devDeadLinksPlugin>[0]['deadLinks']
  routes?: string[]
  target?: string
  headings?: string[]
} = {}) {
  const registry = createLinkRegistry()
  registry.set({
    route: '/guide',
    source: '/guide.md',
    headings: options.headings ?? ['setup'],
    links: [
      { href: './missing', target: options.target ?? '/guide/missing', line: 3 },
      { href: '#setup', target: '#setup', line: 4 },
      { href: '#nope', target: '#nope', line: 5 },
      { href: '/other#details', target: '/other#details', line: 6 },
    ],
  })
  const pageLoader = {
    sourceRoot: ROOT,
    registry,
    resolveFilePage: () => ({
      origin: 'file',
      file: FILE,
      sourcePath: '/guide.md',
      pagePath: '/guide.md',
      routePath: '/guide',
    }),
  } as unknown as MarkdownPageLoader
  const sitePages = (options.routes ?? ['/guide', '/other']).map(routePath => ({ routePath }))
  const pageRegistry = {
    list: async () => sitePages as RegisteredSitePage[],
  } as unknown as SitePageRegistry
  const warn = vi.fn()
  const plugin = devDeadLinksPlugin({
    pageLoader,
    registry: pageRegistry,
    deadLinks: options.deadLinks ?? { level: 'warn', ignore: [] },
  })
  const server = { config: { logger: { warn } } } as unknown as ViteDevServer
  const configureServer = plugin.configureServer as (devServer: ViteDevServer) => void
  const transform = plugin.transform as (code: string, id: string) => Promise<void>
  configureServer(server)

  return { warn, transform }
}

describe('devDeadLinksPlugin', () => {
  it('warns about dead pages and same-page anchors only', async () => {
    const { warn, transform } = createHarness()

    await transform('', FILE)

    expect(warn.mock.calls.map(([message]) => message)).toEqual([
      'KawaPress: dead link /guide.md:3  ./missing  missing-page',
      'KawaPress: dead link /guide.md:5  #nope  missing-anchor',
    ])
  })

  it('stays quiet when the links resolve', async () => {
    const { warn, transform } = createHarness({ target: '/guide', headings: ['setup', 'nope'] })

    await transform('', FILE)

    expect(warn).not.toHaveBeenCalled()
  })

  it('reports each problem once per module', async () => {
    const { warn, transform } = createHarness()

    await transform('', FILE)
    await transform('', FILE)

    expect(warn).toHaveBeenCalledTimes(2)
  })

  it('ignores links configured in deadLinks.ignore', async () => {
    const { warn, transform } = createHarness({
      deadLinks: { level: 'warn', ignore: [/^\/guide\//, '#nope'] },
    })

    await transform('', FILE)

    expect(warn).not.toHaveBeenCalled()
  })

  it('does nothing when the site disables the check', async () => {
    const { warn, transform } = createHarness({ deadLinks: false })

    await transform('', FILE)

    expect(warn).not.toHaveBeenCalled()
  })

  it('does nothing for queries and other files', async () => {
    const { warn, transform } = createHarness()

    await transform('', `${FILE}?raw`)
    await transform('', join(ROOT, 'guide.vue'))

    expect(warn).not.toHaveBeenCalled()
  })

  it('finds the route of a plugin page by its module id', async () => {
    const links = createLinkRegistry()
    links.set({
      route: '/api/a',
      source: '@test/a.md',
      headings: [],
      links: [{ href: './gone', target: '/api/gone', line: 2 }],
    })
    const warn = vi.fn()
    const plugin = devDeadLinksPlugin({
      pageLoader: { sourceRoot: ROOT, registry: links } as unknown as MarkdownPageLoader,
      registry: {
        list: async () => [{ origin: 'plugin', sourcePath: '@test/a.md', routePath: '/api/a' }],
      } as unknown as SitePageRegistry,
      deadLinks: { level: 'warn', ignore: [] },
    })
    ;(plugin.configureServer as (server: ViteDevServer) => void)({ config: { logger: { warn } } } as unknown as ViteDevServer)

    await (plugin.transform as (code: string, id: string) => Promise<void>)('', '/@kawapress-page/@test/a.md')

    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]![0]).toContain('@test/a.md:2')
  })

  it('does nothing outside the dev server', async () => {
    const registry = createLinkRegistry()
    registry.set({
      route: '/guide',
      source: '/guide.md',
      headings: [],
      links: [{ href: './missing', target: '/guide/missing', line: 1 }],
    })
    const warn = vi.fn()
    const plugin = devDeadLinksPlugin({
      pageLoader: { sourceRoot: ROOT, registry } as unknown as MarkdownPageLoader,
      registry: { list: async () => [{ routePath: '/guide' }] } as unknown as SitePageRegistry,
      deadLinks: { level: 'warn', ignore: [] },
    })
    const transform = plugin.transform as (code: string, id: string) => Promise<void>

    await transform('', FILE)

    expect(warn).not.toHaveBeenCalled()
  })
})
