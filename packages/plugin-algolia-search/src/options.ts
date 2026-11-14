/** An index to search, with optional Algolia search parameters of its own. */
export interface AlgoliaIndex {
  name: string
  searchParameters?: AlgoliaSearchParameters
}

/**
 * Algolia search parameters, for example `{ facetFilters: ['version:v2'] }`.
 * They are sent to Algolia as written.
 */
export type AlgoliaSearchParameters = Record<string, unknown>

/**
 * Texts of the DocSearch modal, in the shape `@docsearch/js` documents:
 * https://docsearch.algolia.com/docs/api#translations
 */
export type AlgoliaTranslations = Record<string, unknown> & {
  button?: {
    buttonText?: string
    buttonAriaLabel?: string
  }
}

/** Options that can differ per locale. */
export interface AlgoliaLocaleOptions {
  /** Index to search; a shorthand for `indices: [indexName]`. */
  indexName?: string
  /** Indices to search, used instead of `indexName`. */
  indices?: (string | AlgoliaIndex)[]
  /** Search parameters applied to every index. */
  searchParameters?: AlgoliaSearchParameters
  placeholder?: string
  translations?: AlgoliaTranslations
  maxResultsPerGroup?: number
  /** Turns off the recent and favorite searches DocSearch keeps in the browser. */
  disableUserPersonalization?: boolean
  /** Sends click and conversion events to Algolia Insights. */
  insights?: boolean
  /** Facets shown as filters above the results. */
  facets?: { key: string, label?: string }[]
  /** Hit attribute shown as a badge next to each result. */
  resultBadgeKey?: string
}

export interface AlgoliaSearchPluginOptions extends AlgoliaLocaleOptions {
  /** Application ID from the Algolia dashboard. */
  appId: string
  /** Search-only API key. It is public; never use an admin key here. */
  apiKey: string
  /** Turns the Ctrl/Cmd+K and `/` shortcuts on or off. Both are on by default. */
  keyboardShortcuts?: {
    'Ctrl/Cmd+K'?: boolean
    '/'?: boolean
  }
  /** Overrides per locale key, merged over the options above. */
  locales?: Record<string, AlgoliaLocaleOptions>
}

/** Options of one locale, ready for `@docsearch/js`. */
export interface ResolvedAlgoliaLocaleOptions extends Omit<AlgoliaLocaleOptions, 'indexName'> {
  indices: (string | AlgoliaIndex)[]
}

/** What the runtime receives through the virtual module. */
export interface ResolvedAlgoliaSearchOptions extends ResolvedAlgoliaLocaleOptions {
  appId: string
  apiKey: string
  keyboardShortcuts: {
    'Ctrl/Cmd+K': boolean
    '/': boolean
  }
  locales: Record<string, AlgoliaLocaleOptions>
}

const OPTION_PATH = 'plugins: [algoliaSearchPlugin({ ... })]'

const LOCALE_KEYS = [
  'indexName',
  'indices',
  'searchParameters',
  'placeholder',
  'translations',
  'maxResultsPerGroup',
  'disableUserPersonalization',
  'insights',
  'facets',
  'resultBadgeKey',
] as const

const SITE_KEYS = [...LOCALE_KEYS, 'appId', 'apiKey', 'keyboardShortcuts', 'locales'] as const

/**
 * Validates the plugin options at config time, so a typo fails the build with a
 * clear message instead of an empty search box in the browser.
 */
export function resolveAlgoliaSearchOptions(
  options: AlgoliaSearchPluginOptions | undefined,
): ResolvedAlgoliaSearchOptions {
  if (!isRecord(options)) {
    throw new Error(
      `KawaPress Algolia search: ${OPTION_PATH} is missing its options. `
      + 'Pass the appId, apiKey, and indexName that Algolia gave you for DocSearch.',
    )
  }
  rejectUnknownKeys(options, SITE_KEYS, 'options')

  const appId = requireText(options.appId, 'appId', 'Copy the Application ID from the Algolia dashboard.')
  const apiKey = requireText(
    options.apiKey,
    'apiKey',
    'Use the search-only API key from the Algolia dashboard, never an admin key.',
  )

  const locales: Record<string, AlgoliaLocaleOptions> = {}
  for (const [localeIndex, localeOptions] of Object.entries(options.locales ?? {})) {
    const path = `locales.${localeIndex}`
    if (!isRecord(localeOptions)) {
      throw new TypeError(`KawaPress Algolia search: "${path}" must be an object.`)
    }
    rejectUnknownKeys(localeOptions, LOCALE_KEYS, path)
    // A locale may change only what it needs; the merged result must still name an index.
    resolveLocaleOptions(overrideLocale(options, localeOptions), path)
    locales[localeIndex] = localeOptions
  }

  return {
    ...resolveLocaleOptions(options, 'options'),
    appId,
    apiKey,
    keyboardShortcuts: {
      'Ctrl/Cmd+K': options.keyboardShortcuts?.['Ctrl/Cmd+K'] ?? true,
      '/': options.keyboardShortcuts?.['/'] ?? true,
    },
    locales,
  }
}

