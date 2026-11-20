# 插件版图与路线（背景资料）

2026-11 对比 Rspress 得出的结论，用来决定做哪些插件。已确认要做的插件以各自 spec 为准。

## 对比结论

- 两边都有：Algolia、llms、sitemap、Twoslash、评论、Mermaid、数学公式、最后更新时间。
- Rspress 官方有、KawaPress 没有：preview、playground、api-docgen（都是 React 专用）、typedoc、rss、client-redirects；核心内置多版本文档。
- Rspress 社区约 38 个插件，命名约定是 `rspress-plugin-*`，文档有社区插件列表页。

## 路线

第一批（并行实施，见 `.agents/engineering/002-official-plugins-batch-1/`）：feed、analytics、og-image、file-tree、vue-repl，以及插件市场页。

第二批（需要先和用户一起做设计）：

- `plugin-vue-component-demo`（参考 vitepress-demo-plugin）与 `plugin-vue-component-meta`（基于 `vue-component-meta`）：分成两个包，但组件库几乎总是同时使用，需要设计两者如何搭配。
- `plugin-typedoc`：不做传统的静态代码生成。初步原则：
  - 只维护一份 API 模型，同时渲染给人看的页面和给 Agent 看的 Markdown；
  - 以签名为主，按任务而不是按符号种类分组；
  - 示例在构建时用 Twoslash 做类型检查；
  - 给 Agent 分层提供：先索引，再模块，最后单个符号；
  - 自动生成版本之间的 API 变更；
  - 报告文档覆盖率；
  - 将来可以生成 Agent Skill。
  - 它和 vue-component-meta 可能共用这份 API 模型与渲染组件。
  - 前置条件：Core 目前没有 `addPage()` 或动态路由，生成 API 页面需要先在核心里设计这项能力。

暂缓：client-redirects（迁移 VitePress 时有用）、拼音搜索、changelog 页、OpenAPI、PDF 导出。
