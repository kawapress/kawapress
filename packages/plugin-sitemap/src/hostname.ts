const TRAILING_SLASH_RE = /\/+$/

/**
 * 把 `hostname` 与站点 `base` 合并为 sitemap 的基地址。`base` 是 KawaPress
 * 解析后的值，总是以 `/` 开头和结尾。
 * 如果 `hostname` 已经包含 `base`，则不会重复追加。
 */
export function resolveSitemapHostname(hostname: string, base: string): string {
  const url = new URL(hostname)
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error(`KawaPress Sitemap: hostname must use http or https, received ${JSON.stringify(hostname)}.`)
  }

  const hostPath = `${url.pathname.replace(TRAILING_SLASH_RE, '')}/`
  url.pathname = hostPath === base || base === '/'
    ? hostPath
    : `${hostPath.replace(TRAILING_SLASH_RE, '')}${base}`
  url.search = ''
  url.hash = ''
  return url.href
}
