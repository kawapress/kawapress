import { describe, expect, it } from 'vitest'
import { createDocSearchConfig } from './docsearch-config'
import { resolveAlgoliaSearchOptions } from './options'

describe('docsearch config', () => {
  it('filters every index by the language of the page', () => {
    const options = resolveAlgoliaSearchOptions({
      appId: 'APP',
      apiKey: 'key',
      indices: ['docs', { name: 'blog', searchParameters: { hitsPerPage: 3 } }],
      searchParameters: { facetFilters: ['version:v2', 'lang:fr'] },
    })

    expect(createDocSearchConfig(options, 'root', 'zh-CN').indices).toEqual([
      {
        name: 'docs',
        searchParameters: { facetFilters: ['version:v2', 'lang:zh-CN'] },
      },
      {
        name: 'blog',
        searchParameters: { hitsPerPage: 3, facetFilters: ['version:v2', 'lang:zh-CN'] },
      },
    ])
  })

  it('accepts a single facet filter string', () => {
    const options = resolveAlgoliaSearchOptions({
      appId: 'APP',
      apiKey: 'key',
      indexName: 'docs',
      searchParameters: { facetFilters: 'version:v2' },
    })

    expect(createDocSearchConfig(options, 'root', 'en').indices[0].searchParameters)
      .toEqual({ facetFilters: ['version:v2', 'lang:en'] })
  })

  it('uses the overrides of the current locale', () => {
    const options = resolveAlgoliaSearchOptions({
      appId: 'APP',
      apiKey: 'key',
      indexName: 'docs',
      placeholder: 'Search',
      locales: { zh: { placeholder: '搜索', indexName: 'docs-zh' } },
    })

    const config = createDocSearchConfig(options, 'zh', 'zh-CN')
    expect(config).toMatchObject({
      appId: 'APP',
      apiKey: 'key',
      placeholder: '搜索',
      keyboardShortcuts: { 'Ctrl/Cmd+K': true, '/': true },
    })
    expect(config.indices.map(index => index.name)).toEqual(['docs-zh'])
    expect(config).not.toHaveProperty('locales')
  })
})
