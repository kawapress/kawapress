import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { consola } from 'consola'
import { XMLParser } from 'fast-xml-parser'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildSite } from '../../kawapress/src/server/build'
import { feedPlugin } from './plugin'

const temporaryDirectories: string[] = []
const PACKAGE_ROOT = fileURLToPath(new URL('../', import.meta.url))
const PLUGIN_ENTRY = fileURLToPath(new URL('./index.ts', import.meta.url))
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })

afterEach(async () => {
  vi.restoreAllMocks()
  await Promise.all(temporaryDirectories.splice(0).map(directory => (
    rm(directory, { force: true, recursive: true })
  )))
})

async function createSite(config: string, pages: Record<string, string>): Promise<string> {
  const root = await mkdtemp(join(PACKAGE_ROOT, 'kawapress-feed-'))
  temporaryDirectories.push(root)
  await writeFile(join(root, 'kawapress.config.ts'), config)
  for (const [path, content] of Object.entries(pages)) {
    const file = join(root, path)
    await mkdir(join(file, '..'), { recursive: true })
    await writeFile(file, content)
  }
  return root
}

function siteConfig(feedOptions: string, extra = ''): string {
  return `
import { nagi } from 'kawapress/nagi'
import feed from ${JSON.stringify(PLUGIN_ENTRY)}

export default nagi({
  title: 'Docs',
  description: 'Site description',
  base: '/docs',
  ${extra}
  plugins: [feed(${feedOptions})],
})
`
}

const localesConfig = `
  locales: {
    root: { label: '简体中文', lang: 'zh-CN', title: '文档' },
    en: { label: 'English', lang: 'en', title: 'Docs EN' },
  },
`

const pluginPagesSource = `
import { definePlugin } from 'kawapress'

const pluginPages = definePlugin({
  name: '@changelog',
  setup(api) {
    api.pages('/changelog/[version]', () => [
      { version: 'v1', markdown: '---\\ntitle: Release 1\\ndate: "2026-05-01"\\n---\\n# Release 1\\n\\nFirst release notes.\\n' },
      { version: 'draft', markdown: '---\\ndate: "2026-06-01"\\n---\\n# Draft\\n' },
    ])
    api.pages('/en/changelog/[version]', () => [
      { version: 'v1', markdown: '---\\ntitle: Release 1 EN\\ndate: "2026-05-02"\\n---\\n# Release 1 EN\\n' },
    ])
  },
})
`

