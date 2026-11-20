# @kawapress/plugin-vue-component-demo

Live Vue component demos with highlighted source for KawaPress Markdown.

[![npm version](https://img.shields.io/npm/v/@kawapress/plugin-vue-component-demo?label=npm&color=42b883)](https://www.npmjs.com/package/@kawapress/plugin-vue-component-demo) · [简体中文](https://github.com/kawapress/kawapress/blob/main/packages/plugin-vue-component-demo/README-zh-CN.md)

`@kawapress/plugin-vue-component-demo` is part of [KawaPress](https://github.com/kawapress/kawapress), a Vue-first static site generator.

## Features

- Write each demo as its own `.vue` file, with full editor support, and show it in Markdown with one tag.
- The demo is rendered for real in the page (server rendering and hydration), not in an iframe.
- The source below the demo is highlighted with the site's own Shiki setup, so it matches the code blocks of your pages in light and dark mode.
- Editing a demo file updates both the rendered demo and its source in the dev server, without recompiling the page.
- A demo that needs browser APIs can be marked `client-only`.
- The page's `.md` output (from the LLMS plugin) gets the title, the description and the full source instead of the rendered demo.

## Install

```sh
npm install --save-dev @kawapress/plugin-vue-component-demo
```

`pnpm add --save-dev @kawapress/plugin-vue-component-demo` and `yarn add --dev @kawapress/plugin-vue-component-demo` work too.

## Usage

```ts
import vueComponentDemoPlugin from '@kawapress/plugin-vue-component-demo'
import { nagi } from 'kawapress/nagi'

export default nagi({
  plugins: [vueComponentDemoPlugin()],
})
```

Then use the tag on its own line in any Markdown page:

```md
<ComponentDemo
  src="./demos/ButtonBasic.vue"
  title="Basic usage"
  description="Buttons come in three **sizes**."
/>
```

The demo is on top. Under it are the title, the description and a toolbar to show or hide the source and copy it. The source is collapsed by default.

| Attribute | Description |
| --- | --- |
| `src` | The demo file. Relative to the Markdown file, a Vite alias, or an absolute path. Required. |
| `title`, `description` | Shown under the demo. Inline Markdown works. |
| `client-only` | Render the demo in the browser only. The server draws a placeholder, and the demo file never runs on the server. |

The tag must stand alone in its block, with blank lines around it. A missing file or a mistake in the tag fails the build with the page and line.

## Options

| Option | Description |
| --- | --- |
| `tag` | Tag name used in Markdown. Default `ComponentDemo`. |
| `expandSource` | Show the source expanded. Default `false`. |
| `labels` | Override the texts for every language. |
| `localeLabels` | Override the texts for one language. |

## Notes

- The source is rendered by the site's Markdown highlighter, so Shiki themes, languages and transformers apply to it too.
- Relative `src` paths are resolved from the page's path in the source folder. A page that `rewrites` moved to another route is resolved as if it were still in its source location.
- The `component` attribute (a controls playground generated from a component) is not available yet; using it fails the build with a message.

## Documentation

[Documentation](https://kawapress.dev/en/plugins/vue-component-demo) · [Report a problem](https://github.com/kawapress/kawapress/issues)

## License

[MIT](https://github.com/kawapress/kawapress/blob/main/LICENSE) © KawaPress contributors
