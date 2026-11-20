import type { SatoriFont } from './fonts'
import type { OgImageRemoteFontsOptions } from './types'
import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import process from 'node:process'
// Imported statically: the config, and this module with it, is loaded by a Vite
// module runner that is closed by the time cards are rendered.
import { EnvHttpProxyAgent, fetch as undiciFetch } from 'undici'

export const DEFAULT_FONT_ENDPOINTS = ['https://fonts.googleapis.com']
const DEFAULT_TIMEOUT = 10_000
/** Consecutive network failures after which an endpoint is skipped for the rest of the process. */
const ENDPOINT_FAILURE_LIMIT = 2
const WEIGHTS = [400, 700] as const

/** Noto families by script, for the characters no local font draws. */
const SCRIPT_FAMILIES: Array<[RegExp, string[]]> = [
  [/\p{sc=Hangul}/u, ['Noto Sans KR']],
  [/\p{sc=Thai}/u, ['Noto Sans Thai']],
  [/\p{sc=Bengali}/u, ['Noto Sans Bengali']],
  [/\p{sc=Arabic}/u, ['Noto Sans Arabic']],
  [/\p{sc=Tamil}/u, ['Noto Sans Tamil']],
  [/\p{sc=Malayalam}/u, ['Noto Sans Malayalam']],
  [/\p{sc=Hebrew}/u, ['Noto Sans Hebrew']],
  [/\p{sc=Telugu}/u, ['Noto Sans Telugu']],
  [/\p{sc=Devanagari}/u, ['Noto Sans Devanagari']],
  [/\p{sc=Kannada}/u, ['Noto Sans Kannada']],
  // Math operators; other symbols such as ★ go to the Symbols families.
  [/\p{Sm}/u, ['Noto Sans Math']],
  [/\p{Symbol}/u, ['Noto Sans Symbols', 'Noto Sans Symbols 2']],
]
const FALLBACK_FAMILY = 'Noto Sans'

/** Han and kana. */
const CJK_RE = /[\p{scx=Han}\p{scx=Hiragana}\p{scx=Katakana}]/u
/** CJK and full-width punctuation, drawn by the same font as the Han text around it. */
const CJK_PUNCTUATION_RE = /[\u3000-\u303F\uFF00-\uFFEF]/u
const KANA_RE = /[\p{sc=Hiragana}\p{sc=Katakana}]/u
const EMOJI_RE = /\p{Extended_Pictographic}/u
const FONT_FACE_RE = /@font-face\s*\{([^}]*)\}/g
const FONT_WEIGHT_RE = /font-weight:\s*(\d+)/
const FONT_URL_RE = /src:\s*url\(([^)]+)\)/

export interface RemoteFonts {
  fonts: SatoriFont[]
  /** Characters whose font could not be downloaded. */
  failedCharacters: Set<string>
  /** Why those downloads failed. */
  errors: string[]
}

export interface RemoteFontLoader {
  /**
   * Downloads, for the characters no local font draws, one subset per Noto
   * family. What is downloaded depends on the characters alone, so a card asks
   * for the same subsets in every build and the disk cache answers them.
   */
  fontsFor: (characters: readonly string[], lang: string) => Promise<RemoteFonts>
  /** Whether a remote font is meant for `char`; emoji are not covered. */
  covers: (char: string) => boolean
}

export interface RemoteFontLoaderOptions extends OgImageRemoteFontsOptions {
  cacheDirectory: string
  fetch?: typeof globalThis.fetch
}

const PROXY_VARIABLES = ['HTTPS_PROXY', 'https_proxy', 'HTTP_PROXY', 'http_proxy']
let proxiedFetch: typeof globalThis.fetch | undefined

/**
 * Node's fetch ignores `HTTPS_PROXY`, so a developer behind a proxy would time
 * out. With a proxy variable set, requests go through undici's
 * `EnvHttpProxyAgent`, which also honors `NO_PROXY`.
 */
const defaultFetch: typeof globalThis.fetch = async (input, init) => {
  if (!PROXY_VARIABLES.some(name => process.env[name])) {
    return globalThis.fetch(input, init)
  }
  if (!proxiedFetch) {
    const dispatcher = new EnvHttpProxyAgent()
    proxiedFetch = ((url: string, requestInit?: object) => undiciFetch(url, { ...requestInit, dispatcher })) as unknown as typeof globalThis.fetch
  }
  return proxiedFetch(input, init)
}

