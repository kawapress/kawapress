import { describe, expect, it } from 'vitest'
import { PLAUSIBLE_DEFAULT_SRC, resolveAnalyticsOptions } from './options'

describe('analytics options', () => {
  it('fills in the Plausible script address', () => {
    expect(resolveAnalyticsOptions({ plausible: { domain: 'example.com' } })).toEqual({
      plausible: { domain: 'example.com', src: PLAUSIBLE_DEFAULT_SRC },
      dev: false,
    })
  })

  it('accepts several services at once', () => {
    const resolved = resolveAnalyticsOptions({
      google: { id: 'G-TEST123' },
      umami: { websiteId: 'site-id', src: 'https://umami.example.com/script.js' },
      cloudflare: { token: 'token' },
      dev: true,
    })
    expect(Object.keys(resolved).sort()).toEqual(['cloudflare', 'dev', 'google', 'umami'])
    expect(resolved.dev).toBe(true)
  })

  it('requires at least one service', () => {
    expect(() => resolveAnalyticsOptions({})).toThrow(/at least one/)
    expect(() => resolveAnalyticsOptions({ dev: true })).toThrow(/at least one/)
    expect(() => resolveAnalyticsOptions(undefined)).toThrow(/at least one service/)
  })

  it('names the Google option that is wrong', () => {
    expect(() => resolveAnalyticsOptions({ google: { id: '' } })).toThrow(/"google.id"/)
    expect(() => resolveAnalyticsOptions({ google: { id: 'TEST123' } })).toThrow(/"G-XXXXXXX"/)
    expect(() => resolveAnalyticsOptions({ google: { id: 'UA-123-1' } })).toThrow(/Universal Analytics/)
  })

  it('names the other options that are wrong', () => {
    expect(() => resolveAnalyticsOptions({ plausible: { domain: 'https://example.com/' } }))
      .toThrow(/"plausible.domain"/)
    expect(() => resolveAnalyticsOptions({ plausible: { domain: 'example.com', src: 'nope' } }))
      .toThrow(/"plausible.src"/)
    expect(() => resolveAnalyticsOptions({ umami: { websiteId: 'id' } as never }))
      .toThrow(/"umami.src"/)
    expect(() => resolveAnalyticsOptions({ umami: { websiteId: '', src: 'https://a.test/s.js' } }))
      .toThrow(/"umami.websiteId"/)
    expect(() => resolveAnalyticsOptions({ cloudflare: { token: ' ' } }))
      .toThrow(/"cloudflare.token"/)
    expect(() => resolveAnalyticsOptions({ plausible: { domain: 'a.test' }, dev: 'yes' as never }))
      .toThrow(/"dev"/)
  })
})
