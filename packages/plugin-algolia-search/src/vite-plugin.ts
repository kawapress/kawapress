import type { Plugin } from 'vite'
import type { ResolvedAlgoliaSearchOptions } from './options'
import { stringifyJson } from 'kawapress'

export const ALGOLIA_OPTIONS_MODULE_ID = 'virtual:kawapress-algolia-search-options'

const RESOLVED_MODULE_ID = `\0${ALGOLIA_OPTIONS_MODULE_ID}`

/**
 * Publishes the plugin options to the browser as plain JSON. The runtime half of
 * the plugin must never import this package's generator half.
 */
export function algoliaOptionsPlugin(options: ResolvedAlgoliaSearchOptions): Plugin {
  return {
    name: 'kawapress:algolia-search-options',
    resolveId(id) {
      if (id === ALGOLIA_OPTIONS_MODULE_ID) {
        return RESOLVED_MODULE_ID
      }
    },
    load(id) {
      if (id !== RESOLVED_MODULE_ID) {
        return
      }
      return `export default ${stringifyJson(options, {
        label: 'options of @kawapress/plugin-algolia-search',
        path: 'algoliaSearchPlugin',
      })}`
    },
  }
}
