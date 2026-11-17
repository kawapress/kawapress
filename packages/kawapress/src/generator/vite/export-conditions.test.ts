import { describe, expect, it } from 'vitest'
import { customConditions, findExportConditions } from './export-conditions'

describe('findExportConditions', () => {
  it('names the condition that leads to each build of a subpath', () => {
    const exportsField = {
      '.': { source: './src/index.ts', types: './dist/index.d.ts', import: './dist/index.js' },
    }

    expect(findExportConditions(exportsField, '.', 'src/index.ts')).toEqual([['source']])
    expect(findExportConditions(exportsField, '.', 'dist/index.js')).toEqual([['import']])
    expect(findExportConditions(exportsField, '.', 'dist/other.js')).toEqual([])
  })

  it('follows nested conditions and arrays', () => {
    const exportsField = {
      '.': {
        browser: { import: './dist/browser.mjs' },
        default: ['./dist/index.mjs'],
      },
    }

    expect(findExportConditions(exportsField, '.', 'dist/browser.mjs')).toEqual([['browser', 'import']])
    expect(findExportConditions(exportsField, '.', 'dist/index.mjs')).toEqual([['default']])
  })

  it('reads a root-only `exports` string or condition object', () => {
    expect(findExportConditions('./index.js', '.', 'index.js')).toEqual([[]])
    expect(findExportConditions({ browser: './b.js', default: './n.js' }, '.', 'b.js')).toEqual([['browser']])
    expect(findExportConditions('./index.js', './other', 'index.js')).toEqual([])
  })

  it('expands the subpath pattern with the longest prefix', () => {
    const exportsField = {
      './*': { import: './dist/*.js' },
      './components/*': { source: './src/components/*.vue', import: './dist/components/*.js' },
    }

    expect(findExportConditions(exportsField, './components/Button', 'src/components/Button.vue'))
      .toEqual([['source']])
    expect(findExportConditions(exportsField, './utils', 'dist/utils.js')).toEqual([['import']])
  })
})

describe('customConditions', () => {
  it('keeps only the conditions a site has to configure itself', () => {
    expect(customConditions(['source'])).toEqual(['source'])
    expect(customConditions(['browser', 'import'])).toEqual([])
    expect(customConditions(['node', 'module', 'default', 'production'])).toEqual([])
  })
})
