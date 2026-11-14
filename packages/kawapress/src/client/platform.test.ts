// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { PLATFORM_DETECTION_SCRIPT } from './platform'

afterEach(() => {
  delete document.documentElement.dataset.kawaPlatform
  vi.unstubAllGlobals()
})

describe('platform detection script', () => {
  it.each([
    ['MacIntel', 'apple'],
    ['iPhone', 'apple'],
    ['Win32', 'control'],
    ['Linux x86_64', 'control'],
  ])('marks %s as %s', (platform, expected) => {
    vi.stubGlobal('navigator', { platform, userAgent: '' })
    // eslint-disable-next-line no-new-func
    new Function(PLATFORM_DETECTION_SCRIPT)()
    expect(document.documentElement.dataset.kawaPlatform).toBe(expected)
  })
})
