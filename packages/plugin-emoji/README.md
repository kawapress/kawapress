# @kawapress/plugin-emoji

Emoji shortcodes such as `:tada:` for KawaPress.

[![npm version](https://img.shields.io/npm/v/@kawapress/plugin-emoji?label=npm&color=42b883)](https://www.npmjs.com/package/@kawapress/plugin-emoji) · [简体中文](https://github.com/kawapress/kawapress/blob/main/packages/plugin-emoji/README-zh-CN.md)

`@kawapress/plugin-emoji` is part of [KawaPress](https://github.com/kawapress/kawapress), a Vue-first static site generator.

## Features

- Replaces `:name:` shortcodes with emoji using GitHub's shortcode list.
- Leaves unknown names, inline code, and fenced code blocks untouched.
- Keeps ASCII emoticons such as `:)` as plain text so punctuation is never turned into emoji.
- Heading titles, outlines, and anchors keep the written `:name:` shortcode.

## Install

This package is already included in `kawapress`. A site that uses `kawapress/nagi` has it, so there is nothing to install.

Install it yourself only when you build a site without the nagi preset.

```sh
npm install --save-dev @kawapress/plugin-emoji
```

`pnpm add --save-dev @kawapress/plugin-emoji` and `yarn add --dev @kawapress/plugin-emoji` work too.

## Usage

```md
Release complete :tada:
```

```ts
import emojiPlugin from '@kawapress/plugin-emoji'
import { defineConfig } from 'kawapress'

export default defineConfig({
  plugins: [emojiPlugin()],
})
```

## Documentation

[Documentation](https://kawapress.dev/en/guide/markdown-extensions#emoji) · [Report a problem](https://github.com/kawapress/kawapress/issues)

## License

[MIT](https://github.com/kawapress/kawapress/blob/main/LICENSE) © KawaPress contributors
