// @vitest-environment happy-dom

import { afterEach, describe, expect, it } from 'vitest'
import { createAppearanceInitializerScript } from './appearance'

function runInitializer(fallback: 'light' | 'dark' | undefined): string {
  // eslint-disable-next-line no-new-func
  new Function(createAppearanceInitializerScript(fallback))()
  return document.documentElement.className
}

afterEach(() => {
  window.localStorage.clear()
  document.documentElement.className = ''
})

describe('appearance initializer', () => {
  it('leaves the root alone without a saved choice or a site default', () => {
    expect(runInitializer(undefined)).toBe('')
  })

  it('applies the site default before the reader picks one', () => {
    expect(runInitializer('dark')).toBe('dark')
  })

  it('prefers the saved choice over the site default', () => {
    window.localStorage.setItem('kawapress:appearance', 'light')

    expect(runInitializer('dark')).toBe('light')
  })
})
