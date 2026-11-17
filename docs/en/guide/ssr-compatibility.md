---
description: Write Vue code that runs safely during KawaPress server rendering and in the browser.
---

# SSR Compatibility

KawaPress performs server-side rendering (SSR) for initial requests during development and again during production builds. Custom code in pages, components, and Runtime Plugins must work in both Node.js and browser environments.

Read the [Vue Server-Side Rendering guide](https://vuejs.org/guide/scaling-up/ssr.html) for a broader introduction to SSR.

## Access Browser APIs {#access-browser-apis}

Browser APIs such as `window`, `document`, `navigator`, and `localStorage` do not exist on the server. Do not access them directly while setup runs.

Move browser-only work into `onMounted()`:

```vue
<script setup lang="ts">
import { onMounted, shallowRef } from 'vue'

const viewportWidth = shallowRef<number>()

onMounted(() => {
  viewportWidth.value = window.innerWidth
})
</script>

<template>
  <span v-if="viewportWidth">Viewport width: {{ viewportWidth }}px</span>
</template>
```

`onMounted()` does not run during SSR, so `window` is only accessed in the browser.

## Handle Dependencies That Access Browser APIs on Import {#handle-dependencies-that-access-browser-apis-on-import}

Some libraries access `window` as soon as their module loads. Calling the library only from `onMounted()` is not enough if a static import at the top of the file still runs during SSR.

Move the import itself into `onMounted()`:

```vue
<script setup lang="ts">
import { onMounted } from 'vue'

onMounted(async () => {
  const { mountWidget } = await import('browser-only-widget')
  mountWidget()
})
</script>
```

Regular modules can also branch on `import.meta.env.SSR`:

```ts
if (!import.meta.env.SSR) {
  const { startTracking } = await import('browser-only-library')
  startTracking()
}
```

Keep the import dynamic inside the branch. Static imports always run when the module is evaluated.

## Render a Component Only on the Client {#render-a-component-only-on-the-client}

Wrap a component that needs the DOM while rendering in Core's globally registered `<ClientOnly>`. The server and the browser's first render both produce an empty node; the component appears after mounting, without a hydration mismatch:

```vue
<script setup lang="ts">
import { defineAsyncComponent } from 'vue'

const ClientWidget = defineAsyncComponent(
  () => import('./ClientWidget.vue'),
)
</script>

<template>
  <ClientOnly>
    <ClientWidget />
  </ClientOnly>
</template>
```

`ClientOnly` can also be imported from `kawapress/client` for use in a regular Vue component.

Use `useAppearance()` when a component needs to follow the light or dark appearance:

```ts
import { useAppearance } from 'kawapress/client'

const { isDark } = useAppearance()
```

It follows the `dark` / `light` class on `<html>`, or the operating system preference when neither class is present. `isDark` updates when the theme toggles that class.

## Use a Browser Plugin from a Runtime Plugin {#use-a-browser-plugin-from-a-runtime-plugin}

The same Runtime Plugin source enters both the SSR and client module graphs. Dynamically import a Vue plugin in the non-SSR branch when it accesses browser APIs during module evaluation:

```ts
import { defineRuntimePlugin } from 'kawapress'

export default defineRuntimePlugin({
  name: 'browser-only-plugin',
  setup(api) {
    api.vueApp(async (app) => {
      if (!import.meta.env.SSR) {
        const { default: browserPlugin } = await import('browser-plugin')
        app.use(browserPlugin)
      }
    })
  },
})
```

Use this pattern only for browser behavior that does not change the initial HTML. If a plugin changes the component tree, use the client-only component boundary from the previous section to keep server and browser output aligned.

## Load the Same Dependency on Both Sides {#load-the-same-dependency-on-both-sides}

The server and the browser must run the same component code. A common trap is export conditions configured for the client only: since Vite 6, the top-level `resolve.conditions` applies to the browser build, while the server build reads `ssr.resolve.conditions`. With the config below the browser bundles a component library's `src/` while the server still bundles its prebuilt `dist/`, and any difference between the two causes hydration mismatches:

```ts
import { defineConfig } from 'kawapress'

export default defineConfig({
  vite: {
    resolve: { conditions: ['source', 'module', 'browser', 'development|production'] },
  },
})
```

Give the server the same condition:

```ts
export default defineConfig({
  vite: {
    resolve: { conditions: ['source', 'module', 'browser', 'development|production'] },
    ssr: { resolve: { conditions: ['source'] } },
  },
})
```

`kawapress build` checks the dependencies both sides bundle. When one import reaches different export conditions on the two sides, the build warns, lists the file each side loaded, and names the conditions to add to `ssr.resolve.conditions`. A browser build that a package ships on purpose through the `browser` condition does not trigger the warning.

## Keep the First Render Stable {#keep-the-first-render-stable}

Hydration requires the server HTML and the browser's first render to produce the same node structure and text. Avoid using these values directly during the first render:

- `Date.now()` or other request-dependent timestamps;
- `Math.random()`;
- browser viewport dimensions;
- user settings that exist only in `localStorage`.

Start with a stable value, then read browser state from `onMounted()`. Data needed by both environments should come from the same pageData, site configuration, or route information.

KawaPress also performs real SSR in development. Compatibility errors usually appear while developing instead of waiting until a production build.