describe('feed plugin', () => {
  it('feeds plugin pages by their sourcePath and puts them in the locale of their route', async () => {
    const config = siteConfig(
      `{ hostname: 'https://example.com', include: ['@changelog/**/*.md'], exclude: ['@changelog/changelog/draft.md'], formats: ['json'] }`,
      localesConfig,
    )
      .replace('plugins: [feed(', 'plugins: [pluginPages, feed(')
      .replace(`import { nagi }`, `${pluginPagesSource}\nimport { nagi }`)
    const root = await createSite(config, {
      'index.md': '# Home\n',
      'en/index.md': '# Home\n',
    })

    await buildSite(root)

    const rootJson = JSON.parse(await readFile(join(root, 'dist/feed.json'), 'utf8'))
    expect(rootJson.items.map((item: { title: string }) => item.title)).toEqual(['Release 1'])
    expect(rootJson.items[0].url).toBe('https://example.com/docs/changelog/v1')
    const enJson = JSON.parse(await readFile(join(root, 'dist/en/feed.json'), 'utf8'))
    expect(enJson.items.map((item: { title: string }) => item.title)).toEqual(['Release 1 EN'])
    expect(await readFile(join(root, 'dist/changelog/v1.html'), 'utf8')).toContain('type="application/feed+json"')
  }, 120_000)

  it('writes every format per locale, under the base, and links them from page heads', async () => {
    const warn = vi.spyOn(consola, 'warn')
    const root = await createSite(
      siteConfig(`{
        hostname: 'https://example.com',
        include: ['**/blog/**/*.md'],
        exclude: ['**/drafts/**', '**/index.md'],
        author: 'Default Author',
        limit: 2,
        transformItems(items, { locale }) {
          return locale === 'en' ? items.map(item => ({ ...item, title: item.title + '!' })) : undefined
        },
      }`, localesConfig),
      {
        'index.md': '# Home\n',
        'blog/index.md': '# Blog\n',
        'blog/one.md': '---\ntitle: One\ndate: "2026-01-01"\ndescription: First post.\n---\n# One\n',
        'blog/two.md': '---\ntitle: Two\ndate: "2026-02-01"\nauthor: Ann\nimage: /cover.png\n---\n# Two\n\nSecond **post** body.\n',
        'blog/three.md': '---\ntitle: Three\ndate: "2026-03-01"\n---\n# Three\n\nThird.\n',
        'blog/drafts/x.md': '---\ndate: "2026-04-01"\n---\n# Draft\n',
        'en/index.md': '# Home\n',
        'en/blog/one.md': '---\ntitle: One\ndate: "2026-01-01"\n---\n# One\n',
      },
    )

    await buildSite(root)

    const rss = parser.parse(await readFile(join(root, 'dist/feed.xml'), 'utf8')).rss.channel
    expect(rss.title).toBe('文档')
    expect(rss.language).toBe('zh-CN')
    expect(rss.link).toBe('https://example.com/docs/')
    expect(rss.item.map((item: { title: string }) => item.title)).toEqual(['Three', 'Two'])
    expect(rss.item[1].description).toBe('Second post body.')
    expect(rss.item[1].author).toBe('Ann')
    expect(rss.item[0].link).toBe('https://example.com/docs/blog/three')

    const atom = parser.parse(await readFile(join(root, 'dist/atom.xml'), 'utf8')).feed
    expect(atom.entry).toHaveLength(2)

    const json = JSON.parse(await readFile(join(root, 'dist/feed.json'), 'utf8'))
    expect(json.items[1].image).toBe('https://example.com/docs/cover.png')
    expect(json.feed_url).toBe('https://example.com/docs/feed.json')

    const enJson = JSON.parse(await readFile(join(root, 'dist/en/feed.json'), 'utf8'))
    expect(enJson.title).toBe('Docs EN')
    expect(enJson.items).toHaveLength(1)
    expect(enJson.items[0].title).toBe('One!')
    expect(enJson.items[0].url).toBe('https://example.com/docs/en/blog/one')
    expect(await readdir(join(root, 'dist/en'))).toEqual(expect.arrayContaining(['feed.xml', 'atom.xml', 'feed.json']))
    expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('feed'))

    const zhHead = await readFile(join(root, 'dist/blog/one.html'), 'utf8')
    expect(zhHead).toContain('type="application/rss+xml"')
    expect(zhHead).toContain('href="https://example.com/docs/feed.xml"')
    expect(zhHead).toContain('href="https://example.com/docs/atom.xml"')
    expect(zhHead).toContain('type="application/feed+json"')
    expect(zhHead).toContain('href="https://example.com/docs/feed.json"')
    const enHead = await readFile(join(root, 'dist/en.html'), 'utf8')
    expect(enHead).toContain('href="https://example.com/docs/en/feed.xml"')
    expect(enHead).not.toContain('href="https://example.com/docs/feed.xml"')
  })

  it('writes an empty feed with links when matching pages have no date', async () => {
    const warn = vi.spyOn(consola, 'warn')
    const root = await createSite(
      siteConfig(`{ hostname: 'https://example.com', include: ['blog/**/*.md'], formats: ['rss'] }`),
      {
        'index.md': '# Home\n',
        'blog/undated.md': '# Undated\n',
      },
    )

    await buildSite(root)

    const rss = await readFile(join(root, 'dist/feed.xml'), 'utf8')
    expect(rss).toContain('<channel>')
    expect(rss).not.toContain('<item>')
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('/blog/undated'))
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('没有条目'))
    expect(await readFile(join(root, 'dist/index.html'), 'utf8')).toContain('application/rss+xml')
  })

  it('writes nothing when no page matches include', async () => {
    const warn = vi.spyOn(consola, 'warn')
    const root = await createSite(
      siteConfig(`{ hostname: 'https://example.com', include: ['blog/**/*.md'], formats: ['rss'] }`),
      { 'index.md': '# Home\n' },
    )

    await buildSite(root)

    await expect(readFile(join(root, 'dist/feed.xml'), 'utf8')).rejects.toThrow()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('没有任何页面匹配 include'))
    expect(await readFile(join(root, 'dist/index.html'), 'utf8')).not.toContain('application/rss+xml')
  })

  it('only writes the requested formats', async () => {
    const root = await createSite(
      siteConfig(`{ hostname: 'https://example.com', include: ['**/*.md'], formats: ['atom'] }`),
      { 'index.md': '---\ndate: "2026-01-01"\n---\n# Home\n' },
    )

    await buildSite(root)

    expect(await readFile(join(root, 'dist/atom.xml'), 'utf8')).toContain('<feed')
    await expect(readFile(join(root, 'dist/feed.xml'), 'utf8')).rejects.toThrow()
    await expect(readFile(join(root, 'dist/feed.json'), 'utf8')).rejects.toThrow()
  })
})

describe('feedPlugin options', () => {
  it('throws for a missing or non-http hostname and an empty include', () => {
    expect(() => feedPlugin({ include: ['*.md'] } as never)).toThrow('hostname')
    expect(() => feedPlugin({ hostname: 'ftp://example.com', include: ['*.md'] })).toThrow('http or https')
    expect(() => feedPlugin({ hostname: 'https://example.com', include: [] })).toThrow('include')
    expect(() => feedPlugin({ hostname: 'https://example.com', include: ['*.md'], limit: 0 })).toThrow('limit')
    expect(() => feedPlugin({ hostname: 'https://example.com', include: ['*.md'], formats: ['xml' as never] })).toThrow('formats')
  })
})
