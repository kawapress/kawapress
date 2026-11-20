import type { CardContext } from './cards'
import { Buffer } from 'node:buffer'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { html as parseHtml } from 'satori-html'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { formatMissingGlyphWarning, renderCard } from './cards'
import { loadFonts } from './fonts'
import { decodeTextNodes, inlineLocalImages, stripComments, textContent } from './render'

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
  url: 'https://example.com/hello',
  frontmatter: {},
}

describe('renderCard', () => {
  it('renders a 1200x630 PNG and reuses it while the output stays the same', async () => {
    const cache = createMemoryCache()
    const render = vi.fn(async (value: typeof props) => (
      `<!--[--><div style="display:flex;width:100%;height:100%;background-color:#123456;font-family:Figtree">${value.title}</div><!--]-->`
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
      bundle: { render: async (value: typeof props) => `<div style="display:flex">${value.title}</div>` },
      fonts: await loadFonts('/'),
      cache: createMemoryCache(),
      imageDirectories: [],
    }

    // Only what the card shows counts: the description is not in this template.
    const card = await renderCard({ ...props, title: 'Hi 你好', description: '世界' }, context)
    expect(card.missingCharacters.sort()).toEqual(['你', '好'])
  })
})

describe('renderCard with remote fonts', () => {
  const han = { ...props, title: 'Hi 你好', description: 'ok', lang: 'zh-CN' }
  const html = async () => '<div style="display:flex;font-family:Figtree">Hi &amp; 你好</div>'

  it('asks for the characters no local font draws and keeps a card whose download failed out of the cache', async () => {
    const fontsFor = vi.fn(async (characters: readonly string[]) => ({
      fonts: [],
      failedCharacters: new Set(characters),
      errors: ['cannot download Noto Sans SC. https://fonts.googleapis.com: fetch failed'],
    }))
    const cache = createMemoryCache()
    const context: CardContext = {
      bundle: { render: html },
      fonts: await loadFonts('/', [], { fontsFor, covers: () => true }),
      cache,
      imageDirectories: [],
    }

    const card = await renderCard(han, context)
    expect(fontsFor).toHaveBeenCalledWith(['你', '好'], 'zh-CN')
    expect(card.remoteFontErrors).toEqual(['cannot download Noto Sans SC. https://fonts.googleapis.com: fetch failed'])
    expect(card.missingCharacters.sort()).toEqual(['你', '好'])
    expect(cache.size()).toBe(0)
  })

  it('caches a card once every download succeeded', async () => {
    const cache = createMemoryCache()
    const context: CardContext = {
      bundle: { render: async (value: typeof props) => `<div style="display:flex">${value.title}</div>` },
      fonts: await loadFonts('/', [], {
        fontsFor: async () => ({ fonts: [], failedCharacters: new Set(), errors: [] }),
        covers: char => char !== '🎉',
      }),
      cache,
      imageDirectories: [],
    }

    const first = await renderCard({ ...han, title: '你🎉' }, context)
    expect(first.remoteFontErrors).toEqual([])
    expect(cache.size()).toBe(1)
    const second = await renderCard({ ...han, title: '你🎉' }, context)
    expect(second.cached).toBe(true)
    expect(second.missingCharacters).toEqual(['🎉'])
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
  it('decodes the entities of text nodes', () => {
    const node = decodeTextNodes(parseHtml('<div><span>A &amp; B</span>&lt;3</div>'))
    expect(JSON.stringify(node)).toContain('"A & B"')
    expect(JSON.stringify(node)).toContain('"<3"')
  })

  it('reads the text of the card HTML', () => {
    expect(textContent('<div style="a:b">A &amp; B</div><span>&#20320;&#x597D;&lt;</span>')).toBe(' A & B  你好< ')
  })

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
