import type { ResolvedAlgoliaSearchOptions } from './options'
import options from 'virtual:kawapress-algolia-search-options'

/**
 * Site options as the generator published them. The runtime reads them here so
 * no module on the browser side imports the generator half of this package.
 */
const resolvedOptions: ResolvedAlgoliaSearchOptions = options

export default resolvedOptions
