import { describe, expect, it } from 'vitest'
import { parseCodeSnippet } from './code-snippet'

describe('parseCodeSnippet', () => {
  it('reads a bare path', () => {
    expect(parseCodeSnippet('./demo.ts')).toEqual({ path: './demo.ts' })
  })

  it('reads the region, highlighted lines, language, attributes and title', () => {
    expect(parseCodeSnippet('@/snippets/demo.ts#setup{1,3-5 js:line-numbers :no-copy} [Setup]'))
      .toEqual({
        path: '@/snippets/demo.ts',
        region: 'setup',
        highlight: '1,3-5',
        lang: 'js:line-numbers',
        attrs: ':no-copy',
        title: 'Setup',
      })
  })

  it('reads a language without highlighted lines', () => {
    expect(parseCodeSnippet('./demo.txt{ts}')).toEqual({ path: './demo.txt', lang: 'ts' })
  })

  it('keeps spaces inside a title', () => {
    expect(parseCodeSnippet('./demo.ts [My demo file]'))
      .toEqual({ path: './demo.ts', title: 'My demo file' })
  })

  it('rejects braces with more parts than it understands', () => {
    expect(parseCodeSnippet('./demo.ts{1 ts a b}')).toBeUndefined()
  })

  it('rejects an empty path', () => {
    expect(parseCodeSnippet('#region')).toBeUndefined()
  })
})
