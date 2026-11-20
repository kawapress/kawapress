# Vue REPL 插件

包名 `@kawapress/plugin-vue-repl`。在文档里嵌入 `@vue/repl`，读者可以直接编辑并运行 Vue 代码。

- 工程实施：`.agents/engineering/002-official-plugins-batch-1/`

## 背景与目标

Vue 组件库和教程类文档需要「改一下看看效果」。Rspress 有 React 的 plugin-playground，Vue 侧没有官方答案。这是 KawaPress 作为 Vue 文档工具的差异点之一。

目标：一个代码块加一个标记就变成可运行的 Playground；不点开时不加载 REPL，首屏不受影响；组件库可以把自己的包注入 REPL。

## Happy Path

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

页面上先显示正常高亮的代码和「运行」按钮。点击后在原位置加载 REPL（编辑器 + 预览），代码作为 `App.vue`。另有「在 Vue Playground 中打开」链接跳到 play.vuejs.org。

## 选项

```ts
interface VueReplPluginOptions {
  /** 额外的 import map，组件库用它把自己的包加进 REPL。 */
  importMap?: { imports?: Record<string, string>, scopes?: Record<string, Record<string, string>> }
  /** 预览 iframe 里额外加载的样式表，例如组件库的 CSS。 */
  previewStyles?: string[]
  /** 编辑器，默认 codemirror。 */
  editor?: 'codemirror' | 'monaco'
  /** 默认 false：点击「运行」后才加载。true 时进入视口即加载。 */
  eager?: boolean
}
```

## 语法

- 围栏信息 `vue repl` 触发，其余 `vue` 代码块不受影响。
- 多文件：连续的 `vue repl` / `ts repl` / `js repl` / `css repl` 代码块放在 `::: repl` 容器里，用代码组同样的 `[文件名]` 语法命名，第一个 `.vue` 文件是入口。
- 高度用 `{height=N}` 写在围栏信息或 `::: repl` 容器上，默认 480 像素。
- 容器里第一个文件可以省略 `[文件名]`，默认 `App.vue`；容器里出现正文、重名文件、没有 `.vue` 文件或不支持的语言时构建报错。

## 行为

- 生成侧：识别围栏，用 `addPageComponent()` 给页面加上 REPL 外壳组件，把文件内容作为 props 传入。SSR 输出的是 Shiki 高亮后的代码和按钮，与普通代码块外观一致。
- 运行侧：`@vue/repl` 及编辑器只在点击后通过动态 `import()` 加载，不进入首屏包。挂载发生在 `onMounted` 之后，SSR 与客户端首帧 DOM 一致，没有 hydration 差异。
- 明暗主题跟随 `useAppearance()` 的 `isDark`。
- 「在 Vue Playground 中打开」按 play.vuejs.org 的 hash 格式序列化文件，不依赖 REPL 已加载。
- 需要 `useRuntimeDependencies()` 声明运行侧依赖。两种编辑器的入口都要声明，否则 dev 下第一次点「运行」会因为发现新依赖而整页刷新。
- `@vue/repl` 锁在 `~4.7.2`。运行时从 jsDelivr 加载 Vue 运行时和编译器，离线时显示错误并允许重试，文档已写明。
- 按钮文字等界面文案支持 `labels` 和 `localeLabels`，与 plugin-mermaid 一致。

## 边界

- 不支持 React 等其他框架。
- 不提供在线保存或分享短链接。
- 预览运行在 iframe 沙箱里，示例代码访问父页面的行为不保证。

## 验收

- 单元测试：围栏识别、多文件容器解析、play.vuejs.org 链接生成。
- e2e：带 REPL 的页面首屏没有加载 `@vue/repl` 的 chunk；点击「运行」后能编辑代码并看到预览更新；明暗切换生效；无 hydration 警告。
- 文档页 `docs/plugins/vue-repl.md` 与英文版，含组件库注入 import map 的示例。
