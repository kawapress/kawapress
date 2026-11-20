# @kawapress/plugin-vue-component-meta

为 KawaPress Markdown 生成 Vue 组件的 API 表格，由 `vue-component-meta` 从源码读出。

[![npm version](https://img.shields.io/npm/v/@kawapress/plugin-vue-component-meta?label=npm&color=42b883)](https://www.npmjs.com/package/@kawapress/plugin-vue-component-meta) · [English](https://github.com/kawapress/kawapress/blob/main/packages/plugin-vue-component-meta/README.md)

`@kawapress/plugin-vue-component-meta` 是 [KawaPress](https://github.com/kawapress/kawapress) 的一部分。KawaPress 是一个以 Vue 为核心的静态站点生成器。

## 特性

- 一个标签渲染出组件的 Props、事件、插槽与公开接口表格，组件改了表格跟着变。
- 由 TypeScript 检查器读组件，导入的类型、`withDefaults` 默认值和 JSDoc 都能读到。`@deprecated` 给名称加删除线，`@since` 显示版本说明。
- 开发服务器里，组件或它引用的类型文件改动后表格热更新。
- 页面的 `.md` 输出（给 AI 工具看）里有同样内容的 Markdown 表格。
- `import doc from './Button.vue?component-doc'` 把组件描述作为纯 JSON 交给其他插件，其中每个 prop 都带可编辑的控件类型。
- 表格按页面语言使用中文或英文文案，文案可以改写。

## 安装

```sh
npm install --save-dev @kawapress/plugin-vue-component-meta typescript
```

也可以用 `pnpm add --save-dev @kawapress/plugin-vue-component-meta typescript` 或 `yarn add --dev @kawapress/plugin-vue-component-meta typescript`。TypeScript 6 是 peer 依赖；TypeScript 7 暂时没有检查器需要的 JavaScript API。

## 使用

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

`src` 相对当前 Markdown 文件，也可以写 Vite alias，例如 `@/components/Button.vue`。加上 `only="props"`（或 `events`、`slots`、`exposed`）只渲染其中一张表。空表会被省略。

用 JSDoc 描述 prop：

```ts
interface Props {
  /**
   * 视觉尺寸。
   * @since 0.2.0
   */
  size?: 'small' | 'medium' | 'large'
  /**
   * 任意颜色。
   * @control text
   */
  color?: string | number
  /** @ignore */
  internal?: boolean
}
```

`@ignore` 让 prop 不进表格，也不进 demo 插件的调节面板。`@control text|number|boolean|json|none` 覆盖由类型推断出的控件。

### 控件推断

| 类型 | 控件 |
| --- | --- |
| `boolean` | `boolean` |
| `number` | `number` |
| `string` | `text` |
| 字面量联合，如 `'a' \| 'b'` | `select` |
| 对象、数组、`string \| number` | `json` |
| 函数、`VNode`、组件 | `none` |

### 数据模型

```ts
import type { ComponentDoc, PropControl, PropDoc } from '@kawapress/plugin-vue-component-meta'
import doc from './Button.vue?component-doc'
```

`?component-doc` 的默认导出是 `ComponentDoc`：`name`、`description`、`props`、`events`、`slots`、`exposed`。这个模块是静态 JSON，检查器不会进入浏览器产物。

## 配置项

| 选项 | 说明 |
| --- | --- |
| `tsconfig` | 用于检查组件的 tsconfig，相对站点根目录。默认取每个组件向上最近的 `tsconfig.json`，找不到就用内置的最小配置。 |
| `ignoreTypes` | 不展开的类型名，例如很大的 DOM 类型。 |
| `tag` | Markdown 里的标签名，默认 `ComponentApi`。 |
| `labels` | 改写所有语言的文字。 |
| `localeLabels` | 改写某一种语言的文字。 |

## 限制

- 分析组件会加载 TypeScript：第一次约需 0.3 秒、300 MB 内存。只有用到这个标签或 demo 调节面板的页面才会承担。
- 检查器读不出泛型组件（`<script setup generic="T">`）时，表格显示提示，构建时输出警告。
- 相对路径的 `src` 按页面经过 `rewrites` 之后的路径解析。

## 文档

[文档](https://kawapress.dev/plugins/vue-component-meta) · [反馈问题](https://github.com/kawapress/kawapress/issues)

## 许可证

[MIT](https://github.com/kawapress/kawapress/blob/main/LICENSE) © KawaPress contributors
