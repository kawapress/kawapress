# @kawapress/plugin-emoji

为 KawaPress 提供 `:tada:` 等 Emoji 短代码支持。

[![npm version](https://img.shields.io/npm/v/@kawapress/plugin-emoji?label=npm&color=42b883)](https://www.npmjs.com/package/@kawapress/plugin-emoji) · [English](https://github.com/kawapress/kawapress/blob/main/packages/plugin-emoji/README.md)

`@kawapress/plugin-emoji` 是 [KawaPress](https://github.com/kawapress/kawapress) 的一部分。KawaPress 是一个以 Vue 为核心的静态站点生成器。

## 特性

- 按 GitHub 名称表把 `:name:` 短代码渲染成 Emoji。
- 未知名称、行内代码与代码围栏中的短代码保持原样。
- `:)` 等字符表情不作转换，避免把技术文档里的标点误改成表情。
- 标题纯文本、大纲和锚点仍保留源码里的 `:name:` 短代码。

## 安装

这个包已经包含在 `kawapress` 里。使用 `kawapress/nagi` 的站点自带它，不需要再安装。

只有不使用 nagi 预设搭建站点时，才需要单独安装它。

```sh
npm install --save-dev @kawapress/plugin-emoji
```

也可以用 `pnpm add --save-dev @kawapress/plugin-emoji` 或 `yarn add --dev @kawapress/plugin-emoji`。

## 使用

```md
发布完成 :tada:
```

```ts
import emojiPlugin from '@kawapress/plugin-emoji'
import { defineConfig } from 'kawapress'

export default defineConfig({
  plugins: [emojiPlugin()],
})
```

## 文档

[文档](https://kawapress.dev/guide/markdown-extensions#emoji) · [反馈问题](https://github.com/kawapress/kawapress/issues)

## 许可证

[MIT](https://github.com/kawapress/kawapress/blob/main/LICENSE) © KawaPress contributors
