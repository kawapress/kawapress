# 更新日志

KawaPress 的所有重要变更都记录在这里。格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循[语义化版本](https://semver.org/lang/zh-CN/)。1.0 之前，第二位数字的变化（如 `0.2` → `0.3`）可能包含破坏性变更。

21 个公开包一起发布，使用同一个版本号。[English](https://github.com/kawapress/kawapress/blob/main/CHANGELOG.md)

## [Unreleased]

## [0.4.2] - 2026-11-16

### 修复

- **用 pnpm 安装的站点也能加载主题。** 之前在 pnpm 下，使用 `kawapress/nagi` 的站点构建出的页面没有主题，并报错 `rendered page did not contain [data-kawa-ssg-md-root]`。（[#46](https://github.com/kawapress/kawapress/issues/46)）
- **导入了 `kawapress/client` 的页面在 `kawapress dev` 下正常显示。** 之前页面或组件只要调用 `usePageData()`、`useSite()` 等客户端组合式函数，开发模式下就会白屏，并报错 `useRoute() and useRouter() need a KawaPress app`。（[#48](https://github.com/kawapress/kawapress/issues/48)）
- **站点自己能解析到 `@vue/server-renderer` 时，llms 构建也能成功。** pnpm workspace 里常见这种情况，之前 `kawapress build` 会报错 `rendered page did not contain [data-kawa-ssg-md-root]`。（[#50](https://github.com/kawapress/kawapress/issues/50)）

## [0.4.1] - 2026-11-15

### 修复

- **站点 `package.json` 不是 ES 模块包时，`kawapress build` 也能正常构建。** 没有设置 `"type": "module"` 的项目（例如用 `npm init -y` 创建的项目）不再报错 `Cannot find module '…/dist/.server/entry-server.js'`。（[#44](https://github.com/kawapress/kawapress/issues/44)）

## [0.4.0] - 2026-11-15

### 破坏性变更

**nagi 的 `themeConfig.githubUrl` 替换为 `themeConfig.socialLinks`。** 配置中仍然保留 `githubUrl` 时会在构建时报错并提示改写方式。样式 class `.nagi-github-link` 同步改为 `.nagi-social-link`。

- **站点作者**：把 `themeConfig.githubUrl`（以及各语言下的 `githubUrl`）改为 `themeConfig.socialLinks`。
- **写过自定义样式的站点作者**：把 `.nagi-github-link` 选择器改为 `.nagi-social-link`。

```diff
 export default nagi({
   themeConfig: {
-    githubUrl: 'https://github.com/kawapress/kawapress',
+    socialLinks: [
+      { icon: 'github', link: 'https://github.com/kawapress/kawapress' },
+    ],
   },
 })
```

**标题纯文本去掉行内 HTML 标签。** 用于 `pageData.title`、`pageData.headers`、右侧大纲、`[[toc]]`、本地搜索和 `llms.txt` 的标题纯文本现在会去掉行内 HTML 标签、只保留标签之间的文字：`<kbd>Ctrl</kbd>` 读作 `Ctrl`，`<Badge text="beta" />` 不保留任何文字。标题锚点 ID 不变。

- **站点作者**：如果此前依赖行内 HTML 标签或组件属性（如 `<Badge text="beta" />`）进入页面标题或大纲，请把文字移到标签外，或在 frontmatter 中显式设置 `title`。

**`@kawapress/plugin-search` 的 `loadSearchIndexes()` 第一个参数由 `sourceRoot` 字符串改为 `MarkdownPageScope`，`markdownFileToRoutePath()` 支持可选的 `rewrites` 参数。** `MarkdownPage` 与 `PageBuildArtifact` 新增 `pagePath` 字段（表示经 `rewrites` 改写后的页面路径）。

- **插件作者**：调用 `loadSearchIndexes()` 时传入 `{ sourceRoot, publicDir, exclude, rewrites }`；在测试中构造 `PageBuildArtifact` 或 `MarkdownPage` 时补上 `pagePath`。

```diff
-const indexes = await loadSearchIndexes(sourceRoot, locales, options)
+const indexes = await loadSearchIndexes(
+  { sourceRoot, publicDir, exclude: srcExclude, rewrites },
+  locales,
+  options,
+)
```

**平台检测脚本标签的 `id` 变更。** 识别访客平台的内联脚本从 `@kawapress/plugin-search` 移入 `kawapress/client` 的 `usePlatformAttribute()`，`<head>` 中对应 `<script>` 的 `id` 由 `kawa-search-platform` 改为 `kawa-platform`。

### 新增

- **Markdown 文件引入（`<!--@include: ...-->`）与代码片段导入（`<<< ...`）。** 支持整文件引入、`#region` 片段、`{start,end}` 行号范围，以及带 `#region`、`{lines lang attrs}` 和 `[title]` 标签名的代码片段导入；`kawapress/generator` 公开 `expandMarkdownSource()` 与 `readMarkdownSource()`。详见 [Markdown 语法扩展](https://kawapress.dev/guide/markdown-extensions#import-code-snippets)。
- **站点配置新增 `srcExclude` 与 `rewrites`。** 用 `srcExclude` 排除不作为页面的 Markdown 文件，用 `rewrites` 规则对象或函数改写页面公开路由；`kawapress/generator` 公开 `markdownFileToPagePath()`。详见[路由](https://kawapress.dev/guide/routing#excluding-source-files)。
- **`@kawapress/plugin-badge`、`@kawapress/plugin-toc` 与 `@kawapress/plugin-emoji`（nagi 默认启用）。** 使用 nagi 的站点可直接在 Markdown 中写 `<Badge>`、`[[toc]]` 和 `:tada:` 表情短代码。
- **`@kawapress/plugin-algolia-search` 与 `nagi({ search: false })`。** 接入 Algolia DocSearch，按需加载脚本、自动按当前语言附加 `lang:<lang>` 过滤并映射到 `--kawa-*` Token；在 `nagi()` 中传 `search: false` 可关闭内置本地搜索。详见 [Algolia 搜索](https://kawapress.dev/plugins/algolia-search)。
- **nagi 侧边栏分组折叠（`collapsed`）与 `socialLinks`。** 在 `themeConfig.sidebar` 或目录 `_meta.json` 中用 `collapsed: true | false` 控制分组折叠，在 `themeConfig.socialLinks` 中使用 Simple Icons 名称或自定义 SVG 配置顶栏社交图标链接。详见[国际化](https://kawapress.dev/guide/internationalization#collapsible-sidebar-groups)。
- **`kawapress/client` 公开 `usePlatformAttribute()` 与 `withoutBase()`。** 在首屏绘制前写入 `data-kawa-platform` 属性，并提供从路径中移除站点 `base` 的 `withoutBase()`。
- **[从 VitePress 迁移](https://kawapress.dev/guide/migrate-from-vitepress)指南。** 提供迁移步骤、站点与主题配置对照表，以及组合式函数替换说明。

### 迁移

1. 把站点里的 `kawapress` 和所有 `@kawapress/*` 包升级到 `0.4.0`。
2. 如果使用 nagi 并设置过 `themeConfig.githubUrl`，改为 `themeConfig.socialLinks`；样式里的 `.nagi-github-link` 选择器改为 `.nagi-social-link`。
3. 如果写过调用 `loadSearchIndexes()` 或构造 `PageBuildArtifact` / `MarkdownPage` 对象的插件，按上面的示例修改。
4. 如果 nagi 站点自己在 `plugins` 里加过 `@kawapress/plugin-badge`、`@kawapress/plugin-toc` 或 `@kawapress/plugin-emoji`，可以把它们删掉，nagi 已经默认安装。
5. 运行 `kawapress build`，检查标题里带行内 HTML 的页面标题和大纲。

## [0.3.0] - 2026-10-28

### 破坏性变更

**Outlet 改名，`addToOutlet()` 被替换。** 旧名字和旧 API 已经移除，没有保留别名，仍在使用它们的插件会在站点启动时报错。

| 旧 Outlet | 新 Outlet |
| --- | --- |
| `header.actions` | `layout.header.end` |
| `doc.header` | `doc.under-title` |
| `doc.footer` | `doc`（后置） |
| `doc.after` | `doc`（后置） |

| 旧 API | 新 API |
| --- | --- |
| `api.addToOutlet(outlet, item)` | `api.prependToOutlet(outlet, item)` 或 `api.appendToOutlet(outlet, item)` |

不同身份的用户需要做什么：

- **站点作者**，只使用官方插件：代码不需要改。把 `kawapress` 和所有 `@kawapress/*` 包一起升级到 `0.3.0`。
- **插件作者**：替换每一处 `api.addToOutlet(...)`。`prependToOutlet` 把组件放在主题内容前面，`appendToOutlet` 放在后面。`id` 参数不变。
- **主题作者**：把主题自己画的内容包进 `<KawaOutlet name="...">`，不要再在旁边放一个空的 `<KawaOutlet />`。作用域插槽（`v-slot="{ items }"`）已移除，默认插槽现在放的是你自己的内容。

```diff
-api.addToOutlet('doc.footer', { id: 'last-updated', component: LastUpdated })
+api.appendToOutlet('doc', { id: 'last-updated', component: LastUpdated })
```

```diff
-<KawaOutlet name="header.actions" />
-<LanguageMenu />
+<KawaOutlet name="layout.header.end">
+  <LanguageMenu />
+</KawaOutlet>
```

### 新增

- **八个标准 Outlet。** Outlet 的名字由「范围 + 位置」组成：`layout` 是页面框架，`doc` 是正在阅读的这一篇文档，`start` / `end` 跟随阅读方向。八个名字是 `layout.header`、`layout.header.start`、`layout.header.end`、`layout.sidebar`、`layout.footer`、`doc`、`doc.under-title`、`doc.toc`，nagi 主题全部实现。详见[主题开发](https://kawapress.dev/plugins/theme-development)和[插件开发](https://kawapress.dev/plugins/plugin-development)。
- **`api.prependToOutlet()` 与 `api.appendToOutlet()`。** 插件可以选择出现在主题自己内容的前面还是后面。多个插件使用同一个 Outlet 的同一侧时，按 `plugins` 数组的顺序依次排列。
- **GitHub Packages。** 15 个带 `@kawapress/` 前缀的包也会出现在仓库页面的 Packages 里，安装仍然从 npmjs.com 进行。`kawapress` 和 `create-kawapress` 不在那里，因为 GitHub 要求包的 scope 与所有者同名。

### 变更

- **最后更新那一行。** 左边是带图标的编辑链接，右边是更新时间。它现在排在上一篇/下一篇之后，评论区又排在它之后。两个插件都追加到 `doc`，想调整它们的顺序，就调整它们在 `plugins` 里的顺序。
- **Mermaid 并排视图。** 左边是源码，右边是图，中间的分隔条可以拖动。分隔条平时是一条细线，悬停或拖动时才加宽，源码区撑满整个高度。窄屏幕上，图排在源码上方。
- **文档。** 主题相关的几篇合并成一篇[主题开发](https://kawapress.dev/plugins/theme-development)，`guide/theme-customization` 和 `guide/theme-architecture` 两个页面不再存在。文档站每次构建前会补全 git 历史，所以每个页面都能显示最后更新时间。

### 修复

- 插件放进顶栏控件区的内容（例如搜索按钮）在 0.2.1 里被放到了 Logo 旁边，现在回到顶栏末尾，位于语言菜单之前。

### 迁移

1. 把站点里的 `kawapress` 和所有 `@kawapress/*` 包升级到 `0.3.0`。
2. 如果写过插件，按上面的示例替换 `addToOutlet()`，并按表格改掉 Outlet 的名字。
3. 如果写过主题，把你的内容包进 `<KawaOutlet>`，并删掉对它作用域插槽的使用。
4. 运行 `kawapress build`。如果有插件往一个没有任何页面渲染的 Outlet 里放了内容，会输出一行警告。

## [0.2.2] - 2026-10-28

### 修复

- npm 上每个包的 README 里「简体中文」链接会打开 404 页面。现在每个包的 tarball 都包含 `README-zh-CN.md`，链接可以正常打开。

## [0.2.1] - 2026-10-27

### 新增

- **每个包自己的 README。** 每个包在 npm 页面上都有自己的中英文 README。
- **Mermaid 视图。** 图可以在图像、代码、并排三种视图之间切换。

### 变更

- **nagi 顶栏。** 搜索按钮移到了 Logo 旁边，导航链接移到右侧，与语言菜单、外观切换和 GitHub 链接放在一起。
- 仓库迁移到 `kawapress` GitHub 组织，文档链接改用 `kawapress.dev`。
- **发布流程。** 每个包有自己的版本号，一次发布只发布 npm 上还没有的版本。详见 [RELEASING.md](https://github.com/kawapress/kawapress/blob/main/RELEASING.md)。

### 修复

- 放大后的 Mermaid 图不再被视图切换下方的一条硬边截断。

## [0.2.0] - 2026-10-27

### 破坏性变更

- 页面数据、Frontmatter 和主题配置的类型，现在由插件和主题通过 TypeScript 接口合并来扩展，不再用泛型参数传递。请使用不带类型参数的 `defineConfig()` 和 `useThemeConfig()`，并在 `declare module 'kawapress' { interface ThemeConfig { ... } }` 里声明主题字段。
- 已移除 `PresetConfig`、`NagiThemeConfig`、`NagiHomeFrontmatter` 和 `LastUpdatedPageData`。

### 新增

- `@kawapress/plugin-mermaid`：用文字写图表，构建时画成 SVG。
- nagi 的 `themeConfig.nav`：顶栏的分区链接，每个分区有自己的侧边栏。
- 官方文档分成「指南」和「插件」两个分区，并新增官方插件总览页。

### 修复

- CSS 目标浏览器改为原生支持 `light-dark()` 的版本，主题覆盖 Token 不再在生产构建中丢失颜色。
- 发布时某个版本已经在 npm 上，不再让整次发布失败。

[Unreleased]: https://github.com/kawapress/kawapress/compare/v0.4.2...HEAD
[0.4.2]: https://github.com/kawapress/kawapress/releases/tag/v0.4.2
[0.4.1]: https://github.com/kawapress/kawapress/releases/tag/v0.4.1
[0.4.0]: https://github.com/kawapress/kawapress/releases/tag/v0.4.0
[0.3.0]: https://github.com/kawapress/kawapress/releases/tag/v0.3.0
[0.2.2]: https://github.com/kawapress/kawapress/commit/5a9b6f2
[0.2.1]: https://github.com/kawapress/kawapress/commit/5456bfa
[0.2.0]: https://github.com/kawapress/kawapress/releases/tag/v0.2.0
