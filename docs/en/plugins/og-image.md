---
title: Social Images
description: Generate a social share card for every page at build time, with the title, description and site name, and write og:image meta automatically. Customize the template with a Vue component.
---

# Social Images

A link shared on X, Discord, Slack or WeChat gets far more clicks when it has an image. `@kawapress/plugin-og-image` generates a 1200×630 PNG for every page at build time and writes `og:image` and related meta into the page `<head>`. There is nothing to design by hand and nothing to configure per page.

## Install {#install}

::: code-group
```sh [npm]
npm install --save-dev @kawapress/plugin-og-image
```

```sh [pnpm]
pnpm add --save-dev @kawapress/plugin-og-image
```

```sh [Yarn]
yarn add --dev @kawapress/plugin-og-image
```
:::

The plugin draws images with `@resvg/resvg-js`, a native package with prebuilt binaries. Installing picks the binary for your platform, so you do not need a compiler toolchain on mainstream platforms.

## Enable Social Images {#enable-og-image}

Add the plugin to `kawapress.config.ts` and set `hostname`. `og:image` must be an absolute address, so `hostname` is required:

```ts
import ogImage from '@kawapress/plugin-og-image'
import { nagi } from 'kawapress/nagi'

export default nagi({
  plugins: [
    ogImage({ hostname: 'https://example.com' }),
  ],
})
```

The plugin appends the site `base` to `hostname` for you, so do not repeat it. With `base: '/handbook/'`, the page `/guide/intro` gets the image `https://example.com/handbook/og/guide/intro.png`.

After a build, every page has:

- A file `og/<route>.png` in the output folder. The home page is `og/index.png`, and `/guide/intro` is `og/guide/intro.png`.
- `og:image`, `og:image:width`, `og:image:height`, `twitter:card` (set to `summary_large_image`) and `twitter:image` in its `<head>`.

The built-in template is a light card: the site name with a small accent square at the top, a large bold page title (the size shrinks for long titles, and CJK characters count double width) with up to two lines of description in the middle, and the page address (the URL without the protocol) under a divider at the bottom. The title is the page title. The description comes from the page frontmatter, then the `description` of the current locale, then the site `description`. The site name is the `title` of the current locale, or the site `title`.

## Chinese, Japanese, Korean and Other Scripts {#cjk-fonts}

The plugin ships one Latin font (Figtree, weights 400, 500, 600 and 700). When a title or description contains glyphs it does not have, such as Chinese characters, Japanese kana or Korean, the build downloads subsets of the matching Noto fonts from Google Fonts. A subset holds only the characters the card shows, so a Chinese site needs no configuration:

```ts
import ogImage from '@kawapress/plugin-og-image'
import { nagi } from 'kawapress/nagi'

export default nagi({
  plugins: [
    ogImage({ hostname: 'https://example.com' }),
  ],
})
```

The plugin downloads regular (400) and bold (700), and picks the font by script:

- **Han characters**: Japanese (JP) when the card has kana or the page language is `ja`; Korean (KR) for `ko`; Traditional Chinese (TC) for `zh-TW` and `zh-Hant`; Hong Kong (HK) for `zh-HK`; Simplified Chinese (SC) otherwise.
- **Other scripts**: their own Noto family, such as Korean (KR), Thai, Arabic, Hebrew or Devanagari.
- **Symbols**: Noto Sans Math for math operators, Noto Sans Symbols or Symbols 2 for other symbols, and Noto Sans for anything else.
- **Emoji are not covered** and are still drawn as blank boxes.

Downloaded fonts are cached in `node_modules/.cache/kawapress-og-image/fonts/` under the site root. What a card downloads depends only on its own text, so later builds work offline once the cache is filled. Cache `node_modules/.cache/kawapress-og-image` in CI.

### Remote Font Options {#remote-fonts}

`remoteFonts` is on by default. Pass an object to tune it:

```ts
ogImage({
  hostname: 'https://example.com',
  remoteFonts: {
    endpoints: ['https://fonts.googleapis.com'],
    timeout: 10000,
  },
})
```

