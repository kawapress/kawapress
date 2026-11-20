# 并行交付

多个功能可以在各自的 git worktree 中同时实施，同时进行中的上限为 4 个。没有独立 worktree 的工作一次只做一个。

## 分工

- 方案：主会话把每个功能的规约写进 `.agents/specs/<name>/`，批次的编排、分工和进度写进对应的 engineering 单元。实施者只读自己那份 spec、engineering 单元和 `core-product` 里被引用的章节。
- 实施：每个功能一个 worktree、一个分支 `feat/<name>`，从同一个已提交的 `main` 切出。实施者完成后在分支上提交，不合并、不推送、不发布。
- 审查与合并：主会话逐个审查分支，修改意见直接在该 worktree 里改完，再合并回 `main`。

## 共享文件

并行分支只改自己的包目录和自己的文档页。以下文件由主会话在合并时统一修改，实施分支不碰：

- `pnpm-lock.yaml`、`pnpm-workspace.yaml` 的 catalog（实施者需要新依赖时在包的 `package.json` 写具体版本范围，合并时再收进 catalog）
- `docs/sidebar.ts`、`docs/kawapress.config.ts`、`docs/plugins/overview.md` 及英文版
- `CHANGELOG.md`、`CHANGELOG.zh-CN.md`、`RELEASING.md`
- 插件市场的数据文件

## 完成判据

分支交回前必须通过：该包的单元测试、`pnpm lint`、`pnpm typecheck`，并在文档站里用真实页面跑通 spec 中的验收路径。

## 实施者常见陷阱

- 生成侧代码在构建过程中不能用动态 `import()`：配置由 Vite 模块运行器加载，构建页面时运行器已关闭。用 `createRequire` 或静态导入。单元测试发现不了，必须用真实站点构建验证（og-image、vue-component-meta 都踩过）。
- 文档站要真实构建并在浏览器里看一遍：测试夹具能通过不代表真实站点能用（vue-component-meta 曾因文档站解析不到 `vue` 输出空表）。
- 测试里不要用 `expect.any(String)` 之类的宽松断言糊过关键行为。
