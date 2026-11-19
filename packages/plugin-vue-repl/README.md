# @kawapress/plugin-vue-repl

Editable, runnable Vue examples for KawaPress Markdown, powered by `@vue/repl`.

[![npm version](https://img.shields.io/npm/v/@kawapress/plugin-vue-repl?label=npm&color=42b883)](https://www.npmjs.com/package/@kawapress/plugin-vue-repl) · [简体中文](https://github.com/kawapress/kawapress/blob/main/packages/plugin-vue-repl/README-zh-CN.md)

`@kawapress/plugin-vue-repl` is part of [KawaPress](https://github.com/kawapress/kawapress), a Vue-first static site generator.

## Features

- Add `repl` to a `vue` code block and readers can edit and run it in the page.
- The REPL loads only after the reader clicks Run, so the first screen is not slowed down. Until then the block is an ordinary highlighted code block.
- Several files in one example with a `::: repl` container.
- An "Open in Vue Playground" link on every example, built at build time.
- A component library can put its own package into the REPL with an import map and extra preview styles.
- The editor and the preview follow the site's light and dark mode.

## Install

```sh
npm install --save-dev @kawapress/plugin-vue-repl
```

`pnpm add --save-dev @kawapress/plugin-vue-repl` and `yarn add --dev @kawapress/plugin-vue-repl` work too.

## Usage

````md
```vue repl
<script setup>
import { ref } from 'vue'

const count = ref(0)
</script>

<template>
  <button @click="count++">{{ count }}</button>
</template>
```
````

```ts
import vueReplPlugin from '@kawapress/plugin-vue-repl'
import { nagi } from 'kawapress/nagi'

export default nagi({
  plugins: [vueReplPlugin()],
})
```

Use `[Name.vue]` to name the file and `{height=600}` to set the height in pixels (480 by default). For several files, put the code blocks in a `::: repl` container and name each one; the first `.vue` file is the entry.

## Options

| Option | Description |
| --- | --- |
| `importMap` | Extra import map that puts your own packages into the REPL. |
| `previewStyles` | Extra stylesheets loaded inside the preview. |
| `editor` | `codemirror` (default) or `monaco`. |
| `eager` | Load as soon as the example scrolls into view instead of waiting for Run. Default `false`. |
| `labels` | Override the texts for every language. |
| `localeLabels` | Override the texts for one language. |

## Documentation

[Documentation](https://kawapress.dev/en/plugins/vue-repl) · [Report a problem](https://github.com/kawapress/kawapress/issues)

## License

[MIT](https://github.com/kawapress/kawapress/blob/main/LICENSE) © KawaPress contributors
