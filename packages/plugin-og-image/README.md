# @kawapress/plugin-og-image

Per-page social share images (`og:image`) for KawaPress, rendered at build time from a Vue template.

[![npm version](https://img.shields.io/npm/v/@kawapress/plugin-og-image?label=npm&color=42b883)](https://www.npmjs.com/package/@kawapress/plugin-og-image) · [简体中文](https://github.com/kawapress/kawapress/blob/main/packages/plugin-og-image/README-zh-CN.md)

`@kawapress/plugin-og-image` is part of [KawaPress](https://github.com/kawapress/kawapress), a Vue-first static site generator.

## Features

- Zero config: every page gets a 1200×630 PNG with its title, description and site name.
- Writes `og:image`, `og:image:width`, `og:image:height`, `twitter:card` and `twitter:image`. The site `base` is added to the address for you.
- Custom template as a Vue component, drawn with satori.
- A Latin font (Figtree) is built in. Chinese, Japanese, Korean and other scripts work out of the box: Noto font subsets are downloaded at build time and cached. Use `fonts` with `remoteFonts: false` to build offline.
- Cached, so a second build only draws pages that changed.
- Never overrides an `og:image` you wrote yourself. `ogImage: false` in frontmatter skips a page.

## Install

```sh
npm install --save-dev @kawapress/plugin-og-image
```

`pnpm add --save-dev @kawapress/plugin-og-image` and `yarn add --dev @kawapress/plugin-og-image` work too.

## Usage

```ts
import ogImage from '@kawapress/plugin-og-image'
import { defineConfig } from 'kawapress'

export default defineConfig({
  plugins: [
    ogImage({ hostname: 'https://example.com' }),
  ],
})
```

Cards are written to `dist/og/<route>.png`.

## Options

| Option | Description |
| --- | --- |
| `hostname` | Required. The absolute address of the site. |
| `template` | Path of a Vue single-file component, relative to the site root. |
| `fonts` | `{ name, path, weight?, style? }[]`. TTF, OTF or WOFF files. They take precedence over remote fonts. |
| `remoteFonts` | `boolean \| { endpoints?, timeout? }`, on by default. Downloads Noto font subsets at build time for characters no other font draws. The characters on cards are sent to the font service; set `false` to stay offline. |
| `exclude` | Globs matched against the page `sourcePath`. |

## Documentation

[Documentation](https://kawapress.dev/en/plugins/og-image) · [Report a problem](https://github.com/kawapress/kawapress/issues)

## License

[MIT](https://github.com/kawapress/kawapress/blob/main/LICENSE) © KawaPress contributors
