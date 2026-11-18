import type { PackageResolutionMismatch } from './resolution-check'
import { describe, expect, it } from 'vitest'
import { formatResolutionWarning } from './resolution-check'

function mismatch(
  specifier: string,
  client: string[] | undefined,
  ssr: string[] | undefined,
): PackageResolutionMismatch['imports'][number] {
  return {
    specifier,
    client: { file: 'client.js', conditions: client },
    ssr: { file: 'ssr.js', conditions: ssr },
  }
}

describe('formatResolutionWarning', () => {
  it('says nothing without mismatches', () => {
    expect(formatResolutionWarning([])).toBeUndefined()
  })

  it('suggests SSR conditions for conditions only the client uses', () => {
    const warning = formatResolutionWarning([
      { packageName: 'lib', imports: [mismatch('lib', ['source'], ['import'])] },
    ])!
    expect(warning).toContain(`vite: { ssr: { resolve: { conditions: ['source'] } } }`)
    expect(warning).not.toContain('resolve.alias')
  })

  it('suggests client conditions for conditions only SSR uses', () => {
    const warning = formatResolutionWarning([
      { packageName: 'lib', imports: [mismatch('lib', ['import'], ['server-build'])] },
    ])!
    expect(warning).toContain(`vite: { resolve: { conditions: ['server-build', 'module', 'browser', 'development|production'] } }`)
  })

  it('keeps every hint when packages differ for different reasons', () => {
    const warning = formatResolutionWarning([
      { packageName: 'a', imports: [mismatch('a', ['source'], ['import'])] },
      { packageName: 'b', imports: [mismatch('b', ['import'], ['server-build'])] },
      { packageName: 'c', imports: [mismatch('c', undefined, undefined)] },
    ])!
    expect(warning).toContain(`conditions: ['source']`)
    expect(warning).toContain(`conditions: ['server-build',`)
    expect(warning).toContain('For imports without a differing condition, check `resolve.alias`')
  })

  it('points at aliases and plugins when no condition explains the difference', () => {
    const warning = formatResolutionWarning([
      { packageName: 'lib', imports: [mismatch('lib', undefined, ['import'])] },
    ])!
    expect(warning).toContain('No export condition explains the difference')
    expect(warning).toContain('"lib": client client.js, SSR ssr.js (\'import\')')
  })

  it('summarises imports past the first three', () => {
    const warning = formatResolutionWarning([{
      packageName: 'lib',
      imports: ['lib', 'lib/a', 'lib/b', 'lib/c', 'lib/d'].map(specifier =>
        mismatch(specifier, ['source'], ['import'])),
    }])!
    expect(warning).toContain('"lib/b"')
    expect(warning).not.toContain('"lib/c"')
    expect(warning).toContain('… and 2 more imports')
  })
})
