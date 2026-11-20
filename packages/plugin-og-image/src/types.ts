export interface OgImageFont {
  /** Font family name. Templates refer to it with `font-family`. */
  name: string
  /** Path of a TTF, OTF or WOFF file, relative to the site root. WOFF2 is not supported. */
  path: string
  weight?: number
  style?: 'normal' | 'italic'
}

export interface OgImageRemoteFontsOptions {
  /**
   * Addresses of a Google Fonts compatible CSS API (`<endpoint>/css2?family=…&text=…`),
   * tried in order. Defaults to `['https://fonts.googleapis.com']`.
   */
  endpoints?: string[]
  /** Time limit of one request in milliseconds. Defaults to 10000. */
  timeout?: number
}

export interface OgImagePluginOptions {
  /** Absolute address of the site. The site `base` is appended for you. */
  hostname: string
  /** Vue SFC used as the card template, relative to the site root. Defaults to the built-in template. */
  template?: string
  /** Fonts the template uses. A Latin font is built in, and they take precedence over remote fonts. */
  fonts?: OgImageFont[]
  /**
   * Downloads subsets of Noto fonts at build time for the characters no font in
   * `fonts` draws, such as Chinese, Japanese or Korean text. They are cached in
   * `node_modules/.cache`. Defaults to `true`; `false` keeps the build offline.
   */
  remoteFonts?: boolean | OgImageRemoteFontsOptions
  /** Glob patterns, matched against the page `sourcePath`, of pages without a card. */
  exclude?: string[]
}

/** Props the template component receives. */
export interface OgImageTemplateProps {
  title: string
  description: string
  siteTitle: string
  lang: string
  routePath: string
  /** Absolute address of the page, such as `https://example.com/guide/intro`. */
  url: string
  frontmatter: Record<string, unknown>
}
