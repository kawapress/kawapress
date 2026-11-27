# 插件页面

状态：已确认，待实施。核心 API 摘要见 `core-product` 的 Generator Plugin API 一节。

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

一句话：**先写网址，再写内容从哪来。**

```ts
// 挂现成文件：网址模板 ↔ 文件模板，同名参数两边对应
api.pages('/packages/[name]', '../packages/[name]/README.md')
api.pages('/notes/[...slug]', '../notes/[...slug].md')

// 生成内容：函数返回每页的参数与 Markdown
api.pages('/changelog/[version]', async ({ read }) =>
  parseChangelog(await read('../CHANGELOG.md')).map(release => ({
    version: release.version,
    frontmatter: { lastUpdated: release.date },
    markdown: `# v${release.version}\n\n${release.body}`,
  })),
)

// 网址没有参数就是一页，可以直接返回 Markdown 字符串
api.pages('/changelog/', async ({ read }) => `# 更新日志\n\n...`)
```

```ts
pages: <Route extends string>(route: Route, source: string | PluginPagesGenerator<Route>) => void

interface PluginPagesContext {
  command: 'dev' | 'build'
  /** 读文本文件（UTF-8），并把它记为这组页面的依赖。 */
  read: (path: string) => Promise<string>
  /** 匹配文件，返回排序后的绝对路径，并把这个模式记为这组页面的依赖。 */
  glob: (pattern: string | readonly string[]) => Promise<string[]>
}

interface PluginPageContent {
  markdown: string
  /** 合并进页面 frontmatter，同名字段覆盖 Markdown 自带的值。只允许 JSON 值。 */
  frontmatter?: Record<string, unknown>
}

/** 网址有参数时返回数组，每项给出全部参数；没有参数时返回一页。参数名从 Route 字面量推出类型。 */
type PluginPagesGenerator<Route extends string> = (context: Readonly<PluginPagesContext>) => MaybePromise<
  RouteParams<Route> extends Record<string, never>
    ? string | PluginPageContent
    : readonly (RouteParams<Route> & PluginPageContent)[]
>
```

- `api.pages()` 是正式的公开插件 API，不加 `experimental` 前缀，按 0.x 的常规兼容规则演进。一个插件可以调用多次，每次是独立的一组页面。
- 只支持 Markdown 源码。插件要用组件时在 Markdown 里写组件，由 `addPageComponent` 引入；不提供「直接给一个 Vue 组件当页面」的入口，保持一条编译管线。
- 网址模板只在生成侧展开：核心把每组页面展开成全部具体路径，浏览器里的路由仍只做精确匹配，`router` 规约不变。

#### 网址模板

- 以 `/` 开头、不含 `base`，结尾的 `/` 表示目录首页；页面所在语言由路径前缀按 `locales` 判断，与普通页面一致。多语言各调用一次 `pages()`，不为语言单独设计语法。
- `[name]` 匹配一段路径（不含 `/`，非空）；`[...name]` 匹配一段或多段。参数名是 JavaScript 标识符，同一模板内不重复，一个参数独占一段路径（`/v[version]` 不允许）。
- 展开后的路由最后一段是 `index` 时即目录首页，例如 `[...slug]` 取 `guide/index` 得到 `/notes/guide/`。

#### 文件模板（第二个参数是字符串）

- 相对站点根目录 `root`（配置文件所在目录）解析，也可以写绝对路径；参数写法同网址模板，参数集合必须与网址模板完全一致，否则报错。
- 核心把参数换成通配符去匹配文件，再从每个匹配到的路径读出参数值填进网址，一个文件一页，页面源码就是文件内容（不支持 `<!--@include-->`）。
- 一个文件都匹配不到时报错，指出是哪个插件的哪个模板。
- 页面里的相对图片与资源路径按源文件所在目录解析，与普通 Markdown 文件一致；相对 `.md` 链接不改写，指向未成为页面的文件时由 dead link 检查报出。

#### 生成函数（第二个参数是函数）

- 返回数组时每一项必须给出模板的全部参数，值为字符串：`[name]` 的值非空且不含 `/`，`[...name]` 的值是不以 `/` 开头或结尾的一段或多段路径。缺参数、值格式不对时报错，指出插件、模板与第几项。
- 网址没有参数时返回一个字符串或一个 `PluginPageContent`。
- `frontmatter` 对象由核心合并进页面源码，插件不手写 YAML。

#### 依赖跟踪

- 「读了谁就依赖谁」：生成函数通过 `read()` 读过的文件、通过 `glob()` 用过的模式，以及文件模板本身，都记为这组页面的依赖。相对路径都按 `root` 解析。
- 开发时依赖文件被修改，或有文件新增、删除并命中记下的模式，核心只重新执行这一组页面；页面集合变化时整页刷新，只有某页内容变化时只热更新那一页。构建时不监听。
- 每次执行重新记录依赖，上一次的依赖被替换。
- 不经过 `read()`、`glob()` 的数据（如 `fetch` 远程接口、自己用 `node:fs` 读的文件）不被跟踪：构建时取一次，开发时重启开发服务器后更新。插件开发文档写明这一点。
- 生成函数在开发期重新执行时抛错：报告错误并保留这组页面上一次的结果，不让开发服务器退出；构建时抛错即构建失败。

### 页面标识

- `sourcePath` 由核心生成，形如 `<插件名><pagePath>`（例如 `@kawapress/plugin-typedoc/api/core.md`），插件作者不填写。它不以 `/` 开头，因此不会与 Markdown 文件的 `sourcePath`（以 `/` 开头）重名；路由在站点内唯一，`sourcePath` 也随之唯一。
- `pagePath` 由路由推出：`/x/` 为 `/x/index.md`，`/x/y` 为 `/x/y.md`，llms 的每页 `.md` 输出用它。
- 两组页面（同一插件或不同插件）展开出同一个路由时报错，指出两边的插件与模板。

### 读取全站页面

`kawapress/generator` 导出两个函数，取代插件各自调用 `listMarkdownPages`：

```ts
/** 先是 Markdown 文件页面（顺序同 listMarkdownPages），再是插件页面（按插件顺序与各插件返回的顺序）；路由冲突时报错并指出两边来源。 */
listSitePages(site: ResolvedSiteConfig): Promise<SitePage[]>

