/**
 * Frontmatter keys this plugin reads. Every reader of `PageFrontmatter` sees
 * them while the plugin is imported.
 */
declare module 'kawapress' {
  interface PageFrontmatter {
    /** `false` skips the share image of this page. */
    ogImage?: boolean
  }
}

export {}
