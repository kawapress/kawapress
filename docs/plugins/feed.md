---
title: 订阅源
description: 用 @kawapress/plugin-feed 为博客、更新日志生成 RSS、Atom 与 JSON Feed，并自动加入订阅发现链接。
---

# 订阅源

博客、更新日志和周报类站点需要让读者订阅更新。`@kawapress/plugin-feed` 会在构建时生成 RSS 2.0、Atom 与 JSON Feed 三种订阅源，并在每个页面的 `<head>` 中加入自动发现链接，浏览器和阅读器据此找到订阅地址。

## 安装 {#install}

::: code-group
```sh [npm]
npm install --save-dev @kawapress/plugin-feed
```

```sh [pnpm]
pnpm add --save-dev @kawapress/plugin-feed
```

```sh [Yarn]
yarn add --dev @kawapress/plugin-feed
```
:::

## 启用订阅源 {#enable-feed}

在 `kawapress.config.ts` 中添加插件，写上 `hostname` 和要收录的页面：

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

`hostname` 是站点的绝对地址，必须以 `http://` 或 `https://` 开头，缺失或不合法时插件会直接抛错。站点配置的 `base` 会自动追加到它后面，因此无需重复写入。

`include` 是相对 `srcDir` 的 glob，必须填写，它决定哪些页面进入订阅源。插件不会默认收录整站文档。需要排除的页面用 `exclude` 指定。

## 文章页 frontmatter {#frontmatter}

订阅源的条目取自页面的 frontmatter：

```md
---
title: KawaPress 0.9
date: '2026-11-20'
description: 独立版本号与新插件。
author: ShenQingChuan
image: /images/0.9-cover.png
---
```

| 字段 | 说明 |
| --- | --- |
| `title` | 条目标题，即页面标题。 |
| `date` | 必填。发布时间，条目按它倒序排列。 |
| `description` | 条目摘要。没有时取正文第一段的纯文本，最多 300 个字符。 |
| `author` | 作者名，也可以写成 `{ name, email, link }`。优先于插件的 `author` 选项。 |
| `image` | 封面图。站内路径会自动拼成带 `hostname` 和 `base` 的绝对地址。 |
| `feed` | 写 `false` 可以把该页排除在订阅源之外。 |

`date` 必须是加引号的字符串。未加引号的 YAML 日期会被解析成 `Date` 对象，而 KawaPress 页面数据只接受可以序列化为 JSON 的值，因此构建会报错。

匹配 `include` 却没有可解析 `date` 的页面不会进入订阅源，构建时会列出这些页面并输出 warning。博客列表页通常没有 `date`，请用 `exclude` 排除，例如 `exclude: ['blog/index.md']`。

订阅源只输出摘要，不输出文章全文。

## 输出文件 {#output}

构建后得到三个文件，写入构建输出的根目录：

| 格式 | 文件 |
| --- | --- |
| RSS 2.0 | `feed.xml` |
| Atom | `atom.xml` |
| JSON Feed | `feed.json` |

部署后，订阅地址形如 `https://example.com/feed.xml`；站点配置了 `base` 时，形如 `https://example.com/handbook/feed.xml`。

用 `formats` 选择需要的格式，文件名固定：

```ts
feed({
  hostname: 'https://example.com',
  include: ['blog/**/*.md'],
  formats: ['rss', 'json'],
})
```

每个订阅源最多包含 `limit` 条，默认 20 条，按 `date` 从新到旧排列。

只要某种语言有页面匹配 `include`，就会为它生成订阅源，并在这种语言的页面里加上自动发现链接；其中没有带 `date` 的页面时，生成的是没有条目的订阅源，并输出 warning。没有任何页面匹配 `include` 时，插件输出 warning，不生成文件。如果 `public/` 中已有同名文件，构建会报错，不会覆盖。

## 自动发现 {#autodiscovery}

插件会在页面的 `<head>` 中加入三条 `<link rel="alternate">`，类型分别是 `application/rss+xml`、`application/atom+xml` 和 `application/feed+json`。`href` 是包含 `hostname` 和 `base` 的完整地址，`title` 是订阅源的标题。

只有存在订阅源的语言，它的页面才会带有这些链接。

## 订阅源信息 {#metadata}

`title` 和 `description` 默认取站点的值；站点配置了多语言时，取该语言的 `title` 和 `description`。可以用同名选项覆盖，也可以用 `copyright` 写版权声明：

```ts
feed({
  hostname: 'https://example.com',
  include: ['blog/**/*.md'],
  title: 'KawaPress 博客',
  description: '版本发布与设计笔记。',
  copyright: '© KawaPress contributors',
  author: { name: 'ShenQingChuan', link: 'https://example.com/about' },
})
```

`author` 是默认作者，没有在 frontmatter 中写 `author` 的页面会使用它。

## 多语言 {#multiple-locales}

每种语言各输出一套文件：默认语言（`root`）在根目录，其他语言在以语言键命名的目录里，例如 `en/feed.xml`。`include` 是相对 `srcDir` 的路径，所以需要同时覆盖各语言的目录：

```ts
feed({
  hostname: 'https://example.com',
  include: ['blog/**/*.md', 'en/blog/**/*.md'],
  exclude: ['**/index.md'],
})
```

只有某种语言存在匹配的页面时，才会为它输出文件。订阅源的 `language` 取自 `locales` 配置中的 `lang` 字段。

## 修改条目 {#transform-items}

`transformItems` 在写入文件之前接收一种语言的全部条目，可以增加、删除或修改它们。返回 `undefined` 时保留原有条目。第二个参数的 `locale` 是语言键，默认语言是 `root`：

```ts
feed({
  hostname: 'https://example.com',
  include: ['blog/**/*.md'],
  transformItems(items, { locale }) {
    return items.filter(item => !item.title.startsWith('[草稿]'))
  },
})
```

每个条目包含 `title`、`link`、`date`，以及可选的 `id`、`description`、`image` 和 `authors`。`link` 和 `image` 都是绝对地址。

## 注意事项 {#limitations}

- 插件不提供博客列表页、归档页或分页。这些页面请在站点里用 `createContentLoader()` 自行实现。
- 订阅源不包含文章全文。生成发生在预渲染之前，此时拿不到最终的 HTML，而不带组件的 Markdown 渲染会丢失 Vue 组件的内容。
- JSON Feed 使用 1.0 版本格式。
