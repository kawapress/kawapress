---
title: File Tree
description: Write a directory layout as indented text and get a tree with file icons, folding and annotations at build time. The output is plain HTML with no client script.
---

# File Tree

Docs often need to show a project's directory layout. Drawing `├──` by hand in a `text` block gives no icons, no highlighting and no folding, and renaming one file means realigning the lines.

`@kawapress/plugin-file-tree` lets you write the layout with indentation and renders it at build time as a tree with file icons, folding and annotations. The page carries plain HTML and styles, so the reader's browser downloads no script.

## Write a tree {#write-a-tree}

Write `tree` as the language of a code block and use indentation for the levels:

````md
```tree
docs/
  .kawapress/
  guide/
    getting-started.md   # start here
    **routing.md**
  kawapress.config.ts
  package.json
```
````

The result:

```tree
docs/
  .kawapress/
  guide/
    getting-started.md   # start here
    **routing.md**
  kawapress.config.ts
  package.json
```

## Syntax {#syntax}

| Write | Meaning |
| --- | --- |
| Indentation | Sets the level. One level is 2 spaces or 1 tab, and a tree cannot mix them. |
| Ends with `/` | A directory. A directory with no children is still a directory. |
| No trailing `/` | A file. A file cannot have children. |
| `# note` | After the name, shown as gray note text. |
| `**name**` | Highlights the entry, to point out "this is the file you change". |
| `...` | On its own line, stands for other content left out. |
| ` (collapsed)` after a directory name | The directory starts folded. |

```tree
packages/
  core/ (collapsed)
    src/
    package.json
  plugin-file-tree/
    src/
      **index.ts**   # entry
      ...
    package.json
```

Directories open and close on click, and with the keyboard too: focus the directory name and press Enter or Space. Folding uses the browser's native `<details>`, so no script is involved.

## Icons {#icons}

Icons come from [Catppuccin Icons](https://github.com/catppuccin/vscode-icons) and are chosen by file name and extension: `package.json`, `.ts`, `.vue` and `.md` each get their own, and common directory names (`src`, `docs`, `.github` and so on) have dedicated icons. Anything unrecognized gets the generic file or folder icon.

The icons become inline SVG at build time. A page carries only the ones it uses and never calls an online service.

## When the indentation is wrong {#errors}

Bad indentation fails the build, and the message names the page and the line:

- A level that is not 2 spaces (3 spaces, for example).
- Tabs and spaces mixed in one tree.
- A line indented more than one level deeper than the line above.
- Children under a file (a directory name missing its `/`).

## Search and llms {#search-and-llms}

The search index and the `llms` output read the Markdown source, so they still see the indented text you wrote.

## Styles {#styles}

The plugin's styles live in the `kawa.plugin` layer and read only the shared `--kawa-*` variables, so light and dark follow the theme. To fine-tune, override these classes:

| Class | Element |
| --- | --- |
| `.kawa-file-tree` | The frame around the tree |
| `.kawa-file-tree__list` | The list of each level |
| `.kawa-file-tree__row` | One row (icon, name, note) |
| `.kawa-file-tree__icon` | An icon |
| `.kawa-file-tree__name` | A name |
| `.kawa-file-tree__name--highlight` | A name marked with `**…**` |
| `.kawa-file-tree__comment` | A `# note` |

## Install {#install}

The nagi preset does not include this plugin, so install it separately:

::: code-group
```sh [npm]
npm install --save-dev @kawapress/plugin-file-tree
```

```sh [pnpm]
pnpm add --save-dev @kawapress/plugin-file-tree
```

```sh [Yarn]
yarn add --dev @kawapress/plugin-file-tree
```
:::

```ts
import fileTreePlugin from '@kawapress/plugin-file-tree'
import { nagi } from 'kawapress/nagi'

export default nagi({
  plugins: [
    fileTreePlugin(),
  ],
})
```

Adding it to `plugins` is enough. There are no options, and the styles load automatically.

## Limitations {#limitations}

- The plugin renders only what you write. It never reads the real file system to build a tree.
- Links inside a tree are not supported.
