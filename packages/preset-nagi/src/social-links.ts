/** Icon of a social link: a Simple Icons name such as `github`, or raw SVG markup. */
export type NagiSocialLinkIcon = string | { svg: string }

/** One icon link in the navigation bar, written as in VitePress. */
export interface NagiSocialLink {
  icon: NagiSocialLinkIcon
  link: string
  /** Accessible name of the link. Defaults to the icon name. */
  ariaLabel?: string
}

/** SVG markup of every named icon the site uses, keyed by icon name. */
export type NagiSocialIcons = Readonly<Record<string, string>>

/** Name the link is announced with when it has no `ariaLabel`. */
export function socialLinkLabel(link: NagiSocialLink): string {
  return link.ariaLabel ?? (typeof link.icon === 'string' ? link.icon : '')
}

/** SVG markup of the icon of a link, or `undefined` for an unknown name. */
export function socialLinkSvg(link: NagiSocialLink, icons: NagiSocialIcons): string | undefined {
  return typeof link.icon === 'string' ? icons[link.icon] : link.icon.svg
}
