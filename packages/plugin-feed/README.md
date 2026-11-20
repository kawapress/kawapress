# @kawapress/plugin-feed

RSS 2.0, Atom and JSON Feed output for KawaPress, with one set of files per locale.

[![npm version](https://img.shields.io/npm/v/@kawapress/plugin-feed?label=npm&color=42b883)](https://www.npmjs.com/package/@kawapress/plugin-feed) · [简体中文](https://github.com/kawapress/kawapress/blob/main/packages/plugin-feed/README-zh-CN.md)

`@kawapress/plugin-feed` is part of [KawaPress](https://github.com/kawapress/kawapress), a Vue-first static site generator.

## Features

- Write a `hostname` and the pages to include, and get `feed.xml`, `atom.xml` and `feed.json`.
- Every page `<head>` links the feeds of its locale, so readers can discover them.
- The site `base` is added to every address for you.
- Entries come from frontmatter: `title`, `date`, `description`, `author`, `image`.
- A page can opt out with `feed: false` in its frontmatter.

## Install

```sh
npm install --save-dev @kawapress/plugin-feed
```

`pnpm add --save-dev @kawapress/plugin-feed` and `yarn add --dev @kawapress/plugin-feed` work too.

## Usage

```ts
import feed from '@kawapress/plugin-feed'
import { defineConfig } from 'kawapress'

export default defineConfig({
  plugins: [
    feed({
      hostname: 'https://example.com',
      include: ['blog/**/*.md'],
    }),
  ],
})
```

A post needs a quoted `date` in its frontmatter:

```md
---
title: KawaPress 0.9
date: '2026-11-20'
description: A short summary.
---
```

## Options

| Option | Description |
| --- | --- |
| `hostname` | Required. The absolute address of the site. |
| `include` | Required. Globs relative to `srcDir` of the pages to include. |
| `exclude` | Globs of pages to leave out. |
| `formats` | Any of `'rss'`, `'atom'`, `'json'`. Default: all three. |
| `limit` | Entries per feed, newest first. Default 20. |
| `title`, `description`, `copyright` | Feed metadata. Title and description default to the site or locale values. |
| `author` | Default author. The frontmatter `author` wins. |
| `transformItems` | Add, remove or change entries before they are written. |

## Documentation

[Documentation](https://kawapress.dev/en/plugins/feed) · [Report a problem](https://github.com/kawapress/kawapress/issues)

## License

[MIT](https://github.com/kawapress/kawapress/blob/main/LICENSE) © KawaPress contributors
