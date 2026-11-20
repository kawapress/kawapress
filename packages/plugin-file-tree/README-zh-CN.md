# @kawapress/plugin-file-tree

KawaPress Markdown 的文件树：用缩进写目录结构，构建时得到图标、折叠和说明。

[![npm version](https://img.shields.io/npm/v/@kawapress/plugin-file-tree?label=npm&color=42b883)](https://www.npmjs.com/package/@kawapress/plugin-file-tree) · [English](https://github.com/kawapress/kawapress/blob/main/packages/plugin-file-tree/README.md)

`@kawapress/plugin-file-tree` 是 [KawaPress](https://github.com/kawapress/kawapress) 的一部分。KawaPress 是一个以 Vue 为核心的静态站点生成器。

## 特性

- 写一个 `tree` 代码块，用缩进表示层级，不用再手画、手动对齐 `├──`。
- 文件和文件夹图标来自 Catppuccin Icons，按名称和扩展名挑选，构建时内联进页面。
- 折叠使用浏览器自带的 `<details>`，页面不带任何脚本。
- `#` 后写说明，`**名字**` 高亮，`...` 表示省略，` (collapsed)` 让文件夹默认折叠。
- 缩进写错时构建失败，并给出页面和行号。

## 安装

```sh
npm install --save-dev @kawapress/plugin-file-tree
```

也可以用 `pnpm add --save-dev @kawapress/plugin-file-tree` 或 `yarn add --dev @kawapress/plugin-file-tree`。

## 使用

````md
```tree
docs/
  guide/
    getting-started.md   # 从这里开始
    **routing.md**
  kawapress.config.ts
  package.json
```
````

```ts
import fileTreePlugin from '@kawapress/plugin-file-tree'
import { nagi } from 'kawapress/nagi'

export default nagi({
  plugins: [fileTreePlugin()],
})
```

## 文档

[文档](https://kawapress.dev/plugins/file-tree) · [反馈问题](https://github.com/kawapress/kawapress/issues)

## 许可证

[MIT](https://github.com/kawapress/kawapress/blob/main/LICENSE) © KawaPress contributors
