---
title: Migrating from VitePress
description: Move an existing VitePress documentation site to KawaPress while keeping your Markdown pages.
---

# Migrating from VitePress

If you already have a VitePress documentation site, this guide walks you through moving it to KawaPress.

## What Stays the Same and What Changes {#what-stays-the-same}

Your Markdown content moves over unchanged in most sites: frontmatter, custom containers, code groups, line highlights, `<<<` code snippets, `<!--@include-->`, `[[toc]]`, `:tada:` emoji shortcodes, and `<Badge>` all work as written.

Your site configuration and theme extensions are rewritten in KawaPress's own format. KawaPress does not include a VitePress config compatibility layer, because one clear configuration shape is easier to learn and maintain than having two ways to configure the same thing.

## Step by Step {#step-by-step}

### 1. Install Dependencies {#install-dependencies}

Remove `vitepress` and install `kawapress`:

::: code-group
```sh [npm]
npm uninstall vitepress
npm install --save-dev kawapress
```

```sh [pnpm]
pnpm remove vitepress
pnpm add --save-dev kawapress
```

```sh [Yarn]
yarn remove vitepress
yarn add --dev kawapress
```
:::

A site that writes Markdown and uses the default nagi (凪) preset only needs `kawapress`. If your pages or components import Vue APIs or `.vue` files directly, install `vue` as a development dependency too.

### 2. Create `kawapress.config.ts` {#create-config}

Create `kawapress.config.ts` in the project root using `nagi()` from `kawapress/nagi`, replacing `.vitepress/config.ts`. Here is the same typical setup in both tools:

::: code-group
```ts [kawapress.config.ts]
import { nagi } from 'kawapress/nagi'

export default nagi({
  title: 'My Docs',
  srcDir: 'docs',
  themeConfig: {
    logo: '/logo.svg',
    nav: [
      { text: 'Guide', link: '/guide/getting-started', activeMatch: '/guide' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          collapsed: false,
          items: [
            { text: 'Getting Started', link: '/guide/getting-started' },
          ],
        },
      ],
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/your-org/your-repo' },
    ],
  },
})
```

```ts [.vitepress/config.ts]
import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'My Docs',
  srcDir: 'docs',
  cleanUrls: true,
  themeConfig: {
    logo: '/logo.svg',
    nav: [
      { text: 'Guide', link: '/guide/getting-started', activeMatch: '/guide/' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          collapsed: false,
          items: [
            { text: 'Getting Started', link: '/guide/getting-started' },
          ],
        },
      ],
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/your-org/your-repo' },
    ],
    search: {
      provider: 'local',
    },
  },
})
```
:::

### 3. Move Content and Public Assets {#move-files}

- **Markdown directory**: If your pages live in `docs/`, set `srcDir: 'docs'` in `kawapress.config.ts` and leave them where they are. If your pages are in the project root, omit `srcDir`.
- **Public directory**: KawaPress reads `public` inside `srcDir` by default (`docs/public/` when `srcDir: 'docs'`, or `public/` at the root). If your static files were in `.vitepress/public/`, move them to `public/`.
- **Clean up `.vitepress/`**: Remove `.vitepress/` once you have migrated any custom components or theme code (see below), and replace `.vitepress/dist` and `.vitepress/cache` with `dist` in `.gitignore`.

### 4. Update `package.json` Scripts {#update-scripts}

Replace the `vitepress` CLI commands with `kawapress`. KawaPress reads `kawapress.config.ts` from the project root automatically, so no directory argument is needed:

```json
{
  "scripts": {
    "docs:dev": "kawapress dev",
    "docs:build": "kawapress build",
    "docs:preview": "kawapress preview"
  }
}
```

### 5. Build and Deploy {#deploy}

Run `kawapress build`. Static files are written to `dist/` in the site root (instead of `.vitepress/dist`). Update your hosting platform or CI workflow to publish `dist/`. See [Deploy](/en/guide/deploy) for hosting and caching details.

## Site Configuration Mapping {#site-config}

