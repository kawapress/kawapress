# File Tree 插件

包名 `@kawapress/plugin-file-tree`。只有生成侧加样式，构建时输出纯 HTML，不需要客户端 JS。

- 工程实施：`.agents/engineering/002-official-plugins-batch-1/`

## 背景与目标

文档里经常要展示项目目录结构。现在大家写 `text` 代码块手画 `├──`，没有图标、不能高亮、不能折叠，也很难维护。

目标：用缩进写目录树，渲染成带文件图标、可折叠、可标注的树形结构，并且 SSR 输出完整、零运行时 JS。

## Happy Path

````md
```tree
docs/
  .kawapress/
  guide/
    getting-started.md   # 从这里开始
    **routing.md**
  kawapress.config.ts
  package.json
```
````

## 语法

- 围栏语言名 `tree`。
- 缩进表示层级，2 个空格或 1 个 Tab 为一级，同一棵树不能混用；缩进不合法时构建报错并给出行号。
- 以 `/` 结尾是目录，否则是文件。目录没有子项时也是目录。
- `# 注释` 写在名字之后，渲染为灰色说明文字。
- `**名字**` 高亮该项，用于指出「你要改的就是这个文件」。
- `...` 单独一行表示省略的其他内容。
- 目录名后加 ` (collapsed)` 默认折叠。

## 行为

- 输出嵌套 `<ul>`，目录用 `<details open>` / `<summary>`，折叠不需要 JS。语义：`role="tree"` / `treeitem` / `group`，键盘可用原生 details 行为。
- 图标：构建时按文件名和扩展名从 Iconify 图标集（`@iconify-json/catppuccin` 或同类开源图标集，实施时选定并写回此处）解析成内联 SVG，只有用到的图标进入页面；未知类型用通用文件图标。与 nagi 的 socialLinks 一样在构建期解析，不请求在线服务。
- 样式包在 `@layer kawa.plugin` 中，只读取 `--kawa-*` Token。
- 搜索索引和 `llms` 的 Markdown 输出保留原始围栏文本。

## 边界

- 不读取真实文件系统生成树，只渲染作者写的内容。
- 不支持在树里写链接。

## 验收

- 单元测试：解析器（缩进、注释、高亮、省略、折叠、错误行号）与 HTML 输出快照。
- 文档站至少一处现有的手画目录（例如插件开发页的包结构）改用 `tree`，dev 与 build 都无 hydration 警告。
- 文档页 `docs/plugins/file-tree.md` 与英文版。
