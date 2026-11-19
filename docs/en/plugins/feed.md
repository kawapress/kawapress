---
title: Feed
description: Generate RSS, Atom and JSON Feed for blogs and changelogs with @kawapress/plugin-feed, including autodiscovery links.
---

# Feed

Blogs, changelogs and weekly notes need a way for readers to subscribe. `@kawapress/plugin-feed` generates RSS 2.0, Atom and JSON Feed files at build time, and adds autodiscovery links to the `<head>` of every page so browsers and feed readers can find them.

## Install {#install}

::: code-group
```sh [npm]
npm install --save-dev @kawapress/plugin-feed
```

```sh [pnpm]
pnpm add --save-dev @kawapress/plugin-feed
```

```sh [Yarn]
yarn add --dev @kawapress/plugin-feed
```
:::

## Enable the Feed {#enable-feed}

Add the plugin to `kawapress.config.ts` with a `hostname` and the pages to include:

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

`hostname` is the absolute address of the site. It must start with `http://` or `https://`, and the plugin throws right away when it is missing or invalid. The site `base` is appended automatically, so you do not need to write it twice.

`include` is a list of globs relative to `srcDir`. It is required and decides which pages enter the feeds. The plugin never includes the whole site by default. Use `exclude` for pages that should stay out.

## Post Frontmatter {#frontmatter}

Feed entries come from page frontmatter:

```md
---
title: KawaPress 0.9
date: '2026-11-20'
description: Independent versions and new plugins.
author: ShenQingChuan
image: /images/0.9-cover.png
---
```

| Field | Description |
| --- | --- |
| `title` | The entry title, which is the page title. |
| `date` | Required. The publication time. Entries are sorted by it, newest first. |
| `description` | The entry summary. Without it, the plain text of the first paragraph is used, up to 300 characters. |
| `author` | An author name, or `{ name, email, link }`. It wins over the plugin's `author` option. |
| `image` | A cover image. A site path is turned into an absolute address with `hostname` and `base`. |
| `feed` | Set it to `false` to keep this page out of the feeds. |

`date` must be a quoted string. An unquoted YAML date is parsed as a `Date` object, but KawaPress page data accepts only values that can be serialized to JSON, so the build fails.

A page that matches `include` but has no parsable `date` stays out of the feeds. The build lists these pages in a warning. A blog index page usually has no `date`, so exclude it, for example with `exclude: ['blog/index.md']`.

Feeds contain the summary only, not the full article.

## Output Files {#output}

The build writes three files to the root of the output directory:

| Format | File |
| --- | --- |
| RSS 2.0 | `feed.xml` |
| Atom | `atom.xml` |
| JSON Feed | `feed.json` |

After deployment, the feed address looks like `https://example.com/feed.xml`, or `https://example.com/handbook/feed.xml` when the site sets a `base`.

Use `formats` to choose which ones to write. The file names are fixed:

```ts
feed({
  hostname: 'https://example.com',
  include: ['blog/**/*.md'],
  formats: ['rss', 'json'],
})
```

Each feed holds at most `limit` entries, 20 by default, sorted by `date` from newest to oldest.

A locale gets feeds, and autodiscovery links on its pages, as soon as one of its pages matches `include`. If none of those pages has a `date`, its feeds have no entries and the build prints a warning. When no page matches `include` at all, the plugin prints a warning and writes no file. If `public/` already contains a file with the same name, the build fails instead of overwriting it.

## Autodiscovery {#autodiscovery}

The plugin adds three `<link rel="alternate">` tags to the `<head>` of the page, with the types `application/rss+xml`, `application/atom+xml` and `application/feed+json`. `href` is the full address with `hostname` and `base`, and `title` is the feed title.

Only pages of a locale that has feeds get these links.

## Feed Information {#metadata}

`title` and `description` default to the values of the site, or of the locale when the site has several locales. Override them with the options of the same name, and use `copyright` for a copyright notice:

```ts
feed({
  hostname: 'https://example.com',
  include: ['blog/**/*.md'],
  title: 'KawaPress Blog',
  description: 'Releases and design notes.',
  copyright: '© KawaPress contributors',
  author: { name: 'ShenQingChuan', link: 'https://example.com/about' },
})
```

`author` is the default author. Pages that do not set `author` in frontmatter use it.

## Multiple Locales {#multiple-locales}

Each locale gets its own set of files. The default locale (`root`) writes to the root directory, and other locales write to a folder named after the locale key, such as `en/feed.xml`. `include` is relative to `srcDir`, so it has to cover the folder of every locale:

```ts
feed({
  hostname: 'https://example.com',
  include: ['blog/**/*.md', 'en/blog/**/*.md'],
  exclude: ['**/index.md'],
})
```

Files are written for a locale only when it has matching pages. The `language` of a feed comes from the `lang` field in the `locales` configuration.

## Transform Items {#transform-items}

`transformItems` receives all entries of one locale before the files are written. It can add, remove, or change entries. When it returns `undefined`, the original entries are kept. `locale` in the second argument is the locale key, and it is `root` for the default locale:

```ts
feed({
  hostname: 'https://example.com',
  include: ['blog/**/*.md'],
  transformItems(items, { locale }) {
    return items.filter(item => !item.title.startsWith('[Draft]'))
  },
})
```

Each entry has `title`, `link` and `date`, and optionally `id`, `description`, `image` and `authors`. `link` and `image` are absolute addresses.

## Limitations {#limitations}

- The plugin does not provide a blog list page, an archive, or pagination. Build those pages in your site with `createContentLoader()`.
- Feeds do not contain the full article. Generation happens before prerendering, when the final HTML is not available, and rendering Markdown without components would drop the content of Vue components.
- JSON Feed uses the version 1.0 format.
