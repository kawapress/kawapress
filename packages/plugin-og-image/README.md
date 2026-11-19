# @kawapress/plugin-og-image

Per-page social share images (`og:image`) for KawaPress, rendered at build time from a Vue template.

[![npm version](https://img.shields.io/npm/v/@kawapress/plugin-og-image?label=npm&color=42b883)](https://www.npmjs.com/package/@kawapress/plugin-og-image) · [简体中文](https://github.com/kawapress/kawapress/blob/main/packages/plugin-og-image/README-zh-CN.md)

`@kawapress/plugin-og-image` is part of [KawaPress](https://github.com/kawapress/kawapress), a Vue-first static site generator.

## Features

- Zero config: every page gets a 1200×630 PNG with its title, description and site name.
- Writes `og:image`, `og:image:width`, `og:image:height`, `twitter:card` and `twitter:image`. The site `base` is added to the address for you.
- Custom template as a Vue component, drawn with satori.
- A Latin font is built in. Add your own font file for Chinese, Japanese or Korean text.
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
| `fonts` | `{ name, path, weight?, style? }[]`. TTF, OTF or WOFF files. |
| `exclude` | Globs matched against the page `sourcePath`. |

## Documentation

[Documentation](https://kawapress.dev/en/plugins/og-image) · [Report a problem](https://github.com/kawapress/kawapress/issues)

## License

[MIT](https://github.com/kawapress/kawapress/blob/main/LICENSE) © KawaPress contributors
