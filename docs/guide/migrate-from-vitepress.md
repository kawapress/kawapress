---
title: 从 VitePress 迁移
description: 将现有的 VitePress 文档站迁移到 KawaPress：保留 Markdown 内容，改写配置文件与扩展入口。
---

# 从 VitePress 迁移

如果你已经有一个用 VitePress 搭建的文档站，这篇指南会带你一步步搬到 KawaPress。

## 什么不变，什么要改 {#what-stays-the-same}

大多数站点的 Markdown 正文不需要改动：Frontmatter、自定义容器、代码组、代码行高亮、`<<<` 代码片段、`<!--@include-->`、`[[toc]]`、`:tada:` 表情和 `<Badge>` 的写法都保持原样。

配置文件和主题扩展需要按 KawaPress 的格式重写。KawaPress 不提供 VitePress 配置兼容层，因为保留一套干净的配置格式，比让同一件事同时存在两种写法更好维护。

## 迁移步骤 {#step-by-step}

### 1. 安装依赖 {#install-dependencies}

卸载 `vitepress`，安装 `kawapress`：

::: code-group
```sh [npm]
npm uninstall vitepress
npm install --save-dev kawapress
```

```sh [pnpm]
pnpm remove vitepress
pnpm add --save-dev kawapress
```

```sh [Yarn]
yarn remove vitepress
yarn add --dev kawapress
```
:::

只写 Markdown 并使用默认预设 nagi（凪）时，只需要安装 `kawapress` 一个包。如果站点里直接导入了 Vue API 或编写了 `.vue` 组件，请同时把 `vue` 安装为开发依赖。

### 2. 创建 `kawapress.config.ts` {#create-config}

在项目根目录创建 `kawapress.config.ts`，用 `kawapress/nagi` 替换原来的 `.vitepress/config.ts`。下面是同一份典型配置在两边的写法对照：

::: code-group
```ts [kawapress.config.ts]
import { nagi } from 'kawapress/nagi'

export default nagi({
  title: 'My Docs',
  srcDir: 'docs',
  themeConfig: {
    logo: '/logo.svg',
    nav: [
      { text: '指南', link: '/guide/getting-started', activeMatch: '/guide' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: '介绍',
          collapsed: false,
          items: [
            { text: '快速开始', link: '/guide/getting-started' },
          ],
        },
      ],
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/your-org/your-repo' },
    ],
  },
})
```

```ts [.vitepress/config.ts]
import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'My Docs',
  srcDir: 'docs',
  cleanUrls: true,
  themeConfig: {
    logo: '/logo.svg',
    nav: [
      { text: '指南', link: '/guide/getting-started', activeMatch: '/guide/' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: '介绍',
          collapsed: false,
          items: [
            { text: '快速开始', link: '/guide/getting-started' },
          ],
        },
      ],
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/your-org/your-repo' },
    ],
    search: {
      provider: 'local',
    },
  },
})
```
:::

### 3. 整理目录与公共资源 {#move-files}

- **Markdown 目录**：如果原来的文档放在 `docs/` 下，在 `kawapress.config.ts` 里设置 `srcDir: 'docs'` 即可保持目录位置不变；如果文档就在项目根目录，不需要设置 `srcDir`。
- **公共资源目录**：KawaPress 默认读取 `srcDir` 下的 `public` 目录（例如 `docs/public/` 或根目录的 `public/`）。如果你的公共文件之前放在 `.vitepress/public/`，把它们移到 `public/` 下。
- **清理旧目录**：删掉 `.vitepress/` 目录（如果里面有自定义组件或主题代码，先按后文的说明迁出），并把 `.gitignore` 里的 `.vitepress/dist` 和 `.vitepress/cache` 改成 `dist`。

### 4. 更新 `package.json` 脚本 {#update-scripts}

把 `vitepress` 命令换成 `kawapress`。KawaPress 默认读取项目根目录的 `kawapress.config.ts`，不需要在命令后面再写目录名：

```json
{
  "scripts": {
    "docs:dev": "kawapress dev",
    "docs:build": "kawapress build",
    "docs:preview": "kawapress preview"
  }
}
```

### 5. 构建与部署 {#deploy}

运行 `kawapress build`，静态产物会输出到站点根目录的 `dist/`（而不是 `.vitepress/dist`）。把部署平台或 CI 脚本中的发布目录改为 `dist` 即可。服务器和缓存要求见[部署](/guide/deploy)。

