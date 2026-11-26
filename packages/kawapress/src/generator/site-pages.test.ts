import type { KawaPressPlugin, PluginPage } from '../api/plugin'
import type { ResolvedSiteConfig } from '../core/site'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { consola } from 'consola'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { definePlugin } from '../api/plugin'
import { setupGeneratorPlugins } from './plugin-host'
import { listSitePages, onSitePagesChange } from './site-pages'

let root: string

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'kawapress-site-pages-'))
  await mkdir(join(root, 'guide'), { recursive: true })
  await writeFile(join(root, 'index.md'), '# Home\n')
  await writeFile(join(root, 'guide/intro.md'), '# Intro\n\n<!--@include: ./part.md-->\n')
  await writeFile(join(root, 'guide/part.md'), 'Included text\n')
})

afterEach(async () => {
  await rm(root, { force: true, recursive: true })
})

function pagesPlugin(name: string, pages: () => PluginPage[]): KawaPressPlugin {
  return definePlugin({
    name,
    setup(api) {
      api.pages(pages)
    },
  })
}

function page(path: string, sourcePath: string, markdown = `# ${path}\n`): PluginPage {
  return { path, sourcePath, markdown }
}

async function setup(
  plugins: KawaPressPlugin[],
  options: { command?: 'dev' | 'build' } = {},
) {
  return setupGeneratorPlugins({
    srcExclude: ['guide/part.md'],
    locales: {
      root: { label: 'English', lang: 'en' },
      zh: { label: '简体中文', lang: 'zh-CN' },
    },
    plugins,
  }, { root, ...options })
}

describe('listSitePages', () => {
  it('lists Markdown files first, then plugin pages in plugin order, for every locale', async () => {
    const host = await setup([
      pagesPlugin('first', () => [
        page('/api/core', '@first/core.md'),
        page('/zh/api/core', '@first/zh/core.md'),
      ]),
      pagesPlugin('second', () => [page('/changelog/', '@second/changelog.md')]),
    ])

    const pages = await listSitePages(host.site)

    expect(pages.map(({ readSource: _readSource, ...rest }) => rest)).toEqual([
      { origin: 'file', file: join(root, 'guide/intro.md'), sourcePath: '/guide/intro.md', pagePath: '/guide/intro.md', routePath: '/guide/intro' },
      { origin: 'file', file: join(root, 'index.md'), sourcePath: '/index.md', pagePath: '/index.md', routePath: '/' },
      { origin: 'plugin', sourcePath: '@first/core.md', pagePath: '/api/core.md', routePath: '/api/core' },
      { origin: 'plugin', sourcePath: '@first/zh/core.md', pagePath: '/zh/api/core.md', routePath: '/zh/api/core' },
      { origin: 'plugin', sourcePath: '@second/changelog.md', pagePath: '/changelog/index.md', routePath: '/changelog' },
    ])
  })

  it('reads the current source: includes written out for files, the plugin text for plugin pages', async () => {
    const host = await setup([
      pagesPlugin('docs', () => [page('/api', '@docs/api.md', '# API\n\n<!--@include: ./x.md-->\n')]),
    ])

    const pages = await listSitePages(host.site)
    const sources = await Promise.all(pages.map(item => item.readSource()))

    expect(sources).toEqual([
      '# Intro\n\nIncluded text\n',
      '# Home\n',
      '# API\n\n<!--@include: ./x.md-->\n',
    ])
  })

  it('collects plugin pages once for repeated calls', async () => {
    const handler = vi.fn(() => [page('/api', '@docs/api.md')])
    const host = await setup([pagesPlugin('docs', handler)])

    await listSitePages(host.site)
    await listSitePages(host.site)

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith({ command: 'build' })
  })

  it('names both sources when a plugin page takes the route of a Markdown file', async () => {
    const host = await setup([pagesPlugin('docs', () => [page('/guide/intro', '@docs/intro.md')])])

    await expect(listSitePages(host.site)).rejects.toThrow(
      'KawaPress: "/guide/intro.md" (a Markdown file) and "@docs/intro.md" of plugin "docs" both become the route "/guide/intro".',
    )
  })

  it('names both plugins when two plugins use one sourcePath', async () => {
    const host = await setup([
      pagesPlugin('one', () => [page('/a', '@shared/a.md')]),
      pagesPlugin('two', () => [page('/b', '@shared/a.md')]),
    ])

    await expect(listSitePages(host.site)).rejects.toThrow(
      'KawaPress: plugins "one" and "two" both add a page with the sourcePath "@shared/a.md".',
    )
  })

  it('names both sources when two plugin pages share a route', async () => {
    const host = await setup([
      pagesPlugin('one', () => [page('/a/', '@one/a.md')]),
      pagesPlugin('two', () => [page('/a', '@two/a.md')]),
    ])

    await expect(listSitePages(host.site)).rejects.toThrow(
      'KawaPress: "@one/a.md" of plugin "one" and "@two/a.md" of plugin "two" both become the route "/a".',
    )
  })

  it.each([
    ['a path without a leading slash', page('api', '@p/a.md'), 'must have a path that starts with a single "/", got "api"'],
    ['a sourcePath with a leading slash', page('/api', '/@p/a.md'), 'must have a sourcePath that does not start with "/" and ends with ".md", got "/@p/a.md"'],
    ['a sourcePath without .md', page('/api', '@p/a.html'), 'must have a sourcePath that does not start with "/" and ends with ".md", got "@p/a.html"'],
    ['a markdown that is not a string', { path: '/api', sourcePath: '@p/a.md', markdown: 1 } as unknown as PluginPage, 'must have a markdown string, got number'],
  ])('rejects %s', async (_name, invalid, message) => {
    const host = await setup([pagesPlugin('p', () => [invalid])])

    await expect(listSitePages(host.site)).rejects.toThrow(message)
  })

  it('rejects a site object that configResolved() did not hand out', async () => {
    const host = await setup([])

    await expect(listSitePages({ ...host.site })).rejects.toThrow(
      'need the site config that configResolved() received',
    )
    expect(() => onSitePagesChange({ ...host.site }, () => {})).toThrow(
      'need the site config that configResolved() received',
    )
  })

  it('finds the site from a second copy of the module, as when the config runs in its own module graph', async () => {
    const host = await setup([pagesPlugin('@test/pages', () => [page('/api/a', '@test/a.md')])])
    vi.resetModules()
    const other = await import('./site-pages')

    expect(other.listSitePages).not.toBe(listSitePages)
    expect((await other.listSitePages(host.site)).map(item => item.routePath)).toContain('/api/a')
  })

  it('is not available inside configResolved()', async () => {
    let site: ResolvedSiteConfig | undefined
    let early: Promise<unknown> | undefined
    await setup([definePlugin({
      name: 'early',
      setup(api) {
        api.configResolved((resolved) => {
          site = resolved
          early = listSitePages(resolved)
        })
      },
    })])

    expect(site).toBeDefined()
    await expect(early).rejects.toThrow('not known inside configResolved()')
  })
})

