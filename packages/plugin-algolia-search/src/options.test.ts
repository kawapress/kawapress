import type { AlgoliaSearchPluginOptions } from './options'
import { describe, expect, it } from 'vitest'
import { mergeLocaleOptions, resolveAlgoliaSearchOptions } from './options'

const REQUIRED = { appId: 'APP', apiKey: 'search-key', indexName: 'docs' }

describe('algolia search options', () => {
  it('folds indexName into indices and turns both shortcuts on', () => {
    expect(resolveAlgoliaSearchOptions(REQUIRED)).toEqual({
      appId: 'APP',
      apiKey: 'search-key',
      indices: ['docs'],
      keyboardShortcuts: { 'Ctrl/Cmd+K': true, '/': true },
      locales: {},
    })
  })

  it('keeps an explicit indices list and the optional settings', () => {
    const resolved = resolveAlgoliaSearchOptions({
      appId: 'APP',
      apiKey: 'search-key',
      indices: [{ name: 'docs', searchParameters: { hitsPerPage: 5 } }],
      placeholder: 'Search docs',
      keyboardShortcuts: { '/': false },
    })

    expect(resolved.indices).toEqual([{ name: 'docs', searchParameters: { hitsPerPage: 5 } }])
    expect(resolved.placeholder).toBe('Search docs')
    expect(resolved.keyboardShortcuts).toEqual({ 'Ctrl/Cmd+K': true, '/': false })
  })

  it.each([
    [{ ...REQUIRED, appId: '' }, /"appId"/],
    [{ ...REQUIRED, apiKey: undefined }, /"apiKey"/],
    [{ appId: 'APP', apiKey: 'key' }, /needs "indexName" or a non-empty "indices"/],
    [{ ...REQUIRED, indexName: undefined, indices: [] }, /needs "indexName"/],
    [{ ...REQUIRED, indexName: undefined, indices: [{ name: '' }] }, /indices\[0\]/],
  ])('rejects incomplete options %#', (options, message) => {
    expect(() => resolveAlgoliaSearchOptions(options as AlgoliaSearchPluginOptions)).toThrow(message)
  })

  it('rejects options that cannot reach the browser as JSON', () => {
    expect(() => resolveAlgoliaSearchOptions({
      ...REQUIRED,
      transformItems: (items: unknown[]) => items,
    } as AlgoliaSearchPluginOptions)).toThrow(/unsupported option "transformItems"/)
  })

  it('merges locale overrides over the site options', () => {
    const resolved = resolveAlgoliaSearchOptions({
      ...REQUIRED,
      placeholder: 'Search docs',
      searchParameters: { hitsPerPage: 5 },
      locales: {
        zh: { placeholder: '搜索文档' },
        fr: { indices: ['docs-fr'] },
      },
    })

    expect(mergeLocaleOptions(resolved, 'root')).toEqual({
      indices: ['docs'],
      placeholder: 'Search docs',
      searchParameters: { hitsPerPage: 5 },
    })
    expect(mergeLocaleOptions(resolved, 'zh')).toEqual({
      indices: ['docs'],
      placeholder: '搜索文档',
      searchParameters: { hitsPerPage: 5 },
    })
    expect(mergeLocaleOptions(resolved, 'fr').indices).toEqual(['docs-fr'])
  })

  it('rejects unknown keys inside a locale', () => {
    expect(() => resolveAlgoliaSearchOptions({
      ...REQUIRED,
      locales: { zh: { appId: 'OTHER' } as never },
    })).toThrow(/"locales.zh" has unsupported option "appId"/)
  })
})
