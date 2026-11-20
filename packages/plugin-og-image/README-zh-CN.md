# @kawapress/plugin-og-image

KawaPress 的页面分享图（`og:image`），构建时用 Vue 模板渲染。

[![npm version](https://img.shields.io/npm/v/@kawapress/plugin-og-image?label=npm&color=42b883)](https://www.npmjs.com/package/@kawapress/plugin-og-image) · [English](https://github.com/kawapress/kawapress/blob/main/packages/plugin-og-image/README.md)

`@kawapress/plugin-og-image` 是 [KawaPress](https://github.com/kawapress/kawapress) 的一部分。KawaPress 是一个以 Vue 为核心的静态站点生成器。

## 特性

- 零配置：每个页面生成一张 1200×630 的 PNG，带标题、描述和站点名。
- 自动写入 `og:image`、`og:image:width`、`og:image:height`、`twitter:card` 和 `twitter:image`，站点的 `base` 会自动加到地址上。
- 可以用 Vue 组件自定义模板，由 satori 绘制。
- 内置一份拉丁字体（Figtree）。中文、日文、韩文等其他文字开箱即用：构建时下载 Noto 字体子集并缓存。离线构建可以用 `fonts` 加 `remoteFonts: false`。
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
| `fonts` | `{ name, path, weight?, style? }[]`，TTF、OTF 或 WOFF 文件。优先于远程字体。 |
| `remoteFonts` | `boolean \| { endpoints?, timeout? }`，默认开启。构建时下载 Noto 字体子集，绘制其他字体都没有的字符。卡片上的文字会发送给字体服务，设为 `false` 保持离线。 |
| `exclude` | 匹配页面 `sourcePath` 的 glob。 |

## 文档

[文档](https://kawapress.dev/plugins/og-image) · [反馈问题](https://github.com/kawapress/kawapress/issues)

## 许可证

[MIT](https://github.com/kawapress/kawapress/blob/main/LICENSE) © KawaPress contributors
