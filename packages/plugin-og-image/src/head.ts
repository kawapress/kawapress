import type { HeadConfig } from 'kawapress'
import { OG_IMAGE_DIR, OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH } from './constants'

const TRAILING_SLASH_RE = /\/+$/
const EDGE_SLASH_RE = /^\/+|\/+$/g

/** Joins `hostname` and the site `base` (always `/…/`), without repeating a `base` that `hostname` already has. */
export function resolveHostname(hostname: string, base: string): string {
  let url: URL
  try {
    url = new URL(hostname)
  }
  catch {
    throw new Error(`KawaPress OG Image: hostname must be an absolute URL, received ${JSON.stringify(hostname)}.`)
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error(`KawaPress OG Image: hostname must use http or https, received ${JSON.stringify(hostname)}.`)
  }

  const hostPath = `${url.pathname.replace(TRAILING_SLASH_RE, '')}/`
  url.pathname = hostPath === base || base === '/'
    ? hostPath
    : `${hostPath.replace(TRAILING_SLASH_RE, '')}${base}`
  url.search = ''
  url.hash = ''
  return url.href
}

/** Output path of the card of a route, relative to the output directory: `/guide/intro` becomes `og/guide/intro.png`. */
export function routeToImagePath(routePath: string): string {
  const trimmed = routePath.replace(EDGE_SLASH_RE, '')
  return `${OG_IMAGE_DIR}/${trimmed || 'index'}.png`
}

export function imageUrl(hostname: string, imagePath: string): string {
  return hostname + imagePath.split('/').map(encodeURIComponent).join('/')
}

function isOgImageTag(tag: HeadConfig): boolean {
  const [name, attrs] = tag
  return name === 'meta' && (attrs.property === 'og:image' || attrs.name === 'og:image')
}

export function hasOgImage(...sources: ReadonlyArray<readonly HeadConfig[] | undefined>): boolean {
  return sources.some(head => head?.some(isOgImageTag))
}

export function createOgImageHead(url: string): HeadConfig[] {
  return [
    ['meta', { property: 'og:image', content: url }],
    ['meta', { property: 'og:image:width', content: String(OG_IMAGE_WIDTH) }],
    ['meta', { property: 'og:image:height', content: String(OG_IMAGE_HEIGHT) }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:image', content: url }],
  ]
}
