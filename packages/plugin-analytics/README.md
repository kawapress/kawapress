# @kawapress/plugin-analytics

Web analytics for KawaPress: Google Analytics, Plausible, Umami and Cloudflare Web Analytics.

[![npm version](https://img.shields.io/npm/v/@kawapress/plugin-analytics?label=npm&color=42b883)](https://www.npmjs.com/package/@kawapress/plugin-analytics) · [简体中文](https://github.com/kawapress/kawapress/blob/main/packages/plugin-analytics/README-zh-CN.md)

`@kawapress/plugin-analytics` is part of [KawaPress](https://github.com/kawapress/kawapress), a Vue-first static site generator.

## Features

- One plugin and one config for four services. Several can run at the same time.
- Navigating between pages inside the site is counted as a page view, once per page.
- Nothing is reported while you run `kawapress dev`, unless you ask for it.
- Every script loads with `async` or `defer`, so rendering is never blocked.
- Sites that do not use Google ship no browser code from this plugin that tracks anything.

## Install

```sh
npm install --save-dev @kawapress/plugin-analytics
```

`pnpm add --save-dev @kawapress/plugin-analytics` and `yarn add --dev @kawapress/plugin-analytics` work too.

## Usage

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

At least one service is required. A wrong option stops the build and names the option.

## Options

| Option | Description |
| --- | --- |
| `google.id` | GA4 measurement ID, starts with `G-`. Universal Analytics (`UA-`) is not supported. |
| `plausible.domain / src` | Site domain. `src` defaults to `https://plausible.io/js/script.js`; change it for self-hosting. |
| `umami.websiteId / src` | Both required. Umami has no shared script address. |
| `cloudflare.token` | Site token of Cloudflare Web Analytics. |
| `dev` | Also inject the scripts during `kawapress dev`. Default `false`. |

This plugin shows no cookie consent banner. If your site needs one, add it yourself.

## Documentation

[Documentation](https://kawapress.dev/en/plugins/analytics) · [Report a problem](https://github.com/kawapress/kawapress/issues)

## License

[MIT](https://github.com/kawapress/kawapress/blob/main/LICENSE) © KawaPress contributors
