# @kawapress/plugin-vue-repl

KawaPress Markdown 的可编辑、可运行 Vue 示例，基于 `@vue/repl`。

[![npm version](https://img.shields.io/npm/v/@kawapress/plugin-vue-repl?label=npm&color=42b883)](https://www.npmjs.com/package/@kawapress/plugin-vue-repl) · [English](https://github.com/kawapress/kawapress/blob/main/packages/plugin-vue-repl/README.md)

`@kawapress/plugin-vue-repl` 是 [KawaPress](https://github.com/kawapress/kawapress) 的一部分。KawaPress 是一个以 Vue 为核心的静态站点生成器。

## 特性

- 在 `vue` 代码块上加 `repl`，读者就能在页面里直接编辑并运行。
- 读者点击「运行」后才加载 REPL，首屏不受影响。在那之前它就是一个普通的高亮代码块。
- 用 `::: repl` 容器在一个示例里放多个文件。
- 每个示例都有「在 Vue Playground 中打开」链接，构建时生成。
- 组件库可以用 import map 和预览样式，把自己的包加进 REPL。
- 编辑器和预览跟随站点的明暗模式。

## 安装

```sh
npm install --save-dev @kawapress/plugin-vue-repl
```

也可以用 `pnpm add --save-dev @kawapress/plugin-vue-repl` 或 `yarn add --dev @kawapress/plugin-vue-repl`。

## 使用

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

用 `[Name.vue]` 给文件命名，用 `{height=600}` 设置高度（单位像素，默认 480）。需要多个文件时，把代码块放进 `::: repl` 容器并分别命名，第一个 `.vue` 文件是入口。

## 配置项

| 选项 | 说明 |
| --- | --- |
| `importMap` | 额外的 import map，把自己的包加进 REPL。 |
| `previewStyles` | 预览里额外加载的样式表。 |
| `editor` | `codemirror`（默认）或 `monaco`。 |
| `eager` | 示例滚动到视口后自动加载，不等点击「运行」。默认 `false`。 |
| `labels` | 改写所有语言的文字。 |
| `localeLabels` | 改写某一种语言的文字。 |

## 文档

[文档](https://kawapress.dev/plugins/vue-repl) · [反馈问题](https://github.com/kawapress/kawapress/issues)

## 许可证

[MIT](https://github.com/kawapress/kawapress/blob/main/LICENSE) © KawaPress contributors
