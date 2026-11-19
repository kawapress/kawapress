---
title: 网站统计
description: 用一个插件接入 Google Analytics、Plausible、Umami 与 Cloudflare Web Analytics，站内跳转也会被正确统计。
---

# 网站统计

站点上线后，总要知道有多少人读了哪些页面。统计插件把几种常见服务放进同一份配置：它在页面里写入统计脚本，并补上单页应用最容易漏掉的一环——站内跳转不会刷新页面，部分服务因此收不到页面浏览。

目前支持四种服务：

- Google Analytics（GA4）
- Plausible
- Umami
- Cloudflare Web Analytics

## 启用插件 {#enable-the-plugin}

::: code-group

```sh [pnpm]
pnpm add --save-dev @kawapress/plugin-analytics
```

```sh [npm]
npm install --save-dev @kawapress/plugin-analytics
```

```sh [yarn]
yarn add --dev @kawapress/plugin-analytics
```

:::

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

至少要配置一个服务，否则构建会报错。可以同时配置多个，各自独立上报。

## 选项 {#options}

| 选项 | 说明 |
| --- | --- |
| `google.id` | GA4 的衡量 ID，以 `G-` 开头。 |
| `plausible.domain` | 在 Plausible 中登记的域名，不带协议和路径。 |
| `plausible.src` | 脚本地址，默认 `https://plausible.io/js/script.js`。自托管时改成自己的地址。 |
| `umami.websiteId` | Umami 控制台里的网站 ID。 |
| `umami.src` | 脚本地址。Umami 没有统一的官方地址，所以必填。 |
| `cloudflare.token` | Cloudflare Web Analytics 的站点 token。 |
| `dev` | 默认 `false`。设为 `true` 时，`kawapress dev` 也会注入脚本。 |

选项在读取配置时就会检查。例如 `google.id` 不是 `G-` 开头，或 `umami.src` 缺失，构建会直接报错，并指出是哪一项。Universal Analytics（`UA-` 开头）已经停止服务，不受支持。

## 各个服务 {#services}

### Google Analytics {#google}

在 Google Analytics 的 **管理 → 数据流** 里复制以 `G-` 开头的衡量 ID：

```ts
analyticsPlugin({ google: { id: 'G-XXXXXXX' } })
```

插件把 gtag 的 `send_page_view` 关闭，改由站点在每次页面显示时发送一次 `page_view`，带上 `page_location` 和 `page_title`。首次加载也走同一条路径，所以每次浏览只会记一次，不会重复。

### Plausible {#plausible}

```ts
analyticsPlugin({ plausible: { domain: 'example.com' } })
```

自托管的 Plausible 需要改写脚本地址：

```ts
analyticsPlugin({
  plausible: { domain: 'example.com', src: 'https://stats.example.com/js/script.js' },
})
```

Plausible 的脚本会自己监听浏览器的历史记录，站内跳转无需额外处理。

### Umami {#umami}

```ts
analyticsPlugin({
  umami: {
    websiteId: '你的网站 ID',
    src: 'https://umami.example.com/script.js',
  },
})
```

Umami 的脚本同样自己处理站内跳转。

### Cloudflare Web Analytics {#cloudflare}

```ts
analyticsPlugin({ cloudflare: { token: '你的站点 token' } })
```

插件会在信标配置中写入 `"spa": true`，让 Cloudflare 把站内跳转算作新的页面浏览。

## 开发时的行为 {#development}

默认只有 `kawapress build` 生成的页面带有统计脚本。运行 `kawapress dev` 时不注入任何脚本，本地调试不会污染统计数据。

想在开发时验证接入是否正确，设置 `dev: true`：

```ts
analyticsPlugin({ google: { id: 'G-XXXXXXX' }, dev: true })
```

## 运行时的行为 {#what-happens-in-the-browser}

- 所有脚本都带 `async` 或 `defer`，不阻塞页面渲染。
- 只配置了 Plausible、Umami 或 Cloudflare 时，这个插件不会向页面包加入任何统计代码。只有配置了 Google，才会注册一个很小的路由钩子，用来发送 `page_view`。
- 只改变地址里的查询参数或 hash，不会再计一次页面浏览。

## 注意事项 {#limitations}

- 插件不提供 Cookie 同意弹窗，也不内置同意管理。需要遵守当地隐私法规的站点，请自行处理，并在读者同意之前不要启用相应的服务。
- 暂时没有自定义事件的 API。
- 统计脚本是第三方脚本。读者的浏览器拦截它们时，页面仍然正常，只是不会计入统计。
