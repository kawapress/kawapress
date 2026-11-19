---
title: Plugin Market
description: Every official KawaPress plugin, filterable by category with one-click install commands, plus the way to community plugins.
outline: false
---

<script setup lang="ts">
import PluginMarket from '../../components/PluginMarket.vue'
import { data } from '../../plugins/plugins.data.ts'
</script>

# Plugin Market

KawaPress splits its features into small plugins, and each plugin does one thing. Plugins marked "Included in nagi" already come with a site created with `kawapress/nagi`. Install the others first, then add them to `plugins` in `kawapress.config.ts`:

```ts
import mermaidPlugin from '@kawapress/plugin-mermaid'
import { nagi } from 'kawapress/nagi'

export default nagi({
  plugins: [mermaidPlugin()],
})
```

<PluginMarket :plugins="data" locale="en" />

## Community Plugins {#community-plugins}

Community plugins are named `kawapress-plugin-<name>` or `@scope/kawapress-plugin-<name>` and add `kawapress-plugin` to `keywords` in `package.json`. That keyword finds them on npm:

<p><a class="plugin-market-community" href="https://www.npmjs.com/search?q=keywords%3Akawapress-plugin" target="_blank" rel="noreferrer">Browse community plugins on npm →</a></p>

Want to write one? Start with [Plugin Development](/en/plugins/plugin-development).
