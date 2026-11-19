---
title: 插件市场
description: 全部 KawaPress 官方插件：按类别筛选、一键复制安装命令，以及社区插件的入口。
outline: false
---

<script setup lang="ts">
import PluginMarket from '../components/PluginMarket.vue'
import { data } from './plugins.data.ts'
</script>

# 插件市场

KawaPress 的功能分成很多个小插件，每个插件只做一件事。标着「nagi 已内置」的插件，用 `kawapress/nagi` 创建的站点已经自带；其余插件先安装，再写进 `kawapress.config.ts` 的 `plugins`：

```ts
import mermaidPlugin from '@kawapress/plugin-mermaid'
import { nagi } from 'kawapress/nagi'

export default nagi({
  plugins: [mermaidPlugin()],
})
```

<PluginMarket :plugins="data" locale="zhCN" />

## 社区插件 {#community-plugins}

社区插件约定使用 `kawapress-plugin-<名字>` 或 `@scope/kawapress-plugin-<名字>` 作为包名，并在 `package.json` 的 `keywords` 中加上 `kawapress-plugin`。按这个关键词就能在 npm 上找到它们：

<p><a class="plugin-market-community" href="https://www.npmjs.com/search?q=keywords%3Akawapress-plugin" target="_blank" rel="noreferrer">在 npm 上浏览社区插件 →</a></p>

想自己写一个？从 [插件开发](/plugins/plugin-development) 开始。
