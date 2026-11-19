# @kawapress/plugin-feed

KawaPress 的 RSS 2.0、Atom 与 JSON Feed 输出，每种语言一套文件。

[![npm version](https://img.shields.io/npm/v/@kawapress/plugin-feed?label=npm&color=42b883)](https://www.npmjs.com/package/@kawapress/plugin-feed) · [English](https://github.com/kawapress/kawapress/blob/main/packages/plugin-feed/README.md)

`@kawapress/plugin-feed` 是 [KawaPress](https://github.com/kawapress/kawapress) 的一部分。KawaPress 是一个以 Vue 为核心的静态站点生成器。

## 特性

- 写一个 `hostname` 和要收录的页面，就得到 `feed.xml`、`atom.xml` 和 `feed.json`。
- 每个页面的 `<head>` 都带有所属语言订阅源的链接，读者可以自动发现。
- 站点的 `base` 会自动加到所有地址上。
- 条目来自 frontmatter：`title`、`date`、`description`、`author`、`image`。
- 页面可以在 frontmatter 里写 `feed: false` 退出。

## 安装

```sh
npm install --save-dev @kawapress/plugin-feed
```

也可以用 `pnpm add --save-dev @kawapress/plugin-feed` 或 `yarn add --dev @kawapress/plugin-feed`。

## 使用

```ts
import feed from '@kawapress/plugin-feed'
import { defineConfig } from 'kawapress'

export default defineConfig({
  plugins: [
    feed({
      hostname: 'https://example.com',
      include: ['blog/**/*.md'],
    }),
  ],
})
```

文章需要在 frontmatter 里写一个加了引号的 `date`：

```md
---
title: KawaPress 0.9
date: '2026-11-20'
description: 一句话摘要。
---
```

## 配置项

| 选项 | 说明 |
| --- | --- |
| `hostname` | 必填。站点的绝对地址。 |
| `include` | 必填。要收录页面的 glob，相对 `srcDir`。 |
| `exclude` | 要排除页面的 glob。 |
| `formats` | `'rss'`、`'atom'`、`'json'` 的任意组合，默认全部。 |
| `limit` | 每个订阅源的条目数，按时间倒序，默认 20。 |
| `title`、`description`、`copyright` | 订阅源信息。标题与描述默认取站点或语言的值。 |
| `author` | 默认作者，frontmatter 的 `author` 优先。 |
| `transformItems` | 在写文件之前增、删、改条目。 |

## 文档

[文档](https://kawapress.dev/plugins/feed) · [反馈问题](https://github.com/kawapress/kawapress/issues)

## 许可证

[MIT](https://github.com/kawapress/kawapress/blob/main/LICENSE) © KawaPress contributors
