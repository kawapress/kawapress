# 004 Vue 组件文档：demo 与 meta

- 状态：draft（规约待用户审阅）
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
