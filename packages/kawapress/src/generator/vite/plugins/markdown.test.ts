import type { MarkdownPageLoader, PageLoadTarget } from '../../../compiler/page-loader'
import type { SitePageRegistry } from '../../site-pages'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createLinkRegistry } from '../../../compiler/link-registry'
import { markdownPlugin } from './markdown'

describe('markdownPlugin', () => {
  it('loads Markdown as a Vue SFC and watches the files it includes', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'kawapress-markdown-plugin-'))
    const file = join(directory, 'page.md')
    const calls: Array<{ file: string, source: string }> = []
    const pageLoader: MarkdownPageLoader = {
      sourceRoot: directory,
      srcExclude: [],
      rewrites: undefined,
      registry: createLinkRegistry(),
      resolveFilePage: loadedFile => ({
        origin: 'file',
        file: loadedFile,
        sourcePath: '/page.md',
        pagePath: '/page.md',
        routePath: '/page',
      }),
      async load(source, page) {
        calls.push({ file: page.file ?? '', source })
        return {
          html: '<h1 id="hello">Hello</h1>\n',
          env: { path: '/page' },
          pageData: {
            path: '/page',
            title: 'Hello',
            frontmatter: {},
            headers: [],
          },
          dependencies: [join(directory, 'part.md')],
        }
      },
    }

    try {
      await writeFile(file, '# Hello\n')
      const plugin = markdownPlugin(pageLoader, {} as SitePageRegistry)
      const load = plugin.load

      expect(plugin.enforce).toBe('pre')
      expect(plugin.transform).toBeUndefined()
      expect(typeof load).toBe('function')
      if (typeof load !== 'function') {
        return
      }

      const watched: string[] = []
      const context = { addWatchFile: (id: string) => watched.push(id) }
      await expect(load.call(context as never, `${file}?raw`)).resolves.toBeNull()
      const result = await load.call(context as never, file)

      expect(calls).toEqual([{
        file,
        source: await readFile(file, 'utf8'),
      }])
      expect(result).toContain('<template><h1 id="hello">Hello</h1>')
      expect(watched).toEqual([join(directory, 'part.md')])
    }
    finally {
      await rm(directory, { force: true, recursive: true })
    }
  })

  it('compiles a plugin page from the registry as the page its plugin described', async () => {
    const calls: Array<{ source: string, target: PageLoadTarget }> = []
    const pageLoader = {
      async load(source: string, target: PageLoadTarget) {
        calls.push({ source, target })
        return {
          html: '<h1 id="api">API</h1>\n',
          env: { path: '/api' },
          pageData: { path: '/api', title: 'API', frontmatter: {}, headers: [] },
          dependencies: [],
        }
      },
    } as unknown as MarkdownPageLoader
    const sitePage = {
      origin: 'plugin' as const,
      sourcePath: '@test/api.md',
      pagePath: '/api.md',
      routePath: '/api',
      moduleId: '/@kawapress-page/@test/api.md',
      readSource: async () => '# API\n\n<!--@include: ./x.md-->\n',
    }
    const registry = { list: async () => [sitePage] } as unknown as SitePageRegistry
    const plugin = markdownPlugin(pageLoader, registry)
    const resolveId = plugin.resolveId as (id: string) => string | undefined
    ;(plugin.configResolved as (config: { root: string }) => void)({ root: '/site' })
    const load = plugin.load as (this: unknown, id: string) => Promise<string>

    const resolved = '/site/@kawapress-page/@test/api.md'
    expect(resolveId('/@kawapress-page/@test/api.md')).toBe(resolved)
    expect(resolveId(resolved)).toBe(resolved)
    expect(resolveId('/guide/intro.md')).toBeUndefined()
    const result = await load.call({}, resolved)

    expect(result).toContain('<template><h1 id="api">API</h1>')
    expect(calls).toEqual([{ source: '# API\n\n<!--@include: ./x.md-->\n', target: sitePage }])
    await expect(load.call({}, '/@kawapress-page/@test/gone.md')).rejects.toThrow(
      'KawaPress: no plugin adds the page "@test/gone.md".',
    )
  })
})
