# @kawapress/plugin-algolia-search

为 KawaPress 站点接入 Algolia DocSearch 搜索。

[![npm version](https://img.shields.io/npm/v/@kawapress/plugin-algolia-search?label=npm&color=42b883)](https://www.npmjs.com/package/@kawapress/plugin-algolia-search) · [English](https://github.com/kawapress/kawapress/blob/main/packages/plugin-algolia-search/README.md)

`@kawapress/plugin-algolia-search` 是 [KawaPress](https://github.com/kawapress/kawapress) 的一部分。KawaPress 是一个以 Vue 为核心的静态站点生成器。

## 特性

- 把轻量搜索按钮放进 `layout.header.end` 插座，并提前连接 Algolia。
- 只在读者点击按钮或按下 `Ctrl/⌘ + K`、`/` 时才加载 `@docsearch/js` 和样式。
- 自动按当前语言的 `lang:<lang>` 过滤每个索引的结果。
- 将搜索结果的链接转为站点路由，通过 KawaPress 站内路由无刷新跳转。
- 把 `--docsearch-*` 变量映射到公共 `--kawa-*` Token，自动适配浅色与深色外观。

## 安装

```sh
npm install --save-dev @kawapress/plugin-algolia-search
```

也可以用 `pnpm add --save-dev @kawapress/plugin-algolia-search` 或 `yarn add --dev @kawapress/plugin-algolia-search`。

## 使用

在 `nagi()` 中写 `search: false` 关掉内置本地搜索，再把 `algoliaSearchPlugin()` 加进 `plugins`：

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

## 配置项

| 选项 | 说明 |
| --- | --- |
| `appId` | Algolia 应用 ID，必填。 |
| `apiKey` | Algolia 只读搜索 API Key，必填。 |
| `indexName` | 要搜索的索引名（`indices: [indexName]` 的简写）。 |
| `indices` | 索引列表，每项为索引名或 `{ name, searchParameters }`。 |
| `searchParameters` | 应用到所有索引的附加 Algolia 查询参数。 |
| `placeholder` | 搜索框占位文字。 |
| `translations` | 按钮和弹窗文字，格式与 `@docsearch/js` 相同。 |
| `maxResultsPerGroup` | 每个分组最多显示的结果条数。 |
| `disableUserPersonalization` | 关闭浏览器保存的最近搜索与收藏记录。 |
| `insights` | 向 Algolia Insights 发送点击与转化事件。 |
| `facets` | 显示在搜索结果上方的 `{ key, label? }[]` 筛选标签。 |
| `resultBadgeKey` | 在每条结果旁作为徽标显示的字段名。 |
| `keyboardShortcuts` | 开启或关闭 `'Ctrl/Cmd+K'` 与 `'/'` 快捷键，默认都开启。 |
| `locales` | 按 KawaPress 语言键覆盖各语言的搜索选项。 |

## 文档

[文档](https://kawapress.dev/plugins/algolia-search) · [反馈问题](https://github.com/kawapress/kawapress/issues)

## 许可证

[MIT](https://github.com/kawapress/kawapress/blob/main/LICENSE) © KawaPress contributors
