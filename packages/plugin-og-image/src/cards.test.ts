import type { CardContext } from './cards'
import { Buffer } from 'node:buffer'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { formatMissingGlyphWarning, renderCard } from './cards'
import { loadFonts } from './fonts'
import { inlineLocalImages, stripComments } from './render'

const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(directory => rm(directory, { force: true, recursive: true })))
})

async function createDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'kawapress-og-'))
  temporaryDirectories.push(directory)
  return directory
}

function createMemoryCache(): CardContext['cache'] & { size: () => number } {
  const entries = new Map<string, Uint8Array>()
  return {
    get: async key => entries.get(key),
    set: async (key, png) => void entries.set(key, png),
    size: () => entries.size,
  }
}

const props = {
  title: 'Hello',
  description: 'World',
  siteTitle: 'Site',
  lang: 'en',
  routePath: '/hello',
  frontmatter: {},
}

describe('renderCard', () => {
  it('renders a 1200x630 PNG and reuses it while the output stays the same', async () => {
    const cache = createMemoryCache()
    const render = vi.fn(async (value: typeof props) => (
      `<!--[--><div style="display:flex;width:100%;height:100%;background-color:#123456;font-family:Inter">${value.title}</div><!--]-->`
    ))
    const context: CardContext = {
      bundle: { render },
      fonts: await loadFonts('/'),
      cache,
      imageDirectories: [],
    }

    const first = await renderCard(props, context)
    expect(first.cached).toBe(false)
    const view = new DataView(first.png.buffer, first.png.byteOffset)
    expect(view.getUint32(0)).toBe(0x89504E47)
    expect(view.getUint32(16)).toBe(1200)
    expect(view.getUint32(20)).toBe(630)

    const second = await renderCard(props, context)
    expect(second.cached).toBe(true)
    expect(Buffer.from(second.png).equals(Buffer.from(first.png))).toBe(true)

    // Different props change the HTML, so the card is rendered again.
    const third = await renderCard({ ...props, title: 'Changed' }, context)
    expect(third.cached).toBe(false)
    expect(cache.size()).toBe(2)
  })

  it('reports characters that no font draws', async () => {
    const context: CardContext = {
      bundle: { render: async () => '<div style="display:flex">x</div>' },
      fonts: await loadFonts('/'),
      cache: createMemoryCache(),
      imageDirectories: [],
    }

    const card = await renderCard({ ...props, title: 'Hi 你好', description: 'ok' }, context)
    expect(card.missingCharacters.sort()).toEqual(['你', '好'])
  })
})

describe('formatMissingGlyphWarning', () => {
  it('lists the pages and caps the list', () => {
    const pages = new Map<string, string[]>()
    for (let index = 0; index < 10; index++) {
      pages.set(`/page-${index}`, ['你', '好'])
    }
    const warning = formatMissingGlyphWarning(pages)
    expect(warning).toContain('10 pages')
    expect(warning).toContain('/page-0  你好')
    expect(warning).toContain('…and 2 more')
    expect(warning).toContain('"fonts" option')
  })
})

describe('template HTML preparation', () => {
  it('removes the comment markers of Vue SSR', () => {
    expect(stripComments('<!--[--><div>a</div><!----><!--]-->')).toBe('<div>a</div>')
  })

  it('inlines local images and leaves remote ones alone', async () => {
    const directory = await createDirectory()
    await writeFile(join(directory, 'logo.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>')
    const html = '<img src="/logo.svg" width="10" height="10"><img src="https://example.com/a.png">'

    const result = await inlineLocalImages(html, [directory])
    expect(result).toContain('src="data:image/svg+xml;base64,')
    expect(result).toContain('src="https://example.com/a.png"')
  })

  it('fails with a clear message for a missing image', async () => {
    const directory = await createDirectory()
    await expect(inlineLocalImages('<img src="/missing.png">', [directory])).rejects.toThrow('"/missing.png"')
  })
})
