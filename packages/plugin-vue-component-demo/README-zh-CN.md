# @kawapress/plugin-vue-component-demo

KawaPress Markdown 的 Vue 组件演示：真实渲染的示例，加上高亮的源码。

[![npm version](https://img.shields.io/npm/v/@kawapress/plugin-vue-component-demo?label=npm&color=42b883)](https://www.npmjs.com/package/@kawapress/plugin-vue-component-demo) · [English](https://github.com/kawapress/kawapress/blob/main/packages/plugin-vue-component-demo/README.md)

`@kawapress/plugin-vue-component-demo` 是 [KawaPress](https://github.com/kawapress/kawapress) 的一部分。KawaPress 是一个以 Vue 为核心的静态站点生成器。

## 特性

- 每个示例写成独立的 `.vue` 文件，编辑器里有完整的类型提示，在 Markdown 里用一个标签引用。
- 示例在页面里真实渲染（服务端渲染加 hydration），不是 iframe。
- 示例下方的源码用站点自己的 Shiki 配置高亮，和页面里的代码块一致，明暗主题都适用。
- 开发服务器里修改示例文件，渲染结果和源码一起更新，不需要重新编译页面。
- 依赖浏览器 API 的示例可以标成 `client-only`。
- 页面的 `.md` 输出（LLMS 插件生成）里是标题、说明和完整源码，不含渲染结果。

## 安装

```sh
npm install --save-dev @kawapress/plugin-vue-component-demo
```

`pnpm add --save-dev @kawapress/plugin-vue-component-demo` 和 `yarn add --dev @kawapress/plugin-vue-component-demo` 同样可以。

## 使用

```ts
import vueComponentDemoPlugin from '@kawapress/plugin-vue-component-demo'
import { nagi } from 'kawapress/nagi'

export default nagi({
  plugins: [vueComponentDemoPlugin()],
})
```

然后在任意 Markdown 页面里把标签单独写成一行：

```md
<ComponentDemo
  src="./demos/ButtonBasic.vue"
  title="基础用法"
  description="按钮有三种**尺寸**。"
/>
```

上方是示例，下方是标题、说明和工具栏（展开或收起源码、复制）。源码默认折叠。

| 属性 | 说明 |
| --- | --- |
| `src` | 示例文件。相对当前 Markdown 文件，也可以写 Vite alias 或绝对路径。必填。 |
| `title`、`description` | 显示在示例下方，支持行内 Markdown。 |
| `client-only` | 只在浏览器里渲染。服务端输出占位，示例文件不会在服务端运行。 |

标签要独占一个块，前后留空行。文件不存在或标签写错时，构建会失败，并指出页面和行号。

## 选项

| 选项 | 说明 |
| --- | --- |
| `tag` | Markdown 里的标签名，默认 `ComponentDemo`。 |
| `expandSource` | 源码默认展开，默认 `false`。 |
| `labels` | 覆盖所有语言的文案。 |
| `localeLabels` | 覆盖某一种语言的文案。 |

## 说明

- 源码由站点的 Markdown 高亮器渲染，所以 Shiki 的主题、语言和 transformer 对它同样生效。
- 相对路径的 `src` 按页面在源码目录里的路径解析。被 `rewrites` 移到其他路由的页面，仍按它原来的源码位置解析。
- `component` 属性（由组件生成调节面板）暂未提供，使用时构建会报错并给出提示。

## 文档

[文档](https://kawapress.dev/plugins/vue-component-demo) · [反馈问题](https://github.com/kawapress/kawapress/issues)

## 许可证

[MIT](https://github.com/kawapress/kawapress/blob/main/LICENSE) © KawaPress contributors