- `endpoints`: addresses compatible with the Google Fonts CSS API, tried in order. Defaults to `['https://fonts.googleapis.com']`. A mirror that offers the same API works too.
- `timeout`: the time limit of each request in milliseconds, `10000` by default. A dropped connection is retried once, and an endpoint that fails twice is skipped for the rest of the build.
- **Proxy**: when `HTTPS_PROXY` or `HTTP_PROXY` is set, requests go through it, and `NO_PROXY` is honored. Node's own `fetch` ignores these variables, so the plugin handles them.
- **A failed download never fails the build**: a warning lists the errors, the characters are drawn as blank boxes, and that card is not cached, so the next build tries again.

::: warning Privacy
The characters shown on cards (titles and descriptions) are sent to the font service at build time. To avoid that, set `remoteFonts: false` to keep the build offline and provide font files with `fonts`.
:::

### Offline and Your Own Fonts {#offline-fonts}

`fonts` still works and takes precedence: each character uses the built-in font first, then your fonts, and remote fonts last. For an offline build, or to pin a specific font, use `remoteFonts: false` with `fonts`:

```ts
import ogImage from '@kawapress/plugin-og-image'
import { nagi } from 'kawapress/nagi'

export default nagi({
  plugins: [
    ogImage({
      hostname: 'https://example.com',
      remoteFonts: false,
      fonts: [
        { name: 'Noto Sans SC', path: 'fonts/NotoSansSC-Regular.otf', weight: 400 },
        { name: 'Noto Sans SC', path: 'fonts/NotoSansSC-Bold.otf', weight: 700 },
      ],
    }),
  ],
})
```

`path` is relative to the site root. TTF, OTF and WOFF files work; WOFF2 does not. A full CJK font is often more than ten megabytes, which does not belong in a repository. A tool such as `pyftsubset` can keep only the characters your site uses and give a subset of a few hundred kilobytes.

Characters that no font covers are drawn as blank boxes. The build warns about them first, listing the affected pages and characters, and still generates the images. The warning only considers text that actually appears on the card.

## Custom Template {#custom-template}

Use `template` to point at a Vue single-file component, relative to the site root:

```ts
import ogImage from '@kawapress/plugin-og-image'
import { nagi } from 'kawapress/nagi'

export default nagi({
  plugins: [
    ogImage({
      hostname: 'https://example.com',
      template: 'og-card.vue',
    }),
  ],
})
```

The template component receives these props:

| Prop | Description |
| --- | --- |
| `title` | The page title |
| `description` | The page description, or an empty string |
| `siteTitle` | The site title of the current locale |
| `lang` | The `lang` of the current locale, `en` by default |
| `routePath` | The page route, for example `/guide/intro` |
| `logo` | The `logo` option, or an empty string |
| `url` | The absolute address of the page, for example `https://example.com/guide/intro` (`hostname`, `base` and route) |
| `frontmatter` | The page frontmatter |

An example with the site logo:

```vue
<!-- og-card.vue -->
<script setup lang="ts">
defineProps<{
  title: string
  description: string
  siteTitle: string
  frontmatter: Record<string, unknown>
}>()
</script>

<template>
  <div
    :style="{
      width: '100%',
      height: '100%',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '64px 80px',
      backgroundColor: '#ffffff',
      color: '#111827',
      fontFamily: 'Figtree',
    }"
  >
    <div :style="{ display: 'flex', alignItems: 'center' }">
      <img src="/logo.png" width="56" height="56">
      <div :style="{ display: 'block', marginLeft: '20px', fontSize: '32px', fontWeight: 700 }">
        {{ siteTitle }}
      </div>
    </div>
    <div :style="{ display: 'block', fontSize: '68px', fontWeight: 700, lineHeight: 1.15 }">
      {{ title }}
    </div>
    <div :style="{ display: 'block', fontSize: '30px', color: '#6b7280', lineClamp: 2 }">
      {{ description }}
    </div>
  </div>
</template>
```

The template is compiled by the same Vue pipeline as the site, so `<script setup>`, `v-if`, `v-for`, `:style` and other components imported from your project all work. It is rendered to an HTML string at build time and then drawn as an image. It never runs in a browser, so there is no interactivity, no lifecycle that waits on the DOM, and no `window`.

