---
title: Analytics
description: Add Google Analytics, Plausible, Umami and Cloudflare Web Analytics with one plugin, with in-site navigation counted correctly.
---

# Analytics

Once a site is live you want to know how many people read which pages. This plugin puts the common services behind one config. It writes the analytics scripts into your pages and covers the one thing single-page apps tend to miss: moving between pages inside the site does not reload the document, so some services never see those page views.

Four services are supported:

- Google Analytics (GA4)
- Plausible
- Umami
- Cloudflare Web Analytics

## Enable the plugin {#enable-the-plugin}

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

At least one service is required, otherwise the build fails. You can configure several; each one reports on its own.

## Options {#options}

| Option | Description |
| --- | --- |
| `google.id` | GA4 measurement ID, starting with `G-`. |
| `plausible.domain` | The domain registered in Plausible, without protocol or path. |
| `plausible.src` | Script URL, `https://plausible.io/js/script.js` by default. Change it when you self-host. |
| `umami.websiteId` | Website ID from the Umami dashboard. |
| `umami.src` | Script URL. Umami has no shared official address, so it is required. |
| `cloudflare.token` | Site token of Cloudflare Web Analytics. |
| `dev` | `false` by default. Set it to `true` to inject the scripts during `kawapress dev` too. |

Options are checked when the config is read. If `google.id` does not start with `G-`, or `umami.src` is missing, the build fails and names the option. Universal Analytics (`UA-` IDs) no longer runs and is not supported.

## The services {#services}

### Google Analytics {#google}

Copy the measurement ID that starts with `G-` from **Admin → Data streams** in Google Analytics:

```ts
analyticsPlugin({ google: { id: 'G-XXXXXXX' } })
```

The plugin turns gtag's `send_page_view` off and sends one `page_view` itself every time a page is shown, with `page_location` and `page_title`. The first load takes the same path, so a visit is counted once and never twice.

### Plausible {#plausible}

```ts
analyticsPlugin({ plausible: { domain: 'example.com' } })
```

A self-hosted Plausible needs its own script address:

```ts
analyticsPlugin({
  plausible: { domain: 'example.com', src: 'https://stats.example.com/js/script.js' },
})
```

The Plausible script watches the browser history itself, so in-site navigation needs nothing more.

### Umami {#umami}

```ts
analyticsPlugin({
  umami: {
    websiteId: 'your-website-id',
    src: 'https://umami.example.com/script.js',
  },
})
```

The Umami script also handles in-site navigation by itself.

### Cloudflare Web Analytics {#cloudflare}

```ts
analyticsPlugin({ cloudflare: { token: 'your-site-token' } })
```

The plugin writes `"spa": true` into the beacon config, so Cloudflare counts in-site navigation as new page views.

## Behavior during development {#development}

By default only pages made by `kawapress build` carry the analytics scripts. `kawapress dev` injects nothing, so local work never pollutes your numbers.

To check the setup while developing, set `dev: true`:

```ts
analyticsPlugin({ google: { id: 'G-XXXXXXX' }, dev: true })
```

## What happens in the browser {#what-happens-in-the-browser}

- Every script loads with `async` or `defer`, so rendering is never blocked.
- With only Plausible, Umami or Cloudflare configured, the plugin adds no analytics code to the page bundle. Only Google registers a small route hook that sends `page_view`.
- A change of only the query string or the hash does not count as another page view.

## Limitations {#limitations}

- The plugin shows no cookie consent banner and has no consent management. If your site must follow local privacy laws, handle that yourself and do not enable a service before the reader agrees.
- There is no API for custom events yet.
- The scripts are third-party scripts. When a reader's browser blocks them, the page still works; the visit is just not counted.
