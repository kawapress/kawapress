import { withoutBase } from 'kawapress/client'

const HTML_EXTENSION_RE = /\.html$/i
const INDEX_PAGE_RE = /\/index$/i
const URL_PARSE_ORIGIN = 'https://kawapress.invalid'

/**
 * Link of a search hit inside this site: the path, query, and hash of the URL
 * the crawler stored, with `.html` and `/index` removed so it names the route
 * of the page. The origin is dropped on purpose, because the index usually
 * holds the production domain while the site may run anywhere.
 */
export function toSiteHref(url: string, base: string): string {
  const { pathname, search, hash } = new URL(url, URL_PARSE_ORIGIN)
  let path = pathname.replace(HTML_EXTENSION_RE, '').replace(INDEX_PAGE_RE, '/')
  if (path.length > 1 && path.endsWith('/') && path !== siteRoot(base)) {
    path = path.slice(0, -1)
  }
  return `${path}${search}${hash}`
}

/**
 * Router location of a site href, or `undefined` when the href points outside
 * the site base.
 */
export function toRouterLocation(href: string, base: string): string | undefined {
  const { pathname, search, hash } = new URL(href, URL_PARSE_ORIGIN)
  const path = withoutBase(decodePathname(pathname), base)
  return path === undefined ? undefined : `${path}${search}${hash}`
}

function siteRoot(base: string): string {
  const trimmed = base.split('/').filter(Boolean).join('/')
  return trimmed ? `/${trimmed}/` : '/'
}

function decodePathname(pathname: string): string {
  try {
    return decodeURI(pathname)
  }
  catch {
    return pathname
  }
}
