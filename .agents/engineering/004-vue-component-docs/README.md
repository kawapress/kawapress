# 004 Vue 组件文档：demo 与 meta

- 状态：in_progress（集成分支 `feat/vue-component-docs`：meta、demo 静态示例、调节面板均已合入，文档页已上线；待合入 main 与发布）
- 关联规格：`.agents/specs/plugin-vue-component-meta/`、`.agents/specs/plugin-vue-component-demo/`；并行设计 `.agents/specs/core-plugin-pages/`（typedoc 的前置，不在本单元实施）
- 相关规则：`.agents/rules/parallel-delivery.md`、`.agents/rules/plugin-naming.md`

## 目标与范围

交付 `@kawapress/plugin-vue-component-meta` 与 `@kawapress/plugin-vue-component-demo`，两者同时安装时 demo 出现属性调节面板。

## 顺序

1. meta 先行：`?component-doc` 查询、`ComponentDoc` 模型与控件推断、`<ComponentApi>` 表格。demo 的调节面板依赖它的数据模型。
2. demo 静态示例可与 meta 并行；调节面板在 meta 的模型合并后再做。
3. 文档站新增「组件演示」「组件 API」两页，用一个示例组件 dogfooding。

## 风险

- `vue-component-meta` 首次分析约 300 MB 内存，CI 与文档站构建要留意。
- 泛型组件读不出 props，需要清楚的提示。
- 调节演练区的初始参数必须服务端与客户端一致，否则 e2e 因 hydration 警告失败。

## 验证

各规约的「验收」一节；全量 `pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm test:e2e`、`pnpm build`。

## 交付记录

- meta 合入后真实构建暴露的问题：构建时 `import()` 遇到已关闭的模块运行器（改 `createRequire`）；文档站解析不到 `vue` 导致空表（文档站加 `vue`，插件给警告）；vue-component-meta 3.3 读不到 emits 的 JSDoc（插件从源码兜底读取）。
- demo 的标题用 `renderInline(text, env)` 渲染，核心的链接收集规则在行内模式下清空了页面标题，导致指向该页锚点的链接被判为死链。核心改为行内模式不收集，demo 改用 env 副本。这次改动涉及 `kawapress` 包，发布时核心版本组要一起发。
- e2e 未新增调节面板的专项用例；构建测试与 SSR 后 hydrate 的单元测试覆盖了无 hydration 警告。
