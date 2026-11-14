---
title: Algolia 搜索
description: 使用 Algolia DocSearch 为 KawaPress 站点提供云端搜索，按需加载脚本并自动按当前语言过滤结果。
---

# Algolia 搜索

`@kawapress/plugin-algolia-search` 把 [Algolia DocSearch](https://docsearch.algolia.com/) 接入 KawaPress 站点。如果你的文档已经由 Algolia 爬虫建立索引，或者需要跨多个索引搜索，可以用它替换 nagi 默认内置的本地搜索。

## 安装与启用 {#install-and-enable}

::: code-group
```sh [npm]
npm install --save-dev @kawapress/plugin-algolia-search
```

```sh [pnpm]
pnpm add --save-dev @kawapress/plugin-algolia-search
```

```sh [Yarn]
yarn add --dev @kawapress/plugin-algolia-search
```
:::

在 `kawapress.config.ts` 中，先用 `search: false` 关闭 nagi 默认的本地搜索，再把 `algoliaSearchPlugin()` 加入 `plugins`：

```ts
import algoliaSearchPlugin from '@kawapress/plugin-algolia-search'
import { nagi } from 'kawapress/nagi'

export default nagi({
  search: false,
  plugins: [
    algoliaSearchPlugin({
      appId: 'YOUR_APP_ID',
      apiKey: 'YOUR_SEARCH_API_KEY',
      indexName: 'your_index_name',
    }),
  ],
})
```

`apiKey` 请填写 Algolia 提供的只读搜索密钥（Search-Only API Key），不要使用拥有写权限的 Admin API Key。

插件会把搜索按钮放到 `layout.header.end` 这个 Outlet 的最前面，位置与默认本地搜索完全一致。如果你同时保留了本地搜索和 Algolia 搜索，请把其中一方的快捷键关掉，避免两个弹窗同时响应按键。

## 配置选项 {#options}

所有选项都会在启动或构建时校验，拼写错误或缺失必填项会直接报错：

| 选项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `appId` | `string` | 必填 | Algolia 应用 ID。 |
| `apiKey` | `string` | 必填 | Algolia 只读搜索 API Key。 |
| `indexName` | `string` | — | 要搜索的索引名（`indices: [indexName]` 的简写）。`indexName` 与 `indices` 至少填一个。 |
| `indices` | `(string \| AlgoliaIndex)[]` | — | 搜索一个或多个索引，每项可写索引名或 `{ name, searchParameters }`。 |
| `searchParameters` | `Record<string, unknown>` | `undefined` | 传给 Algolia 的附加查询参数，例如 `{ facetFilters: ['version:v2'] }`。 |
| `placeholder` | `string` | `undefined` | 搜索框占位文字。 |
| `translations` | `AlgoliaTranslations` | `undefined` | 搜索按钮和弹窗的界面文字，结构与 `@docsearch/js` 一致。未设置 `button.buttonText` 时，按钮默认在中文页面显示「搜索」，其他语言显示 `Search`。 |
| `maxResultsPerGroup` | `number` | `undefined` | 每个分组最多显示的结果条数。 |
| `disableUserPersonalization` | `boolean` | `undefined` | 设为 `true` 时关闭浏览器本地保存的最近搜索和收藏记录。 |
| `insights` | `boolean` | `undefined` | 设为 `true` 时向 Algolia Insights 发送点击事件。 |
| `facets` | `{ key: string, label?: string }[]` | `undefined` | 显示在搜索结果上方的筛选标签。 |
| `resultBadgeKey` | `string` | `undefined` | 在每条结果旁作为徽标显示的字段名。 |
| `keyboardShortcuts` | `{ 'Ctrl/Cmd+K'?: boolean, '/'?: boolean }` | `{ 'Ctrl/Cmd+K': true, '/': true }` | 控制是否启用 `Ctrl/⌘ + K` 和 `/` 快捷键。 |
| `locales` | `Record<string, AlgoliaLocaleOptions>` | `{}` | 按语言键（如 `root`、`en`）覆盖上述除 `appId`、`apiKey`、`keyboardShortcuts` 以外的选项。 |

### 为什么不接受函数选项 {#why-function-options-are-rejected}

`kawapress.config.ts` 只在 Node.js 生成侧运行，插件配置校验后会作为纯 JSON 发送到浏览器。因此，`transformItems`、`hitComponent`、`navigator`、`resultsFooterComponent`、`transformSearchClient`、`getMissingResultsUrl` 这类函数选项无法穿过 JSON 边界，配置时传入会直接报错并提示原因。其中命中结果的 URL 转换和站内路由跳转已由插件在运行侧内置处理，不需要手写 `transformItems` 或 `navigator`。

## 多语言配置与 `lang:` 过滤 {#locales-and-lang-facet}

多语言站点可以在 `locales` 中为每种语言定制搜索提示词、按钮文字或独立索引：

```ts
algoliaSearchPlugin({
  appId: 'YOUR_APP_ID',
  apiKey: 'YOUR_SEARCH_API_KEY',
  indexName: 'my_docs',
  placeholder: '搜索文档',
  locales: {
    en: {
      placeholder: 'Search docs',
      translations: {
        button: {
          buttonText: 'Search',
          buttonAriaLabel: 'Search',
        },
      },
    },
  },
})
```

`locales` 里的配置会浅合并到顶层配置上。如果某个语言单独写了 `indexName` 或 `indices`，它会替换该语言使用的索引列表，而不是追加到顶层索引后面。

### 爬虫需记录 `lang` 字段 {#crawler-lang-facet}

当当前语言在站点 `locales` 中配置了 `lang`（例如 `zh-CN` 或 `en`）时，插件会自动为每个被查询的索引加上 `lang:<当前 lang>` 的 `facetFilters`（并移除手写的其他 `lang:` 过滤）。这样多语言共用同一个 Algolia 索引时，读者也只会搜到当前语言的内容。

要让这条过滤生效，请确保 Algolia 爬虫配置从页面的 `<html lang="...">` 提取了 `lang` 字段，并在索引的 `attributesForFaceting` 中包含 `lang`（VitePress 官方的 DocSearch 爬虫模板已经默认包含这项配置）。

## 快捷键 {#keyboard-shortcuts}

默认同时开启两组打开搜索的快捷键：

- `Ctrl + K`（macOS / iOS 上为 `⌘ + K`），按钮上会根据访客平台直接显示对应的按键标记；
- 当焦点不在输入框、文本域或可编辑元素内时按 `/`。

想关掉其中任意一个，配置 `keyboardShortcuts` 即可：

```ts
algoliaSearchPlugin({
  appId: 'YOUR_APP_ID',
  apiKey: 'YOUR_SEARCH_API_KEY',
  indexName: 'my_docs',
  keyboardShortcuts: {
    'Ctrl/Cmd+K': true,
    '/': false,
  },
})
```

## 样式与运行行为 {#styling-and-runtime-behavior}

- **按需加载**：首屏只渲染一个轻量按钮（`.kawa-algolia-search`），并在 `<head>` 中加入指向 `https://<appId>-dsn.algolia.net` 的 `preconnect`。`@docsearch/js/docsearch` 和样式表只在读者第一次点击按钮或按下快捷键时才下载。
- **站内无刷新跳转**：爬虫索引里存的通常是生产环境完整域名和 `.html` 地址。插件会自动只保留路径、查询参数和锚点，去掉 `.html` 和末尾的 `/index`，交给 KawaPress 站内路由跳转，因此在本地开发、预览或子路径部署下点击结果都不会跳出当前站点。
- **自动跟随主题外观**：DocSearch 样式位于 `@layer kawa.plugin` 层，插件在 `.DocSearch` 元素上将 `--docsearch-*` 变量映射到 `--kawa-c-brand`、`--kawa-c-bg-elv`、`--kawa-c-text-1` 等公共 Token。切换浅色/深色外观或修改主题品牌色时，搜索弹窗会自动同步，不需要额外维护一套 DocSearch 变量。
