import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRemoteFontLoader, groupByFamily } from './remote-fonts'

const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(directory => rm(directory, { force: true, recursive: true })))
})

async function createDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'kawapress-og-fonts-'))
  temporaryDirectories.push(directory)
  return directory
}

const CSS = `
/* [0] */
@font-face {
  font-family: 'Noto Sans SC';
  font-style: normal;
  font-weight: 400;
  src: url(https://fonts.gstatic.com/l/font?kit=regular) format('truetype');
}
@font-face {
  font-family: 'Noto Sans SC';
  font-style: normal;
  font-weight: 700;
  src: url(https://fonts.gstatic.com/l/font?kit=bold) format('truetype');
}
`

type Handler = (url: string) => Response | Promise<Response>

function mockFetch(handler: Handler): typeof globalThis.fetch & { urls: string[] } {
  const urls: string[] = []
  const fn = vi.fn(async (input: string | URL | Request) => {
    const url = String(input)
    urls.push(url)
    return handler(url)
  })
  return Object.assign(fn, { urls }) as unknown as typeof globalThis.fetch & { urls: string[] }
}

function googleLike(url: string): Response {
  if (url.includes('/css2?')) {
    return new Response(CSS)
  }
  return new Response(new Uint8Array([url.includes('bold') ? 7 : 4]))
}

describe('groupByFamily', () => {
  const chars = (text: string): string[] => [...text]

  it('draws Han text and its punctuation with one font chosen by kana and the page language', () => {
    expect([...groupByFamily(chars('好你，'), 'zh-CN')]).toEqual([['Noto Sans SC', ['你', '好', '，']]])
    expect(groupByFamily(chars('漢字'), 'en').has('Noto Sans SC')).toBe(true)
    expect(groupByFamily(chars('漢字'), 'zh-TW').has('Noto Sans TC')).toBe(true)
    expect(groupByFamily(chars('漢字'), 'zh-Hant').has('Noto Sans TC')).toBe(true)
    expect(groupByFamily(chars('漢字'), 'zh-HK').has('Noto Sans HK')).toBe(true)
    expect(groupByFamily(chars('漢字'), 'ja').has('Noto Sans JP')).toBe(true)
    // Kana makes the Han characters of the same card Japanese too.
    expect([...groupByFamily(chars('漢字カナ'), 'en')]).toEqual([['Noto Sans JP', ['カ', 'ナ', '字', '漢']]])
  })

  it('uses a font per script and leaves emoji out', () => {
    const groups = groupByFamily(chars('한글ไทย★∑Ж🎉'), 'en')
    expect(Object.fromEntries(groups)).toEqual({
      'Noto Sans KR': ['글', '한'],
      'Noto Sans Thai': ['ท', 'ย', 'ไ'],
      'Noto Sans Math': ['∑'],
      'Noto Sans Symbols': ['★'],
      'Noto Sans Symbols 2': ['★'],
      'Noto Sans': ['Ж'],
    })
  })
})

describe('createRemoteFontLoader', () => {
  it('downloads the regular and bold subset of the characters and caches them on disk', async () => {
    const cacheDirectory = await createDirectory()
    const fetch = mockFetch(googleLike)
    const loader = createRemoteFontLoader({ cacheDirectory, fetch })

    const result = await loader.fontsFor(['好', '你'], 'zh-CN')
    expect(result.errors).toEqual([])
    expect(result.fonts.map(font => [font.weight, [...font.data]])).toEqual([[400, [4]], [700, [7]]])
    expect(result.fonts[0].name).toMatch(/^Noto Sans SC [0-9a-f]{12}$/)
    expect(fetch.urls[0]).toBe(`https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700&text=${encodeURIComponent('你好')}`)

    // A new build reads the subset from disk.
    const offline = mockFetch(() => {
      throw new Error('offline')
    })
    const next = createRemoteFontLoader({ cacheDirectory, fetch: offline })
    const cached = await next.fontsFor(['你', '好'], 'zh-CN')
    expect(cached.fonts.map(font => [...font.data])).toEqual([[4], [7]])
    expect(cached.fonts[0].name).toBe(result.fonts[0].name)
    expect(offline.urls).toEqual([])
  })

  it('falls back to the next endpoint and stops asking one that keeps failing', async () => {
    const fetch = mockFetch((url) => {
      if (url.startsWith('https://blocked.example')) {
        throw new TypeError('fetch failed')
      }
      return googleLike(url)
    })
    const loader = createRemoteFontLoader({
      cacheDirectory: await createDirectory(),
      endpoints: ['https://blocked.example/', 'https://mirror.example'],
      fetch,
    })

    for (const char of ['一', '二', '三']) {
      expect((await loader.fontsFor([char], 'zh')).fonts).toHaveLength(2)
    }
    // Two failures, each retried once, then the endpoint is skipped.
    expect(fetch.urls.filter(url => url.startsWith('https://blocked.example'))).toHaveLength(4)
    expect(fetch.urls.filter(url => url.startsWith('https://mirror.example/css2?'))).toHaveLength(3)
  })

  it('asks again without weights when the family has no bold face', async () => {
    const fetch = mockFetch(url => url.includes(':wght@') ? new Response('', { status: 400 }) : googleLike(url))
    const loader = createRemoteFontLoader({ cacheDirectory: await createDirectory(), fetch })

    await loader.fontsFor(['∑'], 'en')
    expect(fetch.urls).toContain(`https://fonts.googleapis.com/css2?family=Noto+Sans+Math&text=${encodeURIComponent('∑')}`)
  })

  it('reports the characters of a failed download, and tries again later', async () => {
    let online = false
    const fetch = mockFetch(url => online ? googleLike(url) : new Response('', { status: 503 }))
    const loader = createRemoteFontLoader({ cacheDirectory: await createDirectory(), fetch })

    const failed = await loader.fontsFor(['한'], 'ko')
    expect(failed.fonts).toEqual([])
    expect([...failed.failedCharacters]).toEqual(['한'])
    expect(failed.errors.join('\n')).toMatch(/Noto Sans KR.*HTTP 503/)
    online = true
    expect((await loader.fontsFor(['한'], 'ko')).fonts).toHaveLength(2)
  })

  it('leaves emoji alone', async () => {
    const fetch = mockFetch(googleLike)
    const loader = createRemoteFontLoader({ cacheDirectory: await createDirectory(), fetch })

    expect((await loader.fontsFor(['🎉'], 'en')).fonts).toEqual([])
    expect(fetch.urls).toEqual([])
    expect(loader.covers('🎉')).toBe(false)
    expect(loader.covers('你')).toBe(true)
  })
})
