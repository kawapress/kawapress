import type { LoadedFonts } from './fonts'
import type { CardCache } from './render'
import type { OgImageTemplateProps } from './types'
import { cacheKey, inlineLocalImages, renderPng, stripComments, textContent } from './render'

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
  /** Why downloading a font failed. Such a card is not cached, so the next build tries again. */
  remoteFontErrors: string[]
}

export async function renderCard(
  props: OgImageTemplateProps,
  context: CardContext,
): Promise<Card> {
  const rendered = await context.bundle.render(props)
  const html = await inlineLocalImages(stripComments(rendered), context.imageDirectories)
  const { fonts } = context
  const text = textContent(html)
  const localMissing = fonts.findMissingCharacters(text)
  const { remote } = fonts

  const key = cacheKey(html, fonts.digest)
  const hit = await context.cache.get(key)
  if (hit) {
    // Only cards whose downloads all succeeded are cached, so a remote font drew what it covers.
    const missingCharacters = remote ? localMissing.filter(char => !remote.covers(char)) : localMissing
    return { png: hit, cached: true, missingCharacters, remoteFontErrors: [] }
  }

  const downloaded = remote && localMissing.length > 0
    ? await remote.fontsFor(localMissing, props.lang)
    : { fonts: [], errors: [] }
  const png = await renderPng(html, [...fonts.fonts, ...downloaded.fonts])
  if (downloaded.errors.length === 0) {
    await context.cache.set(key, png)
  }
  return {
    png,
    cached: false,
    missingCharacters: fonts.findMissingCharacters(text, downloaded.fonts),
    remoteFontErrors: downloaded.errors,
  }
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

export function formatRemoteFontWarning(errors: ReadonlySet<string>): string {
  return [
    'KawaPress OG Image: some fonts could not be downloaded, so their characters are drawn as blank boxes. The cards are not cached and the next build tries again.',
    ...[...errors].slice(0, LISTED_PAGES).map(error => `  ${error}`),
    'Set "remoteFonts.endpoints" to a reachable mirror of the Google Fonts CSS API, or provide font files with the "fonts" option.',
  ].join('\n')
}