/** 页面集合变化（Markdown 文件增删、插件页面因依赖变化而增删）时通知，返回取消函数。只在开发服务器中触发。 */
onSitePagesChange(site: ResolvedSiteConfig, listener: () => void): () => void

interface SitePage {
  origin: 'file' | 'plugin'
  /** 仅文件页面有。 */
  file?: string
  sourcePath: string
  pagePath: string
  routePath: string
  /** 当前的 Markdown 源码：文件页面读磁盘（展开 include），插件页面取插件给出的源码。 */
  readSource: () => Promise<string>
}
```

- 两个函数以 `configResolved()` 拿到的同一个 `ResolvedSiteConfig` 对象为键找到站点；传入其他对象时报错，说明应使用 `configResolved()` 的结果。
- 插件页面在全部 `configResolved()` 之后、第一次需要页面列表时收集；每组页面按插件顺序与注册顺序执行一次，开发期在依赖变化后单独重新执行。
- `pluginPageSourcePath(id)` 从模块 id（请求形式 `/@kawapress-page/<sourcePath>` 或解析后位于站点根目录下的形式）读出插件页面的 `sourcePath`，不是插件页面时返回 `undefined`；需要在 Vite 钩子里识别插件页面的插件（如 llms）用它，不自行比较字符串。
- 站点表挂在 `globalThis`（`Symbol.for('kawapress.sitePageRegistries')`）上：配置与插件在独立的模块图里执行，核心模块可能被加载两次，两份副本必须找到同一个站点。
- `listMarkdownPages`、`resolveMarkdownPageScope`、`isMarkdownPage` 继续导出，供只关心磁盘文件的场景使用（如判断改动的文件是不是页面）。

### 核心改动

1. **统一页面列表**：核心内部的页面表、构建入口、dead link 注册表都改用 `listSitePages()`；nagi、搜索、feed 改用它和 `onSitePagesChange()`。
2. **虚拟模块 id**：插件页面用不含 `\0`、以 `.md` 结尾的 id（如 `/@kawapress-page/<sourcePath>`），让 `@vitejs/plugin-vue` 接受它，并在客户端 manifest 中有稳定的键，预渲染能找到对应 chunk。
3. **编译**：`markdownPlugin.load` 对插件页面从注册表取源码；`page-loader` 接受显式的 `routePath`、`sourcePath`，不再从文件路径推导；插件页面不支持 `<!--@include-->`。
4. **构建入口与预渲染**：插件页面进入 `createPageInputs` 与 dead link 注册表，其余流程不变。

### 无源文件页面的规则

| 能力 | 规则 |
| --- | --- |
| `PageDataContext.file` | 改为可选；插件页面没有 `file`，新增 `origin: 'file' \| 'plugin'`。读 `file` 的 `pageData` 处理器必须先判断。 |
| 最后更新时间、编辑链接 | 插件页面默认不显示，也不查 git；插件可以在 frontmatter 里给 `lastUpdated`（可被 `Date.parse` 解析的日期字符串，无效时报错）与 `editLink`（源码的绝对 URL）。 |
| sitemap `lastmod` | 用 frontmatter 的 `lastUpdated`，没有就省略。 |
| llms / 页面 `.md` | 用插件提供的 Markdown 源码，与普通页面一致。 |
| 搜索 | 通过统一页面列表拿到源码后建索引。 |
| nagi 侧边栏 | 自动侧边栏把插件页面当作同路径的普通页面；`_meta.json` 只对磁盘目录生效，插件页面的顺序与标题由 frontmatter 决定。 |
| feed、og-image 的 include/exclude | 匹配 `sourcePath`，插件页面用核心生成的 `sourcePath` 参与匹配。 |
| `rewrites` | 不作用于插件页面。 |

## 发布

核心与已发布插件（last-updated、sitemap、search、feed、og-image、llms）以及 nagi 对插件页面的适配在同一批发布中发出：用户升级后，插件页面立即出现在侧边栏、搜索、sitemap、feed、llms 输出中，不存在只有核心支持的中间状态。各插件仍按自己的版本号升级，不跟随核心版本号。只有用到核心新导出（如 `listSitePages`）的插件才把 `kawapress` peer 范围提高到这次的核心版本；只读取 `origin`、`file` 的插件在旧核心上把缺少 `origin` 视为文件页面，peer 范围不变。

## 验收

- 一个测试插件用两种写法（文件模板、生成函数）生成多语言的若干页面：开发时可访问；改动 `read()` 过的文件只热更新对应页面；新增、删除命中模板或 `glob()` 的文件时整页刷新且页面增减；生产构建预渲染成功、无 hydration 警告。
- 文件模板页面里的相对图片在开发与构建中都能显示。
- 模板参数不一致、生成结果缺参数、文件模板无匹配时报错并指出插件与模板。
- 插件页面出现在自动侧边栏、搜索、sitemap、llms 输出中；不显示编辑链接与最后更新时间。
- 与 Markdown 页面路由冲突时报错并指出两边来源。