## 站点配置对照表 {#site-config}

下表列出 VitePress `defineConfig()` 顶层选项在 KawaPress 中的对应写法：

| VitePress 选项 | 状态 | KawaPress 写法 |
| --- | --- | --- |
| `title` | 相同 | `title`（支持顶层与 `locales.<key>.title`） |
| `description` | 改名 / 形态不同 | 不设在站点顶层；在每页 frontmatter 写 `description`，或在站点/语言的 `head` 中加 `['meta', { name: 'description', content: '...' }]` |
| `lang`、`dir` | 改名 / 形态不同 | 写在 `locales.root`（及各语言条目）上，例如 `locales: { root: { label: '简体中文', lang: 'zh-CN', dir: 'ltr' } }` |
| `titleTemplate` | 改名 / 形态不同 | 在页面 frontmatter 中写 `titleTemplate`（支持 `%s` 或 `false`） |
| `base` | 相同 | `base` |
| `srcDir` | 相同 | `srcDir`（相对于站点根目录） |
| `srcExclude` | 相同 | `srcExclude`（相对于 `srcDir` 的 glob 数组） |
| `rewrites` | 相同 | `rewrites`（`{ 'packages/:pkg/src/:page*': ':pkg/:page*' }` 或函数） |
| `head` | 相同 | `head`（支持顶层、`locales.<key>.head` 和页面 frontmatter，允许 `meta`、`link`、`script`、`style`、`noscript`） |
| `locales` | 相同 | `locales`（默认语言键为 `root`，其余键对应 URL 第一段路径） |
| `themeConfig` | 相同 | `themeConfig`（支持顶层与 `locales.<key>.themeConfig`） |
| `cleanUrls` | 改名 / 形态不同 | 默认始终生成无 `.html` 后缀的简洁路由，无需配置 |
| `ignoreDeadLinks` | 改名 / 形态不同 | `deadLinks`：默认开启报错；可写 `deadLinks: false`、`deadLinks: { level: 'warn' }` 或 `deadLinks: { ignore: [...] }` |
| `lastUpdated` | 改名 / 形态不同 | 安装 `@kawapress/plugin-last-updated`，加入 `plugins: [lastUpdatedPlugin()]` |
| `sitemap` | 相同 | 在 `nagi({ sitemap: { hostname: 'https://...' } })` 中配置，或使用 `@kawapress/plugin-sitemap` |
| `markdown.lineNumbers` | 改名 / 形态不同 | `nagi({ codeBlock: { lineNumbers: true } })`（或 `@kawapress/plugin-code-block`） |
| `markdown.theme`、`markdown.codeTransformers`、`markdown.languages` | 改名 / 形态不同 | 通过 `@kawapress/plugin-shiki` 的 `shikiPlugin({ themes, transformers, langs, twoslash })` 配置 |
| `markdown.math` | 改名 / 形态不同 | 安装 `@kawapress/plugin-mathjax`，加入 `plugins: [mathjaxPlugin()]` |
| `markdown.toc` | 改名 / 形态不同 | nagi 默认内置 `@kawapress/plugin-toc`；需要修改标题级别时在 `plugins` 中传入 `tocPlugin({ level: [2, 3, 4] })` |
| `markdown.gfmAlerts`、`markdown.container`、`markdown.emoji` | 改名 / 形态不同 | nagi 默认内置 `@kawapress/plugin-github-alerts`、`@kawapress/plugin-container` 和 `@kawapress/plugin-emoji` |
| `markdown.config` | 改名 / 形态不同 | 在 Generator Plugin 中使用 `api.markdown((md) => { ... })` |
| `vite` | 改名 / 形态不同 | 在 Generator Plugin 中使用 `api.vite((config) => { ... })` |
| `transformPageData`、`transformHead`、`buildEnd` | 改名 / 形态不同 | 在 Generator Plugin 中分别使用 `api.pageData()`、`api.pageArtifact()` 和 `api.buildArtifacts()` |
| `postRender`、`transformHtml` | 暂不支持 | 无整页 HTML 字符串后处理钩子 |
| `outDir`、`assetsDir`、`cacheDir` | 暂不支持 | 构建产物固定输出到 `dist/`，静态资源位于 `dist/assets/` |
| `appearance` | 改名 / 形态不同 | 写在 `themeConfig.appearance`：`'auto'`（默认，跟随系统）、`'light'` 或 `'dark'`。它只决定读者还没手动切换时的样子，切换按钮始终保留 |
| `mpa`、`metaChunk`、`buildConcurrency`、`shouldPreload`、`scrollOffset`、`useWebFonts`、`contentProps`、`vue`、`extends`、`router.prefetchLinks` | 暂不支持 | KawaPress 不提供这些底层选项 |

