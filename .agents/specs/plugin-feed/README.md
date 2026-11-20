# Feed 插件

包名 `@kawapress/plugin-feed`。只有生成侧，没有运行侧。

- 工程实施：`.agents/engineering/002-official-plugins-batch-1/`

## 背景与目标

VitePress 没有内置 RSS，官方做法是在 `buildEnd` 里用 `createContentLoader()` 自己拼 `feed`。KawaPress 也没有。博客、更新日志、周报类站点需要订阅源。

目标：装上插件、写一个 `hostname` 和一条页面范围，就得到 RSS 2.0、Atom、JSON Feed，并且 `<head>` 里有自动发现链接。

## Happy Path

```ts
import feed from '@kawapress/plugin-feed'

export default nagi({
  plugins: [
    feed({
      hostname: 'https://example.com',
      include: ['blog/**/*.md'],
    }),
  ],
})
```

文章页 frontmatter：

```yaml
---
title: KawaPress 0.9
date: 2026-11-20
description: 独立版本号与新插件。
author: ShenQingchuan
image: /images/0.9-cover.png
---
```

`kawapress build` 后得到 `feed.xml`（RSS 2.0）、`atom.xml`、`feed.json`，每个页面的 `<head>` 带三条 `<link rel="alternate">`。

## 选项

```ts
interface FeedPluginOptions {
  /** 必填，绝对 http(s) 地址。插件自动拼接站点 base。 */
  hostname: string
  /** 相对 srcDir 的 glob，决定哪些页面进入订阅源。必填，避免把整站文档灌进去。 */
  include: string[]
  exclude?: string[]
  /** 默认三种全开。文件名固定为 feed.xml / atom.xml / feed.json。 */
  formats?: Array<'rss' | 'atom' | 'json'>
  /** 每个订阅源最多多少条，默认 20，按 date 倒序。 */
  limit?: number
  /** 订阅源标题与描述，默认取站点或 locale 的 title / description。 */
  title?: string
  description?: string
  copyright?: string
  /** 默认作者，页面 frontmatter 的 author 优先。 */
  author?: string | { name: string, email?: string, link?: string }
  /** 生成侧回调，可增删改条目。返回 undefined 时使用原数组。 */
  transformItems?: (items: FeedItem[]) => FeedItem[] | undefined
}
```

`FeedItem` 是插件自己导出的类型，不暴露 `feed` 库的类型。

## 行为

- 条目来源：`buildArtifacts` 的 `pages`，按 `include` / `exclude` 匹配 `sourcePath`。frontmatter `feed: false` 排除单页。
- `date` 必填：没有可解析 `date` 的匹配页面不进入订阅源，构建时列出这些页面并警告。`date` 只接受字符串（和 sitemap 的 `lastUpdated` 一样，YAML 未加引号的日期会变成 `Date`，Core 要求 pageData 可 JSON 序列化）。
- 正文：只输出 `description`。没有 `description` 时取正文第一段纯文本（去掉 Markdown 标记，最多 300 字符）。0.1 版不输出全文 HTML：`buildArtifacts` 发生在预渲染之前，拿不到最终 HTML，用无组件的 Markdown 渲染又会丢掉 Vue 组件内容。
- `image`：站内路径自动拼成带 `hostname` 和 `base` 的绝对地址。
- 多语言：每个 locale 各出一套文件，root 在根目录，其余在 `<locale 前缀>/`。只有某个 locale 有匹配页面时才为它输出。
- 哪些 locale 有订阅源：该 locale 至少有一个页面的 `sourcePath` 匹配 `include`。只按路径判断，不解析 frontmatter。这样的 locale 一定输出文件；其中没有带 `date` 的页面时，输出没有条目的订阅源并警告，保证自动发现链接不会 404。
- 自动发现：在 `pageData()` 中给有订阅源的 locale 的页面追加 `<link rel="alternate" ...>`，`href` 是带 `hostname` 和 `base` 的绝对地址。不在 `config()` 中写，因为那时还拿不到站点根目录和页面列表。
- 输出路径冲突沿用 `emitFile` 的报错。没有任何页面匹配 `include` 时警告并不输出文件。
- `transformItems(items, { locale })` 按 locale 分别调用。JSON Feed 由 `feed` 库输出，版本为 1。

## 边界

- 不提供博客列表页、归档页或分页，这些属于站点自己用 `createContentLoader()` 实现，或以后的内容层。
- 不做全文输出，见上。
- `hostname` 缺失或不是 http(s) 绝对地址时，插件工厂直接抛错。

## 验收

- 单元测试覆盖：include/exclude 匹配、缺 date 的警告、多语言分文件、base 拼接、`transformItems`、三种格式的输出结构。
- 文档站加一个 fixture 或在 e2e 站点里放两篇带 date 的页面，构建后三种文件可被 W3C Feed Validator 规则接受（至少 RSS 和 Atom 通过 `fast-xml-parser` 解析且字段齐全）。
- 文档页 `docs/plugins/feed.md` 与英文版。
