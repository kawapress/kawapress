import type { KawaPressPlugin } from 'kawapress'
import type { AlgoliaSearchPluginOptions } from './options'
import { definePlugin } from 'kawapress'
import { useRuntimeDependencies } from 'kawapress/generator'
import { resolveAlgoliaSearchOptions } from './options'
import { algoliaOptionsPlugin } from './vite-plugin'

export const ALGOLIA_SEARCH_PLUGIN_NAME = '@kawapress/plugin-algolia-search'

const RUNTIME_DEPENDENCIES = ['@docsearch/js/docsearch']

/**
 * Searches the site through Algolia DocSearch. The options are validated here,
 * at config time, and handed to the runtime as plain JSON; the DocSearch
 * library itself is only downloaded when a reader opens the search.
 */
export function algoliaSearchPlugin(options: AlgoliaSearchPluginOptions): KawaPressPlugin {
  const resolved = resolveAlgoliaSearchOptions(options)

  return definePlugin({
    name: ALGOLIA_SEARCH_PLUGIN_NAME,
    setup(api) {
      api.vite((config) => {
        useRuntimeDependencies(config, ALGOLIA_SEARCH_PLUGIN_NAME, RUNTIME_DEPENDENCIES)
        config.plugins ??= []
        config.plugins.push(algoliaOptionsPlugin(resolved))
      })
    },
  })
}

export default algoliaSearchPlugin

export type {
  AlgoliaIndex,
  AlgoliaLocaleOptions,
  AlgoliaSearchParameters,
  AlgoliaSearchPluginOptions,
  AlgoliaTranslations,
  ResolvedAlgoliaLocaleOptions,
  ResolvedAlgoliaSearchOptions,
} from './options'