## 默认主题 `themeConfig` 对照表 {#theme-config}

下表列出 VitePress 默认主题的 `themeConfig` 选项与 nagi 的对应关系：

| VitePress `themeConfig` | 状态 | nagi 写法 |
| --- | --- | --- |
| `logo` | 相同 | `themeConfig.logo`（支持字符串、`{ src, alt }` 或 `{ light, dark, alt }`，默认同时作为站点 favicon） |
| `nav` | 改名 / 形态不同 | `themeConfig.nav`：数组项为 `{ text, link, activeMatch? }`。`activeMatch` 是路径前缀字符串（如 `'/guide'`），不是正则；不支持下拉分组 `items` |
| `sidebar` | 相同 | `themeConfig.sidebar`：支持数组、按路径前缀分区的对象、`{ base, items }` 以及分组的 `collapsed: true \| false`。未命中前缀时自动读取目录与 `_meta.json` |
| `socialLinks` | 相同 | `themeConfig.socialLinks`：`[{ icon, link, ariaLabel? }]`，`icon` 支持 Simple Icons 名称或 `{ svg }`，可按语言覆盖 |
| `search`（`provider: 'local'`） | 改名 / 形态不同 | nagi 默认内置 `@kawapress/plugin-search`，无需配置 |
| `search`（`provider: 'algolia'`） | 改名 / 形态不同 | 在 `nagi()` 顶层写 `search: false`，并安装 `@kawapress/plugin-algolia-search` 加入 `plugins: [algoliaSearchPlugin({ ... })]`。详见 [Algolia 搜索](/plugins/algolia-search) |
| `outline` | 改名 / 形态不同 | 默认显示二级与三级标题大纲；单页可在 frontmatter 写 `outline: false` 或 `aside: false`。不支持自定义 `level` 范围 |
| `outlineTitle` / `outline.label` | 改名 / 形态不同 | `themeConfig.outlineLabel`（另有 `outlineCollapseLabel` 与 `outlineExpandLabel`） |
| `editLink`、`lastUpdated` / `lastUpdatedText` | 改名 / 形态不同 | 由独立插件 `@kawapress/plugin-last-updated` 提供，配置 `editLink.pattern`、`lastUpdated.formatOptions` 与 `labels`。详见[最后更新时间](/plugins/last-updated) |
| `docFooter`（`prev` / `next`） | 改名 / 形态不同 | 按钮文字用 `themeConfig.previousPageLabel` 与 `themeConfig.nextPageLabel`；不支持在单页 frontmatter 中覆盖上一篇/下一篇链接 |
| `footer`（`message` / `copyright`） | 改名 / 形态不同 | `themeConfig.footerLicenseText` 与 `themeConfig.footerPoweredByText`（在 `home` 和 `page` 布局底部显示，`doc` 页面不显示页脚） |
| `sidebarMenuLabel`、`returnToTopLabel`、`langMenuLabel` | 相同 | 字段名相同，nagi 已内置中英文默认文案 |
| `darkModeSwitchLabel`、`lightModeSwitchTitle`、`darkModeSwitchTitle` | 改名 / 形态不同 | 合并为 `themeConfig.appearanceLabel` |
| `notFound`（`title`、`linkText`、`quote`、`code`） | 改名 / 形态不同 | `themeConfig.notFoundMessage` 与 `themeConfig.notFoundHomeLabel`（不含 `quote` 和 `code`） |
| `i18nRouting` | 改名 / 形态不同 | 多语言路由固定由 `locales` 管理，无需单独开关 |
| `siteTitle`、`logoLink`、`aside: 'left'`、`externalLinkIcon`、`skipToContentLabel`、`carbonAds` | 暂不支持 | nagi 不提供这些主题配置项 |

## 直接可用的 Markdown 语法 {#markdown-syntax}

大多数 VitePress 的 Markdown 扩展都可以原样保留：

