interface ImportMetaEnv {
  /** Set by `@kawapress/plugin-llms` while it compiles pages to Markdown. */
  readonly SSG_MD: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
