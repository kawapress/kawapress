import type { KawaPressPlugin } from '../api/plugin'
import type { PluginPagesContext } from '../api/plugin-pages'
import type { ResolvedSiteConfig } from '../core/site'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
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

/** A plugin that calls `pages()` once for each `[route, source]` pair. */
function pagesPlugin(name: string, ...groups: Array<[string, string | ((context: PluginPagesContext) => unknown)]>): KawaPressPlugin {
  return definePlugin({
    name,
    setup(api) {
      for (const [route, source] of groups) {
        api.pages(route, source as never)
      }
    },
  })
}

async function setup(plugins: KawaPressPlugin[]) {
  return setupGeneratorPlugins({
    srcExclude: ['guide/part.md'],
    locales: {
      root: { label: 'English', lang: 'en' },
      zh: { label: '简体中文', lang: 'zh-CN' },
    },
    plugins,
  }, { root })
}

describe('listSitePages', () => {
  it('lists Markdown files first, then plugin pages in plugin order and call order, for every locale', async () => {
    const host = await setup([
      pagesPlugin(
        '@first',
        ['/api/[name]', () => [{ name: 'core', markdown: '# Core\n' }]],
        ['/zh/api/[name]', () => [{ name: 'core', markdown: '# 核心\n' }]],
      ),
      pagesPlugin('@second', ['/changelog/', () => '# Changelog\n']),
    ])

    const pages = await listSitePages(host.site)

    expect(pages.map(({ readSource: _readSource, ...rest }) => rest)).toEqual([
      { origin: 'file', file: join(root, 'guide/intro.md'), sourcePath: '/guide/intro.md', pagePath: '/guide/intro.md', routePath: '/guide/intro' },
      { origin: 'file', file: join(root, 'index.md'), sourcePath: '/index.md', pagePath: '/index.md', routePath: '/' },
      { origin: 'plugin', sourcePath: '@first/api/core.md', pagePath: '/api/core.md', routePath: '/api/core' },
      { origin: 'plugin', sourcePath: '@first/zh/api/core.md', pagePath: '/zh/api/core.md', routePath: '/zh/api/core' },
      { origin: 'plugin', sourcePath: '@second/changelog/index.md', pagePath: '/changelog/index.md', routePath: '/changelog' },
    ])
  })

  it('reads the current source: includes written out for files, the plugin text for plugin pages', async () => {
    const host = await setup([
      pagesPlugin('docs', ['/api', () => '# API\n\n<!--@include: ./x.md-->\n']),
    ])

    const pages = await listSitePages(host.site)
    const sources = await Promise.all(pages.map(item => item.readSource()))

    expect(sources).toEqual([
      '# Intro\n\nIncluded text\n',
      '# Home\n',
      '# API\n\n<!--@include: ./x.md-->\n',
    ])
  })

  it('runs every group once for repeated calls', async () => {
    const generate = vi.fn(() => '# API\n')
    const host = await setup([pagesPlugin('docs', ['/api', generate])])

    await listSitePages(host.site)
    await listSitePages(host.site)

    expect(generate).toHaveBeenCalledTimes(1)
    expect(generate).toHaveBeenCalledWith(expect.objectContaining({ command: 'build' }))
  })

  it('names the template when a plugin page takes the route of a Markdown file', async () => {
    const host = await setup([pagesPlugin('docs', ['/guide/[name]', () => [{ name: 'intro', markdown: '# X\n' }]])])

    await expect(listSitePages(host.site)).rejects.toThrow(
      'KawaPress: "/guide/intro.md" (a Markdown file) and pages("/guide/[name]") of plugin "docs" both produce the route "/guide/intro".',
    )
  })

  it('names both templates when two groups of one plugin share a route', async () => {
    const host = await setup([
      pagesPlugin('one', ['/a/[name]', () => [{ name: 'x', markdown: '#\n' }]], ['/a/x', () => '#\n']),
    ])

    await expect(listSitePages(host.site)).rejects.toThrow(
      'KawaPress: pages("/a/[name]") of plugin "one" and pages("/a/x") of plugin "one" both produce the route "/a/x".',
    )
  })

  it('names both plugins when two plugins share a route', async () => {
    const host = await setup([
      pagesPlugin('one', ['/a/', () => '#\n']),
      pagesPlugin('two', ['/a', () => '#\n']),
    ])

    await expect(listSitePages(host.site)).rejects.toThrow(
      'KawaPress: pages("/a/") of plugin "one" and pages("/a") of plugin "two" both produce the route "/a".',
    )
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
    const host = await setup([pagesPlugin('@test/pages', ['/api/a', () => '#\n'])])
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
