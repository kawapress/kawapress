# @kawapress/plugin-badge

用于 KawaPress 标题和正文的行内徽标组件。

[![npm version](https://img.shields.io/npm/v/@kawapress/plugin-badge?label=npm&color=42b883)](https://www.npmjs.com/package/@kawapress/plugin-badge) · [English](https://github.com/kawapress/kawapress/blob/main/packages/plugin-badge/README.md)

`@kawapress/plugin-badge` 是 [KawaPress](https://github.com/kawapress/kawapress) 的一部分。KawaPress 是一个以 Vue 为核心的静态站点生成器。

## 特性

- 四种徽标类型：`tip`（默认）、`info`、`warning` 和 `danger`。
- 通过 `text` 属性或默认插槽传入文字。
- 样式位于 `@layer kawa.plugin` 层，颜色读取公共 `--kawa-*` 语义变量。
- 写在标题里的徽标不会进入页面大纲、搜索索引和浏览器标签页标题，也不会改变标题锚点。

## 安装

这个包已经包含在 `kawapress` 里。使用 `kawapress/nagi` 的站点自带它，不需要再安装。

只有不使用 nagi 预设搭建站点时，才需要单独安装它。

```sh
npm install --save-dev @kawapress/plugin-badge
```

也可以用 `pnpm add --save-dev @kawapress/plugin-badge` 或 `yarn add --dev @kawapress/plugin-badge`。

## 使用

```md
# 标题 <Badge type="tip" text="New" />

- 状态 <Badge type="info" text="v0.3" />
- 提示 <Badge type="warning">实验性</Badge>
- 旧版 <Badge type="danger" text="已废弃" />
```

```ts
import badgePlugin from '@kawapress/plugin-badge'
import { defineConfig } from 'kawapress'

export default defineConfig({
  plugins: [badgePlugin()],
})
```

## 文档

[文档](https://kawapress.dev/guide/markdown-extensions#badges) · [反馈问题](https://github.com/kawapress/kawapress/issues)

## 许可证

[MIT](https://github.com/kawapress/kawapress/blob/main/LICENSE) © KawaPress contributors
