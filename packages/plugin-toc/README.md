# @kawapress/plugin-toc

`[[toc]]` table of contents for KawaPress pages.

[![npm version](https://img.shields.io/npm/v/@kawapress/plugin-toc?label=npm&color=42b883)](https://www.npmjs.com/package/@kawapress/plugin-toc) · [简体中文](https://github.com/kawapress/kawapress/blob/main/packages/plugin-toc/README-zh-CN.md)

`@kawapress/plugin-toc` is part of [KawaPress](https://github.com/kawapress/kawapress), a Vue-first static site generator.

## Features

- Turns a line that holds only `[[toc]]` (case-insensitive) into a nested `<nav class="kawa-toc">` list of the page's headings.
- Lists `h2` and `h3` top-level headings by default; headings inside containers or blockquotes are excluded.
- Uses the final heading anchor IDs (including custom `{#id}` anchors) and the same plain-text heading titles as the outline and search index.

## Install

This package is already included in `kawapress`. A site that uses `kawapress/nagi` has it, so there is nothing to install.

Install it yourself only when you build a site without the nagi preset or when you want to configure custom heading levels.

```sh
npm install --save-dev @kawapress/plugin-toc
```

`pnpm add --save-dev @kawapress/plugin-toc` and `yarn add --dev @kawapress/plugin-toc` work too.

## Usage

```md
[[toc]]
```

```ts
import tocPlugin from '@kawapress/plugin-toc'
import { defineConfig } from 'kawapress'

export default defineConfig({
  plugins: [
    tocPlugin({
      level: [2, 3],
    }),
  ],
})
```

## Options

| Option | Description |
| --- | --- |
| `level` | Heading levels the table lists. Default `[2, 3]`. |

## Documentation

[Documentation](https://kawapress.dev/en/guide/markdown-extensions#table-of-contents) · [Report a problem](https://github.com/kawapress/kawapress/issues)

## License

[MIT](https://github.com/kawapress/kawapress/blob/main/LICENSE) © KawaPress contributors
