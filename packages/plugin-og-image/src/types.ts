export interface OgImageFont {
  /** Font family name. Templates refer to it with `font-family`. */
  name: string
  /** Path of a TTF, OTF or WOFF file, relative to the site root. WOFF2 is not supported. */
  path: string
  weight?: number
  style?: 'normal' | 'italic'
}

export interface OgImagePluginOptions {
  /** Absolute address of the site. The site `base` is appended for you. */
  hostname: string
  /** Vue SFC used as the card template, relative to the site root. Defaults to the built-in template. */
  template?: string
  /** Fonts the template uses. A Latin font is built in; add one for CJK text. */
  fonts?: OgImageFont[]
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
  frontmatter: Record<string, unknown>
}
