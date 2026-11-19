/**
 * Frontmatter keys this plugin reads. Every reader of `PageFrontmatter` sees
 * them while the plugin is imported.
 */
declare module 'kawapress' {
  interface PageFrontmatter {
    /** `false` leaves this page out of the feeds. */
    feed?: boolean
    /** Publication date as a quoted string, for example `"2026-11-20"`. */
    date?: string
    /** Author name, or an object with `name`, `email` and `link`. */
    author?: string | { name: string, email?: string, link?: string }
    /** Cover image: a site path such as `/images/cover.png`, or an absolute URL. */
    image?: string
  }
}

export {}
