---
title: Algolia Search
description: Search your KawaPress site with Algolia DocSearch, with lazy script loading and automatic per-language facet filtering.
---

# Algolia Search

`@kawapress/plugin-algolia-search` connects [Algolia DocSearch](https://docsearch.algolia.com/) to a KawaPress site. Use it when your documentation is indexed by the Algolia crawler or when you want to search across multiple Algolia indices instead of using nagi's built-in local search.

## Install and Enable {#install-and-enable}

::: code-group
```sh [npm]
npm install --save-dev @kawapress/plugin-algolia-search
```

```sh [pnpm]
pnpm add --save-dev @kawapress/plugin-algolia-search
```

```sh [Yarn]
yarn add --dev @kawapress/plugin-algolia-search
```
:::

In `kawapress.config.ts`, set `search: false` on `nagi()` to leave out the built-in local search, then add `algoliaSearchPlugin()` to `plugins`:

```ts
import algoliaSearchPlugin from '@kawapress/plugin-algolia-search'
import { nagi } from 'kawapress/nagi'

export default nagi({
  search: false,
  plugins: [
    algoliaSearchPlugin({
      appId: 'YOUR_APP_ID',
      apiKey: 'YOUR_SEARCH_API_KEY',
      indexName: 'your_index_name',
    }),
  ],
})
```

Always pass Algolia's public **Search-Only API Key** as `apiKey`, never an Admin API Key.

The plugin prepends its search button to the `layout.header.end` outlet, in the same spot as the built-in local search. If for any reason you keep both search plugins installed at once, disable `keyboardShortcuts` on one of them so they do not both respond to the same key press.

## Options {#options}

Every option is validated at startup and build time, so missing required fields or typos fail immediately with a clear message:

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `appId` | `string` | Required | Application ID from the Algolia dashboard. |
| `apiKey` | `string` | Required | Search-only API key from the Algolia dashboard. |
| `indexName` | `string` | — | Index to search (shorthand for `indices: [indexName]`). Either `indexName` or `indices` is required. |
| `indices` | `(string \| AlgoliaIndex)[]` | — | One or more indices to search, each as an index name or `{ name, searchParameters }`. |
| `searchParameters` | `Record<string, unknown>` | `undefined` | Extra Algolia search parameters applied to every index, e.g. `{ facetFilters: ['version:v2'] }`. |
| `placeholder` | `string` | `undefined` | Placeholder text of the search input. |
| `translations` | `AlgoliaTranslations` | `undefined` | Button and modal texts in the `@docsearch/js` shape. When `button.buttonText` is omitted, the button shows `搜索` on Chinese pages and `Search` elsewhere. |
| `maxResultsPerGroup` | `number` | `undefined` | Maximum number of hits shown per group. |
| `disableUserPersonalization` | `boolean` | `undefined` | `true` disables recent and favorite searches stored in the browser. |
| `insights` | `boolean` | `undefined` | `true` sends click and conversion events to Algolia Insights. |
| `facets` | `{ key: string, label?: string }[]` | `undefined` | Facet filters shown above the results. |
| `resultBadgeKey` | `string` | `undefined` | Hit attribute shown as a badge next to each result. |
| `keyboardShortcuts` | `{ 'Ctrl/Cmd+K'?: boolean, '/'?: boolean }` | `{ 'Ctrl/Cmd+K': true, '/': true }` | Turns the `Ctrl/⌘ + K` and `/` shortcuts on or off. |
| `locales` | `Record<string, AlgoliaLocaleOptions>` | `{}` | Per-locale overrides keyed by KawaPress locale key (such as `root` or `en`), covering any option except `appId`, `apiKey`, and `keyboardShortcuts`. |

### Why Function Options Are Rejected {#why-function-options-are-rejected}

`kawapress.config.ts` runs in Node.js on the generator side, and validated options are sent to the browser as plain JSON. Options that take functions — such as `transformItems`, `hitComponent`, `navigator`, `resultsFooterComponent`, `transformSearchClient`, and `getMissingResultsUrl` — cannot cross that JSON boundary and are rejected at config time with an explanation. Hit URL normalization and client-router navigation are already built into the runtime plugin, so you do not need custom `transformItems` or `navigator` callbacks for them.

## Locales and the `lang:` Facet {#locales-and-lang-facet}

On a multilingual site, use `locales` to customize placeholders, translations, or indices per language:

```ts
algoliaSearchPlugin({
  appId: 'YOUR_APP_ID',
  apiKey: 'YOUR_SEARCH_API_KEY',
  indexName: 'my_docs',
  placeholder: 'Search docs',
  locales: {
    zh: {
      placeholder: '搜索文档',
      translations: {
        button: {
          buttonText: '搜索',
          buttonAriaLabel: '搜索',
        },
      },
    },
  },
})
```

Each locale entry is shallowly merged over the top-level options. When a locale sets its own `indexName` or `indices`, it replaces the top-level indices for that locale rather than appending to them.

### Crawler `lang` Facet Requirement {#crawler-lang-facet}

Whenever the active locale defines a `lang` in the site's `locales` config (such as `en` or `zh-CN`), the plugin automatically appends `lang:<lang>` to `searchParameters.facetFilters` for every queried index (and removes any user-supplied `lang:` filter). A single shared index therefore returns only hits in the language of the current page.

For this filter to work, make sure your Algolia DocSearch crawler records the `lang` attribute from `<html lang="...">` and includes `lang` in `attributesForFaceting` (which the standard VitePress DocSearch crawler configuration already does).

## Keyboard Shortcuts {#keyboard-shortcuts}

Two shortcuts open the search modal by default:

- `Ctrl + K` (`⌘ + K` on macOS and iOS), with the matching platform key shown on the button from the first frame;
- `/` when focus is not inside an input, textarea, select, or editable element.

Disable either shortcut with `keyboardShortcuts`:

```ts
algoliaSearchPlugin({
  appId: 'YOUR_APP_ID',
  apiKey: 'YOUR_SEARCH_API_KEY',
  indexName: 'my_docs',
  keyboardShortcuts: {
    'Ctrl/Cmd+K': true,
    '/': false,
  },
})
```

## Styling and Runtime Behavior {#styling-and-runtime-behavior}

- **Lazy loading**: The initial render only outputs the trigger button (`.kawa-algolia-search`) and a `<link rel="preconnect" href="https://<appId>-dsn.algolia.net" crossorigin>` tag in `<head>`. `@docsearch/js/docsearch` and its stylesheet are downloaded only when a reader clicks the button or presses a shortcut.
- **In-site routing**: Crawled hit URLs usually include your production domain and `.html` suffixes. The plugin strips the origin, `.html`, and trailing `/index`, keeping only the path, query, and hash so clicking or pressing Enter on a result navigates inside the current site via the KawaPress router.
- **Shared design tokens**: DocSearch styles are imported in `@layer kawa.plugin`, and `.DocSearch` maps `--docsearch-*` variables to KawaPress's `--kawa-*` tokens (`--kawa-c-brand`, `--kawa-c-bg-elv`, `--kawa-c-text-1`, and others). Light and dark mode switches and custom theme brand colors apply to the modal automatically.
