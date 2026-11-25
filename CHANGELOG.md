# Changelog

All notable changes to KawaPress are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/). Before 1.0, a change to the second number (`0.2` → `0.3`) can contain breaking changes.

`kawapress`, `create-kawapress` and `@kawapress/preset-nagi` share one version and are released together; every other plugin has its own version and is released when it changes. Up to 0.8.3, all packages shared one version. Each release section lists the packages and versions it published. [简体中文](https://github.com/kawapress/kawapress/blob/main/CHANGELOG.zh-CN.md)

## [Unreleased]

### Changed

- **Plugins declare which `kawapress` versions they work with.** The peer dependency on `kawapress` is now `>=0.8.3 <0.10.0` instead of following the core's exact minor version, so a new core release no longer requires a new release of every plugin.
- **Every official plugin carries the npm keywords `kawapress` and `kawapress-plugin`**, and `@kawapress/preset-nagi` carries `kawapress-preset`. Community plugins can use the same keywords to be found on npm.

### Fixed

- **Plugins install under strict package layouts.** Official plugins and `@kawapress/preset-nagi` now declare `vite`, `markdown-exit` and `vue` as peer dependencies when their sources import them, with the same ranges as `kawapress`. Before, they resolved these through `kawapress`'s own dependencies, which fails with `hoist=false`, Yarn PnP and other strict layouts. Package managers install missing peers automatically and share them with `kawapress`, so sites that only install `kawapress` see no change.

## [0.8.4] - 2026-11-20

Published: `kawapress` 0.8.4, `create-kawapress` 0.8.4, `@kawapress/preset-nagi` 0.8.4, `@kawapress/plugin-vue-component-meta` 0.1.0, `@kawapress/plugin-vue-component-demo` 0.1.0.

### Added

- **`@kawapress/plugin-vue-component-meta` 0.1.0: API tables from component source.** `<ComponentApi src="./Button.vue" />` renders the props, events, slots and exposed members of a Vue component, read at build time with `vue-component-meta` and the TypeScript checker, including imported types, `withDefaults` values and JSDoc. The tables hot-update in dev, appear as Markdown tables in the page `.md`, and `import doc from './Button.vue?component-doc'` gives the same data to other plugins.
- **`@kawapress/plugin-vue-component-demo` 0.1.0: live component demos.** `<ComponentDemo src="./demos/Basic.vue" />` renders a standalone demo file on the page with its highlighted source, with `client-only` for demos that need the browser. With the Component API plugin installed, `<ComponentDemo component="./Button.vue" />` shows the component with a controls panel built from its prop types, an event log and a live source snippet.

### Changed

- **nagi tables are quieter.** Markdown tables sit in a card with a rounded border that scrolls sideways when wide; the header is muted text over one line, rows are separated by thin lines, and the column lines and zebra stripes are gone. *Theme authors*: each Markdown table is now wrapped in `<div class="nagi-table">`.

### Fixed

- **Links to a heading on a page with a component demo title no longer count as dead.** A plugin that renders a snippet with `renderInline(text, env)` cleared the headings the page had collected. *Plugin authors*: rendering inline Markdown with the page env no longer affects dead link checks.

## [2026-11-20] - five new plugins

Published: `@kawapress/plugin-file-tree` 0.1.0, `@kawapress/plugin-analytics` 0.1.0, `@kawapress/plugin-feed` 0.1.0, `@kawapress/plugin-og-image` 0.1.0, `@kawapress/plugin-vue-repl` 0.1.0. The other packages are unchanged.

### Added

- **`@kawapress/plugin-file-tree` 0.1.0: file trees in Markdown.** A ```` ```tree ```` fence becomes a folder tree with Catppuccin file icons, comments after `#`, highlighted entries in `**bold**`, `...` for omitted items and folders collapsed with `(collapsed)`. Folding uses the native `<details>` element, so the tree works without JavaScript.
- **`@kawapress/plugin-analytics` 0.1.0: one plugin for Google Analytics, Plausible, Umami and Cloudflare Web Analytics.** Pick a provider, or several at once; page views are reported on every client-side navigation. Nothing is reported during `kawapress dev` unless `dev: true` is set.
- **`@kawapress/plugin-feed` 0.1.0: RSS, Atom and JSON feeds.** Pages matched by `include` that have a quoted `date` in their frontmatter become feed items, with one feed per locale and an autodiscovery `<link>` in every page head.
- **`@kawapress/plugin-og-image` 0.1.0: a share image for every page.** Each page gets a 1200×630 PNG drawn from a Vue template with satori, and the `og:image` and `twitter:image` tags that point to it. Characters the built-in Figtree font lacks, such as Chinese, Japanese or Korean text, are drawn with Noto font subsets downloaded at build time and cached; set `remoteFonts: false` to stay offline and bring your own `fonts`. A `logo` shows before the site title, and a custom template can replace the built-in one.
- **`@kawapress/plugin-vue-repl` 0.1.0: runnable Vue examples.** A ```` ```vue repl ```` fence shows the code and runs it in an embedded `@vue/repl` editor on demand, with a link to open it in the Vue Playground. The editor follows the page's light or dark appearance.

## [0.8.3] - 2026-11-19

### Changed

- **The image zoom backdrop is dark in both color schemes.** It was the page background at 80%, which left a light haze in light mode; it is now black at 82% and fades in with the image. The caption is light so it stays readable on the dark backdrop. Transparent images show their transparency on it.

### Fixed

- **nagi's home hero title keeps CJK words together.** Chinese and Japanese titles break only at spaces and at newlines written in `hero.text`, instead of between any two characters, so a word like 驱动的 no longer splits across lines. A run too wide for the column still breaks.

## [0.8.2] - 2026-11-18

### Added

- **`kawapress dev` accepts `--port` and `--strictPort`.** They work like Vite's: `kawapress dev --port 5172 --strictPort` serves on 5172 and exits with an error when that port is taken. Without `--strictPort`, a taken port moves on to the next free one. The flags override `vite.server.port` and `vite.server.strictPort` from the site config.
- **`kawapress build` warns when the client and SSR load a package from different files.** Since Vite 6 the top-level `resolve.conditions` reaches the client only, so a site that adds a condition such as `source` there renders a workspace library's `dist/` on the server and hydrates it with its `src/` in the browser. The warning lists the files each side loaded and the conditions to add to `ssr.resolve.conditions`; a browser build a package ships on purpose, through the `browser` condition or the `browser` field, is not reported.
- **`kawapress build --debug-hydration` keeps Vue's hydration mismatch details.** A production build otherwise only logs `Hydration completed but contains mismatches.`; with the flag, `kawapress preview` shows which node differs. Rebuild without it before deploying.

### Changed

- **`kawapress dev` listens on `localhost` by default**, like Vite. Before, it listened on every network address. *Site authors* who open the dev site from another device: set `vite.server.host: true`.
- **nagi's outline expand button uses the Clarity tree-view icon.**

### Fixed

- **`vite.server` options in the site config reach the dev server.** `host`, `port`, `strictPort`, `proxy` and `fs` were dropped before; the dev server now applies them. `https` is still not supported.
- **A second `kawapress dev` keeps hot reload.** The HMR WebSocket now shares the dev server's port instead of opening its own on 24678, which a second instance could not get.

## [0.8.1] - 2026-11-18

### Fixed

- **`@kawapress/plugin-emoji` type-checks in sites.** It depends on `@types/markdown-it-emoji` itself, so a site that type-checks its `nagi()` config no longer fails on `markdown-it-emoji`.

## [0.8.0] - 2026-11-18

### Breaking changes

- **`llms.description` is removed.** The summary at the top of `llms.txt` now comes from the site and locale `description`, the same text as the page description meta. *Site authors:* move the text; a config that still sets `llms.description` fails to load with a message that names the new place.

  ```diff
   export default nagi({
  +  description: 'KawaPress documentation.',
     locales: {
       root: { label: 'English', lang: 'en' },
  -    zh: { label: '简体中文', lang: 'zh-CN' },
  +    zh: { label: '简体中文', lang: 'zh-CN', description: 'KawaPress 中文文档。' },
     },
  -  llms: { description: { root: 'KawaPress documentation.', zh: 'KawaPress 中文文档。' } },
   })
  ```

- **A plugin with the same name as a preset plugin replaces it, and two plugins with one name are an error.** Before, both ran. *Site authors:* if you added a plugin a preset already includes, it now takes the preset's place; drop it from `plugins` if you meant the preset's own. *Plugin authors:* give every plugin a unique `name`.
- **`shikiPlugin()` renders the light and dark GitHub themes by default**, like the standalone renderer and nagi. *Site authors* who use `shikiPlugin()` without nagi and without `theme` or `themes` get dual-theme markup that follows the page `color-scheme`; pass `theme: 'github-light'` to keep one theme.

### Added

- **Sites and locales can set a default `description`.** Pages without a frontmatter `description` use the current locale's `description`, then the site's.
- **Sites can replace a plugin a preset includes** by putting a plugin with the same name in `plugins`. It runs where the preset's plugin ran.
- **`shikiPlugin()` accepts `languages`.** Grammar registrations load after the default languages, as in the standalone Markdown renderer.
- **Generator plugins can read the resolved site config.** `api.configResolved()` runs after every `config()` hook with KawaPress's defaults applied and values normalized, so plugins no longer repeat them. Official plugins use it.
- **Plugin authors get KawaPress's own tools.** `kawapress/generator` adds `setupGeneratorPlugins()`, which sets plugins up the way a build does for tests and tools, and `resolveMarkdownPageScope()`, the page scope KawaPress lists its own pages with. `withBase()` and `withoutBase()` are also exported from `kawapress`.

### Fixed

- **A favicon declared in `head` replaces nagi's logo favicon.** When the site, locale or page `head` has a `rel="icon"` link, nagi no longer adds a second icon generated from `themeConfig.logo`.

### Migration

1. Move `llms.description` to `description` on the site config and on each locale.
2. Remove any plugin from `plugins` that duplicates one your preset already includes, unless you mean to replace it.
3. If you use `shikiPlugin()` directly without a theme and want one theme, pass `theme`.

## [0.7.1] - 2026-11-16

### Fixed

- **Published client and Shiki types are safe for consumers.** Virtual modules and `ClientOnly` are declared, the generator includes its `picomatch` declaration, and twoslash metadata is read across Shiki versions.

## [0.7.0] - 2026-11-16

### Added

- **Standalone Markdown renderers are public APIs.** Core accepts a custom highlighter, and `@kawapress/plugin-shiki` provides dual-theme rendering with custom grammar registrations for build-time demo loaders.

## [0.6.0] - 2026-11-16

### Added

- **Core provides `ClientOnly` and `useAppearance()`.** `<ClientOnly>` is registered globally and defers browser-only content until after mounting. `useAppearance()` exposes a reactive `isDark` that follows the root appearance class or the operating system preference.
- **Sites can configure Vite and a local Runtime Plugin directly.** `vite` accepts regular Vite configuration, `runtimePlugin` loads a site-local module after package plugins, and `publicDir` may point outside `srcDir`.
- **nagi can omit built-in llms and the footer.** Use `llms: false` and `themeConfig.footer: false` when a site provides its own behavior or does not want them.

### Fixed

- **`layout: page` no longer applies document typography to custom pages.** nagi leaves their headings, images, rules and other markup unstyled, so application-like pages such as editors and playgrounds keep their own layout and controls.
- **Blank page layouts fill their scroll viewport.** `layout: page` no longer collapses full-height application content to its intrinsic height.
- **Search remains available on mobile.** nagi keeps the search button in the navigation bar while moving language, appearance and social controls into the mobile menu.

## [0.5.1] - 2026-11-16

### Fixed

- **A trailing slash no longer leads to the not-found page.** `/guide/` now opens the page `/guide` in dev, in `kawapress preview` and after a client navigation, and Markdown links written as `/guide/` render without the slash. ([#54](https://github.com/kawapress/kawapress/issues/54))
- **Content teleported to `body` is now server-rendered.** `<Teleport to="body">` (tooltips, menus, dialogs) is written at the start of `<body>` in dev and in the build, so such pages hydrate without mismatches and no longer throw `insertBefore` errors on the first update. ([#56](https://github.com/kawapress/kawapress/issues/56))

## [0.5.0] - 2026-11-16

### Added

- **Custom page layouts in nagi.** `layout: <name>` renders the global component registered under that name inside the page frame, and `layout: false` renders the page with no nagi frame at all, as in VitePress. ([#52](https://github.com/kawapress/kawapress/issues/52))
- **`themeConfig.appearance` sets the default look of a nagi site.** `'dark'` or `'light'` applies before the reader picks one; `'auto'` (default) keeps following the system. ([#52](https://github.com/kawapress/kawapress/issues/52))

## [0.4.2] - 2026-11-16

### Fixed

- **The theme loads when the site is installed with pnpm.** With pnpm, a site using `kawapress/nagi` built pages with no theme and failed with `rendered page did not contain [data-kawa-ssg-md-root]`. ([#46](https://github.com/kawapress/kawapress/issues/46))
- **Pages that import `kawapress/client` work in `kawapress dev`.** A page or component that called `usePageData()`, `useSite()` or another client composable left the screen blank in dev with `useRoute() and useRouter() need a KawaPress app`. ([#48](https://github.com/kawapress/kawapress/issues/48))
- **The llms build works when the site can resolve `@vue/server-renderer` itself.** Common in pnpm workspaces, this setup made `kawapress build` fail with `rendered page did not contain [data-kawa-ssg-md-root]`. ([#50](https://github.com/kawapress/kawapress/issues/50))

## [0.4.1] - 2026-11-15

### Fixed

- **`kawapress build` works when the site's `package.json` is not an ES module package.** A project without `"type": "module"` (for example one created with `npm init -y`) no longer fails with `Cannot find module '…/dist/.server/entry-server.js'`. ([#44](https://github.com/kawapress/kawapress/issues/44))

## [0.4.0] - 2026-11-15

### Breaking changes

**`themeConfig.githubUrl` in nagi is replaced by `themeConfig.socialLinks`.** A configuration that still sets `githubUrl` fails the build with a hint on how to rewrite it. In CSS, `.nagi-github-link` is replaced by `.nagi-social-link`.

- **Site authors**: replace `themeConfig.githubUrl` (and any per-locale `githubUrl`) with `themeConfig.socialLinks`.
- **Site authors with custom CSS**: rename `.nagi-github-link` selectors to `.nagi-social-link`.

```diff
 export default nagi({
   themeConfig: {
-    githubUrl: 'https://github.com/kawapress/kawapress',
+    socialLinks: [
+      { icon: 'github', link: 'https://github.com/kawapress/kawapress' },
+    ],
   },
 })
```

**Heading titles drop inline HTML tags.** Plain-text heading titles (used in `pageData.title`, `pageData.headers`, the page outline, `[[toc]]`, local search, and `llms.txt`) now strip inline HTML tags while keeping the text between them: `<kbd>Ctrl</kbd>` reads `Ctrl` and `<Badge text="beta" />` leaves nothing. Heading anchor IDs are unchanged.

- **Site authors**: if a heading relied on an inline HTML tag or attribute (such as `<Badge text="beta" />`) appearing in the browser tab title or outline, move that text outside the tag or set `title` in frontmatter.

**`loadSearchIndexes()` in `@kawapress/plugin-search` takes a `MarkdownPageScope` instead of a `sourceRoot` string, and `markdownFileToRoutePath()` takes an optional `rewrites` argument.** `MarkdownPage` and `PageBuildArtifact` also include `pagePath` (the source path after `rewrites`).

- **Plugin authors**: pass `{ sourceRoot, publicDir, exclude, rewrites }` to `loadSearchIndexes()`, and include `pagePath` when constructing `PageBuildArtifact` or `MarkdownPage` test fixtures.

```diff
-const indexes = await loadSearchIndexes(sourceRoot, locales, options)
+const indexes = await loadSearchIndexes(
+  { sourceRoot, publicDir, exclude: srcExclude, rewrites },
+  locales,
+  options,
+)
```

**Platform detection head script ID changed.** The inline platform script moved from `@kawapress/plugin-search` to `usePlatformAttribute()` in `kawapress/client`, and its `<script>` `id` changed from `kawa-search-platform` to `kawa-platform`.

### Added

- **Markdown file inclusion (`<!--@include: ...-->`) and code snippets (`<<< ...`).** Include whole Markdown files, `#region` blocks, or `{start,end}` line ranges, and import code snippets with `#region`, `{lines lang attrs}`, and `[title]` tab labels. Export `expandMarkdownSource()` and `readMarkdownSource()` from `kawapress/generator`. See [Markdown Extensions](https://kawapress.dev/en/guide/markdown-extensions#import-code-snippets).
- **`srcExclude` and `rewrites` in site configuration.** Exclude non-page Markdown files with `srcExclude` globs, and map source paths to new page routes with `rewrites` rules or a function. Export `markdownFileToPagePath()` from `kawapress/generator`. See [Routing](https://kawapress.dev/en/guide/routing#excluding-source-files).
- **`@kawapress/plugin-badge`, `@kawapress/plugin-toc`, and `@kawapress/plugin-emoji` (enabled by default in nagi).** Use `<Badge>`, `[[toc]]`, and `:tada:` emoji shortcodes out of the box in nagi sites.
- **`@kawapress/plugin-algolia-search` and `nagi({ search: false })`.** Connect Algolia DocSearch with lazy script loading, automatic `lang:<lang>` facet filtering per locale, and `--kawa-*` token styling. Pass `search: false` to `nagi()` to omit the built-in local search. See [Algolia Search](https://kawapress.dev/en/plugins/algolia-search).
- **Collapsible sidebar groups (`collapsed`) and `socialLinks` in nagi.** Fold sidebar groups in `themeConfig.sidebar` or directory `_meta.json` files with `collapsed: true | false`, and render Simple Icons or custom SVG links in the top bar with `themeConfig.socialLinks`. See [Internationalization](https://kawapress.dev/en/guide/internationalization#collapsible-sidebar-groups).
- **`usePlatformAttribute()` and `withoutBase()` in `kawapress/client`.** Detect Apple vs Control/Windows platforms before first paint with `data-kawa-platform`, and strip the site `base` from a URL path with `withoutBase()`.
- **[Migrating from VitePress](https://kawapress.dev/en/guide/migrate-from-vitepress) guide.** Step-by-step migration instructions, site and theme config mapping tables, and composable equivalents.

### Migration

1. Update `kawapress` and every `@kawapress/*` package in your site to `0.4.0`.
2. If you use nagi and set `themeConfig.githubUrl`, replace it with `themeConfig.socialLinks`, and rename any `.nagi-github-link` selector in your CSS to `.nagi-social-link`.
3. If you wrote a plugin that calls `loadSearchIndexes()` or builds `PageBuildArtifact` / `MarkdownPage` objects, update it as shown above.
4. If your nagi site already adds `@kawapress/plugin-badge`, `@kawapress/plugin-toc` or `@kawapress/plugin-emoji` itself, you can remove them from `plugins`; nagi installs them.
5. Run `kawapress build` and check the page titles and outlines of headings that contain inline HTML.

## [0.3.0] - 2026-10-28

### Breaking changes

**Outlets are renamed, and `addToOutlet()` is replaced.** The old names and the old API are removed. There are no aliases, so a plugin that still uses them fails when the site starts.

| Old outlet | New outlet |
| --- | --- |
| `header.actions` | `layout.header.end` |
| `doc.header` | `doc.under-title` |
| `doc.footer` | `doc` (appended) |
| `doc.after` | `doc` (appended) |

| Old API | New API |
| --- | --- |
| `api.addToOutlet(outlet, item)` | `api.prependToOutlet(outlet, item)` or `api.appendToOutlet(outlet, item)` |

What changes for each kind of user:

- **Site authors** who only use the official plugins: nothing to change in your code. Update `kawapress` and every `@kawapress/*` package to `0.3.0` together.
- **Plugin authors**: replace each `api.addToOutlet(...)` call. `prependToOutlet` places the component before the theme's content, `appendToOutlet` after it. The `id` option is unchanged.
- **Theme authors**: wrap what your theme draws in `<KawaOutlet name="...">`, instead of placing an empty `<KawaOutlet />` beside it. The scoped slot (`v-slot="{ items }"`) is removed. The default slot is now your own content.

```diff
-api.addToOutlet('doc.footer', { id: 'last-updated', component: LastUpdated })
+api.appendToOutlet('doc', { id: 'last-updated', component: LastUpdated })
```

```diff
-<KawaOutlet name="header.actions" />
-<LanguageMenu />
+<KawaOutlet name="layout.header.end">
+  <LanguageMenu />
+</KawaOutlet>
```

### Added

- **Eight standard outlets.** An outlet name is a scope plus a position: `layout` is the page frame, `doc` is the document being read, and `start` / `end` follow the reading direction. The outlets are `layout.header`, `layout.header.start`, `layout.header.end`, `layout.sidebar`, `layout.footer`, `doc`, `doc.under-title` and `doc.toc`. The nagi theme renders all of them. See [Theme Development](https://kawapress.dev/en/plugins/theme-development) and [Plugin Development](https://kawapress.dev/en/plugins/plugin-development).
- **`api.prependToOutlet()` and `api.appendToOutlet()`.** A plugin chooses to appear before or after the theme's own content. When several plugins use the same side of an outlet, they follow the order of the `plugins` array.
- **GitHub Packages.** The 15 `@kawapress/*` packages are also listed under the repository's Packages. They are still installed from npmjs.com. `kawapress` and `create-kawapress` are not listed there, because GitHub requires the package scope to match the owner.

### Changed

- **Last updated line.** The edit link, with an icon, is on the left and the time is on the right. The line now comes after the previous/next links, and the comment section comes after it. Both plugins append to `doc`, so to change their order, change their order in `plugins`.
- **Mermaid side-by-side view.** The source is on the left and the diagram on the right, with a draggable divider. The divider is a thin line until you hover or drag it, and the source pane fills the full height. On a narrow screen the diagram moves above the source.
- **Documentation.** The theme guides are merged into one page, [Theme Development](https://kawapress.dev/en/plugins/theme-development). The pages `guide/theme-customization` and `guide/theme-architecture` no longer exist. The docs site loads its git history before each build, so every page shows its last updated time.

### Fixed

- Items that a plugin adds to the top bar controls, such as the search button, were placed next to the logo in 0.2.1. They are back at the end of the top bar, before the language menu.

### Migration

1. Update `kawapress` and every `@kawapress/*` package in your site to `0.3.0`.
2. If you wrote a plugin, replace `addToOutlet()` as shown above, and rename any outlet from the table.
3. If you wrote a theme, wrap your content in `<KawaOutlet>` and remove any use of its scoped slot.
4. Run `kawapress build`. A plugin that adds to an outlet that no page renders prints one warning line.

## [0.2.2] - 2026-10-28

### Fixed

- The "简体中文" link in the README of every package on npm opened a 404 page. Every tarball now contains `README-zh-CN.md`, and the link works.

## [0.2.1] - 2026-10-27

### Added

- **Per-package READMEs.** Every package has its own English and Chinese README on its npm page.
- **Mermaid views.** A diagram switches between image, code and side-by-side views.

### Changed

- **nagi top bar.** The search button was moved next to the logo, and the navigation links to the right, together with the language menu, the appearance switch and the GitHub link.
- The repository moved to the `kawapress` GitHub organization. Documentation links use `kawapress.dev`.
- **Release process.** Every package has its own version, and a release publishes only the versions that npm does not have yet. See [RELEASING.md](https://github.com/kawapress/kawapress/blob/main/RELEASING.md).

### Fixed

- A zoomed-in Mermaid diagram is no longer cut off by the hard edge under the view switch.

## [0.2.0] - 2026-10-27

### Breaking changes

- Page data, frontmatter and theme config types are extended by plugins and themes through TypeScript interface merging, not through generic parameters. Use `defineConfig()` and `useThemeConfig()` without a type argument, and declare theme fields in `declare module 'kawapress' { interface ThemeConfig { ... } }`.
- `PresetConfig`, `NagiThemeConfig`, `NagiHomeFrontmatter` and `LastUpdatedPageData` are removed.

### Added

- `@kawapress/plugin-mermaid`: write diagrams as text and render them to SVG at build time.
- nagi `themeConfig.nav`: section links in the top bar, with one sidebar per section.
- The official documentation is split into "Guide" and "Plugins", with an overview page for the official plugins.

### Fixed

- The CSS target is a browser that supports `light-dark()`, so theme override tokens no longer lose their colors in production builds.
- A release no longer fails when a version is already on npm.

[Unreleased]: https://github.com/kawapress/kawapress/compare/v0.8.4...HEAD
[0.8.4]: https://github.com/kawapress/kawapress/compare/v2026-11-20-plugins...v0.8.4
[2026-11-20]: https://github.com/kawapress/kawapress/compare/v0.8.3...v2026-11-20-plugins
[0.8.3]: https://github.com/kawapress/kawapress/compare/v0.8.2...v0.8.3
[0.8.2]: https://github.com/kawapress/kawapress/compare/v0.8.1...v0.8.2
[0.8.1]: https://github.com/kawapress/kawapress/compare/v0.8.0...v0.8.1
[0.8.0]: https://github.com/kawapress/kawapress/compare/v0.7.1...v0.8.0
[0.7.1]: https://github.com/kawapress/kawapress/compare/v0.7.0...v0.7.1
[0.7.0]: https://github.com/kawapress/kawapress/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/kawapress/kawapress/compare/v0.5.1...v0.6.0
[0.5.1]: https://github.com/kawapress/kawapress/compare/v0.5.0...v0.5.1
[0.5.0]: https://github.com/kawapress/kawapress/compare/v0.4.2...v0.5.0
[0.4.2]: https://github.com/kawapress/kawapress/releases/tag/v0.4.2
[0.4.1]: https://github.com/kawapress/kawapress/releases/tag/v0.4.1
[0.4.0]: https://github.com/kawapress/kawapress/releases/tag/v0.4.0
[0.3.0]: https://github.com/kawapress/kawapress/releases/tag/v0.3.0
[0.2.2]: https://github.com/kawapress/kawapress/commit/5a9b6f2
[0.2.1]: https://github.com/kawapress/kawapress/commit/5456bfa
[0.2.0]: https://github.com/kawapress/kawapress/releases/tag/v0.2.0
