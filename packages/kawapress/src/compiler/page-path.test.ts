import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { markdownFileToPagePath, markdownFileToRoutePath, resolvePagePathRewriter } from './page-path'

describe('resolvePagePathRewriter', () => {
  it('keeps every path when there are no rewrites', () => {
    expect(resolvePagePathRewriter(undefined)('/guide/a.md')).toBe('/guide/a.md')
    expect(resolvePagePathRewriter({})('/guide/a.md')).toBe('/guide/a.md')
  })

  it('applies the first rule that matches, written like VitePress rules', () => {
    const rewrite = resolvePagePathRewriter({
      'packages/core/src/index.md': 'core.md',
      'packages/:pkg/src/:page*': ':pkg/:page*',
    })

    expect(rewrite('/packages/core/src/index.md')).toBe('/core.md')
    expect(rewrite('/packages/theme/src/deep/intro.md')).toBe('/theme/deep/intro.md')
    expect(rewrite('/guide/a.md')).toBe('/guide/a.md')
  })

  it('reads a rule that starts with ^ as a regular expression', () => {
    const rewrite = resolvePagePathRewriter({ '^docs/(.*)': ':0' })

    expect(rewrite('/docs/guide/a.md')).toBe('/guide/a.md')
  })

  it('takes the path a function returns, and keeps the page when it returns nothing', () => {
    const rewrite = resolvePagePathRewriter(id => (
      id.startsWith('old/') ? id.slice('old/'.length) : undefined
    ))

    expect(rewrite('/old/a.md')).toBe('/a.md')
    expect(rewrite('/b.md')).toBe('/b.md')
  })
})

describe('markdownFileToRoutePath', () => {
  const sourceRoot = join('/site', 'src')

  it('turns a file into the route it is served at', () => {
    expect(markdownFileToRoutePath(join(sourceRoot, 'index.md'), sourceRoot)).toBe('/')
    expect(markdownFileToRoutePath(join(sourceRoot, 'guide/intro.md'), sourceRoot))
      .toBe('/guide/intro')
  })

  it('follows rewrites', () => {
    const rewrites = { 'packages/:pkg/src/:page*': ':pkg/:page*' }
    const file = join(sourceRoot, 'packages/core/src/intro.md')

    expect(markdownFileToPagePath(file, sourceRoot, rewrites)).toBe('/core/intro.md')
    expect(markdownFileToRoutePath(file, sourceRoot, rewrites)).toBe('/core/intro')
  })
})