| 语法 | nagi 默认可用 | 说明 |
| --- | --- | --- |
| Frontmatter（YAML / JSON） | 是 | 位于文件开头，`title`、`description`、`titleTemplate`、`head`、`layout` 等直接可用 |
| 自定义标题锚点 `## 标题 {#id}` | 是 | 与 VitePress 写法相同 |
| 内部与外部链接 | 是 | `.md`、`.html` 与无后缀链接统一转为简洁路由 |
| GitHub 风格表格 | 是 | 核心直接支持 |
| 自定义容器 `::: tip` 等 | 是 | 内置 `@kawapress/plugin-container`（`info`、`tip`、`warning`、`danger`、`details`） |
| GitHub 警报 `> [!NOTE]` 等 | 是 | 内置 `@kawapress/plugin-github-alerts`（`NOTE`、`TIP`、`IMPORTANT`、`WARNING`、`CAUTION`） |
| 代码组 `::: code-group` | 是 | 内置 `@kawapress/plugin-code-group` |
| 代码行号与高亮标注 | 是 | 内置 `@kawapress/plugin-shiki` 与 `@kawapress/plugin-code-block`，支持 `:line-numbers`、`{1,3-5}`、`[!code highlight]`、`[!code focus]`、`[!code ++]`、`[!code --]`、`[!code warning]`、`[!code error]` 以及 `twoslash` |
| 代码片段引入 `<<< path` | 是 | 核心直接支持 `#region`、`{1,3-5 lang attrs}`、`[title]` 与 `@/` 路径 |
| Markdown 文件引入 `<!--@include-->` | 是 | 核心直接支持 `#region`、`{start,end}`、嵌套引入与 `@/` 路径 |
| 页内目录 `[[toc]]` | 是 | 内置 `@kawapress/plugin-toc` |
| Emoji 短代码 `:tada:` | 是 | 内置 `@kawapress/plugin-emoji` |
| `<Badge>` 组件 | 是 | 内置 `@kawapress/plugin-badge`（`tip`、`info`、`warning`、`danger`） |
| 在 Markdown 中使用 Vue | 是 | 核心直接支持 `{{ }}`、指令、`<script setup>`、`<style module>` 与导入组件 |
| 数学公式 `$...$`、`$$...$$` | 需安装插件 | 安装 `@kawapress/plugin-mathjax` 并加入 `plugins` |
| Mermaid 图表 ```` ```mermaid ```` | 需安装插件 | 安装 `@kawapress/plugin-mermaid` 并加入 `plugins` |
| 图片点击缩放 | 需安装插件 | 安装 `@kawapress/plugin-image-zoom` 并加入 `plugins` |

有一处细节需要注意：如果标题行里写了 `<Badge text="beta" />` 等行内 HTML 或组件，它们只会在正文标题原位渲染，不会进入页面标题、右侧大纲、`[[toc]]` 和搜索索引，也不会改变标题的自动锚点。

## 需要改写的代码 {#what-needs-changes}

### 主题插槽改为 Outlet {#layout-slots-to-outlets}

VitePress 通过 `.vitepress/theme/Layout.vue` 的插槽（如 `#doc-before`、`#nav-bar-content-after`）在页面框架里塞入自定义组件。KawaPress 不使用主题插槽继承，而是提供八个标准 **Outlet（插座）**，通过 Runtime Plugin 的 `api.prependToOutlet()` 和 `api.appendToOutlet()` 挂载组件：

```ts
// my-layout-plugin/runtime-plugin.ts
import { defineRuntimePlugin } from 'kawapress'
import DocBanner from './DocBanner.vue'

export default defineRuntimePlugin({
  name: 'my-layout-plugin',
  setup(api) {
    api.prependToOutlet('doc', {
      id: 'banner',
      component: DocBanner,
    })
  },
})
```

