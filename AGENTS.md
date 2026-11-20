# KawaPress

## 1. 项目定调

KawaPress 是以 Vue 为核心的静态站点生成器，目标是在扩展性和开发体验上超越 VitePress。pnpm monorepo：`packages/` 下是核心 `kawapress`、默认 Preset `preset-nagi`、脚手架 `create-kawapress` 与各官方插件；`docs/` 是官方文档站，同时承担 dogfooding。

开发计划用 GitHub Project 管理（[KawaPress Development Plan](https://github.com/users/ShenQingchuan/projects/2)），以 issue 驱动，交付状态以它为准。issue、PR、commit 使用英文。

## 2. 验证与闭环

- 单元测试：`pnpm test`，只跑某个包：`pnpm vitest run packages/plugin-mermaid`
- 静态检查：`pnpm lint`、`pnpm typecheck`
- E2E：`pnpm test:e2e`（文档站生产构建 + `kawapress preview`，任何控制台 error 或 hydration 警告即失败）
- 文档站：`pnpm dev` 本地预览；`pnpm build` 生产构建，改动插件或核心后必须用文档站验证真实行为
- 发布：见 [RELEASING.md](./RELEASING.md)。推送 `v*` tag 即触发 npm 发布

## 3. 上下文指引

按需查阅，不要提前全量加载：

- 稳定规约：`.agents/specs/`。`core-product/` 是核心产品与架构的决策来源，改动核心、nagi 或插件 API 之前必须读相关章节，不得违背；新确认的核心决策合入这份文档。各官方插件的规约在 `plugin-<name>/`
- 工程实施：`.agents/engineering/`，进行中的单元见其 `README.md` 导航
- 项目规则：`.agents/rules/`
- 背景资料与调研结论：`.agents/docs/`
- 项目专属技能：`.agents/skills/`

规约只记录当前有效结论、约束和待确认事项，不记录讨论过程或已被替代的设计。调研只为支撑规约，结论写进 spec 后删除调研草稿，除非用户要求保留。

## 4. 红线

1. 未经用户在对话中明确同意，不推送 `v*` tag、不执行任何 `pnpm release` 发布命令。
2. 不改写 `main` 的已推送历史，不强推。
3. 官方文档按正式发布后的真实用法编写，不暴露 `workspace:*`、未发布版本号等开发期状态。
