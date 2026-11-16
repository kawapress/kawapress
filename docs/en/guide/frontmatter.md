---
title: Frontmatter
description: Set a page title, description, layout, and other page data at the top of a Markdown file.
---

# Frontmatter

Frontmatter is a small set of settings at the very top of a Markdown file. It does not appear in the document. Use it for a title, description, layout, or your own data.

## Write Frontmatter {#write-frontmatter}

YAML is the usual format. Put the data between three dashes before anything else in the page:

```md
---
title: Getting started
description: Create your first KawaPress site in a few minutes.
---

# Getting started
```

A JSON object works too:

```md
{
  "title": "Getting started",
  "description": "Create your first KawaPress site in a few minutes."
}

# Getting started
```

These values travel with the page, so keep them simple: text, numbers, `true` or `false`, `null`, lists, and plain objects.

## Use Your Own Data {#use-your-own-data}

Alongside the fields below, you can save any page data you need. Read the current page with `usePageData()`:

```md
---
status: beta
---

<script setup lang="ts">
import { usePageData } from 'kawapress/client'

const page = usePageData()
</script>

Current status: {{ page?.frontmatter.status }}
```

`usePageData()` updates during client-side navigation. It reads only the page that is open.

## Page Titles and Descriptions {#page-titles-and-descriptions}

Use these three fields to set a page title and summary:

| Field | What it does |
| --- | --- |
| `title` | The page title. The first H1 is used when it is absent. |
| `description` | A short page summary for search engines and link previews. |
| `titleTemplate` | A browser-tab title template. `%s` becomes the page title; use `false` for the page title alone. |

```md
---
title: Configure your site
description: Set a KawaPress site title, path, and language.
titleTemplate: '%s · KawaPress Guide'
---
```

The browser-tab title for this page is “Configure your site · KawaPress Guide”. The page title is also used by site search.

Without `title`, the page title is the text of the first H1 with its Markdown formatting and inline HTML tags removed: `**bold**`, `[links](/guide)`, and `<kbd>Ctrl</kbd>` keep only the words inside them, `<Badge text="beta" />` leaves nothing, and inline code loses its backticks. Formulas and emoji shortcodes stay as written: the heading `# Energy $E=mc^2$ <Badge text="beta" />` gives the page title `Energy $E=mc^2$`.

## Page Head {#page-head}

To add `<head>` tags to a single page, write them in the frontmatter `head` field. Every entry has the same `[tag, attributes, content?]` shape as in the site config:

```md
---
head:
  - - meta
    - property: og:image
      content: https://example.com/guide.png
---
```

This page’s share image replaces the `og:image` set for the site. Tags render in the order site, current language, then current page, so later sources win. See [Add Head Tags](/en/guide/getting-started#add-head-tags) for the site and language settings.

The validated list is available as `page.head` when you read page data.

## Nagi Page Layout {#nagi-page-layout}

With the default nagi experience, `layout` chooses the page layout and navigation:

```md
---
layout: home
---
```

| Value | Result |
| --- | --- |
| `doc` | The default document layout. |
| `home` | A landing-page layout with `hero` and `features`. |
| `page` | A plain-page layout without the document sidebar or page outline. |
| Any other name | A custom layout, see below. |
| `false` | No nagi frame at all, only the page itself. Useful for a page shown inside an iframe. |

### Custom Layouts {#custom-layout}

When `layout` is any other name, nagi looks for a global component with that name and renders it below the navigation bar in place of the page content. The component places the page content with `<RouterView />`:

```vue
<!-- ComponentDocs.vue -->
<script setup lang="ts">
import { RouterView } from 'kawapress/client'
</script>

<template>
  <div class="component-docs">
    <aside>…</aside>
    <RouterView />
  </div>
</template>
```

Register it in a Runtime Plugin under the name the frontmatter uses (`component-docs`, `componentDocs`, and `ComponentDocs` all match):

```ts
api.vueApp((app) => {
  app.component('component-docs', ComponentDocs)
})
```

```md
---
layout: component-docs
---
```

Pages with a custom layout or `layout: false` stay out of the automatic sidebar. When no component has the name, the page shows its content like a `page` layout.

You can also turn off individual nagi regions for one page:

```md
---
navbar: false
sidebar: false
outline: false
footer: false
pageClass: focused-page
---
```

| Field | What it does |
| --- | --- |
| `navbar: false` | Hides the top navigation. |
| `sidebar: false` | Hides this document page’s sidebar and menu. The page remains in the site navigation. |
| `aside: false` | Hides the wide-screen page-outline rail. |
| `outline: false` | Hides every page outline, including the small-screen outline button. |
| `footer: false` | Hides the footer on a `home` or `page` layout. |
| `pageClass` | Adds a CSS class to the page’s outer element for your own styles. |

See [Getting Started](/en/guide/getting-started) for `hero` and `features`.

## Exclude a Page from Search {#exclude-a-page-from-search}

To keep a page out of the default local search, write:

```md
---
search: false
---
```

Only a literal `false` excludes a page.

## Exclude a Page from the Sitemap {#exclude-a-page-from-sitemap}

To keep a page out of `sitemap.xml`, write:

```md
---
sitemap: false
---
```

Only a literal `false` excludes a page. For the other sitemap settings, see [Sitemap](/en/plugins/sitemap).
