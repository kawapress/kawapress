# Hydration 诊断方案

状态：实现中，尚未纳入版本计划。

目标：让构建在客户端与服务端可能渲染出不同结果时主动说明原因，而不是只在浏览器里留下一句不带细节的 `Hydration completed but contains mismatches.`。

## 一、客户端与 SSR 解析到不同文件时警告

### 背景

Vite 6 起，顶层 `resolve.conditions` 只作用于客户端环境，SSR 环境读取 `ssr.resolve.conditions`（KawaPress 默认 `['module']`）。站点只在顶层加 `source` 一类条件时，客户端打包工作区组件库的 `src/`，SSR 打包预构建的 `dist/`，服务端渲染与浏览器 hydration 使用的是两份不同的代码。astryx-vue 文档迁移时 10 个抽样页面中 7 个因此 hydration 不匹配，构建没有任何提示。

### 规则

- 只在 `kawapress build` 中检查，对象是 `client` 与 `ssr` 两个环境。
- 只比较两个环境都打包的裸导入（`pkg`、`@scope/pkg`、`pkg/subpath`）。SSR 外部化的依赖在 Node.js 里直接从 `node_modules` 运行，客户端解析结果与它无关，不比较。实际被比较的是 `@vue/*`、链接进来的工作区包和站点加入 `ssr.noExternal` 的包。
- 比较单位是“同一个已安装包副本 + 同一个导入说明符”。同一包的不同版本副本分别比较，不会互相干扰。
- 两侧文件相同则通过。文件不同时，按包的 `exports` 找出各自命中的条件链，去掉每个环境都会自行回答的条件（`default`、`import`、`require`、`module`、`production`、`development`、`types`）和平台条件（`browser`、`node`）后，剩下的站点自配条件两侧一致即视为包有意提供的分平台构建，不警告。
- 依据：在 KawaPress 文档站上，两侧都打包的约 40 个裸导入中只有 `@floating-ui/dom` 文件不同，客户端命中 `browser` 条件取 `floating-ui.dom.browser.min.mjs`，SSR 取默认的 `floating-ui.dom.mjs`。这是包有意提供的浏览器构建，按上述规则不警告；astryx 的 `source` 对 `import` 仍会警告。
- 包没有 `exports` 时：有 `browser` 字段视为有意的分平台构建，不警告；否则两侧文件不同即警告。`exports` 不能导向实际文件（例如被别名或插件改写）时同样警告，只是不注明条件。
- 子路径 `#imports` 不比较。

### 提示内容

- 一次构建汇总成一条警告，按包分组，每个包列出最多 3 个导入的两侧文件与条件链，其余以数量概括。
- 结尾说明 Vite 6 起 `resolve.conditions` 只作用于客户端，并给出可直接写入 `vite` 选项的修复：客户端多出的条件写进 `ssr.resolve.conditions`；只有 SSR 多出条件时写进 `resolve.conditions`；条件无法判断时提示检查 `resolve.alias` 与插件。
- 只警告，不让构建失败：部分包的两份构建渲染结果可能一致，KawaPress 无法判断。