export function createRemoteFontLoader(options: RemoteFontLoaderOptions): RemoteFontLoader {
  const endpoints = (options.endpoints?.length ? options.endpoints : DEFAULT_FONT_ENDPOINTS)
    .map(endpoint => endpoint.replace(/\/+$/, ''))
  const timeout = options.timeout ?? DEFAULT_TIMEOUT
  const fetchFn = options.fetch ?? defaultFetch
  const failures = new Map<string, number>()
  const memory = new Map<string, Promise<SatoriFont[]>>()

  const request = async (url: string): Promise<Response> => {
    try {
      return await fetchFn(url, { signal: AbortSignal.timeout(timeout) })
    }
    catch (error) {
      // A dropped connection is often transient; a timeout is not retried.
      if (error instanceof TypeError) {
        return fetchFn(url, { signal: AbortSignal.timeout(timeout) })
      }
      throw error
    }
  }

  const downloadFrom = async (endpoint: string, family: string, segment: string): Promise<SatoriFont[]> => {
    const familyParam = family.replace(/ /g, '+')
    const text = encodeURIComponent(segment)
    // Families without a bold face reject the weight list; they are asked again without it.
    let response = await request(`${endpoint}/css2?family=${familyParam}:wght@${WEIGHTS.join(';')}&text=${text}`)
    if (response.status === 400) {
      response = await request(`${endpoint}/css2?family=${familyParam}&text=${text}`)
    }
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    const css = await response.text()
    const fonts: SatoriFont[] = []
    for (const [, block] of css.matchAll(FONT_FACE_RE)) {
      const url = FONT_URL_RE.exec(block)?.[1]?.replace(/^['"]|['"]$/g, '')
      if (!url) {
        continue
      }
      const fontResponse = await request(new URL(url, `${endpoint}/`).href)
      if (!fontResponse.ok) {
        throw new Error(`HTTP ${fontResponse.status} for a font file`)
      }
      fonts.push({
        name: family,
        data: Buffer.from(await fontResponse.arrayBuffer()),
        weight: Number(FONT_WEIGHT_RE.exec(block)?.[1] ?? 400) as SatoriFont['weight'],
        style: 'normal',
      })
    }
    if (fonts.length === 0) {
      throw new Error('the response lists no font file')
    }
    return fonts
  }

  /** Downloads one family subset from the first endpoint that answers. */
  const download = async (family: string, segment: string): Promise<SatoriFont[]> => {
    const errors: string[] = []
    for (const endpoint of endpoints) {
      if ((failures.get(endpoint) ?? 0) >= ENDPOINT_FAILURE_LIMIT) {
        errors.push(`${endpoint}: skipped after ${ENDPOINT_FAILURE_LIMIT} failures`)
        continue
      }
      try {
        const fonts = await downloadFrom(endpoint, family, segment)
        failures.set(endpoint, 0)
        return fonts
      }
      catch (error) {
        failures.set(endpoint, (failures.get(endpoint) ?? 0) + 1)
        errors.push(`${endpoint}: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
    throw new Error(`cannot download ${family}. ${errors.join('; ')}`)
  }

  const loadFamily = (family: string, segment: string): Promise<SatoriFont[]> => {
    const key = createHash('sha256').update(`${family}\0${segment}`).digest('hex')
    let pending = memory.get(key)
    if (!pending) {
      pending = (async () => {
        const file = join(options.cacheDirectory, `${key}.json`)
        let fonts = await readCachedFonts(file)
        if (!fonts) {
          fonts = await download(family, segment)
          await writeCachedFonts(file, fonts)
        }
        // satori keeps one font per name and weight: subsets get their own names so none hides another.
        return fonts.map(font => ({ ...font, name: `${family} ${key.slice(0, 12)}` }))
      })()
      // A failed download is tried again by the next card.
      pending.catch(() => memory.delete(key))
      memory.set(key, pending)
    }
    return pending
  }

  return {
    async fontsFor(characters, lang) {
      const result: RemoteFonts = { fonts: [], failedCharacters: new Set(), errors: [] }
      await Promise.all([...groupByFamily(characters, lang)].map(async ([family, chars]) => {
        try {
          result.fonts.push(...await loadFamily(family, chars.join('')))
        }
        catch (error) {
          chars.forEach(char => result.failedCharacters.add(char))
          result.errors.push(error instanceof Error ? error.message : String(error))
        }
      }))
      // Downloads finish in any order; a stable font order keeps the rendering stable.
      result.fonts.sort((a, b) => a.name.localeCompare(b.name) || a.weight - b.weight)
      return result
    },
    covers(char) {
      return !EMOJI_RE.test(char)
    },
  }
}

/**
 * The Noto families that draw `characters`, each with its sorted characters.
 * Han characters look different in Chinese, Japanese and Korean: kana in the
 * text or the page language decides, and Simplified Chinese is the default.
 */
export function groupByFamily(characters: readonly string[], lang: string): Map<string, string[]> {
  const unique = [...new Set(characters)].filter(char => !EMOJI_RE.test(char)).sort()
  const cjkFamily = cjkFamilyFor(unique, lang.toLowerCase())
  const groups = new Map<string, string[]>()
  for (const char of unique) {
    const families = CJK_RE.test(char) || CJK_PUNCTUATION_RE.test(char)
      ? [cjkFamily]
      : SCRIPT_FAMILIES.find(([pattern]) => pattern.test(char))?.[1] ?? [FALLBACK_FAMILY]
    for (const family of families) {
      groups.set(family, [...groups.get(family) ?? [], char])
    }
  }
  return groups
}

function cjkFamilyFor(characters: readonly string[], lang: string): string {
  const [primary] = lang.split('-')
  if (primary === 'ja' || characters.some(char => KANA_RE.test(char))) {
    return 'Noto Sans JP'
  }
  if (primary === 'ko') {
    return 'Noto Sans KR'
  }
  if (primary === 'zh' && (lang.includes('hk') || lang.includes('mo'))) {
    return 'Noto Sans HK'
  }
  if (primary === 'zh' && (lang.includes('hant') || lang.includes('tw'))) {
    return 'Noto Sans TC'
  }
  return 'Noto Sans SC'
}

async function readCachedFonts(file: string): Promise<SatoriFont[] | undefined> {
  try {
    const entries = JSON.parse(await readFile(file, 'utf8')) as Array<Omit<SatoriFont, 'data'> & { data: string }>
    return entries.map(entry => ({ ...entry, data: Buffer.from(entry.data, 'base64') }))
  }
  catch {
    return undefined
  }
}

async function writeCachedFonts(file: string, fonts: SatoriFont[]): Promise<void> {
  const directory = join(file, '..')
  await mkdir(directory, { recursive: true })
  const temporary = `${file}.${process.pid}.tmp`
  await writeFile(temporary, JSON.stringify(fonts.map(font => ({ ...font, data: font.data.toString('base64') }))))
  await rename(temporary, file)
}
