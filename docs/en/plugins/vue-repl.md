---
title: Vue REPL
description: Embed editable, runnable Vue examples in your docs. @vue/repl only loads after the reader clicks Run, so the first screen stays fast, and every example opens in the Vue Playground with one click.
---

# Vue REPL

In tutorials and component library docs, the thing readers most want is to change one line and see what happens. `@kawapress/plugin-vue-repl` turns a code block into an example that can be edited and run. It is built on the official [`@vue/repl`](https://github.com/vuejs/repl), the same one that powers [play.vuejs.org](https://play.vuejs.org).

The REPL is not small, so it does not download with the page. The page first shows an ordinary highlighted code block. When the reader clicks Run, the editor and the preview load in place.

## Write an example {#write-an-example}

Add `repl` after the language of a `vue` code block:

````md
```vue repl
<script setup>
import { ref } from 'vue'

const count = ref(0)
</script>

<template>
  <button @click="count++">
    Clicked {{ count }} times
  </button>
</template>
```
````

This is the result. Click Run to try it:

```vue repl
<script setup>
import { ref } from 'vue'

const count = ref(0)
</script>

<template>
  <button @click="count++">
    Clicked {{ count }} times
  </button>
</template>
```

`vue` blocks without `repl` are not affected and stay ordinary code blocks.

The content of the block becomes `App.vue`. To use another file name, write `[file name]` after it, the same way you name a tab in a code group (`code-group`):

````md
```vue repl [Counter.vue]
...
```
````

## Multiple files {#multiple-files}

When an example needs `.ts`, `.js` or `.css` files, put the consecutive code blocks in a `::: repl` container and name each block with `[file name]`. The first `.vue` file is the entry:

````md
::: repl
```vue [App.vue]
<script setup>
import { count } from './store.ts'
</script>

<template>
  <button @click="count++">{{ count }}</button>
</template>

<style src="./style.css"></style>
```

```ts [store.ts]
import { ref } from 'vue'

export const count = ref(0)
```

```css [style.css]
button {
  padding: 0.25rem 1rem;
}
```
:::
````

A container only accepts code blocks, in `vue`, `ts`, `js`, `css` or `json`. Blocks inside it do not need to repeat `repl`. File names must be unique in one container, and there must be at least one `.vue` file.

## Height {#height}

An example is 480 pixels high by default. Write `{height=600}` in the info string of the code block to give one example another height:

````md
```vue repl {height=300}
...
```
````

For a container, write `::: repl {height=600}`.

## Open in Vue Playground {#playground}

Every example has an "Open in Vue Playground" link under it. It opens [play.vuejs.org](https://play.vuejs.org) with the code already in place, so readers can keep editing and share it there.

The link is built at build time, so it works before anyone clicks Run. If you configure `importMap`, it travels with the link, but the Playground does not load your `previewStyles`.

## Use your component library in examples {#component-library}

Examples for a component library need `import { MyButton } from 'my-ui'` to work. Use `importMap` to tell the REPL where the package loads from, and `previewStyles` to add the library's stylesheet to the preview:

```ts
import vueReplPlugin from '@kawapress/plugin-vue-repl'
import { nagi } from 'kawapress/nagi'

export default nagi({
  plugins: [
    vueReplPlugin({
      importMap: {
        imports: {
          'my-ui': 'https://cdn.jsdelivr.net/npm/my-ui@1/dist/index.mjs',
        },
      },
      previewStyles: [
        'https://cdn.jsdelivr.net/npm/my-ui@1/dist/style.css',
      ],
    }),
  ],
})
```

Now an example can write:

````md
```vue repl
<script setup>
import { MyButton } from 'my-ui'
</script>

<template>
  <MyButton type="primary">OK</MyButton>
</template>
```
````

`importMap` is the browser's [standard import map](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap). Its values must be ES module URLs that a browser can load directly. If your library depends on Vue, make it treat `vue` as external instead of bundling Vue into its own file, otherwise the preview ends up with two copies of Vue.

## Options {#options}

```ts
import vueReplPlugin from '@kawapress/plugin-vue-repl'
import { nagi } from 'kawapress/nagi'

export default nagi({
  plugins: [
    vueReplPlugin({
      editor: 'codemirror',
      eager: false,
      labels: {
        run: 'Try it',
      },
      localeLabels: {
        root: { playground: 'Playground' },
      },
    }),
  ],
})
```

| Option | Description |
| --- | --- |
| `importMap` | Extra import map that puts your own packages, such as a component library, into the REPL. It has `imports` and `scopes`. |
| `previewStyles` | URLs of extra stylesheets loaded inside the preview, for example a component library's CSS. |
| `editor` | `codemirror` (default) or `monaco`. CodeMirror is lighter. Monaco has completion and type hints, but it is heavier and downloads type declarations from a CDN. |
| `eager` | `false` by default, so nothing loads until Run is clicked. With `true`, an example loads and runs as soon as it scrolls near the viewport. |
| `labels` | Override the texts for every language. |
| `localeLabels` | Override the texts for one language. The key is the locale name in `locales`. |

The texts you can override are `region`, `run`, `loading`, `playground` and `failed`. Chinese and English are built in, and other languages fall back to English.

## Light and dark {#theme}

The editor and the preview follow the site's light or dark mode and change as soon as it switches.

## Styles {#styles}

The plugin's styles live in the `kawa.plugin` layer and only read the shared `--kawa-*` variables. To fine-tune them, override these class names:

| Class name | Element |
| --- | --- |
| `.kawa-vue-repl` | The whole example block |
| `.kawa-vue-repl__source` | The code shown before Run is clicked |
| `.kawa-vue-repl__stage` | The area that holds the REPL after it loads |
| `.kawa-vue-repl__bar` | The bottom row with the button and the link |
| `.kawa-vue-repl__run` | The Run button |

## Install {#install}

The nagi preset does not include this plugin. Install it separately:

::: code-group
```sh [npm]
npm install --save-dev @kawapress/plugin-vue-repl
```

```sh [pnpm]
pnpm add --save-dev @kawapress/plugin-vue-repl
```

```sh [Yarn]
yarn add --dev @kawapress/plugin-vue-repl
```
:::

```ts
import vueReplPlugin from '@kawapress/plugin-vue-repl'
import { nagi } from 'kawapress/nagi'

export default nagi({
  plugins: [
    vueReplPlugin(),
  ],
})
```

Adding it to `plugins` is enough. KawaPress loads the components and styles it needs automatically, and pages without an example download nothing.

## Limitations {#limitations}

- The Vue runtime and compiler in the preview load from a CDN (jsDelivr), so readers need network access. If loading fails, a message appears next to the button and clicking it again retries.
- The preview runs in an iframe. Example code that reaches into the parent page is not guaranteed to work.
- Only Vue is supported. React and other frameworks are out of scope.
- There is no online saving or short-link sharing. Use "Open in Vue Playground" to share.
- The plugin relies on the public API of `@vue/repl`. Its version is pinned to a 4.7 minor range, and upgrades ship with new releases of this plugin.
