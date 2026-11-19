---
title: 文件树
description: 用缩进写目录结构，构建时渲染成带文件图标、可折叠、可标注的树，输出纯 HTML，不需要客户端脚本。
---

# 文件树

文档里常要展示项目的目录结构。用 `text` 代码块手画 `├──` 既没有图标，也不能高亮或折叠，改一个文件名还得重新对齐。

`@kawapress/plugin-file-tree` 让你用缩进写目录，构建时把它渲染成带文件图标、可折叠、可标注的树。页面里是纯 HTML 和样式，读者的浏览器不用下载任何脚本。

## 写一棵树 {#write-a-tree}

在代码块的语言处写 `tree`，用缩进表示层级：

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

效果如下：

```tree
docs/
  .kawapress/
  guide/
    getting-started.md   # 从这里开始
    **routing.md**
  kawapress.config.ts
  package.json
```

## 语法 {#syntax}

| 写法 | 含义 |
| --- | --- |
| 缩进 | 表示层级。2 个空格或 1 个 Tab 为一级，同一棵树里不能混用。 |
| 以 `/` 结尾 | 目录。没有子项的目录也是目录。 |
| 不以 `/` 结尾 | 文件。文件不能有子项。 |
| `# 说明` | 写在名字之后，显示为灰色说明文字。 |
| `**名字**` | 高亮这一项，用来指出「要改的就是这个文件」。 |
| `...` | 单独一行，表示省略了其他内容。 |
| 目录名后加 ` (collapsed)` | 这个目录默认折叠。 |

```tree
packages/
  core/ (collapsed)
    src/
    package.json
  plugin-file-tree/
    src/
      **index.ts**   # 入口
      ...
    package.json
```

目录可以点击展开和收起，用键盘也行：聚焦到目录名后按回车或空格。折叠靠浏览器自带的 `<details>`，不需要脚本。

## 图标 {#icons}

图标来自 [Catppuccin Icons](https://github.com/catppuccin/vscode-icons)，按文件名和扩展名挑选，例如 `package.json`、`.ts`、`.vue`、`.md` 各有各的图标，常见的目录名（`src`、`docs`、`.github` 等）也有专属图标。认不出的类型使用通用的文件或文件夹图标。

图标在构建时就变成了内联 SVG，页面只带用到的那几个，不会请求在线服务。

## 缩进写错时 {#errors}

缩进不合法时构建会失败，错误信息里有页面路径和行号：

- 一级不是 2 个空格（比如 3 个空格）。
- 同一棵树里混用了 Tab 和空格。
- 一行比上一行多缩进了不止一级。
- 文件下面写了子项（忘了在目录名后加 `/`）。

## 与搜索、llms 的关系 {#search-and-llms}

搜索索引和 `llms` 输出读取的是 Markdown 原文，所以它们看到的仍然是你写的那段缩进文本。

## 样式 {#styles}

插件的样式放在 `kawa.plugin` 样式层，只读取公共的 `--kawa-*` 变量，明暗模式自动跟随。需要微调时，覆盖这些类名：

| 类名 | 对应的元素 |
| --- | --- |
| `.kawa-file-tree` | 整棵树的外框 |
| `.kawa-file-tree__list` | 每一层的列表 |
| `.kawa-file-tree__row` | 一行（图标、名字、说明） |
| `.kawa-file-tree__icon` | 图标 |
| `.kawa-file-tree__name` | 名字 |
| `.kawa-file-tree__name--highlight` | 被 `**…**` 高亮的名字 |
| `.kawa-file-tree__comment` | `# 说明` |

## 安装 {#install}

nagi 预设没有内置这个插件，需要单独安装：

::: code-group
```sh [npm]
npm install --save-dev @kawapress/plugin-file-tree
```

```sh [pnpm]
pnpm add --save-dev @kawapress/plugin-file-tree
```

```sh [Yarn]
yarn add --dev @kawapress/plugin-file-tree
```
:::

```ts
import fileTreePlugin from '@kawapress/plugin-file-tree'
import { nagi } from 'kawapress/nagi'

export default nagi({
  plugins: [
    fileTreePlugin(),
  ],
})
```

加入 `plugins` 就够了，没有需要配置的选项。样式会自动加载。

## 注意事项 {#limitations}

- 插件只渲染你写的内容，不会读取真实的文件系统来生成树。
- 树里不支持写链接。
