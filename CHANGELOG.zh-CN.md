# 更新日志

KawaPress 的所有重要变更都记录在这里。格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循[语义化版本](https://semver.org/lang/zh-CN/)。1.0 之前，第二位数字的变化（如 `0.2` → `0.3`）可能包含破坏性变更。

21 个公开包一起发布，使用同一个版本号。[English](https://github.com/kawapress/kawapress/blob/main/CHANGELOG.md)

## [Unreleased]

## [0.8.1] - 2026-11-18

### 修复

- **站点做类型检查时 `@kawapress/plugin-emoji` 不再报错。** 它自己依赖 `@types/markdown-it-emoji`，站点对 `nagi()` 配置做类型检查时不会再因为 `markdown-it-emoji` 失败。

## [0.8.0] - 2026-11-18

### 破坏性变更

- **移除 `llms.description`。** `llms.txt` 开头的简介改为取站点和语言的 `description`，与页面的 description meta 是同一句话。*站点作者*：把这段文字挪过去；仍然设置 `llms.description` 的配置会加载失败，报错会指出新的写法。

  ```diff
   export default nagi({
  +  description: 'KawaPress 中文文档。',
     locales: {
       root: { label: '简体中文', lang: 'zh-CN' },
  -    en: { label: 'English', lang: 'en' },
  +    en: { label: 'English', lang: 'en', description: 'KawaPress documentation.' },
     },
  -  llms: { description: { root: 'KawaPress 中文文档。', en: 'KawaPress documentation.' } },
   })
  ```

- **与 Preset 内置插件同名的插件会替换它，同一个名字出现两次会报错。** 以前两者都会执行。*站点作者*：如果你在 `plugins` 里加了 Preset 已经包含的插件，它现在会顶替 Preset 的那一个；本意是使用 Preset 自带的，就把它从 `plugins` 里删掉。*插件作者*：每个插件的 `name` 必须唯一。
- **`shikiPlugin()` 默认输出明暗两套 GitHub 主题**，与独立渲染器和 nagi 一致。*站点作者*：不使用 nagi、直接用 `shikiPlugin()` 且没传 `theme` 或 `themes` 时，输出会变成跟随页面 `color-scheme` 的双主题标记；想保留单一主题就传 `theme: 'github-light'`。

### 新增

- **站点和语言可以设置默认 `description`。** 没在 frontmatter 写 `description` 的页面，先使用当前语言的 `description`，再使用全站的。
- **站点可以替换 Preset 内置的插件**：在 `plugins` 里放一个同名插件，它会在 Preset 原来的位置执行。
- **`shikiPlugin()` 支持 `languages`。** 额外的 grammar 注册在默认语言之后加载，与独立 Markdown 渲染器一致。
- **生成侧插件可以读取解析完成的站点配置。** `api.configResolved()` 在全部 `config()` 之后执行，默认值已经补上、配置已经归一化，插件不必再自己重复一遍。官方插件都已改用它。
- **插件作者可以使用 KawaPress 自己的工具。** `kawapress/generator` 新增 `setupGeneratorPlugins()`，按构建流程加载插件，供测试和工具使用；以及 `resolveMarkdownPageScope()`，返回 KawaPress 自己列页面时使用的范围。`withBase()` 和 `withoutBase()` 也从 `kawapress` 导出。

### 修复

- **`head` 中声明的站点图标会替换 nagi 的 logo 图标。** 站点、语言或页面的 `head` 写了 `rel="icon"` 链接时，nagi 不再根据 `themeConfig.logo` 再生成一条。

### 迁移

1. 把 `llms.description` 挪到站点配置和各语言的 `description`。
2. 检查 `plugins`：与 Preset 已包含的插件重复的项，除非你想替换它，否则删掉。
3. 直接使用 `shikiPlugin()`、没有指定主题又只想要一套主题时，传入 `theme`。

## [0.7.1] - 2026-11-16

### 修复

- **发布包的客户类型检查可以正常通过。** 补齐虚拟模块和 `ClientOnly` 声明、生成器的 `picomatch` 声明，并兼容不同 Shiki 版本的 twoslash 元数据。

## [0.7.0] - 2026-11-16

### 新增

- **公开独立的 Markdown 渲染器。** Core 支持自定义高亮器，`@kawapress/plugin-shiki` 为构建时 demo 加载器提供双主题高亮和自定义 grammar 注册。

## [0.6.0] - 2026-11-16

### 新增

- **Core 提供 `ClientOnly` 和 `useAppearance()`。** `<ClientOnly>` 已全局注册，浏览器专属内容在挂载后才渲染；`useAppearance()` 提供响应式 `isDark`，跟随根元素的外观 class 或操作系统偏好。
- **站点可以直接配置 Vite 和本地 Runtime Plugin。** `vite` 接受常规 Vite 配置，`runtimePlugin` 在插件包之后加载站点本地模块，`publicDir` 也可以指向 `srcDir` 外的目录。
- **nagi 可以关闭内置 llms 和页脚。** 站点自己提供对应能力或不需要它们时，使用 `llms: false` 和 `themeConfig.footer: false`。

### 修复

- **`layout: page` 不再把文档排版样式套到自定义页面上。** 标题、图片、分隔线等标记保持站点自己的样式，编辑器、演练场这类应用页面不会再出现多余的间距和边框。
- **空白页面布局撑满滚动视口。** `layout: page` 不再把需要满屏的应用内容压缩成自身内容的高度。
- **移动端保留搜索入口。** nagi 在导航栏继续显示搜索按钮，只把语言、明暗和社交链接收进移动端菜单。

## [0.5.1] - 2026-11-16

### 修复

- **末尾带斜杠的地址不再显示 404 页面。** 在 dev、`kawapress preview` 和站内跳转中，`/guide/` 都会打开页面 `/guide`；Markdown 里写成 `/guide/` 的链接渲染时去掉末尾斜杠。（[#54](https://github.com/kawapress/kawapress/issues/54)）
- **传送到 `body` 的内容现在会在服务端渲染出来。** `<Teleport to="body">`（提示框、菜单、对话框等）在 dev 和构建产物里都写在 `<body>` 开头，这类页面水合时不再报不匹配，首次更新也不再抛出 `insertBefore` 错误。（[#56](https://github.com/kawapress/kawapress/issues/56)）

## [0.5.0] - 2026-11-16

### 新增

- **nagi 支持自定义页面布局。** `layout: <名字>` 会在页面外框里渲染以该名字注册的全局组件，`layout: false` 不渲染任何 nagi 外框，与 VitePress 一致。（[#52](https://github.com/kawapress/kawapress/issues/52)）
- **`themeConfig.appearance` 设置 nagi 站点的默认外观。** 写 `'dark'` 或 `'light'` 后，读者还没手动切换时就用这个外观；`'auto'`（默认）继续跟随系统。（[#52](https://github.com/kawapress/kawapress/issues/52)）

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

[Unreleased]: https://github.com/kawapress/kawapress/compare/v0.8.1...HEAD
[0.8.1]: https://github.com/kawapress/kawapress/compare/v0.8.0...v0.8.1
[0.8.0]: https://github.com/kawapress/kawapress/compare/v0.7.1...v0.8.0
[0.7.1]: https://github.com/kawapress/kawapress/compare/v0.7.0...v0.7.1
[0.7.0]: https://github.com/kawapress/kawapress/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/kawapress/kawapress/compare/v0.5.1...v0.6.0
[0.5.1]: https://github.com/kawapress/kawapress/compare/v0.5.0...v0.5.1
[0.5.0]: https://github.com/kawapress/kawapress/compare/v0.4.2...v0.5.0
[0.4.2]: https://github.com/kawapress/kawapress/releases/tag/v0.4.2
[0.4.1]: https://github.com/kawapress/kawapress/releases/tag/v0.4.1
[0.4.0]: https://github.com/kawapress/kawapress/releases/tag/v0.4.0
[0.3.0]: https://github.com/kawapress/kawapress/releases/tag/v0.3.0
[0.2.2]: https://github.com/kawapress/kawapress/commit/5a9b6f2
[0.2.1]: https://github.com/kawapress/kawapress/commit/5456bfa
[0.2.0]: https://github.com/kawapress/kawapress/releases/tag/v0.2.0
