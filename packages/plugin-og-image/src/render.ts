import type { SatoriFont } from './fonts'
import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { extname, join, resolve, sep } from 'node:path'
import process from 'node:process'
import { Resvg } from '@resvg/resvg-js'
import satori from 'satori'
import { html as parseHtml } from 'satori-html'
import { OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH } from './constants'

const COMMENT_RE = /<!--[\s\S]*?-->/g
const TAG_RE = /<[^>]*>/g
const ENTITY_RE = /&(?:#(\d+)|#x([\da-f]+)|(amp|lt|gt|quot|apos|nbsp));/gi
const NAMED_ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: '\'', nbsp: '\u00A0' }
const IMG_TAG_RE = /<img\b[^>]*>/gi
const SRC_RE = /\bsrc="([^"]*)"/i
const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
}

/**
 * Bumped when the pipeline changes what it draws for the same input, so cards
 * cached by an older version are not reused.
 */
const CACHE_VERSION = '1'

/** Drops the comment markers Vue SSR leaves in its output; satori has no use for them. */
export function stripComments(html: string): string {
  return html.replace(COMMENT_RE, '')
}

/** The text a card shows: the HTML without tags and with its entities decoded. */
export function textContent(html: string): string {
  return decodeEntities(html.replace(TAG_RE, ' '))
}

function decodeEntities(text: string): string {
  return text.replace(ENTITY_RE, (match, decimal?: string, hex?: string, name?: string) => {
    if (decimal || hex) {
      return String.fromCodePoint(Number.parseInt(decimal ?? hex!, decimal ? 10 : 16))
    }
    return NAMED_ENTITIES[name!.toLowerCase()] ?? match
  })
}

interface HtmlNode {
  props?: { children?: unknown }
}

/** satori-html keeps text as Vue SSR escaped it, so `&` would be drawn as `&amp;`. */
export function decodeTextNodes<T>(node: T): T {
  const decode = (child: unknown): unknown => typeof child === 'string' ? decodeEntities(child) : decodeTextNodes(child)
  const props = (node as HtmlNode | null)?.props
  if (props && 'children' in props) {
    props.children = Array.isArray(props.children) ? props.children.map(decode) : decode(props.children)
  }
  return node
}

/**
 * Inlines site-internal images. A template refers to them with a path that
 * starts with `/`, like in a page: it is read from the public folder, then from
 * the site root. Remote and `data:` URLs stay as they are.
 */
export async function inlineLocalImages(
  html: string,
  directories: readonly string[],
): Promise<string> {
  const replacements = new Map<string, string>()
  for (const tag of html.match(IMG_TAG_RE) ?? []) {
    const src = SRC_RE.exec(tag)?.[1]
    if (!src || !src.startsWith('/') || src.startsWith('//') || replacements.has(src)) {
      continue
    }
    replacements.set(src, await readLocalImage(decodeAmpersands(src), directories))
  }

  return html.replace(IMG_TAG_RE, tag => tag.replace(SRC_RE, (match, src: string) => {
    const dataUri = replacements.get(src)
    return dataUri ? `src="${dataUri}"` : match
  }))
}

async function readLocalImage(src: string, directories: readonly string[]): Promise<string> {
  const mime = MIME_TYPES[extname(src).toLowerCase()]
  if (!mime) {
    throw new Error(`KawaPress OG Image: unsupported image type ${JSON.stringify(src)}. Use PNG, JPEG, GIF, WebP or SVG.`)
  }
  for (const directory of directories) {
    const file = resolve(directory, `.${src}`)
    if (!file.startsWith(directory + sep)) {
      continue
    }
    try {
      const data = await readFile(file)
      return `data:${mime};base64,${data.toString('base64')}`
    }
    catch {
      // Try the next folder.
    }
  }
  throw new Error(`KawaPress OG Image: image ${JSON.stringify(src)} used in the template was not found in the public folder or the site root.`)
}

function decodeAmpersands(value: string): string {
  return value.replace(/&amp;/g, '&')
}

export function cacheKey(html: string, fontsDigest: string): string {
  return createHash('sha256')
    .update(`${CACHE_VERSION}\0${OG_IMAGE_WIDTH}x${OG_IMAGE_HEIGHT}\0${fontsDigest}\0${html}`)
    .digest('hex')
}

export async function renderPng(html: string, fonts: readonly SatoriFont[]): Promise<Uint8Array> {
  // satori-html returns a satori-compatible node tree; its type is looser than satori's.
  const node = decodeTextNodes(parseHtml(html)) as unknown as Parameters<typeof satori>[0]
  const svg = await satori(node, {
    width: OG_IMAGE_WIDTH,
    height: OG_IMAGE_HEIGHT,
    fonts: [...fonts],
  })
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: OG_IMAGE_WIDTH },
    // satori draws text as paths, so resvg needs no fonts; scanning the system fonts costs ~0.5s per card.
    font: { loadSystemFonts: false },
  })
  return resvg.render().asPng()
}

export interface CardCache {
  get: (key: string) => Promise<Uint8Array | undefined>
  set: (key: string, png: Uint8Array) => Promise<void>
}

export function createCardCache(directory: string): CardCache {
  return {
    async get(key) {
      try {
        return await readFile(join(directory, `${key}.png`))
      }
      catch {
        return undefined
      }
    },
    async set(key, png) {
      await mkdir(directory, { recursive: true })
      // Written aside and moved in, so an interrupted build never leaves half a PNG behind.
      const temporary = join(directory, `${key}.${process.pid}.tmp`)
      await writeFile(temporary, png)
      await rename(temporary, join(directory, `${key}.png`))
    },
  }
}
