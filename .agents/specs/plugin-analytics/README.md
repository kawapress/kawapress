# Analytics 插件

包名 `@kawapress/plugin-analytics`。生成侧注入脚本，运行侧补齐单页应用的页面浏览上报。

- 工程实施：`.agents/engineering/002-official-plugins-batch-1/`

## 背景与目标

Rspress 社区为 Google Analytics、Vercel Analytics、Clarity 等各出一个包，VitePress 用户则手写 `head`。手写的问题是：站内跳转不刷新页面，部分服务收不到页面浏览。

目标：一个插件、一份配置接入主流统计服务，站内跳转也被正确统计，开发时默认不上报。

## Happy Path

```ts
import analytics from '@kawapress/plugin-analytics'

export default nagi({
  plugins: [
    analytics({
      google: { id: 'G-XXXXXXX' },
      plausible: { domain: 'kawapress.dev' },
    }),
  ],
})
```

## 选项

```ts
interface AnalyticsPluginOptions {
  google?: { id: string }
  plausible?: { domain: string, src?: string } // src 默认 https://plausible.io/js/script.js，自托管时改写
  umami?: { websiteId: string, src: string }   // umami 没有统一的官方地址，src 必填
  cloudflare?: { token: string }
  /** 默认 false：kawapress dev 时不注入任何脚本。 */
  dev?: boolean
}
```

至少要配置一个服务，否则插件工厂抛错。可同时配置多个。

## 行为

- 脚本通过 `config()` 写入站点 `head`，全部 `async` 或 `defer`，不阻塞渲染。只在 `kawapress build`（以及 `dev: true` 时的 dev）注入，判断方式见下文。
- 站内跳转：
  - Google：初始化时设置 `send_page_view: false`，由 Runtime Plugin 在 `router.afterEach` 中发送 `page_view`（含 `page_location`、`page_title`）。首次加载也由同一处发送，保证只发一次。
  - Plausible、Umami：官方脚本自己监听 History API，不重复上报。
  - Cloudflare：`data-cf-beacon` 中写 `"spa": true`。
- 运行侧只在配置了 Google 时注册路由钩子。包导出了 `./runtime-plugin`，Core 总会加载这个入口，所以其他服务也会带上一个只含开关的极小模块。
- 判断 dev 还是 build：插件 API 在 `config()` 阶段不提供命令，目前读取命令行参数里是否有 `build`。Core 在 `configResolved()` 提供 `command` 之后改用它。
- Google 的 `page_view` 按路径去重；站内跳转后等 `<title>` 更新（最多 300 毫秒）再上报，保证标题是新页面的。
- 选项在配置期校验格式（例如 Google id 以 `G-` 开头），错误信息指出是哪一项。

## 边界

- 不做 Cookie 同意弹窗，也不内置同意管理。文档注明需要合规的站点自行处理。
- 不提供自定义事件 API。以后有需求再加 `useAnalytics().track()`。
- 不支持 Universal Analytics（`UA-`），它已停止服务。

## 验收

- 单元测试：各服务生成的 head 标签、dev 默认不注入、多服务并存、错误配置的报错。
- e2e 或手动验证：构建文档站后在浏览器里站内跳转两次，Google 的 `dataLayer` 中有三次 `page_view`，且没有重复。
- 文档页 `docs/plugins/analytics.md` 与英文版。
