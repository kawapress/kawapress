import { describe, expect, it } from 'vitest'
import { createOgImageHead, hasOgImage, imageUrl, resolveHostname, routeToImagePath } from './head'

describe('resolveHostname', () => {
  it('appends the base and keeps a trailing slash', () => {
    expect(resolveHostname('https://example.com', '/')).toBe('https://example.com/')
    expect(resolveHostname('https://example.com/', '/docs/')).toBe('https://example.com/docs/')
  })

  it('does not repeat a base the hostname already has', () => {
    expect(resolveHostname('https://example.com/docs', '/docs/')).toBe('https://example.com/docs/')
  })

  it('rejects hostnames that are not absolute http(s) addresses', () => {
    expect(() => resolveHostname('example.com', '/')).toThrow('absolute URL')
    expect(() => resolveHostname('ftp://example.com', '/')).toThrow('http or https')
  })
})

describe('routeToImagePath', () => {
  it('maps routes to PNG files under og/', () => {
    expect(routeToImagePath('/')).toBe('og/index.png')
    expect(routeToImagePath('/guide/intro')).toBe('og/guide/intro.png')
    expect(routeToImagePath('/en/')).toBe('og/en.png')
  })

  it('percent-encodes each segment of the public URL', () => {
    expect(imageUrl('https://example.com/', 'og/指南/a b.png')).toBe(
      'https://example.com/og/%E6%8C%87%E5%8D%97/a%20b.png',
    )
  })
})

describe('hasOgImage', () => {
  it('finds og:image in any head source', () => {
    expect(hasOgImage(undefined, [], [['meta', { property: 'og:image', content: 'x' }]])).toBe(true)
    expect(hasOgImage([['meta', { name: 'og:image', content: 'x' }]])).toBe(true)
  })

  it('ignores other tags', () => {
    expect(hasOgImage([['meta', { property: 'og:title', content: 'x' }], ['link', { rel: 'icon', href: '/a.png' }]])).toBe(false)
  })
})

describe('createOgImageHead', () => {
  it('writes the card size and the twitter tags', () => {
    expect(createOgImageHead('https://example.com/og/a.png')).toEqual([
      ['meta', { property: 'og:image', content: 'https://example.com/og/a.png' }],
      ['meta', { property: 'og:image:width', content: '1200' }],
      ['meta', { property: 'og:image:height', content: '630' }],
      ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
      ['meta', { name: 'twitter:image', content: 'https://example.com/og/a.png' }],
    ])
  })
})
