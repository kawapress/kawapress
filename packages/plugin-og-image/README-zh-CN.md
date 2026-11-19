# @kawapress/plugin-og-image

KawaPress 的页面分享图（`og:image`），构建时用 Vue 模板渲染。

[![npm version](https://img.shields.io/npm/v/@kawapress/plugin-og-image?label=npm&color=42b883)](https://www.npmjs.com/package/@kawapress/plugin-og-image) · [English](https://github.com/kawapress/kawapress/blob/main/packages/plugin-og-image/README.md)

`@kawapress/plugin-og-image` 是 [KawaPress](https://github.com/kawapress/kawapress) 的一部分。KawaPress 是一个以 Vue 为核心的静态站点生成器。

## 特性

- 零配置：每个页面生成一张 1200×630 的 PNG，带标题、描述和站点名。
- 自动写入 `og:image`、`og:image:width`、`og:image:height`、`twitter:card` 和 `twitter:image`，站点的 `base` 会自动加到地址上。
- 可以用 Vue 组件自定义模板，由 satori 绘制。
- 内置一份拉丁字体。中文、日文、韩文需要自己提供字体文件。
- 带缓存，二次构建只重绘有变化的页面。
- 不会覆盖你自己写的 `og:image`。页面 frontmatter 写 `ogImage: false` 可以跳过。

## 安装

```sh
npm install --save-dev @kawapress/plugin-og-image
```

`pnpm add --save-dev @kawapress/plugin-og-image` 和 `yarn add --dev @kawapress/plugin-og-image` 也可以。

## 使用

```ts
import ogImage from '@kawapress/plugin-og-image'
import { defineConfig } from 'kawapress'

export default defineConfig({
  plugins: [
    ogImage({ hostname: 'https://example.com' }),
  ],
})
```

图片写入 `dist/og/<路由>.png`。

## 选项

| 选项 | 说明 |
| --- | --- |
| `hostname` | 必填。站点的绝对地址。 |
| `template` | Vue 单文件组件的路径，相对站点根目录。 |
| `fonts` | `{ name, path, weight?, style? }[]`，TTF、OTF 或 WOFF 文件。 |
| `exclude` | 匹配页面 `sourcePath` 的 glob。 |

## 文档

[文档](https://kawapress.dev/plugins/og-image) · [反馈问题](https://github.com/kawapress/kawapress/issues)

## 许可证

[MIT](https://github.com/kawapress/kawapress/blob/main/LICENSE) © KawaPress contributors
