const TRAILING_SLASH_RE = /\/+$/

/**
 * Joins `hostname` and the site `base` into the address every feed link starts
 * from. `base` is the value KawaPress resolved: it starts and ends with `/`.
 * A `hostname` that already carries `base` is not extended twice.
 */
export function resolveFeedHostname(hostname: unknown, base: string): string {
  if (typeof hostname !== 'string' || hostname === '') {
    throw new TypeError('KawaPress Feed: the "hostname" option is required, for example "https://example.com".')
  }
  let url: URL
  try {
    url = new URL(hostname)
  }
  catch {
    throw new TypeError(`KawaPress Feed: hostname must be an absolute http or https address, received ${JSON.stringify(hostname)}.`)
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new TypeError(`KawaPress Feed: hostname must use http or https, received ${JSON.stringify(hostname)}.`)
  }

  const hostPath = `${url.pathname.replace(TRAILING_SLASH_RE, '')}/`
  url.pathname = hostPath === base || base === '/'
    ? hostPath
    : `${hostPath.replace(TRAILING_SLASH_RE, '')}${base}`
  url.search = ''
  url.hash = ''
  return url.href
}
