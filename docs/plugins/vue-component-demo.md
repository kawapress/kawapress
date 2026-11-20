---
title: 组件演示
description: 把组件示例写成独立的 .vue 文件，在文档里展示真实渲染的效果和高亮源码；配合组件 API 插件，还能生成属性调节面板。
---

# 组件演示

组件库的文档几乎每一页都是「效果 + 源码」：先看组件长什么样，再看怎么写。把示例代码直接写在 Markdown 里，编辑器没有类型提示，示例也没法在别处复用。

`@kawapress/plugin-vue-component-demo` 让你把示例写成独立的 `.vue` 文件，在页面里真实渲染它，并在下方附上与站点代码块一致的高亮源码。示例和普通页面一样经过服务端渲染，不是 iframe，也不是在线编辑器。

## 安装 {#install}

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

## 展示一个示例 {#show-a-demo}

示例是一个普通的 Vue 单文件组件：

```vue
<script setup lang="ts">
import KButton from '../KButton.vue'
</script>

<template>
  <div class="row">
    <KButton label="小" size="small" />
    <KButton label="中" />
    <KButton label="大" size="large" />
  </div>
</template>
```

在 Markdown 里用 `ComponentDemo` 标签引用它：

```md
<ComponentDemo
  src="../components/examples/demos/ButtonSizes.vue"
  title="尺寸"
  description="按钮有 `small`、`medium`、`large` 三种尺寸。"
/>
```

效果如下：

<ComponentDemo
  src="../components/examples/demos/ButtonSizes.vue"
  title="尺寸"
  description="按钮有 `small`、`medium`、`large` 三种尺寸。"
/>

源码默认折叠，点「展开源码」查看，「复制源码」复制整个文件。示例是真实的组件，状态和事件都照常工作：

<ComponentDemo src="../components/examples/demos/ButtonCounter.vue" title="计数" />

## 标签属性 {#attributes}

| 属性 | 说明 |
| --- | --- |
| `src` | 示例文件，相对当前 Markdown 文件，也可以写 Vite alias，例如 `@/demos/Basic.vue`。 |
| `title` | 标题，支持行内 Markdown。 |
| `description` | 说明，支持行内 Markdown。 |
| `client-only` | 示例只在浏览器里渲染，见下文。 |

## 只在浏览器里渲染 {#client-only}

示例在服务端也会渲染一次。用到 `window`、`document` 等浏览器 API 的示例，加上 `client-only`，服务端只输出占位，页面加载后再渲染：

```md
<ComponentDemo src="../components/examples/demos/ViewportWidth.vue" client-only />
```

<ComponentDemo src="../components/examples/demos/ViewportWidth.vue" title="窗口宽度" client-only />

## 修改示例时 {#editing}

开发服务器里修改示例文件，渲染效果和展开的源码都会热更新，页面不刷新，示例里的状态也会保留。

## 给 AI 工具的输出 {#ai-output}

页面的 `.md` 与 `llms-full.txt` 里，每个示例输出为标题、说明和完整的源码代码块，不包含渲染结果。

## 选项 {#options}

| 选项 | 说明 |
| --- | --- |
| `tag` | Markdown 里的标签名，默认 `ComponentDemo`。 |
| `expandSource` | 源码默认展开，默认 `false`。 |
| `labels`、`localeLabels` | 改写按钮文字。`labels` 作用于所有语言，`localeLabels` 按语言改写。 |

## 说明 {#notes}

- 示例是页面里的普通组件，不做样式隔离。示例自己的样式请写成 `scoped`。
- 标签要单独成段，不能写在一段文字中间。
- 相对路径的 `src` 按页面源文件的位置解析。
