# 002 第一批官方插件并行交付

- 状态：done（2026-11-20 发布）
- 集成分支：`feat/plugins-batch-1`，经 kawapress/kawapress#95 合入 `main`（`f207f9a`）
- 发布：tag `v2026-11-20-plugins`，5 个新插件各发 `0.1.0`，带 provenance；GitHub Release「Five new plugins 0.1.0」
- 关联规格：`.agents/specs/plugin-feed/`、`plugin-analytics/`、`plugin-og-image/`、`plugin-file-tree/`、`plugin-vue-repl/`、`plugin-marketplace/`
- 相关规则：`.agents/rules/parallel-delivery.md`、`.agents/rules/plugin-naming.md`
- 依赖：`.agents/engineering/003-independent-versioning/`（新插件按独立版本号首发）

## 目标与范围

在一个批次里交付 5 个新插件和插件市场页，并把所有官方插件补上 `kawapress-plugin` keyword。

不在本批：vue-component-demo、vue-component-meta、typedoc（需要先设计，见 `.agents/docs/plugin-landscape.md`）。

## 工程全貌

| 工作项 | 分支 | 实施者 | 状态 |
| --- | --- | --- | --- |
| plugin-file-tree | `feat/plugin-file-tree` | Sonnet 子代理 | 已发布 0.1.0，文档站已启用 |
| plugin-analytics | `feat/plugin-analytics` | Sonnet 子代理 | 已发布 0.1.0 |
| plugin-feed | `feat/plugin-feed` | Sonnet 子代理 | 已发布 0.1.0 |
| plugin-og-image | `feat/plugin-og-image` | Sonnet 子代理 | 已发布 0.1.0，文档站已启用（带 logo） |
| plugin-vue-repl | `feat/plugin-vue-repl` | Sonnet 子代理 | 已发布 0.1.0，文档站已启用 |
| 插件市场页 + keywords | 直接在集成分支上 | 主会话 | 已上线；keywords 随各插件下次发版生效 |

同时进行的上限是 4 个。第一轮：file-tree、analytics、feed、og-image（都只依赖公开插件 API，互不相关）。第二轮：vue-repl，因为运行侧懒加载与 hydration 的风险最高，需要更仔细地审查。插件市场页放在最后，由主会话完成，因为它的数据文件需要列出本批全部新包。

### 实施者的输入

每个子代理只拿到：自己的 spec 路径、本单元、`rules/parallel-delivery.md`、`rules/plugin-naming.md`、`docs/plugins/plugin-development.md`，以及一个结构相近的现有插件作为参考：

- file-tree → `packages/plugin-container`（纯生成侧 Markdown 语法）
- analytics → `packages/plugin-comments`（生成侧配置 + 运行侧路由钩子）
- feed → `packages/plugin-sitemap`（`buildArtifacts` + `emitFile`）
- og-image → `packages/plugin-sitemap` 与 `packages/plugin-llms`（`pageData` 写 head、`importModule`）
- vue-repl → `packages/plugin-mermaid`（围栏 + `addPageComponent` + 客户端懒加载）

### 交付后的结论

- og-image 不在仓库里放字体：插件按每张卡片用到的字下载 Noto 子集并缓存，支持 `HTTPS_PROXY`、备用地址和失败不阻断构建，细节见 `specs/plugin-og-image/`。中文字体维持 Noto Sans SC；Google Fonts 上的港台字体标点居中，不适合简体。
- 内置西文字体是 Figtree。想换得更好看的开源中文字体（得意黑、霞鹜文楷简体等）需要插件支持「任意字体文件 + 本地子集化」，尚未排期。
- 只有 dev 冒烟测试没有在本地跑过（5173 端口被占），CI 上全部通过。

### 已知问题与后续

- 子代理的 worktree 从 `main` 切出，不含集成分支上的 `.agents/`。派发时在任务说明里给出规约的绝对路径。
- Core 缺口：插件在 `config()` / `configResolved()` 拿不到当前命令（dev 还是 build），analytics 暂时读取命令行参数。
- Core 缺口：导出了 `./runtime-plugin` 的包总会被加载，无法按配置省掉运行侧代码。
- nagi 正文样式会盖过插件层的列表、`summary` 和正文链接样式，file-tree 暂用 `!important`，vue-repl 的 Playground 链接沿用主题的链接样式。
- `scripts/published-types.test.ts` 会检查发布源码 import 的包是否自带类型；feed、og-image 因此把 `@types/picomatch` 放进 dependencies。子代理只跑了自己包的测试，没跑到这个仓库级测试，以后派发时要求跑全量 `pnpm test`。

### 合并时主会话统一完成

1. 审查分支，修改意见在原 worktree 里改完再合并。
2. 依赖收进 `pnpm-workspace.yaml` 的 catalog，重新生成 `pnpm-lock.yaml`。
3. `docs/sidebar.ts`、插件市场数据、CHANGELOG。
4. 全量 `pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm test:e2e`、`pnpm build`。

### 发布

新包先由用户在本机（npm 登录 + 两步验证）跑 `pnpm release --bootstrap --version 0.0.1` 与 `pnpm release:trust --apply` 占位并配置信任，再由主会话准备更新日志、经用户确认后推 tag，由 CI 发布。占位时 npm 上多出的 `0.0.0-stage` 版本不是发布脚本产生的，未处理。

## 风险

- og-image 的 `@resvg/resvg-js` 是原生依赖，CI 与用户机器都要能装上；不行就换 `@resvg/resvg-wasm`，在验证记录里写明。
- og-image 首次构建要联网下载字体；离线环境需设置 `remoteFonts: false` 并用 `fonts` 自带字体。
- vue-repl 依赖 `@vue/repl` 的公开 API，它的大版本变化频繁，依赖范围锁到 minor。

## 验证

各分支的完成判据见 `rules/parallel-delivery.md`；批次完成判据是：合并后全量检查通过，文档站中每个新插件至少有一个真实使用的页面。
