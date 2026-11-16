import { describe, expect, it } from 'vitest'
import { canonicalRoutePath } from './route-path'

describe('canonicalRoutePath', () => {
  it.each([
    ['/guide/', '/guide'],
    ['/guide//', '/guide'],
    ['/guide', '/guide'],
    ['/', '/'],
    ['//', '/'],
    ['/guide/intro/', '/guide/intro'],
  ])('maps %s to %s', (path, canonical) => {
    expect(canonicalRoutePath(path)).toBe(canonical)
  })
})
