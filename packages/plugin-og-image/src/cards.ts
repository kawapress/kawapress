import type { LoadedFonts } from './fonts'
import type { CardCache } from './render'
import type { OgImageTemplateProps } from './types'
import { cacheKey, inlineLocalImages, renderPng, stripComments } from './render'

/** What the Vue template environment exports: it renders the template to an HTML string. */
export interface TemplateBundle {
  render: (props: OgImageTemplateProps) => Promise<string>
}

export interface CardContext {
  bundle: TemplateBundle
  fonts: LoadedFonts
  cache: CardCache
  /** Folders a template image such as `/logo.png` is looked up in, in order. */
  imageDirectories: readonly string[]
}

export interface Card {
  png: Uint8Array
  cached: boolean
  /** Characters of the page text that no font draws. */
  missingCharacters: string[]
}

export async function renderCard(
  props: OgImageTemplateProps,
  context: CardContext,
): Promise<Card> {
  const rendered = await context.bundle.render(props)
  const html = await inlineLocalImages(stripComments(rendered), context.imageDirectories)
  const missingCharacters = context.fonts.findMissingCharacters(
    `${props.title}${props.description}${props.siteTitle}`,
  )

  const key = cacheKey(html, context.fonts.digest)
  const hit = await context.cache.get(key)
  if (hit) {
    return { png: hit, cached: true, missingCharacters }
  }
  const png = await renderPng(html, context.fonts)
  await context.cache.set(key, png)
  return { png, cached: false, missingCharacters }
}

const LISTED_PAGES = 8

export function formatMissingGlyphWarning(pages: ReadonlyMap<string, string[]>): string {
  const lines = [...pages].slice(0, LISTED_PAGES).map(
    ([route, characters]) => `  ${route}  ${characters.slice(0, 12).join('')}${characters.length > 12 ? '…' : ''}`,
  )
  if (pages.size > LISTED_PAGES) {
    lines.push(`  …and ${pages.size - LISTED_PAGES} more`)
  }
  return [
    `KawaPress OG Image: ${pages.size} page${pages.size === 1 ? '' : 's'} use characters that no font has a glyph for. They are drawn as blank boxes.`,
    ...lines,
    'Add a font that covers them with the "fonts" option.',
  ].join('\n')
}
