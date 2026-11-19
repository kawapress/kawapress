---
title: Vue REPL
description: 在文档里嵌入可编辑、可运行的 Vue 示例，点击「运行」才加载 @vue/repl，不影响页面首屏，并能一键在 Vue Playground 中打开。
---

# Vue REPL

教程和组件库文档里，读者最想做的事是「改一行，看看会怎样」。`@kawapress/plugin-vue-repl` 把一个代码块变成可以编辑、可以运行的示例，背后是 Vue 官方的 [`@vue/repl`](https://github.com/vuejs/repl)，和 [play.vuejs.org](https://play.vuejs.org) 用的是同一套。

REPL 本身不小，所以它不会随页面一起下载。页面先显示一个普通的高亮代码块，读者点了「运行」，编辑器和预览才在原位置加载出来。

## 写一个示例 {#write-an-example}

在 `vue` 代码块的语言处加上 `repl`：

````md
```vue repl
<script setup>
import { ref } from 'vue'

const count = ref(0)
</script>

<template>
  <button @click="count++">
    点了 {{ count }} 次
  </button>
</template>
```
````

效果如下，点击「运行」试试：

```vue repl
<script setup>
import { ref } from 'vue'

const count = ref(0)
</script>

<template>
  <button @click="count++">
    点了 {{ count }} 次
  </button>
</template>
```

没有写 `repl` 的 `vue` 代码块不受影响，仍然是普通代码块。

代码块里的内容会作为 `App.vue`。想换个文件名，在后面写 `[文件名]`，和代码组（`code-group`）里给标签命名是同一种写法：

````md
```vue repl [Counter.vue]
...
```
````

## 多个文件 {#multiple-files}

示例里需要拆出 `.ts`、`.js` 或 `.css` 文件时，把连续的代码块放进 `::: repl` 容器，每个代码块用 `[文件名]` 命名。第一个 `.vue` 文件是入口：

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

容器里只能放代码块，语言可以是 `vue`、`ts`、`js`、`css` 或 `json`。容器里的代码块不必再写 `repl`。同一个容器里文件名不能重复，也至少要有一个 `.vue` 文件。

## 高度 {#height}

示例区域默认高 480 像素。在代码块的信息里写 `{height=600}`，单个示例就换成别的高度：

````md
```vue repl {height=300}
...
```
````

容器的写法是 `::: repl {height=600}`。

## 在 Vue Playground 中打开 {#playground}

每个示例下面都有「在 Vue Playground 中打开」链接，点开后代码已经在 [play.vuejs.org](https://play.vuejs.org) 里了，读者可以在那里继续改、分享。

链接在构建时就生成好了，不需要先点「运行」。如果配置了 `importMap`，它也会一起带过去，但 Playground 不会加载你的 `previewStyles`。

## 让示例用上你的组件库 {#component-library}

组件库的示例需要 `import { MyButton } from 'my-ui'` 能工作。用 `importMap` 告诉 REPL 这个包从哪里加载，用 `previewStyles` 给预览加上组件库的样式：

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

这样示例里就可以写：

````md
```vue repl
<script setup>
import { MyButton } from 'my-ui'
</script>

<template>
  <MyButton type="primary">确定</MyButton>
</template>
```
````

`importMap` 的写法是浏览器的[标准 import map](https://developer.mozilla.org/zh-CN/docs/Web/HTML/Element/script/type/importmap)，值必须是浏览器能直接加载的 ES 模块地址。组件库如果依赖 Vue，请让它把 `vue` 当成外部依赖，不要把 Vue 打进自己的文件里，否则预览里会出现两份 Vue。

## 配置 {#options}

```ts
import vueReplPlugin from '@kawapress/plugin-vue-repl'
import { nagi } from 'kawapress/nagi'

export default nagi({
  plugins: [
    vueReplPlugin({
      editor: 'codemirror',
      eager: false,
      labels: {
        run: '试一试',
      },
      localeLabels: {
        en: { playground: 'Playground' },
      },
    }),
  ],
})
```

| 选项 | 说明 |
| --- | --- |
| `importMap` | 额外的 import map，把组件库等自己的包加进 REPL。有 `imports` 和 `scopes` 两部分。 |
| `previewStyles` | 预览里额外加载的样式表地址，例如组件库的 CSS。 |
| `editor` | 编辑器，`codemirror`（默认）或 `monaco`。CodeMirror 更轻；Monaco 有补全和类型提示，但更重，还会从 CDN 下载类型声明。 |
| `eager` | 默认 `false`，点击「运行」才加载。设为 `true` 后，示例滚动到视口附近就自动加载并运行。 |
| `labels` | 覆盖所有语言的文字。 |
| `localeLabels` | 只覆盖某一种语言的文字，键是 `locales` 里的语言名。 |

可以覆盖的文字有 `region`、`run`、`loading`、`playground`、`failed`。内置中文和英文，其他语言回退英文。

## 明暗模式 {#theme}

编辑器和预览都会跟随站点的明暗模式，切换时立刻变化。

## 样式 {#styles}

插件的样式放在 `kawa.plugin` 样式层，只读取公共的 `--kawa-*` 变量。需要微调时，覆盖这些类名：

| 类名 | 对应的元素 |
| --- | --- |
| `.kawa-vue-repl` | 整个示例块 |
| `.kawa-vue-repl__source` | 点击前显示的代码 |
| `.kawa-vue-repl__stage` | 加载后放 REPL 的区域 |
| `.kawa-vue-repl__bar` | 底部放按钮和链接的一栏 |
| `.kawa-vue-repl__run` | 「运行」按钮 |

## 安装 {#install}

nagi 预设没有内置这个插件，需要单独安装：

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

加入 `plugins` 就够了。需要用到的组件和样式，KawaPress 会自动加载；页面里没有示例时，什么都不会下载。

## 注意事项 {#limitations}

- 预览里的 Vue 和编译器从 CDN（jsDelivr）加载，读者需要能访问网络。加载失败时按钮旁会提示，可以再点一次重试。
- 预览运行在 iframe 里，示例代码访问父页面的行为不保证可用。
- 只支持 Vue。React 等其他框架不在范围内。
- 不提供在线保存和短链接分享；要分享请用「在 Vue Playground 中打开」。
- 插件依赖 `@vue/repl` 的公开接口，版本锁在 4.7 的次版本范围内，升级会随本插件的新版本发布。
