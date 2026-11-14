# Markdown Extensions

KawaPress adds documentation-oriented extensions on top of standard Markdown.

## Heading Anchors {#heading-anchors}

Every heading receives an anchor automatically. Hover a heading to copy a link to that section.

For example:

```md
## Install KawaPress
```

The resulting section link is `#install-kawapress`. When headings repeat on the same page, later anchors receive a numeric suffix to keep every link unique.

### Custom Anchors {#custom-anchors}

Automatic anchors are created by **slugifying** the visible heading into a URL-friendly fragment. This is convenient, but the result changes with the heading.

**Counterexample: relying only on automatic anchors**

Suppose the same installation guide has Chinese and English versions:

```md
<!-- The Chinese heading generates #安装 -->
## 安装

<!-- The English heading generates #installation -->
## Installation
```

A reader is viewing `/en/guide/setup#installation`. After switching to Chinese, the URL keeps `#installation`, but the Chinese page only has `#安装`, so the browser cannot find the matching section. Even on a single-language site, renaming “Installation” to “Install and Configure” produces a new anchor and breaks links already shared in issues, articles, or bookmarks.

**Preferred example: give the section a stable ID**

Let translated headings share an ID that does not depend on their visible text:

```md
<!-- Chinese -->
## 安装 {#installation}

<!-- English -->
## Installation {#installation}
```

Both pages now use `#installation`. Language switching still lands on the installation section, and changing the Chinese heading to `## 安装与配置 {#installation}` does not break existing links.

The page does not display `{#installation}`. Its outline and search results use the same ID. **Custom IDs must be unique within a page.** Prefer lowercase English words, numbers, and hyphens, such as `getting-started`.

Inline HTML or components inside a heading, such as `<Badge text="beta" />`, render in the heading on the page, but HTML tags are dropped from the plain-text title used in the page outline, search results, and browser tab title (text inside tags such as `<kbd>Ctrl</kbd>` stays as `Ctrl`), and they do not change the automatic anchor.

## Links {#links}

KawaPress distinguishes internal page links, same-page anchors, and external links so each keeps the appropriate browser behavior.

### Internal Links {#internal-links}

Links to another Markdown page may be extensionless or end in `.md` or `.html`. All three forms resolve to the same extensionless public route:

```md
[Routing](./routing)
[Routing](./routing.md)
[Routing](./routing.html)
```

Relative links are resolved from the current Markdown **source file**. For example, `[Routing](./routing.md)` in `guide/index.md` still points to `/guide/routing`. A link to an `index.md` page also drops the final `/index` segment.

Root-relative links follow the configured `base` as well:

```md
[Getting Started](/en/guide/getting-started)
[Home](/en/index.md)
```

Generated pages use the canonical extensionless URL. After hydration, the client router handles normal internal page links without a full-page reload. A same-page `#heading` link keeps the browser's native anchor behavior.

For example, continue to [Routing](./routing.md) or [Deployment](./deploy.html).

### External Links {#external-links}

