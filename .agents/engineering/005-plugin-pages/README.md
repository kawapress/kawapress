# 005 插件页面

- 状态：实施中
- 关联 issue：#101
- 关联规约：`.agents/specs/core-plugin-pages/`；`core-product` 的「4.3 Generator Plugin API」
- 相关规则：`.agents/rules/parallel-delivery.md`

## 目标与范围

核心提供 `api.pages()`、`api.invalidatePages()`、`listSitePages()`、`onSitePagesChange()`，nagi 与 6 个已发布插件（last-updated、sitemap、search、feed、og-image、llms）同批适配。typedoc 不在本单元。

## 顺序

两个阶段在同一个分支 `feat/plugin-pages` 上依次完成，第二阶段依赖第一阶段的 API。

1. **核心**（`packages/kawapress`）
   - 类型：`PluginPage`、`SitePage`，`PageDataContext` 与 `PageBuildArtifact` 增加 `origin`、`file` 改为可选；全部导出。
   - 插件页面注册表：收集、校验（`path`、`sourcePath` 格式与唯一性、与文件页面的路由冲突）、`invalidatePages()` 重新收集。
   - `listSitePages()` / `onSitePagesChange()`，按 `ResolvedSiteConfig` 对象找到站点。
   - 页面表、构建入口、预渲染、dead link 注册表改用全站页面；插件页面的模块 id 用 `/@kawapress-page/<sourcePath>`，`markdownPlugin` 与 `page-loader` 从注册表取源码、接受显式的路由与 `sourcePath`。
   - 开发服务器：集合变化时使页面表失效并整页刷新；单页源码变化时只让该页模块失效（HMR）。
   - 插件开发文档（`docs/plugins/plugin-development.md` 与英文版）加入 `pages()` 一节，示例按正式发布后的用法写。
2. **适配**
   - nagi 自动侧边栏、search 索引、feed：改用 `listSitePages()` 与 `onSitePagesChange()`，读源码用 `readSource()`。
   - last-updated：插件页面不查 git，只采用 frontmatter 里的 `lastUpdated`、`editLink`。
   - sitemap：`lastmod` 用 frontmatter 的 `lastUpdated`，没有就省略。
   - llms：以 `sourcePath` 而不是 `file` 为键；开发期 `.md` 响应能找到插件页面。
   - og-image、feed 的 include/exclude 对插件页面匹配其 `sourcePath`。
   - 用到 `listSitePages`、`onSitePagesChange` 的包（nagi、search、feed）在发布时把 `kawapress` peer 范围提高到新核心版本；其余包保持兼容旧核心（缺少 `origin` 视为文件页面）。

## 验证

- 核心单元测试：一个测试插件生成多语言页面；路由冲突、`sourcePath` 重复、格式错误报错；`invalidatePages()` 触发重新收集与变化通知。
- 文档站 dogfooding：在 `docs` 里加一个只在本仓库使用的本地插件（不写进文档、不发布），生成一两个页面，`pnpm dev` 下可访问并热更新，`pnpm build` 后预渲染成功；页面出现在侧边栏、搜索、sitemap、llms 输出中，不显示编辑链接与最后更新时间。验证后决定保留为 e2e 夹具还是删除。
- 全量 `pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm test:e2e`、`pnpm build`。

## 风险

- 页面身份等同文件路径的假设分散在很多地方，漏改会表现为插件页面在某处静默缺失；以验收路径逐项检查。
- 插件页面的模块 id 必须能被 `@vitejs/plugin-vue` 接受，并在客户端 manifest 中有稳定的键，否则预渲染找不到页面 chunk。
- 单文件 500 行上限：`compiler/page-loader`、`generator/vite/plugins/pages.ts` 等扩展时需要拆分。
