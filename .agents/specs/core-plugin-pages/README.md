# 插件页面（草案）

状态：draft，待用户确认「待定问题」后转为正式规约，并更新 `core-product` 里「0.1 不提供 `addPage()`」的条目。

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

- 只支持 Markdown 源码。插件要用组件时在 Markdown 里写组件，由 `addPageComponent` 引入；不提供「直接给一个 Vue 组件当页面」的入口，保持一条编译管线。
- 「动态路由」在 SSG 下展开为具体路径：插件返回的就是全部路径，不引入参数路由。
- 开发时插件调用 `api.invalidatePages()` 通知页面集合变化，核心重新收集并整页刷新；单个页面内容变化走普通 HMR。

### 核心改动

1. **统一页面列表**：`listSitePages()` 合并 Markdown 文件与插件页面，统一检查路由冲突（冲突时报出两边来源），并导出给 nagi、搜索、feed 使用，取代它们各自的 `listMarkdownPages` 调用。
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

## 待定问题（需要用户决定）

1. 插件页面是否只允许 Markdown 源码（本草案的建议），还是也允许直接给一个 Vue 组件？
2. `api.pages()` 是否放进 0.x 的公开插件 API，还是先标记为实验性（`api.experimental.pages()`），待 typedoc 验证后再转正？
3. 已发布插件（last-updated、sitemap、search、feed、og-image、llms）适配插件页面，是否随核心一起在同一个版本发出？

## 验收

- 一个测试插件生成多语言的若干页面：开发时可访问、可热更新、集合变化时整页刷新；生产构建预渲染成功、无 hydration 警告。
- 插件页面出现在自动侧边栏、搜索、sitemap、llms 输出中；不显示编辑链接与最后更新时间。
- 与 Markdown 页面路由冲突时报错并指出两边来源。
