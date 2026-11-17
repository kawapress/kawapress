import type { HeadConfig } from 'kawapress'
import { describe, expect, it } from 'vitest'
import { resolveFaviconLinks } from './favicon'

describe('resolveFaviconLinks', () => {
  it('uses the logo as the favicon by default', () => {
    expect(resolveFaviconLinks('/logo.svg', '/docs/')).toEqual([
      { id: 'nagi-favicon', rel: 'icon', href: '/docs/logo.svg' },
    ])
    expect(resolveFaviconLinks({ light: '/light.svg', dark: '/dark.svg' }, '/')).toEqual([
      { id: 'nagi-favicon-light', rel: 'icon', href: '/light.svg', media: '(prefers-color-scheme: light)' },
      { id: 'nagi-favicon-dark', rel: 'icon', href: '/dark.svg', media: '(prefers-color-scheme: dark)' },
    ])
    expect(resolveFaviconLinks(undefined, '/')).toEqual([])
  })

  it('leaves the favicon to an icon declared in any head', () => {
    const icon: HeadConfig[] = [['link', { rel: 'icon', href: '/favicon.svg' }]]

    expect(resolveFaviconLinks('/logo.svg', '/', [icon, [], []])).toEqual([])
    expect(resolveFaviconLinks('/logo.svg', '/', [[], icon, []])).toEqual([])
    expect(resolveFaviconLinks('/logo.svg', '/', [[], [], icon])).toEqual([])
    expect(resolveFaviconLinks('/logo.svg', '/', [[['link', { rel: 'Shortcut Icon', href: '/favicon.ico' }]]])).toEqual([])
  })

  it('keeps the logo favicon next to unrelated head links', () => {
    expect(resolveFaviconLinks('/logo.svg', '/', [[
      ['link', { rel: 'apple-touch-icon', href: '/touch.png' }],
      ['link', { rel: 'stylesheet', href: '/a.css' }],
      ['meta', { name: 'icon', content: 'x' }],
    ]])).toHaveLength(1)
  })
})
