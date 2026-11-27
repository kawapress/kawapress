---
title: Build-Time Data Loading
description: Read remote data or local files during the build and use the result in Markdown and Vue components.
---

<script setup lang="ts">
import { data as demo } from '../../guide/data-loading.data.ts'
</script>

# Build-Time Data Loading

Some information does not belong directly in Markdown. A release list may come from an API, while an article index may come from many local files. KawaPress can read that information during the build and make the result available to a page.

A Data Loader runs only in Node.js. Its source code and Node.js dependencies never reach the browser. The value returned by `load()` is serialized as JSON into the chunks that use it.

## Basic Usage {#basic-usage}

Create a file ending in `.data.ts` or `.data.js`:

```ts
// example.data.ts
export default {
  load() {
    return {
      hello: 'world',
    }
  },
}
```

Import the generated `data` export from a Markdown page or Vue component:

```md
<script setup lang="ts">
import { data } from './example.data.ts'
</script>

<pre>{{ data }}</pre>
```

The Loader file does not declare this runtime value. KawaPress runs the default export's `load()` function and creates the named `data` export for you.

This documentation site uses the same feature. The current build loaded **{{ demo.pageCount }}** Chinese and English guide pages.

## Load Remote Data {#load-remote-data}

`load()` may be asynchronous. Node.js 22 includes `fetch()`:

```ts
// releases.data.ts
export default {
  async load() {
    const response = await fetch('https://api.example.com/releases')
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`)
    }
    return response.json()
  },
}
```

The request runs during development or production builds, not in each visitor's browser. The SSR and client builds share one result within the same build.

## Read Local Files {#read-local-files}

To build data from local files, use the `read()` and `glob()` that `load()` receives. Paths are relative to the Loader file, and absolute paths work too:

```ts
// catalog.data.ts
import { defineLoader } from 'kawapress'

export default defineLoader({
  async load({ glob, read }) {
    const files = await glob('./catalog/*.json')
    return Promise.all(files.map(async file => ({
      file,
      value: JSON.parse(await read(file)),
    })))
  },
})
```

`read(path)` reads UTF-8 text, and `glob(pattern)` returns absolute paths in stable path order. Whatever you read is tracked:

- In development, editing a file read through `read()` updates the data automatically.
- Adding or removing a file that matches a `glob()` pattern updates it too.
- Changes to local helper modules imported by the Loader do the same.

Data that does not go through `read()` or `glob()`, such as `fetch` results or files you read yourself with `node:fs`, is not tracked and refreshes when you restart the dev server.

### Migrating from VitePress {#watch-form}

The VitePress `watch` form still works. With `watch`, the first argument of `load()` is the matched files and the second is the `{ read, glob }` context shown above:

```ts
export default defineLoader({
  watch: './catalog/*.json',
  async load(files, { read }) {
    return Promise.all(files.map(async file => JSON.parse(await read(file))))
  },
})
```

## Collect Markdown Content {#collect-markdown-content}

Use `createContentLoader()` for an article archive or API index:

```ts
// posts.data.ts
import { createContentLoader } from 'kawapress'

export default createContentLoader('posts/*.md')
```

The glob is relative to the site's `srcDir`, and only Markdown files are loaded. Each default entry contains:

```ts
interface ContentData {
  // KawaPress route without the deployment base
  url: string
  frontmatter: Record<string, unknown>
  src?: string
  html?: string
  excerpt?: string
}
```

An `index.md` file maps to its directory route. For example, `posts/index.md` has the URL `/posts`. Prefer `<RouterLink :to="post.url">` in Vue templates so the router applies the site's `base` automatically.

Enable extra fields only when needed, then use `transform` to keep the browser payload small:

```ts
// posts.data.ts
import { createContentLoader } from 'kawapress'

export default createContentLoader('posts/*.md', {
  includeSrc: true,
  render: true,
  excerpt: true,
  async transform(pages) {
    return pages
      .filter(page => page.frontmatter.draft !== true)
      .map(page => ({
        title: page.frontmatter.title,
        url: page.url,
        excerpt: page.excerpt,
      }))
  },
})
```

| Option | Purpose |
| --- | --- |
| `includeSrc` | Includes the original Markdown source. |
| `render` | Includes full HTML rendered by the current KawaPress Markdown pipeline. |
| `excerpt` | Includes a rendered excerpt. `true` uses `---`; a custom separator or extraction function is also accepted. |
| `transform` | Filters, sorts, or reshapes the final data, synchronously or asynchronously. |
| `globOptions` | Adjusts matching options such as `dot` and `ignore`. |

These values are bundled into JavaScript, so keep only what the page needs. Use `html` and `excerpt` only with Markdown you trust. Do not pass untrusted content directly to `v-html`.

## Type a Loader {#type-a-loader}

`defineLoader()` checks the Loader contract. Declaring `data` gives importing pages an exact type as well:

```ts
// posts.data.ts
import { defineLoader } from 'kawapress'

export interface Data {
  posts: Array<{
    title: string
    url: string
  }>
}

declare const data: Data
export { data }

export default defineLoader({
  async load(): Promise<Data> {
    return { posts: [] }
  },
})
```

## Read Site Configuration {#read-site-configuration}

The active configuration is available through `globalThis.KAWAPRESS_CONFIG` while a Loader runs:

```ts
export default {
  load() {
    const config = globalThis.KAWAPRESS_CONFIG
    return {
      base: config?.site.base,
      sourceRoot: config?.srcDir,
    }
  },
}
```

`root`, `srcDir`, and `publicDir` are absolute paths. `site` contains the serializable site data shared with the runtime. This global is available only during Node.js Data Loader execution.

## Data Boundary {#data-boundary}

A Loader result must be lossless standard JSON: `null`, booleans, finite numbers, strings, arrays, and plain objects. Do not return `undefined`, `Date`, `Map`, `Set`, functions, class instances, circular references, or Vue refs. KawaPress reports the Loader file and exact property instead of allowing `JSON.stringify()` to silently discard data.

A Data Loader supplies data to an existing page. It does not create routes and is not a Content Layer; Markdown files still define the pages that can be visited.
