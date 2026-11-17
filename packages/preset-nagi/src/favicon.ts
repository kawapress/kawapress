import type { Link } from '@unhead/vue'
import type { HeadConfig } from 'kawapress'
import type { NagiHomeImage, NagiImageSource, NagiThemeableImage } from './home'
import { withBase } from 'kawapress/client'

/**
 * Favicon links generated from `themeConfig.logo`. A site that declares its own
 * icon in the site, locale or page `head` keeps that icon alone, so the logo
 * only acts as the default.
 */
export function resolveFaviconLinks(
  image: NagiHomeImage | undefined,
  base: string,
  heads: readonly (readonly HeadConfig[])[] = [],
): Link[] {
  if (!image || heads.some(declaresIcon)) {
    return []
  }
  if (isThemeableImage(image)) {
    return [{
      id: 'nagi-favicon-light',
      rel: 'icon',
      href: withBase(resolveImageSrc(image.light), base),
      media: '(prefers-color-scheme: light)',
    }, {
      id: 'nagi-favicon-dark',
      rel: 'icon',
      href: withBase(resolveImageSrc(image.dark), base),
      media: '(prefers-color-scheme: dark)',
    }]
  }
  return [{
    id: 'nagi-favicon',
    rel: 'icon',
    href: withBase(resolveImageSrc(image), base),
  }]
}

/** `rel` is a list of keywords, so `shortcut icon` declares an icon as well. */
function declaresIcon(head: readonly HeadConfig[]): boolean {
  return head.some(([tag, attrs]) => (
    tag === 'link'
    && typeof attrs.rel === 'string'
    && attrs.rel.toLowerCase().split(/\s+/).includes('icon')
  ))
}

function isThemeableImage(image: NagiHomeImage): image is NagiThemeableImage {
  return typeof image === 'object' && 'light' in image && 'dark' in image
}

function resolveImageSrc(image: string | NagiImageSource): string {
  return typeof image === 'string' ? image : image.src
}
