---
title: 国际化
description: 使用目录和 locales 配置组织多语言文档站。
---

# 国际化

KawaPress 根据 URL 选择语言。把默认语言放在根目录，其他语言放进各自的子目录。使用默认 nagi 界面时，站点会自动显示语言切换菜单。

## 放置不同语言的页面 {#add-pages-for-each-language}

下面的站点以中文为默认语言，并提供英文：

```text
.
├─ guide/
│  └─ getting-started.md
├─ en/
│  ├─ guide/
│  │  └─ getting-started.md
│  └─ index.md
└─ index.md
```

同一篇文档在不同语言下应使用相同的相对路径：

| Markdown 文件 | 页面地址 |
| --- | --- |
| `guide/getting-started.md` | `/guide/getting-started` |
| `en/guide/getting-started.md` | `/en/guide/getting-started` |

根目录就是默认语言，不需要额外的语言前缀。`en` 这样的目录名会成为 URL 的第一段。

## 配置语言 {#configure-languages}

在 `kawapress.config.ts` 中写出每种语言：

```ts
import { nagi } from 'kawapress/nagi'

export default nagi({
  title: 'My Docs',
  locales: {
    root: {
      label: '简体中文',
      lang: 'zh-CN',
    },
    en: {
      label: 'English',
      lang: 'en',
    },
  },
})
```

`root` 表示默认语言。其他键会成为语言目录名，因此上面的 `en` 对应 `/en/`。

