export interface NagiImageSource {
  src: string
  alt?: string
}

export interface NagiThemeableImage {
  light: string | NagiImageSource
  dark: string | NagiImageSource
  alt?: string
}

export type NagiHomeImage
  = string | NagiImageSource | NagiThemeableImage

export interface NagiHomeAction {
  text: string
  link: string
  theme?: 'brand' | 'alt'
  target?: string
  rel?: string
}

export interface NagiHomeHero {
  name?: string
  /** A newline in the text starts a new line, so a long title breaks where the author wants. */
  text?: string
  /** Newlines start new lines, as in `text`. */
  tagline?: string
  image?: NagiHomeImage
  actions?: NagiHomeAction[]
}

export interface NagiHomeFeature {
  icon?: string
  title: string
  details: string
  link?: string
  linkText?: string
  target?: string
  rel?: string
}

export function isExternalLink(link: string): boolean {
  return /^(?:[a-z][a-z\d+.-]*:)?\/\//i.test(link)
}
