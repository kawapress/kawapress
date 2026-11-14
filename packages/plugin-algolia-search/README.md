# @kawapress/plugin-algolia-search

Algolia DocSearch for KawaPress sites.

[![npm version](https://img.shields.io/npm/v/@kawapress/plugin-algolia-search?label=npm&color=42b883)](https://www.npmjs.com/package/@kawapress/plugin-algolia-search) · [简体中文](https://github.com/kawapress/kawapress/blob/main/packages/plugin-algolia-search/README-zh-CN.md)

`@kawapress/plugin-algolia-search` is part of [KawaPress](https://github.com/kawapress/kawapress), a Vue-first static site generator.

## Features

- Places a lightweight search button in the `layout.header.end` outlet and preconnects to Algolia.
- Loads `@docsearch/js` and its CSS only when a reader clicks the button or presses `Ctrl/⌘ + K` or `/`.
- Automatically filters every index by `lang:<lang>` for the current locale.
- Normalizes hit URLs to site routes and navigates through the KawaPress router.
- Maps `--docsearch-*` variables to the shared `--kawa-*` tokens so light and dark themes match out of the box.

## Install

```sh
npm install --save-dev @kawapress/plugin-algolia-search
```

`pnpm add --save-dev @kawapress/plugin-algolia-search` and `yarn add --dev @kawapress/plugin-algolia-search` work too.

## Usage

Set `search: false` on `nagi()` to disable the built-in local search, then add `algoliaSearchPlugin()` to `plugins`:

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

## Options

| Option | Description |
| --- | --- |
| `appId` | Application ID from the Algolia dashboard. Required. |
| `apiKey` | Search-only API key from the Algolia dashboard. Required. |
| `indexName` | Index name to search (shorthand for `indices: [indexName]`). |
| `indices` | List of index names or `{ name, searchParameters }` objects. |
| `searchParameters` | Extra Algolia search parameters applied to every index. |
| `placeholder` | Search input placeholder text. |
| `translations` | Button and modal texts in the `@docsearch/js` shape. |
| `maxResultsPerGroup` | Maximum hits shown per group. |
| `disableUserPersonalization` | Disable recent and favorite searches stored in the browser. |
| `insights` | Send click and conversion events to Algolia Insights. |
| `facets` | Facet filters `{ key, label? }[]` shown above the results. |
| `resultBadgeKey` | Hit attribute shown as a badge next to each result. |
| `keyboardShortcuts` | Turn `'Ctrl/Cmd+K'` and `'/'` shortcuts on or off. Both default to `true`. |
| `locales` | Per-locale overrides keyed by KawaPress locale key. |

## Documentation

[Documentation](https://kawapress.dev/en/plugins/algolia-search) · [Report a problem](https://github.com/kawapress/kawapress/issues)

## License

[MIT](https://github.com/kawapress/kawapress/blob/main/LICENSE) © KawaPress contributors