/**
 * The options of one locale: the site options with the locale overrides on top,
 * and `indexName` folded into `indices`.
 */
export function mergeLocaleOptions(
  options: ResolvedAlgoliaSearchOptions,
  localeIndex: string,
): ResolvedAlgoliaLocaleOptions {
  const overrides = options.locales[localeIndex]
  return overrides
    ? resolveLocaleOptions(overrideLocale(options, overrides), `locales.${localeIndex}`)
    : resolveLocaleOptions(options, 'options')
}

/**
 * Site options with locale overrides on top. A locale that names an index, in
 * either form, replaces the site's indices instead of adding to them.
 */
function overrideLocale(
  site: AlgoliaLocaleOptions,
  overrides: AlgoliaLocaleOptions,
): AlgoliaLocaleOptions {
  const merged = { ...pickLocaleOptions(site), ...pickLocaleOptions(overrides) }
  if (overrides.indexName !== undefined && overrides.indices === undefined) {
    delete merged.indices
  }
  return merged
}

function resolveLocaleOptions(
  options: AlgoliaLocaleOptions,
  path: string,
): ResolvedAlgoliaLocaleOptions {
  const { indexName, indices, ...rest } = pickLocaleOptions(options)
  // An explicit `indices` wins, so a locale can replace the site's `indexName`.
  const resolvedIndices = indices ?? (indexName === undefined ? undefined : [indexName])
  if (!Array.isArray(resolvedIndices) || resolvedIndices.length === 0) {
    throw new Error(
      `KawaPress Algolia search: "${path}" needs "indexName" or a non-empty "indices" list. `
      + 'Use the index name from your DocSearch crawler, for example indexName: "my-docs".',
    )
  }
  resolvedIndices.forEach((index, position) => assertIndex(index, `${path}.indices[${position}]`))
  return { ...rest, indices: resolvedIndices }
}

/** Only the options a locale may change, without the keys that are not set. */
function pickLocaleOptions(options: AlgoliaLocaleOptions): AlgoliaLocaleOptions {
  return Object.fromEntries(
    LOCALE_KEYS
      .filter(key => options[key] !== undefined)
      .map(key => [key, options[key]]),
  ) as AlgoliaLocaleOptions
}

function assertIndex(index: unknown, path: string): void {
  if (typeof index === 'string' && index.trim() !== '') {
    return
  }
  if (isRecord(index) && typeof index.name === 'string' && index.name.trim() !== '') {
    return
  }
  throw new Error(
    `KawaPress Algolia search: "${path}" must be an index name or { name, searchParameters }, `
    + `received ${JSON.stringify(index)}.`,
  )
}

function rejectUnknownKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  path: string,
): void {
  const unknown = Object.keys(value).filter(key => !allowed.includes(key))
  if (unknown.length > 0) {
    throw new Error(
      `KawaPress Algolia search: "${path}" has unsupported ${unknown.length === 1 ? 'option' : 'options'} `
      + `${unknown.map(key => JSON.stringify(key)).join(', ')}. `
      + `Supported options are ${allowed.join(', ')}. Options that take a function cannot be `
      + 'passed from kawapress.config.ts, because they have to reach the browser as JSON.',
    )
  }
}

function requireText(value: unknown, path: string, hint: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(
      `KawaPress Algolia search: ${OPTION_PATH} needs a non-empty string at "${path}", `
      + `received ${JSON.stringify(value)}. ${hint}`,
    )
  }
  return value.trim()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
