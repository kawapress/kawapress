# 插件页面

状态：已确认，待实施。核心 API 摘要见 `core-product` 的 Generator Plugin API 一节。

让 Generator Plugin 向站点添加不来自 `srcDir` 里 Markdown 文件的页面。第一个使用者是 `plugin-typedoc`（每个模块、每个符号一页），之后可服务 changelog 页、归档页、OpenAPI 等。

## 现状

页面的唯一来源是 `listMarkdownPages`（`generator/pages.ts`），页面身份在很多地方等同于源文件路径：

- 构建入口、`virtual:kawapress-pages`、页面编译（`markdownPlugin` 读文件、`page-loader` 按 `file` 缓存并推导路由）都以 `file` 为键。
- `PageDataContext.file`、`PageBuildArtifact.file` 是必填字段，`pageArtifacts` 与 llms 插件以 `file` 为键。
- 读磁盘的使用者：nagi 侧边栏、搜索索引、feed 的语言判断、dead link 检查。
- 依赖 git 的使用者：最后更新时间、编辑链接、sitemap 的 `lastmod`。
- 路由只做精确匹配，没有动态参数（`router` 规约的非目标）。

## 方案

### API

```ts
api.pages(async ({ command }) => PluginPage[])

interface PluginPage {
  /** 路由，例如 `/api/core/define-plugin`。带语言前缀时归属该语言。 */
  path: string
  /** Markdown 源码，走与普通页面完全相同的编译管线（frontmatter、标题、组件、Shiki、addPageComponent）。 */
  markdown: string
  /** 页面在「来源」上的标识，用于 include/exclude 匹配与排序，形如 `@typedoc/core/define-plugin.md`。 */
  sourcePath: string
}
```

- `api.pages()` 与 `api.invalidatePages()` 是正式的公开插件 API，不加 `experimental` 前缀，按 0.x 的常规兼容规则演进。
- 只支持 Markdown 源码。插件要用组件时在 Markdown 里写组件，由 `addPageComponent` 引入；不提供「直接给一个 Vue 组件当页面」的入口，保持一条编译管线。
- 「动态路由」在 SSG 下展开为具体路径：插件返回的就是全部路径，不引入参数路由。
- 开发时插件调用 `api.invalidatePages()` 通知页面集合变化，核心重新收集并整页刷新；单个页面内容变化走普通 HMR。

### 页面标识

- `path` 是公开路由：以 `/` 开头、不含 `base` 的站内路径，结尾的 `/` 表示目录首页。页面所在语言由路径前缀按 `locales` 判断，与普通页面一致。
- `sourcePath` 不以 `/` 开头、以 `.md` 结尾，建议用插件名做第一段（如 `@typedoc/core/define-plugin.md`），因此不会与 Markdown 文件的 `sourcePath`（以 `/` 开头）重名；同一站点内插件页面的 `sourcePath` 必须唯一，重复时报错指出两个插件。
- `pagePath` 由路由推出：`/x/` 为 `/x/index.md`，`/x/y` 为 `/x/y.md`，llms 的每页 `.md` 输出用它。

### 读取全站页面

`kawapress/generator` 导出两个函数，取代插件各自调用 `listMarkdownPages`：

```ts
/** 先是 Markdown 文件页面（顺序同 listMarkdownPages），再是插件页面（按插件顺序与各插件返回的顺序）；路由冲突时报错并指出两边来源。 */
listSitePages(site: ResolvedSiteConfig): Promise<SitePage[]>

/** 页面集合变化（Markdown 文件增删、任一插件调用 invalidatePages()）时通知，返回取消函数。只在开发服务器中触发。 */
onSitePagesChange(site: ResolvedSiteConfig, listener: () => void): () => void

interface SitePage {
  origin: 'file' | 'plugin'
  /** 仅文件页面有。 */
  file?: string
  sourcePath: string
  pagePath: string
  routePath: string
  /** 当前的 Markdown 源码：文件页面读磁盘（展开 include），插件页面取插件给出的源码。 */
  readSource: () => Promise<string>
}
```

- 两个函数以 `configResolved()` 拿到的同一个 `ResolvedSiteConfig` 对象为键找到站点；传入其他对象时报错，说明应使用 `configResolved()` 的结果。
- 插件页面在全部 `configResolved()` 之后、第一次需要页面列表时收集；`pages()` handler 按插件顺序执行一次，开发期在 `invalidatePages()` 后重新执行。
- `listMarkdownPages`、`resolveMarkdownPageScope`、`isMarkdownPage` 继续导出，供只关心磁盘文件的场景使用（如判断改动的文件是不是页面）。

### 核心改动

1. **统一页面列表**：核心内部的页面表、构建入口、dead link 注册表都改用 `listSitePages()`；nagi、搜索、feed 改用它和 `onSitePagesChange()`。
2. **虚拟模块 id**：插件页面用不含 `\0`、以 `.md` 结尾的 id（如 `/@kawapress-page/<sourcePath>`），让 `@vitejs/plugin-vue` 接受它，并在客户端 manifest 中有稳定的键，预渲染能找到对应 chunk。
3. **编译**：`markdownPlugin.load` 对插件页面从注册表取源码；`page-loader` 接受显式的 `routePath`、`sourcePath`，不再从文件路径推导；插件页面不支持 `<!--@include-->`。
4. **构建入口与预渲染**：插件页面进入 `createPageInputs` 与 dead link 注册表，其余流程不变。

### 无源文件页面的规则

| 能力 | 规则 |
| --- | --- |
| `PageDataContext.file` | 改为可选；插件页面没有 `file`，新增 `origin: 'file' \| 'plugin'`。读 `file` 的 `pageData` 处理器必须先判断。 |
| 最后更新时间、编辑链接 | 插件页面默认不显示；插件可以在 frontmatter 里给 `lastUpdated`、`editLink`。 |
| sitemap `lastmod` | 用 frontmatter 的 `lastUpdated`，没有就省略。 |
| llms / 页面 `.md` | 用插件提供的 Markdown 源码，与普通页面一致。 |
| 搜索 | 通过统一页面列表拿到源码后建索引。 |
| nagi 侧边栏 | 自动侧边栏把插件页面当作同路径的普通页面；`_meta.json` 只对磁盘目录生效，插件页面的顺序与标题由 frontmatter 决定。 |
| feed、og-image 的 include/exclude | 匹配 `sourcePath`，插件页面用自己的 `sourcePath` 参与匹配。 |
| `rewrites` | 不作用于插件页面。 |

## 发布

核心与已发布插件（last-updated、sitemap、search、feed、og-image、llms）以及 nagi 对插件页面的适配在同一批发布中发出：用户升级后，插件页面立即出现在侧边栏、搜索、sitemap、feed、llms 输出中，不存在只有核心支持的中间状态。各插件仍按自己的版本号升级，不跟随核心版本号。只有用到核心新导出（如 `listSitePages`）的插件才把 `kawapress` peer 范围提高到这次的核心版本；只读取 `origin`、`file` 的插件在旧核心上把缺少 `origin` 视为文件页面，peer 范围不变。

## 验收

- 一个测试插件生成多语言的若干页面：开发时可访问、可热更新、集合变化时整页刷新；生产构建预渲染成功、无 hydration 警告。
- 插件页面出现在自动侧边栏、搜索、sitemap、llms 输出中；不显示编辑链接与最后更新时间。
- 与 Markdown 页面路由冲突时报错并指出两边来源。