A complete URL is treated as external, such as the [Vue documentation](https://vuejs.org/guide/introduction.html). KawaPress automatically adds:

```html
<a href="https://vuejs.org/" target="_blank" rel="noreferrer">
  Vue documentation
</a>
```

External links open in a new tab and do not send the current page URL to the destination as referrer data.

## GitHub-Style Tables {#github-style-tables}

Separate cells with pipes and add a delimiter row below the header. Colons in the delimiter row select left, center, or right alignment:

```md
| Service | Runs On | Default Port |
| :------ | :-----: | -----------: |
| Dev server | Local | 5173 |
| Preview server | Local | 4173 |
```

The result is:

| Service | Runs On | Default Port |
| :------ | :-----: | -----------: |
| Dev server | Local | 5173 |
| Preview server | Local | 4173 |

When a table is wider than the article, nagi makes the table region horizontally scrollable instead of overflowing the document layout.

## Table of Contents {#table-of-contents}

To place a table of contents directly inside the article body, write `[[toc]]` (case-insensitive) on a line of its own:

```md
[[toc]]
```

nagi includes `@kawapress/plugin-toc` by default and replaces that line with a nested list wrapped in `<nav class="kawa-toc">`. Only top-level headings of the page are listed (headings inside containers or blockquotes are skipped), links point to the final heading anchor IDs, and titles match the page outline and search index.

By default, `h2` and `h3` headings are included. To change which heading levels appear, pass `tocPlugin()` in `plugins` in `kawapress.config.ts`:

```ts
import tocPlugin from '@kawapress/plugin-toc'
import { nagi } from 'kawapress/nagi'

export default nagi({
  plugins: [
    tocPlugin({
      level: [2, 3, 4],
    }),
  ],
})
```

## Badges {#badges}

Use the `<Badge>` component to attach a short status label, such as a version number or stability tag, to a heading or phrase. nagi includes `@kawapress/plugin-badge` by default.

```md
- Default <Badge text="Recommended" />
- Info <Badge type="info" text="v0.3" />
- Warning <Badge type="warning" text="Experimental" />
- Danger <Badge type="danger">Deprecated</Badge>
```

The result is:

- Default <Badge text="Recommended" />
- Info <Badge type="info" text="v0.3" />
- Warning <Badge type="warning" text="Experimental" />
- Danger <Badge type="danger">Deprecated</Badge>

`type` accepts `'tip'` (default), `'info'`, `'warning'`, or `'danger'`. Pass the label through the `text` prop or the default slot. A `<Badge text="beta" />` inside a heading is omitted from the outline, search titles, and browser tab title, and does not change the heading anchor.

## Emoji {#emoji}

nagi includes `@kawapress/plugin-emoji` by default, so `:name:` shortcodes turn into emoji characters:

```md
Release complete :tada: Ready to ship :rocket:
```

The result is:

Release complete :tada: Ready to ship :rocket:

Shortcode names follow GitHub's emoji list. Unknown names and shortcodes inside inline code or fenced code blocks stay as written. ASCII emoticons such as `:)` are not converted, so punctuation in technical writing stays untouched. Shortcodes inside headings keep their `:name:` text in the outline and search index, and anchors remain unchanged.

## Custom Containers {#custom-containers}

Custom containers separate tips, risks, and supporting information from ordinary paragraphs. Open and close a container with three colons:

```md
::: tip
Run a production build locally to catch deployment problems earlier.
:::
```

The Markdown above renders as:

::: tip
Run a production build locally to catch deployment problems earlier.
:::

### Container Types {#default-container-types}

KawaPress provides five container types. When the title is omitted, it follows the current page language automatically.

::: info
Background information needed to understand the current topic.
:::

::: tip
Advice that helps readers complete a task more smoothly.
:::

::: warning
A risk that needs attention before continuing.
:::

::: danger
An action that may cause data loss or other serious consequences.
:::

::: details
Additional information that stays collapsed until the reader opens it.
:::

### Custom Titles {#custom-container-titles}

Text after the container type replaces the default title. Inline Markdown works in titles too:

```md
::: danger **Stop and check the configuration**
Never commit access tokens to a Git repository.
:::

::: details View the complete configuration
This can contain paragraphs, lists, and code blocks.
:::
```

The result is:

::: danger **Stop and check the configuration**
Never commit access tokens to a Git repository.
:::

::: details View the complete configuration
This can contain paragraphs, lists, and code blocks.
:::

## GitHub-Style Alerts {#github-alerts}

GitHub-style alerts use blockquote syntax. They are useful when the same callout should work in both KawaPress documentation and a GitHub README. Put the alert type on the first line of the blockquote:

```md
> [!NOTE]
> Information readers should not overlook, even when skimming.

> [!TIP]
> Advice that helps readers complete a task more smoothly.

> [!IMPORTANT]
> Information required to complete the current task.

> [!WARNING]
> A potential risk that needs immediate attention.

> [!CAUTION]
> A serious consequence that an action may cause.
```

The result is shown below. Alert names are case-insensitive, and visible titles follow the current page language:

> [!NOTE]
> Information readers should not overlook, even when skimming.

> [!TIP]
> Advice that helps readers complete a task more smoothly.

> [!IMPORTANT]
> Information required to complete the current task.

> [!WARNING]
> A potential risk that needs immediate attention.

> [!CAUTION]
> A serious consequence that an action may cause.

## Code Blocks {#code-blocks}

Add a language after the opening fence. KawaPress displays the language label and a copy button automatically:

````md
```ts
const greeting = 'Hello, KawaPress'
```
````

The button briefly confirms a successful copy. Its text follows the current page language.

### Line Numbers {#line-numbers}

Add `:line-numbers` after the language to show line numbers. Append a starting value when the snippet should begin at a specific line:

````md
```ts:line-numbers=5
const first = 'Line five'
const second = 'Line six'
```
````

The result is:

```ts:line-numbers=5
const first = 'Line five'
const second = 'Line six'
```

Enable line numbers in the nagi configuration when every code block should show them by default:

```ts
import { nagi } from 'kawapress/nagi'

export default nagi({
  codeBlock: {
    lineNumbers: true,
  },
})
```

Once enabled, use `:no-line-numbers` to disable them for one code block.

### Code Annotations {#code-annotations}

Code annotations draw attention to selected lines without showing their control text to readers. Put them in comments supported by the current language, such as `//` in JavaScript, `#` in Shell, or `<!-- -->` in HTML.

Use `{2,4-5}` in the opening fence to highlight lines by number:

````md
```ts {2,4-5}
const first = 1
const second = 2
const third = 3
const fourth = 4
const fifth = 5
```
````

Use `[!code highlight]` to highlight the current line instead:

```ts {1}
const ordinary = 'Highlighted by line number'
const highlighted = 'Highlighted by notation' // [!code highlight]
```

Use `[!code focus]` to focus one line. Other lines remain subdued until the reader hovers the code block or focuses it with the keyboard:

```ts
const before = 'Supporting context'
const target = 'Current focus' // [!code focus]
const after = 'Supporting context'
```

Use `[!code --]` and `[!code ++]` for removed and added lines. Copying the block automatically excludes removed lines:

```ts
const mode = 'legacy' // [!code --]
const mode = 'modern' // [!code ++]
```

Use `[!code warning]` and `[!code error]` to mark risks:

```ts
console.warn('Check the configuration first') // [!code warning]
throw new Error('Invalid configuration') // [!code error]
```

Append a count, such as `[!code focus:2]`, to annotate consecutive lines starting with the current line.

### Type Hints {#type-hints}

Add `twoslash` after the language name and the block is checked like a real TypeScript project. Hover a variable or a function to see its type and docs; write `// ^?` on the next line to print the type of a value right in the code:

````md
```ts twoslash
const toCurrency = (value: number) => `¥${value.toFixed(2)}`
const price = toCurrency(19.9)
//    ^?
```
````

Here is the result. Try hovering `toCurrency`:

```ts twoslash
const toCurrency = (value: number) => `¥${value.toFixed(2)}`
const price = toCurrency(19.9)
//    ^?
```

Only blocks marked with `twoslash` are analysed; every other block is highlighted as usual. The analysis happens at build time, and the popup styles load only on the pages that use them, so pages without Twoslash code blocks download nothing extra.

### Import Code Snippets {#import-code-snippets}

Instead of copying long code examples into Markdown, use `<<<` on its own line to pull code directly from a source file. Your examples stay in real files and update automatically when the source changes.

```md
<<< ./snippets/example.ts
```

Paths are relative to the current Markdown file, or start with `@/` to resolve from `srcDir`:

```md
<<< @/snippets/example.ts
```

Mark a section of the source file with `#region` and `#endregion` comments to import only that part. The marker lines and shared leading indentation are stripped automatically:

```ts
// snippets/example.ts
export function setup() {
  // #region config
  const port = 5173
  const host = 'localhost'
  // #endregion config
  return { port, host }
}
```

Append `#region-name` to the path, add `{lines lang attrs}` for line highlights, language override, and fence attributes such as `:line-numbers`, and add `[title]` to set the tab label inside a code group (which defaults to the file name):

````md
::: code-group
<<< ./snippets/example.ts#config{1 ts:line-numbers} [Dev Config]
<<< ./snippets/prod.ts [Prod Config]
:::
````

## Markdown File Inclusion {#markdown-file-inclusion}

When several pages share the same note or parameter table, use `<!--@include-->` to inline another Markdown file at that spot:

```md
<!--@include: ./parts/prerequisites.md-->

<!-- Start with @/ to resolve from srcDir -->
<!--@include: @/parts/shared-note.md-->
```

When a full `.md` file is included, its own frontmatter is stripped automatically. If the directive is the only content on an indented line (for instance inside a list item), every included line keeps that indentation. Included files can include other files; circular includes stop the build with the full file chain and line number.

To include only part of a file, add a `#region` name or a `{start,end}` line range (either bound can be omitted):

```md
<!-- Include only between <!-- #region intro --> and <!-- #endregion intro --> -->
<!--@include: ./parts/guide.md#intro-->

<!-- Include lines 3 through 10 -->
<!--@include: ./parts/guide.md{3,10}-->

<!-- Include from line 5 to the end of the file -->
<!--@include: ./parts/guide.md{5,}-->
```

`<!--@include-->` and `<<<` expand before Markdown parsing begins, so page rendering, the page outline, local search, `llms.txt`, and dead-link checking all see the same expanded content. If a link inside an included file is broken, the dead-link report points back to the line of the page that included it.

If shared Markdown files live inside `srcDir`, exclude them with [`srcExclude`](./routing#excluding-source-files) so KawaPress does not build standalone pages for them.

## Math Equations {#math-equations}

Math equations are provided by the optional `@kawapress/plugin-mathjax` package. It generates SVG during the build, so the reader's browser does not need to download or run MathJax.

::: code-group
```sh [npm]
npm install -D @kawapress/plugin-mathjax
```

```sh [pnpm]
pnpm add -D @kawapress/plugin-mathjax
```

```sh [Yarn]
yarn add -D @kawapress/plugin-mathjax
```
:::

Add the plugin to the site configuration:

```ts
import mathjaxPlugin from '@kawapress/plugin-mathjax'
import { nagi } from 'kawapress/nagi'

export default nagi({
  plugins: [
    mathjaxPlugin(),
  ],
})
```

Use one pair of `$` delimiters for inline math. For example, mass-energy equivalence is $E = mc^2$.

```md
Mass-energy equivalence is $E = mc^2$.
```

Use a pair of `$$` delimiters on separate lines for display math:

```md
$$
\int_0^1 x^2 \, dx = \frac{1}{3}
$$
```

The result is:

$$
\int_0^1 x^2 \, dx = \frac{1}{3}
$$

Pandoc-style delimiter rules keep prices such as `$20` and `$30` as ordinary text. Escape a literal dollar sign as `\$` when needed. Pass `mathjaxPlugin({ tex: { ... }, svg: { ... } })` to configure TeX macros, equation numbering, or SVG output.
