import { describe, expect, it } from 'vitest'
import { rewriteRelativeAssetUrls } from './asset-urls'

describe('rewriteRelativeAssetUrls', () => {
  const directory = '/repo/packages/core'

  it('points relative image, video and source URLs at the source directory', () => {
    const html = '<p><img src="./logo.png" alt="logo"><img alt="up" src="../shared/a.svg?raw#x"></p>'
      + '<video src="./clip.mp4" poster="./poster.png"><source src="./clip.webm"></video>'

    expect(rewriteRelativeAssetUrls(html, directory)).toBe(
      '<p><img src="/@fs/repo/packages/core/logo.png" alt="logo"><img alt="up" src="/@fs/repo/packages/shared/a.svg?raw#x"></p>'
      + '<video src="/@fs/repo/packages/core/clip.mp4" poster="/@fs/repo/packages/core/poster.png"><source src="/@fs/repo/packages/core/clip.webm"></video>',
    )
  })

  it('leaves absolute, remote, data and bare URLs and every link alone', () => {
    const html = '<img src="/public.png"><img src="https://example.com/a.png"><img src="data:image/png;base64,AA">'
      + '<img src="bare.png"><a href="./other.md">other</a>'

    expect(rewriteRelativeAssetUrls(html, directory)).toBe(html)
  })

  it('does not touch text that only looks like a tag', () => {
    const html = '<pre><code>&lt;img src="./logo.png"&gt;</code></pre>'

    expect(rewriteRelativeAssetUrls(html, directory)).toBe(html)
  })
})
