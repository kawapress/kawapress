import type { AlgoliaIndex, AlgoliaSearchParameters, ResolvedAlgoliaSearchOptions } from './options'
import { mergeLocaleOptions } from './options'

/** The JSON part of the `@docsearch/js` props for one locale. */
export interface DocSearchConfig {
  appId: string
  apiKey: string
  indices: Required<AlgoliaIndex>[]
  keyboardShortcuts: ResolvedAlgoliaSearchOptions['keyboardShortcuts']
  placeholder?: string
  translations?: Record<string, unknown>
  maxResultsPerGroup?: number
  disableUserPersonalization?: boolean
  insights?: boolean
  facets?: { key: string, label?: string }[]
  resultBadgeKey?: string
}

/**
 * DocSearch props for the current locale. Every index gets the shared search
 * parameters and a `lang:<lang>` facet filter, so a multilingual index only
 * answers in the language of the page, the same way VitePress does it.
 */
export function createDocSearchConfig(
  options: ResolvedAlgoliaSearchOptions,
  localeIndex: string,
  lang: string | undefined,
): DocSearchConfig {
  const { indices, searchParameters, ...locale } = mergeLocaleOptions(options, localeIndex)
  return {
    ...locale,
    appId: options.appId,
    apiKey: options.apiKey,
    keyboardShortcuts: options.keyboardShortcuts,
    indices: indices.map((index) => {
      const { name, searchParameters: own } = typeof index === 'string' ? { name: index } : index
      return {
        name,
        searchParameters: withLanguageFilter({ ...searchParameters, ...own }, lang),
      }
    }),
  }
}

function withLanguageFilter(
  parameters: AlgoliaSearchParameters,
  lang: string | undefined,
): AlgoliaSearchParameters {
  if (!lang) {
    return parameters
  }
  const raw = parameters.facetFilters
  const existing = raw === undefined ? [] : Array.isArray(raw) ? raw : [raw]
  return {
    ...parameters,
    facetFilters: [
      ...existing.filter(filter => typeof filter !== 'string' || !filter.startsWith('lang:')),
      `lang:${lang}`,
    ],
  }
}