| 字段 | 作用 |
| --- | --- |
| `label` | 语言菜单里显示的名称。 |
| `lang` | 页面语言，例如 `zh-CN` 或 `en`。nagi 会据此使用中文或英文的内置界面文字。 |
| `title` | 只用于这一种语言的站点标题。 |
| `description` | 这种语言里没写 `description` 的页面所用的简介，优先于全站的 `description`。 |
| `head` | 只用于这一种语言的 `<head>` 标签，写法见[添加 head 标签](/guide/getting-started#add-head-tags)。 |
| `link` | 选择这种语言时打开的地址。不填写时，默认使用它的语言目录；也可以填写另一个站点的地址。 |
| `themeConfig` | 只用于这一种语言的界面配置。它会和全站配置合并；同名字段会被这里的值替换。 |
| `dir` | 文字方向，可写 `ltr` 或 `rtl`。 |

## 切换到对应页面 {#switch-between-matching-pages}

语言菜单会尽量跳到另一种语言中的同一篇文档，并保留查询参数和标题锚点：

```text
/guide/getting-started?tab=install#first-step
→ /en/guide/getting-started?tab=install#first-step
```

因此，请为每种语言保持相同的目录和文件名。KawaPress 不会翻译页面，也不会在目标页面缺失时自动寻找别的内容；缺少对应文件时，链接会进入未找到页面。默认站内搜索也只显示当前语言的结果。

## 默认语言与自动跳转 {#default-language-and-redirects}

`/` 始终是默认语言的首页。KawaPress 不会根据浏览器语言自动跳转，也不会记住读者上次选择的语言；读者可以随时从语言菜单切换。

## 本地化侧边栏 {#localize-the-sidebar}

每种语言可以有自己的 `themeConfig`。使用 nagi 时，`defineLocalizedSidebars()` 可以让你只写一份路径结构：

```ts
// sidebar.ts
import { defineLocalizedSidebars } from 'kawapress/nagi'

export const sidebars = defineLocalizedSidebars({
  locales: {
    root: '',
    en: '/en',
  },
  items: [
    {
      text: {
        root: '指南',
        en: 'Guide',
      },
      items: [
        {
          text: {
            root: '快速开始',
            en: 'Getting Started',
          },
          link: '/guide/getting-started',
        },
      ],
    },
  ],
})
```

然后把每种语言的侧边栏放进对应配置：

```ts
// kawapress.config.ts
import { nagi } from 'kawapress/nagi'
import { sidebars } from './sidebar'

export default nagi({
  themeConfig: {
    sidebar: sidebars.root,
  },
  locales: {
    root: {
      label: '简体中文',
      lang: 'zh-CN',
    },
    en: {
      label: 'English',
      lang: 'en',
      themeConfig: {
        sidebar: sidebars.en,
      },
    },
  },
})
```

链接只需要写默认语言的路径。helper 会为英文侧边栏自动加上 `/en`。

## 顶部导航与分区侧边栏 {#top-navigation-and-sections}

文档变多以后，可以把站点分成几个分区，例如「指南」和「插件」。在顶部放分区链接，让每个分区有自己的侧边栏。

用 `themeConfig.nav` 配置顶部链接：

```ts
import { nagi } from 'kawapress/nagi'

export default nagi({
  themeConfig: {
    nav: [
      { text: '指南', link: '/guide/getting-started', activeMatch: '/guide' },
      { text: '插件', link: '/plugins/overview', activeMatch: '/plugins' },
    ],
  },
})
```

每一项有三个字段：

| 字段 | 说明 |
| --- | --- |
| `text` | 链接上显示的文字。 |
| `link` | 点击后打开的页面，写不带语言前缀以外的站点路径，例如 `/guide/getting-started`。 |
| `activeMatch` | 可选。路径前缀，当前页面在这个前缀之下时，这一项会高亮。不写时只在 `link` 本身这一页高亮。 |

上面的「指南」写了 `activeMatch: '/guide'`，所以读者在 `/guide/` 下的任何页面，这一项都是高亮的，而不只是在「快速开始」这一页。

窄屏幕上，这些链接不会挤在顶部，而是出现在点开菜单按钮后展开的区域里，排在语言列表前面。

### 让每个分区有自己的侧边栏 {#sidebar-per-section}

`sidebar` 可以写成「路径前缀 → 侧边栏」的对象，当前页面在哪个前缀之下，就显示哪个侧边栏：

```ts
export default nagi({
  themeConfig: {
    nav: [
      { text: '指南', link: '/guide/getting-started', activeMatch: '/guide' },
      { text: '插件', link: '/plugins/overview', activeMatch: '/plugins' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: '介绍',
          items: [{ text: '快速开始', link: '/guide/getting-started' }],
        },
      ],
      '/plugins/': [
        {
          text: '官方插件',
          items: [{ text: '概览', link: '/plugins/overview' }],
        },
      ],
    },
  },
})
```

当前页面没有命中任何前缀时，nagi 会改用根据目录自动生成的侧边栏。首页的 `layout` 是 `home`，本来就不显示侧边栏。

### 折叠侧边栏分组 {#collapsible-sidebar-groups}

侧边栏分组越来越多时，可以用 `collapsed` 让分组支持展开和收起：

- 不写 `collapsed`：分组始终展开，不显示折叠按钮；
- `collapsed: false`：默认展开，读者可以点击收起；
- `collapsed: true`：默认收起，读者可以点击展开。

```ts
export default nagi({
  themeConfig: {
    sidebar: [
      {
        text: '指南',
        collapsed: false,
        items: [
          { text: '快速开始', link: '/guide/getting-started' },
        ],
      },
      {
        text: '进阶',
        collapsed: true,
        items: [
          { text: 'SSR 兼容性', link: '/guide/ssr-compatibility' },
        ],
      },
    ],
  },
})
```

如果使用目录自动生成的侧边栏，可以在目录旁的 `_meta.json` 里为 `"type": "dir"` 的目录条目加上同样的 `collapsed` 字段（写在 `"file"` 条目上或值不是布尔值时构建会报错）：

```json
[
  "getting-started",
  {
    "type": "dir",
    "name": "advanced",
    "label": "进阶",
    "collapsed": true
  }
]
```

包含当前正在阅读页面的分组无论配置如何都会自动展开（首屏服务端渲染时就是展开状态，从别的页面跳进来时也会自动展开）。被收起的子列表依然输出在 HTML 中，搜索引擎和爬虫仍然能读取里面的链接。

### 社交图标链接 {#social-links}

在顶栏右侧放置代码仓库或社区入口时，使用 `themeConfig.socialLinks`：

```ts
import { nagi } from 'kawapress/nagi'

export default nagi({
  themeConfig: {
    socialLinks: [
      { icon: 'github', link: 'https://github.com/kawapress/kawapress' },
      { icon: 'discord', link: 'https://discord.gg/your-invite', ariaLabel: '加入 Discord 社区' },
      {
        icon: { svg: '<svg viewBox="0 0 24 24" aria-hidden="true">...</svg>' },
        link: 'https://example.com',
        ariaLabel: '官方网站',
      },
    ],
  },
})
```

- `icon` 可以直接写 [Simple Icons](https://simpleicons.org) 的图标名（如 `'github'`、`'discord'`、`'x'`），也可以传 `{ svg: '<svg>…</svg>' }` 自定义 SVG。图标名在构建时解析成 SVG，只有实际用到的图标会进入浏览器；名称不存在时构建会直接报错。
- `ariaLabel` 是链接的无障碍名称；省略且使用内置图标名时，默认使用该图标名。
- 每个语言可以在自己的 `locales.<key>.themeConfig.socialLinks` 中单独配置社交链接。

### 关闭默认本地搜索 {#disable-local-search}

nagi 默认启用本地全文搜索（`@kawapress/plugin-search`）。如果站点改用 [Algolia 搜索](/plugins/algolia-search)等其他搜索方案，可以在 `nagi()` 顶层传入 `search: false` 去掉内置的本地搜索：

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

### 每种语言各写各的 {#per-locale-navigation}

`nav` 和 `sidebar` 都是主题配置，所以每种语言可以覆盖它们。把链接指向各自语言下的页面即可：

```ts
export default nagi({
  themeConfig: {
    nav: [
      { text: '指南', link: '/guide/getting-started', activeMatch: '/guide' },
    ],
  },
  locales: {
    root: { label: '简体中文', lang: 'zh-CN' },
    en: {
      label: 'English',
      lang: 'en',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/en/guide/getting-started', activeMatch: '/en/guide' },
        ],
      },
    },
  },
})
```

导航区域的无障碍名称默认是「主导航」，可以用 `navLinksLabel` 修改。

## 从右向左书写 {#right-to-left-languages}

阿拉伯语、希伯来语等从右向左书写的语言，可以设置 `dir: 'rtl'`：

```ts
import { nagi } from 'kawapress/nagi'

export default nagi({
  locales: {
    ar: {
      label: 'العربية',
      lang: 'ar',
      dir: 'rtl',
    },
  },
})
```

KawaPress 会把这个方向写到页面的 `<html>` 标签上。它不会自动把从左到右设计的界面完整翻转；请检查并按需要调整自己的样式。
