# @kawapress/plugin-analytics

KawaPress 的网站统计：Google Analytics、Plausible、Umami 与 Cloudflare Web Analytics。

[![npm version](https://img.shields.io/npm/v/@kawapress/plugin-analytics?label=npm&color=42b883)](https://www.npmjs.com/package/@kawapress/plugin-analytics) · [English](https://github.com/kawapress/kawapress/blob/main/packages/plugin-analytics/README.md)

`@kawapress/plugin-analytics` 是 [KawaPress](https://github.com/kawapress/kawapress) 的一部分。KawaPress 是一个以 Vue 为核心的静态站点生成器。

## 特性

- 一个插件、一份配置接入四种服务，也可以同时使用多个。
- 站内页面之间的跳转会被统计为页面浏览，每个页面只计一次。
- 运行 `kawapress dev` 时默认不上报，需要时再打开。
- 所有脚本都带 `async` 或 `defer`，不会阻塞渲染。
- 不使用 Google 的站点，页面包里没有这个插件的任何统计代码。

## 安装

```sh
npm install --save-dev @kawapress/plugin-analytics
```

`pnpm add --save-dev @kawapress/plugin-analytics` 和 `yarn add --dev @kawapress/plugin-analytics` 同样可用。

## 使用

```ts
import analyticsPlugin from '@kawapress/plugin-analytics'
import { nagi } from 'kawapress/nagi'

export default nagi({
  plugins: [
    analyticsPlugin({
      google: { id: 'G-XXXXXXX' },
      plausible: { domain: 'example.com' },
    }),
  ],
})
```

至少要配置一个服务。选项写错时构建会中止，并指出是哪一项。

## 选项

| 选项 | 说明 |
| --- | --- |
| `google.id` | GA4 的衡量 ID，以 `G-` 开头。不支持 Universal Analytics（`UA-`）。 |
| `plausible.domain / src` | 站点域名。`src` 默认 `https://plausible.io/js/script.js`，自托管时改写。 |
| `umami.websiteId / src` | 两项都必填。Umami 没有统一的脚本地址。 |
| `cloudflare.token` | Cloudflare Web Analytics 的站点 token。 |
| `dev` | `kawapress dev` 时也注入脚本。默认 `false`。 |

插件不提供 Cookie 同意弹窗。需要合规的站点请自行处理。

## 文档

[文档](https://kawapress.dev/plugins/analytics) · [反馈问题](https://github.com/kawapress/kawapress/issues)

## 许可证

[MIT](https://github.com/kawapress/kawapress/blob/main/LICENSE) © KawaPress contributors
