# 插件市场页

文档站的一个页面，不是插件包。中文 `/plugins/`（替换现在的「官方插件总览」），英文 `/en/plugins/`。

- 工程实施：`.agents/engineering/002-official-plugins-batch-1/`
- 命名与 keyword 规则：`.agents/rules/plugin-naming.md`

## 背景与目标

VitePress 的插件散落在 npm 和各种 awesome 列表里，用户只能自己整理。我们的官方插件越来越多，现在的总览页只是两张表。

目标：一个页面看清全部官方插件，能按类别筛选、一键复制安装命令、直达文档；并给社区插件一个固定入口。

## Happy Path

1. 用户打开「插件」页，看到按卡片排列的官方插件。每张卡片有：名称、一句话说明、类别、当前版本、「nagi 已内置」或安装命令、文档链接、npm 链接。
2. 顶部的类别筛选：Markdown 语法、代码、搜索、内容与 SEO、页面增强、Vue 组件开发、集成服务。还有一个「只看需要安装的」开关。
3. 页面底部「社区插件」区块：说明命名约定和 keyword，一个按钮跳到 `https://www.npmjs.com/search?q=keywords%3Akawapress-plugin`，再链接到插件开发文档。

## 数据

- 版本、包名、description 不手写：一个 Data Loader 读取仓库 `packages/plugin-*/package.json`（以及 `preset-nagi` 的依赖列表，用来判断是否「nagi 已内置」）。版本号随独立发版自动正确。
- 只有展示用的信息手写在 `docs/plugins/plugin-catalog.ts` 里：类别、文档路径（没有独立文档页的插件可以不写）、中英文的一句话说明（package.json 的 description 是英文，中文页用手写的）。
- 数据文件里缺少某个公开插件，或者写了不存在的包时，Data Loader 抛错，构建失败。新增插件因此不会忘记上架。
- 这个数据文件属于并行交付规则里的共享文件，由合并时统一修改。

## 行为

- 页面使用 nagi 的 `doc` 布局并关闭大纲（`outline: false`），卡片由文档站自己的 Vue 组件 `docs/components/PluginMarket.vue` 渲染，不进任何包。
- 筛选只用客户端状态；SSR 输出全部卡片，筛选不影响首屏内容和搜索索引。
- 原来 overview 页的「怎么安装」说明合并到页面顶部的一小段。
- 现有插件文档页的地址不变。overview 原地址 `/plugins/overview` 保留，内容改成指向新页面的说明，避免外部链接失效（死链检查会兜底站内链接）。

## 以后

社区插件数量起来后，再加一个构建时请求 npm search API 的 Data Loader，在页面上直接列出社区插件，并加人工黑名单。现在不做。

## 验收

- 全部官方插件（现有 18 个加本批新增 5 个）都出现在页面上，版本与 package.json 一致。
- 类别筛选、复制安装命令在 dev 与 build 下都可用，无 hydration 警告，键盘可以操作。
- 删掉数据文件中的一项后构建失败，错误信息指出缺少哪个包。
- 中英文页面都完成；移动端单列排布正常。
