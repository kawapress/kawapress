import type { PageBuildArtifact } from 'kawapress'
import { describe, expect, it } from 'vitest'
import { extractExcerpt } from './excerpt'
import { resolveFeedHostname } from './hostname'
import { createFeedItems, createPageMatcher, sortAndLimit } from './items'

function page(
  routePath: string,
  frontmatter: Record<string, unknown> = {},
  source = '# Title\n\nBody text.\n',
  description?: string,
): PageBuildArtifact {
  const sourcePath = `${routePath === '/' ? '/index' : routePath}.md`
  return {
    source,
    file: `/site${sourcePath}`,
    sourcePath,
    pagePath: sourcePath,
    routePath,
    pageData: {
      path: routePath,
      title: routePath,
      ...(description ? { description } : {}),
      frontmatter,
      headers: [],
    },
  }
}

const locales = { root: { label: 'zh', lang: 'zh-CN' }, en: { label: 'en', lang: 'en' } }
const hostname = 'https://example.com/docs/'

describe('createPageMatcher', () => {
  it('applies include and exclude globs relative to srcDir', () => {
    const matches = createPageMatcher(['blog/**/*.md'], ['blog/drafts/**'])
    expect(matches('/blog/a.md')).toBe(true)
    expect(matches('/blog/2026/b.md')).toBe(true)
    expect(matches('/blog/drafts/c.md')).toBe(false)
    expect(matches('/guide/a.md')).toBe(false)
  })
})

describe('resolveFeedHostname', () => {
  it('joins the base and does not repeat it', () => {
    expect(resolveFeedHostname('https://example.com', '/docs/')).toBe('https://example.com/docs/')
    expect(resolveFeedHostname('https://example.com/docs', '/docs/')).toBe('https://example.com/docs/')
    expect(resolveFeedHostname('https://example.com/', '/')).toBe('https://example.com/')
  })

  it('rejects a missing or non-http hostname', () => {
    expect(() => resolveFeedHostname(undefined, '/')).toThrow('required')
    expect(() => resolveFeedHostname('example.com', '/')).toThrow('absolute')
    expect(() => resolveFeedHostname('ftp://example.com', '/')).toThrow('http or https')
  })
})

describe('createFeedItems', () => {
  const matches = createPageMatcher(['**/blog/**/*.md'])

  it('keeps matching dated pages, groups them by locale and joins the base', () => {
    const { items, undated } = createFeedItems({
      pages: [
        page('/blog/a', { date: '2026-01-02' }, '# A\n\nFirst **paragraph** with [a link](/x).\n', 'Described'),
        page('/blog/b', { date: '2026-01-03', author: 'Ann', image: '/img/b.png' }),
        page('/en/blog/c', { date: '2026-01-04', author: { name: 'Bob', email: 'bob@example.com' }, image: 'https://cdn.test/c.png' }),
        page('/blog/off', { date: '2026-01-05', feed: false }),
        page('/guide/x', { date: '2026-01-06' }),
      ],
      locales,
      hostname,
      matches,
      author: { name: 'Default' },
    })

    expect([...items.keys()]).toEqual(['root', 'en'])
    const [a, b] = items.get('root')!
    expect(a).toMatchObject({
      title: '/blog/a',
      link: 'https://example.com/docs/blog/a',
      description: 'Described',
      authors: [{ name: 'Default' }],
    })
    expect(a.date.toISOString()).toBe('2026-01-02T00:00:00.000Z')
    expect(b).toMatchObject({
      description: 'Body text.',
      image: 'https://example.com/docs/img/b.png',
      authors: [{ name: 'Ann' }],
    })
    expect(items.get('en')![0]).toMatchObject({
      link: 'https://example.com/docs/en/blog/c',
      image: 'https://cdn.test/c.png',
      authors: [{ name: 'Bob', email: 'bob@example.com' }],
    })
    expect(undated).toEqual([])
  })

  it('lists matching pages without a usable string date', () => {
    const { items, undated } = createFeedItems({
      pages: [
        page('/blog/none'),
        page('/blog/bad', { date: 'not a date' }),
        page('/blog/number', { date: 20260101 }),
        page('/blog/ok', { date: '2026-01-01' }),
      ],
      locales,
      hostname,
      matches,
    })
    expect(undated).toEqual(['/blog/none', '/blog/bad', '/blog/number'])
    expect(items.get('root')).toHaveLength(1)
  })

  it('encodes non-ASCII route segments', () => {
    const { items } = createFeedItems({
      pages: [page('/blog/你好', { date: '2026-01-01' })],
      locales,
      hostname,
      matches,
    })
    expect(items.get('root')![0].link).toBe(`https://example.com/docs/blog/${encodeURIComponent('你好')}`)
  })
})

describe('sortAndLimit', () => {
  it('sorts newest first and cuts to the limit', () => {
    const make = (day: number) => ({ title: String(day), link: `https://e.test/${day}`, date: new Date(Date.UTC(2026, 0, day)) })
    expect(sortAndLimit([make(1), make(3), make(2)], 2).map(item => item.title)).toEqual(['3', '2'])
  })
})

describe('extractExcerpt', () => {
  it('takes the first plain paragraph without Markdown marks', () => {
    const source = `---
title: T
---
# Heading

::: tip
skip me
:::

\`\`\`ts

code

\`\`\`

Hello **bold** and \`code\` with ![img](a.png) a [link](/b) <b>tag</b>.
Second line.

Another paragraph.
`
    expect(extractExcerpt(source)).toBe('Hello bold and code with a link tag. Second line.')
  })

  it('returns undefined without a paragraph and truncates long text', () => {
    expect(extractExcerpt('# Only a heading\n')).toBeUndefined()
    const excerpt = extractExcerpt(`# T\n\n${'字'.repeat(400)}\n`)!
    expect([...excerpt]).toHaveLength(300)
    expect(excerpt.endsWith('…')).toBe(true)
  })
})
