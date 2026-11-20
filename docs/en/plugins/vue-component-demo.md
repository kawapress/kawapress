---
title: Component Demo
description: Write component demos as standalone .vue files and show them rendered live with highlighted source; with the Component API plugin, get a props controls panel too.
---

# Component Demo

Almost every page of a component library's docs is "result + source": first how the component looks, then how to write it. Demo code written straight into Markdown gets no type hints in the editor and cannot be reused elsewhere.

`@kawapress/plugin-vue-component-demo` lets you write each demo as a standalone `.vue` file, renders it for real on the page, and shows its source below, highlighted like the site's code blocks. Demos go through server rendering like any page content; they are not iframes and not an online editor.

## Install {#install}

```sh
npm install --save-dev @kawapress/plugin-vue-component-demo
```

```ts
import vueComponentDemoPlugin from '@kawapress/plugin-vue-component-demo'
import { nagi } from 'kawapress/nagi'

export default nagi({
  plugins: [vueComponentDemoPlugin()],
})
```

## Show a demo {#show-a-demo}

A demo is an ordinary Vue single-file component:

```vue
<script setup lang="ts">
import KButton from '../KButton.vue'
</script>

<template>
  <div class="row">
    <KButton label="Small" size="small" />
    <KButton label="Medium" />
    <KButton label="Large" size="large" />
  </div>
</template>
```

Reference it from Markdown with the `ComponentDemo` tag:

```md
<ComponentDemo
  src="../../components/examples/demos/ButtonSizes.vue"
  title="Sizes"
  description="Buttons come in `small`, `medium` and `large`."
/>
```

The result:

<ComponentDemo
  src="../../components/examples/demos/ButtonSizes.vue"
  title="Sizes"
  description="Buttons come in `small`, `medium` and `large`."
/>

The source starts collapsed: **Show source** reveals it and **Copy source** copies the whole file. A demo is a real component, so state and events work as usual:

<ComponentDemo src="../../components/examples/demos/ButtonCounter.vue" title="Counter" />

## Props controls {#controls}

With the [Component API](/en/plugins/vue-component-meta) plugin also installed, swap `src` for `component` and point it at the component itself to get a playground with controls:

```md
<ComponentDemo
  component="../../components/examples/KButton.vue"
  props='{"label":"Submit"}'
  title="Button playground"
/>
```

<ComponentDemo
  component="../../components/examples/KButton.vue"
  props='{"label":"Submit"}'
  title="Button playground"
/>

- Each control is inferred by the Component API plugin from the prop's type: a switch for booleans, a number input for numbers, options for literal unions, a JSON input for objects and arrays. Props that cannot be edited, such as functions, are left out.
- The source snippet below the playground follows the controls, lists only props that differ from their defaults, and can be copied.
- Events the component emits go to the event log, which keeps the latest 20.
- When the component changes its own prop through an `update:xxx` event, as with `v-model`, the controls follow.
- **Reset** restores the initial values.

Initial values come from the `props` attribute, then from the prop defaults; otherwise the prop is not passed. Give required props without a default a value in `props`, which is a JSON object.

The playground shows the component itself, so the snippet always matches the result. To show a particular combination, write a demo file and use `src`.

## Attributes {#attributes}

| Attribute | Description |
| --- | --- |
| `src` | The demo file, relative to the current Markdown file, or a Vite alias such as `@/demos/Basic.vue`. |
| `component` | A component file, shown as a playground with controls. Needs the Component API plugin; use either this or `src`. |
| `props` | With `component`: the initial values, as a JSON object. |
| `title` | Title, with inline Markdown. |
| `description` | Description, with inline Markdown. |
| `client-only` | Render the demo in the browser only, see below. |

## Render in the browser only {#client-only}

Demos are also rendered on the server. A demo that uses browser APIs such as `window` or `document` needs `client-only`: the server outputs a placeholder and the demo renders after the page loads.

```md
<ComponentDemo src="../../components/examples/demos/ViewportWidth.vue" client-only />
```

<ComponentDemo src="../../components/examples/demos/ViewportWidth.vue" title="Viewport width" client-only />

## While editing {#editing}

In the dev server, editing a demo file hot-updates both the rendered demo and the expanded source, without a page reload and keeping the demo's state.

## Output for AI tools {#ai-output}

In the page `.md` and in `llms-full.txt`, each demo becomes its title, description and full source as a code block, without the rendered result.

## Options {#options}

| Option | Description |
| --- | --- |
| `tag` | The tag name in Markdown. Default `ComponentDemo`. |
| `expandSource` | Start with the source expanded. Default `false`. |
| `labels`, `localeLabels` | Override the button text. `labels` applies to every language, `localeLabels` per language. |

## Notes {#notes}

- A demo is an ordinary component on the page with no style isolation. Keep a demo's own styles `scoped`.
- The tag must be a paragraph of its own, not in the middle of text.
- A relative `src` is resolved from the page's source file.
