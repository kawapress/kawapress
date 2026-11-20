# @kawapress/plugin-vue-component-meta

API tables for Vue components in KawaPress Markdown, read from the source with `vue-component-meta`.

[![npm version](https://img.shields.io/npm/v/@kawapress/plugin-vue-component-meta?label=npm&color=42b883)](https://www.npmjs.com/package/@kawapress/plugin-vue-component-meta) · [简体中文](https://github.com/kawapress/kawapress/blob/main/packages/plugin-vue-component-meta/README-zh-CN.md)

`@kawapress/plugin-vue-component-meta` is part of [KawaPress](https://github.com/kawapress/kawapress), a Vue-first static site generator.

## Features

- One tag renders the Props, Events, Slots and Exposed tables of a component. Change the component and the tables follow.
- The TypeScript checker reads the component, so imported types, `withDefaults` values and JSDoc all show up. `@deprecated` strikes the name through and `@since` adds a version note.
- Hot updates in the dev server when the component or a type it imports changes.
- The page's `.md` output (for AI tools) contains the same tables as Markdown.
- `import doc from './Button.vue?component-doc'` gives other plugins a plain-JSON description of the component, including an editable control kind for every prop.
- Tables use Chinese or English labels by the page language, and the labels can be overridden.

## Install

```sh
npm install --save-dev @kawapress/plugin-vue-component-meta typescript
```

`pnpm add --save-dev @kawapress/plugin-vue-component-meta typescript` and `yarn add --dev @kawapress/plugin-vue-component-meta typescript` work too. TypeScript 6 is a peer dependency; TypeScript 7 does not offer the JavaScript API the checker needs yet.

## Usage

```ts
import vueComponentMetaPlugin from '@kawapress/plugin-vue-component-meta'
import { nagi } from 'kawapress/nagi'

export default nagi({
  plugins: [vueComponentMetaPlugin()],
})
```

```md
<ComponentApi src="../src/Button.vue" />
```

`src` is relative to the Markdown file, or a Vite alias such as `@/components/Button.vue`. Add `only="props"` (or `events`, `slots`, `exposed`) to render one table. Empty tables are left out.

Describe a prop with JSDoc:

```ts
interface Props {
  /**
   * Visual size.
   * @since 0.2.0
   */
  size?: 'small' | 'medium' | 'large'
  /**
   * Free-form color.
   * @control text
   */
  color?: string | number
  /** @ignore */
  internal?: boolean
}
```

`@ignore` hides a prop from the table and from the demo plugin's control panel. `@control text|number|boolean|json|none` overrides the control that is inferred from the type.

### Control inference

| Type | Control |
| --- | --- |
| `boolean` | `boolean` |
| `number` | `number` |
| `string` | `text` |
| Literal union such as `'a' \| 'b'` | `select` |
| Objects, arrays, `string \| number` | `json` |
| Functions, `VNode`, components | `none` |

### Data model

```ts
import type { ComponentDoc, PropControl, PropDoc } from '@kawapress/plugin-vue-component-meta'
import doc from './Button.vue?component-doc'
```

The default export of a `?component-doc` import is a `ComponentDoc`: `name`, `description`, `props`, `events`, `slots`, `exposed`. The module is static JSON, so the checker never reaches the browser bundle. The types are also exported from `@kawapress/plugin-vue-component-meta/types`, which imports nothing else.

## Options

| Option | Description |
| --- | --- |
| `tsconfig` | tsconfig used to check the components, relative to the site root. Default: the nearest `tsconfig.json` above each component, or a built-in minimal config. |
| `ignoreTypes` | Type names that are not expanded, for example large DOM types. |
| `tag` | Tag name in Markdown. Default `ComponentApi`. |
| `labels` | Override the texts for every language. |
| `localeLabels` | Override the texts for one language. |

## Limitations

- Analysing a component loads TypeScript: the first one takes about 0.3 seconds and 300 MB of memory. Only pages that use the tag, or the demo plugin's control panel, pay for it.
- If the checker returns nothing for a generic component (`<script setup generic="T">`), the table shows a notice and the build prints a warning.
- Event descriptions must be written as JSDoc on the properties of a type literal; comments on call signatures are lost.
- A relative `src` is resolved against the page's path after `rewrites`.

## Documentation

[Documentation](https://kawapress.dev/en/plugins/vue-component-meta) · [Report a problem](https://github.com/kawapress/kawapress/issues)

## License

[MIT](https://github.com/kawapress/kawapress/blob/main/LICENSE) © KawaPress contributors
