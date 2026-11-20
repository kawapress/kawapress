---
title: 组件 API
description: 构建时从 Vue 组件源码读出 Props、事件、插槽与组件实例公开接口，渲染成随源码更新的 API 表格，并提供给组件演示的调节面板。
---

# 组件 API

组件库文档里最费力、也最容易过时的是 API 表格：组件加了一个 prop，表格常常忘了改。

`@kawapress/plugin-vue-component-meta` 在构建时用 [vue-component-meta](https://github.com/vuejs/language-tools/tree/master/packages/component-meta) 读组件源码，把 Props、事件、插槽与组件实例公开接口渲染成表格。它借助 TypeScript 类型检查器，导入的类型、`withDefaults` 的默认值和 JSDoc 说明都能读到。组件改了，表格跟着变。

## 安装 {#install}

```sh
npm install --save-dev @kawapress/plugin-vue-component-meta typescript
```

TypeScript 6 是 peer 依赖。TypeScript 7 的原生实现暂时没有检查器需要的 JavaScript API，还不能使用。

```ts
import vueComponentMetaPlugin from '@kawapress/plugin-vue-component-meta'
import { nagi } from 'kawapress/nagi'

export default nagi({
  plugins: [vueComponentMetaPlugin()],
})
```

## 渲染 API 表格 {#render-tables}

在 Markdown 里写 `ComponentApi` 标签，`src` 指向组件文件：

```md
<ComponentApi src="../components/examples/KButton.vue" />
```

`src` 相对当前 Markdown 文件，也可以写 Vite alias，例如 `@/components/Button.vue`。下面是本站一个示例按钮的表格：

<ComponentApi src="../components/examples/KButton.vue" />

只要其中一张表时加上 `only`，可选 `props`、`events`、`slots`、`exposed`：

```md
<ComponentApi src="../components/examples/KButton.vue" only="events" />
```

空的表会被省略。

## 用 JSDoc 写说明 {#jsdoc}

表格里的说明来自组件类型上的 JSDoc：

```ts
export interface KButtonProps {
  /**
   * 尺寸。
   * @since 0.1.0
   */
  size?: 'small' | 'medium' | 'large'
  /**
   * 旧的圆角开关，请改用主题 Token。
   * @deprecated 0.2.0 起移除
   */
  rounded?: boolean
}
```

- `@deprecated`：名称加删除线，并显示说明。
- `@since`：显示版本说明。
- `@ignore`：这个 prop 不进表格，也不进组件演示的调节面板。
- `@control`：指定调节面板的控件，见[控件推断](#controls)。

事件的说明写在 `defineEmits` 类型里事件声明的上方，属性写法和调用签名写法都可以：

```ts
const emit = defineEmits<{
  /** 点击按钮时触发，参数是累计点击次数。 */
  press: [times: number]
}>()
```

## 控件推断 {#controls}

每个 prop 会按类型推断出一种控件，[组件演示](/plugins/vue-component-demo#controls)的调节面板用它生成输入项：

| 类型 | 控件 |
| --- | --- |
| `boolean` | 开关 |
| `number` | 数字输入 |
| `string` | 文本输入 |
| 字面量联合，如 `'small' \| 'large'` | 选项 |
| 对象、数组、`string \| number` 等 | JSON 输入 |
| 函数、`VNode`、组件 | 不提供控件 |

JSDoc 的 `@control text`、`number`、`boolean`、`json` 或 `none` 可以覆盖推断结果。

## 在其他插件里使用数据 {#data}

其他插件或页面组件可以直接导入组件的描述：

```ts
import type { ComponentDoc } from '@kawapress/plugin-vue-component-meta'
import doc from './Button.vue?component-doc'
```

`?component-doc` 的默认导出是 `ComponentDoc`，包含 `name`、`description`、`props`、`events`、`slots` 和 `exposed`。它在构建时生成为静态 JSON，类型检查器不会进入浏览器。

## 给 AI 工具的输出 {#ai-output}

页面的 `.md` 与 `llms-full.txt` 里，`ComponentApi` 输出为内容相同的 Markdown 表格。

## 选项 {#options}

| 选项 | 说明 |
| --- | --- |
| `tsconfig` | 用于检查组件的 tsconfig，相对站点根目录。默认取组件所在目录向上最近的 `tsconfig.json`，找不到时使用内置的最小配置。 |
| `ignoreTypes` | 不展开的类型名，例如很大的 DOM 类型；表格里只显示类型名。 |
| `tag` | Markdown 里的标签名，默认 `ComponentApi`。 |
| `labels`、`localeLabels` | 改写表格文字。`labels` 作用于所有语言，`localeLabels` 按语言改写。 |

## 限制 {#limits}

- 第一次分析组件要加载 TypeScript，约需 0.3 秒和 300 MB 内存。只有用到 `ComponentApi` 或组件演示调节面板的页面才会触发。
- 组件所在目录必须能解析到 `vue`，`defineProps` 等宏的类型来自它；解析不到时表格为空，构建会给出警告。
- 检查器读不出泛型组件（`<script setup generic="T">`）的 props 时，表格显示提示，构建时输出警告。
- 相对路径的 `src` 按页面经过 `rewrites` 之后的路径解析。