This table maps top-level VitePress `defineConfig()` options to KawaPress:

| VitePress option | Status | KawaPress equivalent |
| --- | --- | --- |
| `title` | Same | `title` (supported at the top level and on `locales.<key>.title`) |
| `description` | Same | `description` (supported at the top level and on `locales.<key>.description`; a page's frontmatter `description` wins) |
| `lang`, `dir` | Renamed / different shape | Set on `locales.root` (and each locale entry), e.g. `locales: { root: { label: 'English', lang: 'en', dir: 'ltr' } }` |
| `titleTemplate` | Renamed / different shape | Set `titleTemplate` (`'%s · My Site'` or `false`) in page frontmatter |
| `base` | Same | `base` |
| `srcDir` | Same | `srcDir` (relative to the site root) |
| `srcExclude` | Same | `srcExclude` (glob patterns relative to `srcDir`) |
| `rewrites` | Same | `rewrites` (`{ 'packages/:pkg/src/:page*': ':pkg/:page*' }` or a function) |
| `head` | Same | `head` (supported at the top level, on `locales.<key>.head`, and in page frontmatter; allows `meta`, `link`, `script`, `style`, `noscript`) |
| `locales` | Same | `locales` (`root` for the default language, path-segment keys such as `zh` for `/zh/`) |
| `themeConfig` | Same | `themeConfig` (supported at the top level and on `locales.<key>.themeConfig`) |
| `cleanUrls` | Renamed / different shape | Always on; KawaPress routes are always extensionless |
| `ignoreDeadLinks` | Renamed / different shape | `deadLinks`: defaults to `{ level: 'error' }`; use `deadLinks: false`, `deadLinks: { level: 'warn' }`, or `deadLinks: { ignore: [...] }` |
| `lastUpdated` | Renamed / different shape | Install `@kawapress/plugin-last-updated` and add `lastUpdatedPlugin()` to `plugins` |
| `sitemap` | Same | Pass `sitemap: { hostname: 'https://...' }` to `nagi()`, or use `@kawapress/plugin-sitemap` |
| `markdown.lineNumbers` | Renamed / different shape | `nagi({ codeBlock: { lineNumbers: true } })` (or `@kawapress/plugin-code-block`) |
| `markdown.theme`, `markdown.codeTransformers`, `markdown.languages` | Renamed / different shape | Configure through `shikiPlugin({ themes, transformers, langs, twoslash })` from `@kawapress/plugin-shiki` |
| `markdown.math` | Renamed / different shape | Install `@kawapress/plugin-mathjax` and add `mathjaxPlugin()` to `plugins` |
| `markdown.toc` | Renamed / different shape | Included in `nagi()` by default (`@kawapress/plugin-toc`); pass `tocPlugin({ level: [2, 3, 4] })` in `plugins` to customize heading levels |
| `markdown.gfmAlerts`, `markdown.container`, `markdown.emoji` | Renamed / different shape | Included in `nagi()` by default (`@kawapress/plugin-github-alerts`, `@kawapress/plugin-container`, `@kawapress/plugin-emoji`) |
| `markdown.config` | Renamed / different shape | Use `api.markdown((md) => { ... })` in a Generator Plugin |
| `vite` | Renamed / different shape | Use `api.vite((config) => { ... })` in a Generator Plugin |
| `transformPageData`, `transformHead`, `buildEnd` | Renamed / different shape | Use `api.pageData()`, `api.pageArtifact()`, and `api.buildArtifacts()` in a Generator Plugin |
| `postRender`, `transformHtml` | Not available | No full-page HTML string post-processing hook |
| `outDir`, `assetsDir`, `cacheDir` | Not available | Build output is always written to `dist/`, with assets under `dist/assets/` |
| `appearance` | Renamed / different shape | Set `themeConfig.appearance` to `'auto'` (default, follows the system), `'light'`, or `'dark'`. It only sets the look before a reader switches; the switch always stays |
| `mpa`, `metaChunk`, `buildConcurrency`, `shouldPreload`, `scrollOffset`, `useWebFonts`, `contentProps`, `vue`, `extends`, `router.prefetchLinks` | Not available | Not provided by KawaPress |

## Default Theme `themeConfig` Mapping {#theme-config}

This table maps VitePress default theme options to nagi:

| VitePress `themeConfig` | Status | nagi equivalent |
| --- | --- | --- |
| `logo` | Same | `themeConfig.logo` (accepts a path string, `{ src, alt }`, or `{ light, dark, alt }`, and is also used as the site favicon) |
| `nav` | Renamed / different shape | `themeConfig.nav`: items are `{ text, link, activeMatch? }`. `activeMatch` is a route prefix string (such as `'/guide'`), not a regex; dropdown menus (`items`) are not supported |
| `sidebar` | Same | `themeConfig.sidebar`: supports an array, a path-prefix object, `{ base, items }`, and `collapsed: true \| false` on groups. Falls back to automatic sidebars from directories and `_meta.json` |
| `socialLinks` | Same | `themeConfig.socialLinks`: `[{ icon, link, ariaLabel? }]`, where `icon` is a Simple Icons name or `{ svg }`; can be overridden per locale |
| `search` (`provider: 'local'`) | Renamed / different shape | Included in `nagi()` by default (`@kawapress/plugin-search`) |
| `search` (`provider: 'algolia'`) | Renamed / different shape | Set `search: false` in `nagi()` and add `algoliaSearchPlugin({ ... })` from `@kawapress/plugin-algolia-search` to `plugins`. See [Algolia Search](/en/plugins/algolia-search) |
| `outline` | Renamed / different shape | Shows `h2` and `h3` headings by default; disable per page with frontmatter `outline: false` or `aside: false`. Custom `level` ranges are not supported |
| `outlineTitle` / `outline.label` | Renamed / different shape | `themeConfig.outlineLabel` (plus `outlineCollapseLabel` and `outlineExpandLabel`) |
| `editLink`, `lastUpdated` / `lastUpdatedText` | Renamed / different shape | Provided by `@kawapress/plugin-last-updated` (`editLink.pattern`, `lastUpdated.formatOptions`, `labels`). See [Last Updated](/en/plugins/last-updated) |
| `docFooter` (`prev` / `next`) | Renamed / different shape | Button labels are `themeConfig.previousPageLabel` and `themeConfig.nextPageLabel`; per-page frontmatter overrides for prev/next links are not supported |
| `footer` (`message` / `copyright`) | Renamed / different shape | `themeConfig.footerLicenseText` and `themeConfig.footerPoweredByText`; set `themeConfig.footer: false` to omit nagi’s default footer (shown on `home` and `page`; `doc` pages have no footer) |
| `sidebarMenuLabel`, `returnToTopLabel`, `langMenuLabel` | Same | Same field names, with built-in English and Chinese defaults |
| `darkModeSwitchLabel`, `lightModeSwitchTitle`, `darkModeSwitchTitle` | Renamed / different shape | Combined into `themeConfig.appearanceLabel` |
| `notFound` (`title`, `linkText`, `quote`, `code`) | Renamed / different shape | `themeConfig.notFoundMessage` and `themeConfig.notFoundHomeLabel` (`quote` and `code` are not available) |
| `i18nRouting` | Renamed / different shape | Always handled by KawaPress's path-based `locales` |
| `siteTitle`, `logoLink`, `aside: 'left'`, `externalLinkIcon`, `skipToContentLabel`, `carbonAds` | Not available | Not provided by nagi |

## Markdown Syntax That Works as Is {#markdown-syntax}

Most VitePress Markdown syntax works without changes:

| Syntax | On by default in nagi | Notes |
| --- | --- | --- |
| Frontmatter (YAML / JSON) | Yes | `title`, `description`, `titleTemplate`, `head`, `layout`, and custom fields |
| Custom heading anchors `## Heading {#id}` | Yes | Same syntax as VitePress |
| Internal and external links | Yes | `.md`, `.html`, and extensionless links all resolve to clean routes |
| GitHub-style tables | Yes | Built into Core |
| Custom containers `::: tip` | Yes | Included via `@kawapress/plugin-container` (`info`, `tip`, `warning`, `danger`, `details`) |
| GitHub alerts `> [!NOTE]` | Yes | Included via `@kawapress/plugin-github-alerts` (`NOTE`, `TIP`, `IMPORTANT`, `WARNING`, `CAUTION`) |
| Code groups `::: code-group` | Yes | Included via `@kawapress/plugin-code-group` |
| Code line numbers & annotations | Yes | Included via `@kawapress/plugin-shiki` and `@kawapress/plugin-code-block`: `:line-numbers`, `{1,3-5}`, `[!code highlight]`, `[!code focus]`, `[!code ++]`, `[!code --]`, `[!code warning]`, `[!code error]`, and `twoslash` |
| Code snippets `<<< path` | Yes | Built into Core; supports `#region`, `{1,3-5 lang attrs}`, `[title]`, and `@/` |
| Markdown includes `<!--@include-->` | Yes | Built into Core; supports `#region`, `{start,end}`, nesting, and `@/` |
| Inline table of contents `[[toc]]` | Yes | Included via `@kawapress/plugin-toc` |
| Emoji shortcodes `:tada:` | Yes | Included via `@kawapress/plugin-emoji` |
| `<Badge>` component | Yes | Included via `@kawapress/plugin-badge` (`tip`, `info`, `warning`, `danger`) |
| Vue in Markdown | Yes | Built into Core (`{{ }}`, directives, `<script setup>`, `<style module>`, component imports) |
| Math equations `$...$`, `$$...$$` | Needs a plugin | Install `@kawapress/plugin-mathjax` and add it to `plugins` |
| Mermaid diagrams ```` ```mermaid ```` | Needs a plugin | Install `@kawapress/plugin-mermaid` and add it to `plugins` |
| Image zoom | Needs a plugin | Install `@kawapress/plugin-image-zoom` and add it to `plugins` |

One small difference to note: inline HTML or components inside a heading (such as `<Badge text="beta" />`) render in the heading on the page, but their tags are dropped from the plain-text title used by the browser tab, the page outline, `[[toc]]`, and the search index, and they do not change the heading anchor.

## Things That Need Changes {#what-needs-changes}

### Layout Slots Become Outlets {#layout-slots-to-outlets}

Where VitePress wraps the default theme's `Layout` and fills named slots (`#doc-before`, `#nav-bar-content-after`), KawaPress provides eight standard **outlets** that Runtime Plugins contribute to with `api.prependToOutlet()` and `api.appendToOutlet()`:

```ts
// my-layout-plugin/runtime-plugin.ts
import { defineRuntimePlugin } from 'kawapress'
import DocBanner from './DocBanner.vue'

export default defineRuntimePlugin({
  name: 'my-layout-plugin',
  setup(api) {
    api.prependToOutlet('doc', {
      id: 'banner',
      component: DocBanner,
    })
  },
})
```

See [Theme Development](/en/plugins/theme-development#standard-outlets) and [Plugin Development](/en/plugins/plugin-development#add-to-outlet) for all eight outlets and how they work.

### Custom Layout Components {#custom-layouts}

A whole-page layout that VitePress picks with `layout: name` plus `app.component('name', Component)` works the same way in nagi: register a global component with that name in a Runtime Plugin, and place the page content with `<RouterView />` instead of `<Content />`. `layout: false` also means no theme frame at all. See [Frontmatter](/en/guide/frontmatter#custom-layout).

### `useData()` Splits into Focused Composables {#usedata-to-composables}

VitePress's `useData()` and template globals such as `$frontmatter` are replaced by focused composables exported from `kawapress/client`:

| VitePress | KawaPress (`kawapress/client`) |
| --- | --- |
| `useData().page`, `useData().frontmatter`, `$frontmatter` | `const page = usePageData()` (`page.value?.title`, `page.value?.frontmatter`, `page.value?.headers`) |
| `useData().site`, `useData().lang`, `useData().dir`, `useData().localeIndex` | `const site = useSite()` (`site.value.title`, `site.value.base`, `site.value.lang`, `site.value.dir`, `site.value.localeIndex`) |
| `useData().theme` | `const themeConfig = useThemeConfig()` |
| `useData().isDark` | `const { isDark } = useAppearance()` |
| `useRoute()`, `useRouter()` | `useRoute()`, `useRouter()` (exported from `kawapress/client`) |

```vue
<script setup lang="ts">
import { usePageData, useSite, useThemeConfig } from 'kawapress/client'

const page = usePageData()
const site = useSite()
const theme = useThemeConfig()
</script>
```

### `.vitepress/theme/index.ts` `enhanceApp` Becomes a Runtime Plugin {#enhanceapp-to-runtime-plugin}

To register global Vue components, install Vue plugins, or add router hooks, move your `enhanceApp({ app, router })` code into a Runtime Plugin:

```ts
// my-site-plugin/runtime-plugin.ts
import { defineRuntimePlugin } from 'kawapress'
import DemoBox from './DemoBox.vue'

export default defineRuntimePlugin({
  name: 'my-site-plugin',
  setup(api) {
    api.vueApp((app) => {
      app.component('DemoBox', DemoBox)
    })
    api.router((router) => {
      router.afterEach((to) => {
        console.log('Navigated to', to.path)
      })
    })
  },
})
```

See [Plugin Development](/en/plugins/plugin-development#package-layout) for how to wire a Runtime Plugin to its package entry.

### Build-Time Data Loaders (`*.data.ts`) {#data-loaders}

Data loaders (`*.data.ts` and `*.data.js`) work the same way as in VitePress. Change the import source from `'vitepress'` to `'kawapress'`:

```diff
-import { createContentLoader, defineLoader } from 'vitepress'
+import { createContentLoader, defineLoader } from 'kawapress'
```

If a loader reads the global site configuration, replace `globalThis.VITEPRESS_CONFIG` with `globalThis.KAWAPRESS_CONFIG`. Also note that KawaPress requires loader return values to be strictly JSON-serializable (`Date`, `Map`, `Set`, and `undefined` properties fail the build with a clear error). See [Build-Time Data Loading](/en/guide/data-loading).

### `createMarkdownRenderer()` {#create-markdown-renderer}

If you use VitePress's `createMarkdownRenderer()` only to render demo sources at build time, import the same-named function from `@kawapress/plugin-shiki` instead. Shiki grammar options such as `languages` keep working, and the renderer supports `renderAsync()`. See [Rendering Markdown at build time](/plugins/plugin-development#markdown-renderer).

### `withBase()` {#with-base}

Import `withBase()` from `kawapress/client` and pass `site.base` as the second argument:

```vue
<script setup lang="ts">
import { useSite, withBase } from 'kawapress/client'

const site = useSite()
</script>

<template>
  <img :src="withBase('/logo.svg', site.base)" alt="Logo">
</template>
```

When you need to strip the base prefix from a URL path, use `withoutBase(path, site.base)` from `kawapress/client`.

## Not Available {#not-available}

The following features are not available in KawaPress:

- **Team page components (`VPTeamMembers`, etc.)**: KawaPress does not include built-in team components; build team sections with regular Vue components or UnoCSS utilities.
- **Dynamic route generation (`[pkg].paths.ts`)**: Pages come from Markdown files on disk (with optional `rewrites`), without parameterized virtual-page loaders.
- **Versioned documentation**: Built-in multi-version management and version switching are not included.
- **Blog, archives, and RSS**: Built-in blog layouts and RSS generation are not included, though page indexes can be built with `createContentLoader()`.
- **Per-page `prev` / `next` frontmatter**: Previous and next links always follow the active sidebar.
- **`::: raw` style isolation container**: Not included.
- **Carbon Ads integration**: Not built into nagi; mount custom components through a Runtime Plugin and an outlet such as `doc.toc`.
