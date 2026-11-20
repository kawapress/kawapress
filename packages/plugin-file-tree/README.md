# @kawapress/plugin-file-tree

File trees for KawaPress Markdown: write a layout as indented text, get icons, folding and notes at build time.

[![npm version](https://img.shields.io/npm/v/@kawapress/plugin-file-tree?label=npm&color=42b883)](https://www.npmjs.com/package/@kawapress/plugin-file-tree) · [简体中文](https://github.com/kawapress/kawapress/blob/main/packages/plugin-file-tree/README-zh-CN.md)

`@kawapress/plugin-file-tree` is part of [KawaPress](https://github.com/kawapress/kawapress), a Vue-first static site generator.

## Features

- Write a `tree` code block with indentation. No hand-drawn `├──` lines to realign.
- File and folder icons from Catppuccin Icons, picked by name and extension and inlined at build time.
- Folding with the native `<details>`, so the page ships no script.
- Notes after `#`, highlighted entries with `**name**`, `...` for omitted content, and ` (collapsed)` for folders that start closed.
- A wrong indent fails the build with the page and the line.

## Install

```sh
npm install --save-dev @kawapress/plugin-file-tree
```

`pnpm add --save-dev @kawapress/plugin-file-tree` and `yarn add --dev @kawapress/plugin-file-tree` work too.

## Usage

````md
```tree
docs/
  guide/
    getting-started.md   # start here
    **routing.md**
  kawapress.config.ts
  package.json
```
````

```ts
import fileTreePlugin from '@kawapress/plugin-file-tree'
import { nagi } from 'kawapress/nagi'

export default nagi({
  plugins: [fileTreePlugin()],
})
```

## Documentation

[Documentation](https://kawapress.dev/en/plugins/file-tree) · [Report a problem](https://github.com/kawapress/kawapress/issues)

## License

[MIT](https://github.com/kawapress/kawapress/blob/main/LICENSE) © KawaPress contributors