describe('invalidatePages', () => {
  function createDevPlugin() {
    const state = { pages: [page('/api/a', '@dev/a.md', '# A\n')], invalidate: () => {} }
    const handler = vi.fn(() => state.pages)
    const plugin = definePlugin({
      name: 'dev',
      setup(api) {
        state.invalidate = api.invalidatePages
        api.pages(handler)
      },
    })
    return { plugin, state, handler }
  }

  it('collects again and tells every listener while the dev server runs', async () => {
    const { plugin, state, handler } = createDevPlugin()
    const host = await setup([plugin], { command: 'dev' })
    const listener = vi.fn()
    onSitePagesChange(host.site, listener)
    expect(await listSitePages(host.site)).toHaveLength(3)

    state.pages = [...state.pages, page('/api/b', '@dev/b.md')]
    state.invalidate()

    await vi.waitFor(() => expect(listener).toHaveBeenCalledTimes(1))
    expect(handler).toHaveBeenCalledTimes(2)
    expect(handler).toHaveBeenLastCalledWith({ command: 'dev' })
    expect((await listSitePages(host.site)).map(item => item.sourcePath)).toEqual([
      '/guide/intro.md',
      '/index.md',
      '@dev/a.md',
      '@dev/b.md',
    ])
  })

  it('stops notifying a listener that unsubscribed', async () => {
    const { plugin, state } = createDevPlugin()
    const host = await setup([plugin], { command: 'dev' })
    const kept = vi.fn()
    const removed = vi.fn()
    onSitePagesChange(host.site, kept)
    onSitePagesChange(host.site, removed)()
    await listSitePages(host.site)

    state.invalidate()

    await vi.waitFor(() => expect(kept).toHaveBeenCalledTimes(1))
    expect(removed).not.toHaveBeenCalled()
  })

  it('does nothing in a build', async () => {
    const { plugin, state, handler } = createDevPlugin()
    const host = await setup([plugin])
    const listener = vi.fn()
    onSitePagesChange(host.site, listener)
    await listSitePages(host.site)

    state.invalidate()
    await listSitePages(host.site)

    expect(listener).not.toHaveBeenCalled()
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('logs the error and notifies nobody when the new collection fails', async () => {
    const { plugin, state } = createDevPlugin()
    const host = await setup([plugin], { command: 'dev' })
    const error = vi.spyOn(consola, 'error').mockImplementation(() => {})
    const listener = vi.fn()
    onSitePagesChange(host.site, listener)
    await listSitePages(host.site)

    state.pages = [page('api', '@dev/a.md')]
    state.invalidate()

    await vi.waitFor(() => expect(error).toHaveBeenCalledTimes(1))
    expect(error.mock.calls[0]![0]).toBe('KawaPress: collecting plugin pages failed')
    expect(listener).not.toHaveBeenCalled()
    state.pages = [page('/api/a', '@dev/a.md')]
    await expect(listSitePages(host.site)).resolves.toHaveLength(3)
  })
})
