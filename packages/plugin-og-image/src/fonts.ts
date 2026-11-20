import type { Buffer } from 'node:buffer'
import type { RemoteFontLoader } from './remote-fonts'
import type { OgImageFont } from './types'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

const require = createRequire(import.meta.url)

export interface SatoriFont {
  name: string
  data: Buffer
  weight: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900
  style: 'normal' | 'italic'
}

interface OpenTypeFont {
  charToGlyphIndex: (char: string) => number
}

interface OpenTypeModule {
  parse: (buffer: ArrayBuffer) => OpenTypeFont
}

export interface LoadedFonts {
  /** Fonts in the order satori tries them. */
  fonts: SatoriFont[]
  /** Identifies the font set, so a cached card is dropped when a font changes. */
  digest: string
  /** Characters of `text` that no font, nor any of `extraFonts`, has a glyph for. */
  findMissingCharacters: (text: string, extraFonts?: readonly SatoriFont[]) => string[]
  /** Downloads fonts for the characters the fonts above do not draw. */
  remote?: RemoteFontLoader
}

const BUILT_IN_FONT_FILES: Array<{ file: string, weight: SatoriFont['weight'] }> = [
  { file: '@fontsource/figtree/files/figtree-latin-400-normal.woff', weight: 400 },
  { file: '@fontsource/figtree/files/figtree-latin-500-normal.woff', weight: 500 },
  { file: '@fontsource/figtree/files/figtree-latin-600-normal.woff', weight: 600 },
  { file: '@fontsource/figtree/files/figtree-latin-700-normal.woff', weight: 700 },
]

const BUILT_IN_FONT_FAMILY = 'Figtree'
const WEIGHTS = new Set([100, 200, 300, 400, 500, 600, 700, 800, 900])
const IGNORED_CHARACTER_RE = /[\s\p{C}]/u

export async function loadFonts(
  root: string,
  userFonts: readonly OgImageFont[] = [],
  remote?: RemoteFontLoader,
): Promise<LoadedFonts> {
  const fonts: SatoriFont[] = []
  for (const font of userFonts) {
    const weight = font.weight ?? 400
    if (!WEIGHTS.has(weight)) {
      throw new Error(`KawaPress OG Image: font ${JSON.stringify(font.name)} has an invalid weight ${weight}.`)
    }
    const file = resolve(root, font.path)
    let data: Buffer
    try {
      data = await readFile(file)
    }
    catch (error) {
      throw new Error(`KawaPress OG Image: cannot read font ${JSON.stringify(font.path)}.`, { cause: error })
    }
    fonts.push({
      name: font.name,
      data,
      weight: weight as SatoriFont['weight'],
      style: font.style ?? 'normal',
    })
  }
  for (const { file, weight } of BUILT_IN_FONT_FILES) {
    fonts.push({
      name: BUILT_IN_FONT_FAMILY,
      data: await readFile(require.resolve(file)),
      weight,
      style: 'normal',
    })
  }

  const hash = createHash('sha256')
  for (const font of fonts) {
    hash.update(`${font.name}\0${font.weight}\0${font.style}\0`)
    hash.update(font.data)
  }
  // Mirrors serve the same fonts, so only whether remote fonts are on matters.
  hash.update(remote ? 'remote-fonts:on' : 'remote-fonts:off')

  // The small built-in font is tried first: a site of Latin text never opens a CJK font.
  const lookupOrder = [...fonts].reverse()

  return {
    fonts,
    digest: hash.digest('hex'),
    remote,
    findMissingCharacters(text, extraFonts = []) {
      const missing: string[] = []
      for (const char of new Set(text)) {
        if (IGNORED_CHARACTER_RE.test(char)) {
          continue
        }
        if (!lookupOrder.some(font => hasGlyph(font, char)) && !extraFonts.some(font => hasGlyph(font, char))) {
          missing.push(char)
        }
      }
      return missing
    },
  }
}

// Parsed on demand, once per font.
const parsedFonts = new WeakMap<SatoriFont, OpenTypeFont>()

function hasGlyph(font: SatoriFont, char: string): boolean {
  let opentypeFont = parsedFonts.get(font)
  if (!opentypeFont) {
    const opentype = require('opentype.js') as OpenTypeModule
    opentypeFont = opentype.parse(toArrayBuffer(font.data))
    parsedFonts.set(font, opentypeFont)
  }
  return opentypeFont.charToGlyphIndex(char) > 0
}

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer
}