全部八个 Outlet 的位置与用法见[主题开发](/plugins/theme-development#standard-outlets)和[插件开发](/plugins/plugin-development#add-to-outlet)。

### 自定义布局组件 {#custom-layouts}

VitePress 里用 `layout: 名字` 加 `app.component('名字', 组件)` 做的整页布局，在 nagi 中写法不变：在 Runtime Plugin 里注册同名全局组件，组件内用 `<RouterView />` 代替 `<Content />` 放正文。`layout: false` 同样表示不要任何主题外框。详见 [Frontmatter](/guide/frontmatter#custom-layout)。

### `useData()` 拆分为组合式函数 {#usedata-to-composables}

VitePress 的 `useData()`、模板全局变量 `$frontmatter` 在 KawaPress 中拆成职责明确的组合式函数，从 `kawapress/client` 导入：

| VitePress 写法 | KawaPress 写法（来自 `kawapress/client`） |
| --- | --- |
| `useData().page`、`useData().frontmatter`、`$frontmatter` | `const page = usePageData()`（读取 `page.value?.title`、`page.value?.frontmatter`、`page.value?.headers`） |
| `useData().site`、`useData().lang`、`useData().dir`、`useData().localeIndex` | `const site = useSite()`（读取 `site.value.title`、`site.value.base`、`site.value.lang`、`site.value.dir`、`site.value.localeIndex`） |
| `useData().theme` | `const themeConfig = useThemeConfig()` |
| `useData().isDark` | `const { isDark } = useAppearance()` |
| `useRoute()`、`useRouter()` | `useRoute()`、`useRouter()`（同名导出自 `kawapress/client`） |

```vue
<script setup lang="ts">
import { usePageData, useSite, useThemeConfig } from 'kawapress/client'

const page = usePageData()
const site = useSite()
const theme = useThemeConfig()
</script>
```

### `.vitepress/theme/index.ts` 的 `enhanceApp` 改为 Runtime Plugin {#enhanceapp-to-runtime-plugin}

需要在 Vue 应用上注册全局组件、安装 Vue 插件或添加路由守卫时，把原来的 `enhanceApp({ app, router })` 写成 Runtime Plugin：

```ts
// my-site-plugin/runtime-plugin.ts
import { defineRuntimePlugin } from 'kawapress'
import DemoBox from './DemoBox.vue'

export default defineRuntimePlugin({
  name: 'my-site-plugin',
  setup(api) {
    api.vueApp((app) => {
      app.component('DemoBox', DemoBox)
    })
    api.router((router) => {
      router.afterEach((to) => {
        console.log('Navigated to', to.path)
      })
    })
  },
})
```

插件怎么打包与关联生成侧入口，见[插件开发](/plugins/plugin-development#package-layout)。

### 构建时数据加载（`*.data.ts`） {#data-loaders}

`.data.ts` / `.data.js` 的写法与 VitePress 保持一致，只需把导入包名从 `'vitepress'` 换成 `'kawapress'`：

```diff
-import { createContentLoader, defineLoader } from 'vitepress'
+import { createContentLoader, defineLoader } from 'kawapress'
```

如果在 Loader 里读取了全局站点配置，把 `globalThis.VITEPRESS_CONFIG` 改为 `globalThis.KAWAPRESS_CONFIG`。还要注意 KawaPress 要求 Loader 返回值必须是严格可序列化的标准 JSON（不能直接返回 `Date`、`Map`、`Set` 或 `undefined` 属性）。详见[构建时数据加载](/guide/data-loading)。

### `withBase()` {#with-base}

`withBase()` 从 `kawapress/client` 导入，第二个参数需要传入当前站点的 `base`：

```vue
<script setup lang="ts">
import { useSite, withBase } from 'kawapress/client'

const site = useSite()
</script>

<template>
  <img :src="withBase('/logo.svg', site.base)" alt="Logo">
</template>
```

需要从带前缀的路径中去掉 `base` 时，可以使用同样从 `kawapress/client` 导出的 `withoutBase(path, site.base)`。

## 暂未提供的功能 {#not-available}

以下功能目前不在 KawaPress 中提供：

- **团队展示页组件（`VPTeamMembers` 等）**：KawaPress 不内置团队卡片组件，可以使用普通 Vue 组件配合 UnoCSS 工具类编写。
- **动态路由生成（`[pkg].paths.ts`）**：页面全部来自磁盘上的 Markdown 文件（配合 `rewrites` 改写路径），不提供按参数批量生成虚拟页面的路由加载器。
- **多版本文档切换**：未内置版本管理与切换功能。
- **博客、归档与 RSS**：未内置博客布局与 RSS 生成器，文章列表仍可通过 `createContentLoader()` 自行汇总。
- **单页覆盖上下篇链接**：上下篇导航固定按当前侧边栏顺序生成。
- **`::: raw` 样式隔离容器**：未内置 `::: raw` 容器。
- **Carbon Ads 广告位**：nagi 未内置广告配置，需要展示内容时可通过 Runtime Plugin 挂入 `doc.toc` 等 Outlet。
