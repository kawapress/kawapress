# @kawapress/plugin-badge

Inline badges for KawaPress headings and text.

[![npm version](https://img.shields.io/npm/v/@kawapress/plugin-badge?label=npm&color=42b883)](https://www.npmjs.com/package/@kawapress/plugin-badge) · [简体中文](https://github.com/kawapress/kawapress/blob/main/packages/plugin-badge/README-zh-CN.md)

`@kawapress/plugin-badge` is part of [KawaPress](https://github.com/kawapress/kawapress), a Vue-first static site generator.

## Features

- Four badge types: `tip` (default), `info`, `warning`, and `danger`.
- Pass the label with the `text` prop or the default slot.
- Styled in `@layer kawa.plugin` with the shared `--kawa-*` semantic tokens.
- Badges in headings stay out of the page outline, search index, and browser tab title, and do not change the heading anchor.

## Install

This package is already included in `kawapress`. A site that uses `kawapress/nagi` has it, so there is nothing to install.

Install it yourself only when you build a site without the nagi preset.

```sh
npm install --save-dev @kawapress/plugin-badge
```

`pnpm add --save-dev @kawapress/plugin-badge` and `yarn add --dev @kawapress/plugin-badge` work too.

## Usage

```md
# Title <Badge type="tip" text="New" />

- Status <Badge type="info" text="v0.3" />
- Notice <Badge type="warning">Experimental</Badge>
- Legacy <Badge type="danger" text="Deprecated" />
```

```ts
import badgePlugin from '@kawapress/plugin-badge'
import { defineConfig } from 'kawapress'

export default defineConfig({
  plugins: [badgePlugin()],
})
```

## Documentation

[Documentation](https://kawapress.dev/en/guide/markdown-extensions#badges) · [Report a problem](https://github.com/kawapress/kawapress/issues)

## License

[MIT](https://github.com/kawapress/kawapress/blob/main/LICENSE) © KawaPress contributors
