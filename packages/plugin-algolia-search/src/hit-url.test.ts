import { describe, expect, it } from 'vitest'
import { toRouterLocation, toSiteHref } from './hit-url'

describe('hit urls', () => {
  it.each([
    ['https://docs.example.com/guide/start.html#install', '/', '/guide/start#install'],
    ['https://docs.example.com/guide/index.html', '/', '/guide'],
    ['https://docs.example.com/guide/', '/', '/guide'],
    ['https://docs.example.com/index.html', '/', '/'],
    ['https://docs.example.com/', '/', '/'],
    ['/guide/start?tab=a#top', '/', '/guide/start?tab=a#top'],
    ['https://example.com/docs/index.html', '/docs/', '/docs/'],
    ['https://example.com/docs/', '/docs/', '/docs/'],
    ['https://example.com/docs/guide.html', '/docs/', '/docs/guide'],
  ])('turns %s under base %s into %s', (url, base, href) => {
    expect(toSiteHref(url, base)).toBe(href)
  })

  it('maps a site href to the router location without the base', () => {
    expect(toRouterLocation('/docs/guide/start#install', '/docs/')).toBe('/guide/start#install')
    expect(toRouterLocation('/docs/', '/docs/')).toBe('/')
    expect(toRouterLocation('/guide/%E4%B8%AD%E6%96%87', '/')).toBe('/guide/中文')
  })

  it('leaves hrefs outside the base to the browser', () => {
    expect(toRouterLocation('/blog/post', '/docs/')).toBeUndefined()
  })
})
