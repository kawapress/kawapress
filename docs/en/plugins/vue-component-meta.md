---
title: Component API
description: Read props, events, slots and exposed members from Vue component source at build time, render them as API tables that stay in sync, and feed the controls of component demos.
---

# Component API

In a component library's docs, the API tables take the most effort and go stale the fastest: a component gains a prop and the table is forgotten.

`@kawapress/plugin-vue-component-meta` reads component source at build time with [vue-component-meta](https://github.com/vuejs/language-tools/tree/master/packages/component-meta) and renders props, events, slots and exposed members as tables. It works through the TypeScript type checker, so imported types, `withDefaults` values and JSDoc all come through. When the component changes, so do the tables.

## Install {#install}

```sh
npm install --save-dev @kawapress/plugin-vue-component-meta typescript
```

TypeScript 6 is a peer dependency. The native TypeScript 7 does not have the JavaScript API the checker needs yet.

```ts
import vueComponentMetaPlugin from '@kawapress/plugin-vue-component-meta'
import { nagi } from 'kawapress/nagi'

export default nagi({
  plugins: [vueComponentMetaPlugin()],
})
```

## Render API tables {#render-tables}

Write a `ComponentApi` tag in Markdown, with `src` pointing to the component file:

```md
<ComponentApi src="../../components/examples/KButton.vue" />
```

`src` is relative to the current Markdown file, or a Vite alias such as `@/components/Button.vue`. Here are the tables of an example button on this site:

<ComponentApi src="../../components/examples/KButton.vue" />

Add `only` to render one table: `props`, `events`, `slots` or `exposed`.

```md
<ComponentApi src="../../components/examples/KButton.vue" only="events" />
```

Empty tables are left out.

## Describe with JSDoc {#jsdoc}

Descriptions come from JSDoc on the component's types:

```ts
export interface KButtonProps {
  /**
   * Size.
   * @since 0.1.0
   */
  size?: 'small' | 'medium' | 'large'
  /**
   * The old rounded switch; use the theme tokens instead.
   * @deprecated removed in 0.2.0
   */
  rounded?: boolean
}
```

- `@deprecated`: strikes through the name and shows the note.
- `@since`: shows the version note.
- `@ignore`: keeps the prop out of the table and out of the demo controls.
- `@control`: picks the control in the demo controls, see [Control inference](#controls).

Write event descriptions right above each event in the `defineEmits` type; both the property form and the call-signature form work:

```ts
const emit = defineEmits<{
  /** Fired on click, with the number of presses so far. */
  press: [times: number]
}>()
```

## Control inference {#controls}

Each prop gets a control from its type. The controls of the component demo plugin use it to build their inputs:

| Type | Control |
| --- | --- |
| `boolean` | switch |
| `number` | number input |
| `string` | text input |
| literal union such as `'small' \| 'large'` | options |
| object, array, `string \| number` and similar | JSON input |
| function, `VNode`, component | no control |

The JSDoc tags `@control text`, `number`, `boolean`, `json` or `none` override the inferred control.

## Use the data elsewhere {#data}

Other plugins and page components can import a component's description directly:

```ts
import type { ComponentDoc } from '@kawapress/plugin-vue-component-meta'
import doc from './Button.vue?component-doc'
```

The default export of `?component-doc` is a `ComponentDoc` with `name`, `description`, `props`, `events`, `slots` and `exposed`. It is generated as static JSON at build time, and the type checker never reaches the browser.

## Output for AI tools {#ai-output}

In the page `.md` and in `llms-full.txt`, `ComponentApi` becomes Markdown tables with the same content.

## Options {#options}

| Option | Description |
| --- | --- |
| `tsconfig` | The tsconfig used to check components, relative to the site root. By default, the nearest `tsconfig.json` above each component, or a built-in minimal config when there is none. |
| `ignoreTypes` | Type names that are not expanded, such as large DOM types; the table shows just the name. |
| `tag` | The tag name in Markdown. Default `ComponentApi`. |
| `labels`, `localeLabels` | Override the table text. `labels` applies to every language, `localeLabels` per language. |

## Limits {#limits}

- The first component analysis loads TypeScript: about 0.3 seconds and 300 MB of memory. Only pages that use `ComponentApi` or demo controls pay for it.
- `vue` must be resolvable from the component's folder, since the types of `defineProps` and the other macros come from it. Otherwise the tables are empty and the build warns.
- When the checker cannot read the props of a generic component (`<script setup generic="T">`), the table shows a notice and the build warns.
- A relative `src` is resolved against the page path after `rewrites`.
