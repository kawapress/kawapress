import type { HeadConfig } from 'kawapress'
import type { ResolvedAnalyticsOptions } from './options'

/**
 * `<head>` tags of every configured service. All scripts are `async` or
 * `defer`, so none of them blocks rendering.
 */
export function createAnalyticsHead(options: ResolvedAnalyticsOptions): HeadConfig[] {
  const head: HeadConfig[] = []

  if (options.google) {
    const { id } = options.google
    head.push(
      ['script', { async: true, src: `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}` }],
      // `send_page_view: false`: the runtime plugin sends every page_view, the
      // first page included, so a visit is never counted twice.
      ['script', {}, `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config',${JSON.stringify(id)},{send_page_view:false})`],
    )
  }

  if (options.plausible) {
    head.push(['script', { 'defer': true, 'data-domain': options.plausible.domain, 'src': options.plausible.src }])
  }

  if (options.umami) {
    head.push(['script', { 'defer': true, 'src': options.umami.src, 'data-website-id': options.umami.websiteId }])
  }

  if (options.cloudflare) {
    head.push(['script', {
      'defer': true,
      'src': 'https://static.cloudflareinsights.com/beacon.min.js',
      'data-cf-beacon': JSON.stringify({ token: options.cloudflare.token, spa: true }),
    }])
  }

  return head
}
