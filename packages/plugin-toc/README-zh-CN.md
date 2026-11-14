# @kawapress/plugin-toc

为 KawaPress 页面提供 `[[toc]]` 页内目录。

[![npm version](https://img.shields.io/npm/v/@kawapress/plugin-toc?label=npm&color=42b883)](https://www.npmjs.com/package/@kawapress/plugin-toc) · [English](https://github.com/kawapress/kawapress/blob/main/packages/plugin-toc/README.md)

`@kawapress/plugin-toc` 是 [KawaPress](https://github.com/kawapress/kawapress) 的一部分。KawaPress 是一个以 Vue 为核心的静态站点生成器。

## 特性

- 把单独一行的 `[[toc]]`（不区分大小写）替换成 `<nav class="kawa-toc">` 包裹的嵌套章节列表。
- 默认收录页面顶层的 `h2` 和 `h3` 标题，不收录容器或引用块内部的标题。
- 链接指向标题的最终锚点 ID（包含 `{#id}` 自定义锚点），文字与右侧大纲和搜索索引保持一致。

## 安装

这个包已经包含在 `kawapress` 里。使用 `kawapress/nagi` 的站点自带它，不需要再安装。

只有不使用 nagi 预设搭建站点，或需要自定义收录的标题级别时，才需要单独安装它。

```sh
npm install --save-dev @kawapress/plugin-toc
```

也可以用 `pnpm add --save-dev @kawapress/plugin-toc` 或 `yarn add --dev @kawapress/plugin-toc`。

## 使用

```md
[[toc]]
```

```ts
import tocPlugin from '@kawapress/plugin-toc'
import { defineConfig } from 'kawapress'

export default defineConfig({
  plugins: [
    tocPlugin({
      level: [2, 3],
    }),
  ],
})
```

## 配置项

| 选项 | 说明 |
| --- | --- |
| `level` | 收录的标题级别，默认 `[2, 3]`。 |

## 文档

[文档](https://kawapress.dev/guide/markdown-extensions#table-of-contents) · [反馈问题](https://github.com/kawapress/kawapress/issues)

## 许可证

[MIT](https://github.com/kawapress/kawapress/blob/main/LICENSE) © KawaPress contributors