The source of the built-in template is the best starting point: [`OgTemplate.vue`](https://github.com/kawapress/kawapress/blob/main/packages/plugin-og-image/src/template/OgTemplate.vue).

### Supported CSS {#supported-css}

Images are drawn by [satori](https://github.com/vercel/satori), which implements a subset of CSS. Keep these rules in mind:

- **Write styles in the `style` attribute**, either as an object with `:style="{ ... }"` or as a string. `<style>` blocks and class selectors have no effect.
- **Layout is flexbox only.** `grid` and `float` are not supported, and `position` is limited to `relative` and `absolute`.
- **An element with more than one child needs `display: flex`.** An element that only holds text uses `display: block` (use `lineClamp` to truncate to several lines).
- Common box and text properties work: sizes, `margin`, `padding`, `border`, `borderRadius`, `gap`, `fontSize`, `fontWeight`, `fontFamily`, `lineHeight`, `letterSpacing`, `textAlign`, `color`, `opacity`, `boxShadow` and `transform`.
- Backgrounds support solid colors, `linear-gradient`, `radial-gradient` and images.
- `fontFamily` must be the built-in `Figtree` or a `name` declared in `fonts`. The built-in font has weights 400, 500, 600 and 700; a weight of a font from `fonts` only works when you provided a file for it.
- CSS variables, animations and media queries are not supported.
- Text in the template is HTML-entity-decoded before drawing, so characters such as `&` render correctly.
- Neither the built-in font nor the remote fonts have emoji, so emoji are drawn as blank boxes.

See the [CSS support list](https://github.com/vercel/satori#css) of satori for every property.

### Images {#images}

An `<img>` in the template must have `width` and `height`. A path that starts with `/` is a site image: it is read from `public/` first, then from the site root, and inlined as a `data:` URL at build time. PNG, JPEG, GIF, WebP and SVG are supported. A missing file fails the build.

Remote images that start with `https://` are downloaded by satori during the build. Beyond that, the template should not use any network resource.

## Exclude Pages {#exclude-pages}

Write `ogImage: false` in a page frontmatter to skip that page. It gets no image and no meta:

```md
---
ogImage: false
---
```

Use `exclude` to skip many pages by source path. It takes globs that match the `sourcePath` of a page, which is relative to `srcDir`:

```ts
ogImage({
  hostname: 'https://example.com',
  exclude: ['/changelog/**', '/drafts/*.md'],
})
```

When the site `head`, the head of the current locale or the page's own `head` already has an `og:image`, the plugin does not override it and does not generate an image for that page. To give one page your own image, write `og:image` in its frontmatter `head`:

```md
---
head:
  - - meta
    - property: og:image
      content: https://example.com/custom.png
---
```

## Cache {#cache}

The cache key of every image comes from the rendered template output, the fonts and the image size. Results are stored in `node_modules/.cache/kawapress-og-image/` under the site root. A page whose content did not change is not drawn again, so a second build adds almost no time. In CI you can cache this folder.

Changing the template, the fonts, the site title, or a page title or description invalidates the affected pages automatically. Downloaded remote fonts are cached in `fonts/` of the same folder, and cards in `cards/`.

## Preview in the Dev Server {#dev-preview}

You do not need a full build to tune a template. Run `kawapress dev`, open the target page once, then visit `/__og-image/<route>.png`. For example `/__og-image/guide/intro.png`, and `/__og-image/index.png` for the home page. Save the template and reload to see the result.

The dev server does not write `og:image` or other meta into pages.

## Options {#options}

| Option | Description |
| --- | --- |
| `hostname` | Required. The absolute address of the site. The `base` is appended for you. |
| `template` | A custom template: the path of a Vue single-file component, relative to the site root. Defaults to the built-in template. |
| `fonts` | Fonts the template uses, an array of `{ name, path, weight?, style? }`. A Latin font (Figtree) is built in, and your fonts take precedence over remote fonts. |
| `remoteFonts` | Downloads Noto font subsets at build time for characters neither the built-in font nor `fonts` draws. `boolean` or `{ endpoints?, timeout? }`, on by default. `false` keeps the build offline. |
| `logo` | Image the built-in template shows before the site title: a path in the public folder such as `/logo.png`, or an absolute URL. Without it, a small accent square is shown. |
| `exclude` | Pages without an image, as globs that match the page `sourcePath`. |

## Limitations {#limitations}

- Only PNG is produced, always at 1200×630.
- 404 pages and pages with other special layouts get an image too. Use `exclude` or `ogImage: false` for the ones you do not want.
- Fonts and styling follow what satori supports. For complex layouts, prepare part of the picture as an image and place it in the template.
- Social platforms cache share images. If a new image does not show up after deploying, use the refresh tool of the platform, such as the Facebook Sharing Debugger or the X Card Validator.
