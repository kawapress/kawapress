# Hydration 诊断方案

状态：done（`--debug-hydration` 见 #91，解析条件检查见 `generator/vite/plugins/resolution-check.ts`）。

目标：让构建在客户端与服务端可能渲染出不同结果时主动说明原因，而不是只在浏览器里留下一句不带细节的 `Hydration completed but contains mismatches.`。

## 一、客户端与 SSR 解析到不同文件时警告

### 背景

Vite 6 起，顶层 `resolve.conditions` 只作用于客户端环境，SSR 环境读取 `ssr.resolve.conditions`（KawaPress 默认 `['module']`）。站点只在顶层加 `source` 一类条件时，客户端打包工作区组件库的 `src/`，SSR 打包预构建的 `dist/`，服务端渲染与浏览器 hydration 使用的是两份不同的代码。astryx-vue 文档迁移时 10 个抽样页面中 7 个因此 hydration 不匹配，构建没有任何提示。

### 规则

- 只在 `kawapress build` 中检查，对象是 `client` 与 `ssr` 两个环境。
- 只比较两个环境都打包的裸导入（`pkg`、`@scope/pkg`、`pkg/subpath`）。SSR 外部化的依赖在 Node.js 里直接从 `node_modules` 运行，客户端解析结果与它无关，不比较。实际被比较的是 `@vue/*`、链接进来的工作区包和站点加入 `ssr.noExternal` 的包。
- 比较单位是“同一个已安装包副本 + 同一个导入说明符”。同一包的不同版本副本分别比较，不会互相干扰。
- 两侧文件相同则通过。文件不同时，按包的 `exports` 找出能到达各自文件的全部条件链，去掉每个环境都会自行回答的条件（`default`、`import`、`require`、`module`、`production`、`development`、`types`）和平台条件（`browser`、`node`）后，只要存在一对两侧站点自配条件一致的条件链，即视为包有意提供的分平台构建，不警告。
- 包同时有 `exports` 与 `browser` 字段、且客户端文件正是 `browser` 字段映射的目标时，视为有意的浏览器构建，不警告（Vite 只在客户端把 `browser` 字段叠加在 `exports` 的结果上）。
- 依据：在 KawaPress 文档站上，两侧都打包的约 40 个裸导入中只有 `@floating-ui/dom` 文件不同，客户端命中 `browser` 条件取 `floating-ui.dom.browser.min.mjs`，SSR 取默认的 `floating-ui.dom.mjs`。这是包有意提供的浏览器构建，按上述规则不警告；astryx 的 `source` 对 `import` 仍会警告。
- 包没有 `exports` 时：有 `browser` 字段视为有意的分平台构建，不警告；否则两侧文件不同即警告。`exports` 不能导向实际文件（例如被插件改写）时同样警告，只是不注明条件。
- 检查挂在 `resolveId` 的 `pre` 阶段，只看到裸导入。`resolve.alias` 在此之前已把导入改写成路径，所以被别名改写的导入（包括 KawaPress 为 `vue` 设置的别名）不在比较范围内。
- 已知局限：两侧把同一导入解析到同一个包的不同安装副本时，两条记录各只有一侧，目前不报告。
- 子路径 `#imports` 不比较。

### 提示内容

- 一次构建汇总成一条警告，按包分组，每个包列出最多 3 个导入的两侧文件与条件链，其余以数量概括。
- 结尾说明 Vite 6 起 `resolve.conditions` 只作用于客户端，并给出可直接写入 `vite` 选项的修复：客户端多出的条件写进 `ssr.resolve.conditions`；SSR 多出的条件写进 `resolve.conditions`；两者可以同时出现。存在条件无法解释的导入时，另外提示检查 `resolve.alias` 与插件。
- 只警告，不让构建失败：部分包的两份构建渲染结果可能一致，KawaPress 无法判断。

## 二、生产构建按需保留不匹配细节

- `kawapress build --debug-hydration` 为这一次构建把 `__VUE_PROD_HYDRATION_MISMATCH_DETAILS__` 定义为 `true`，`kawapress preview` 时浏览器控制台列出不匹配的节点与两端内容。
- 只提供 CLI 参数，不提供配置项或环境变量：它是一次性的排查手段，写进配置容易被部署出去。
- 在站点配置与插件 `vite()` 钩子之后设置，站点 `define` 关掉它时参数仍然生效。
- 构建开始与结束时各输出一条警告，说明这次构建带有调试代码，部署前应去掉参数重新构建。
- 默认构建保持 Vue 的默认值 `false`；仓库 E2E 继续通过内部的 `KAWAPRESS_E2E=1` 打开同一开关。
