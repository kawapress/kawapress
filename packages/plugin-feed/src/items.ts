import type { LocaleConfig, PageBuildArtifact } from 'kawapress'
import type { FeedAuthor, FeedItem } from './types'
import { resolveLocaleIndex } from 'kawapress'
import picomatch from 'picomatch'
import { extractExcerpt } from './excerpt'

const LEADING_SLASHES_RE = /^\/+/
const EXTERNAL_URL_RE = /^(?:[a-z][a-z\d+.-]*:)?\/\//i

export type FeedPageMatcher = (sourcePath: string) => boolean

/** Matches a page source path such as `/blog/hello.md` against globs relative to `srcDir`. */
export function createPageMatcher(
  include: readonly string[],
  exclude: readonly string[] = [],
): FeedPageMatcher {
  const isIncluded = picomatch([...include], { dot: true })
  const isExcluded = exclude.length > 0 ? picomatch([...exclude], { dot: true }) : () => false
  return (sourcePath) => {
    const path = sourcePath.replace(LEADING_SLASHES_RE, '')
    return isIncluded(path) && !isExcluded(path)
  }
}

export interface CreateFeedItemsOptions {
  pages: readonly PageBuildArtifact[]
  locales: Readonly<Record<string, LocaleConfig>>
  /** Site address with the `base` already joined, ending in `/`. */
  hostname: string
  matches: FeedPageMatcher
  author?: FeedAuthor
}

export interface FeedItemGroups {
  /** Items per locale key, in page order and not yet sorted or limited. */
  items: Map<string, FeedItem[]>
  /** Routes of matching pages that were left out for lack of a usable `date`. */
  undated: string[]
}

export function createFeedItems(options: CreateFeedItemsOptions): FeedItemGroups {
  const localeKeys = Object.keys(options.locales)
  const items = new Map<string, FeedItem[]>()
  const undated: string[] = []

  for (const page of options.pages) {
    const { frontmatter } = page.pageData
    if (frontmatter.feed === false || !options.matches(page.sourcePath)) {
      continue
    }
    const date = parseDate(frontmatter.date)
    if (!date) {
      undated.push(page.routePath)
      continue
    }

    const link = toAbsoluteUrl(page.routePath, options.hostname)
    const description = page.pageData.description?.trim() || extractExcerpt(page.source)
    const authors = resolveAuthors(frontmatter.author, options.author)
    const image = typeof frontmatter.image === 'string' && frontmatter.image
      ? resolveImage(frontmatter.image, link, options.hostname)
      : undefined
    const item: FeedItem = {
      title: page.pageData.title,
      link,
      date,
      ...(description ? { description } : {}),
      ...(image ? { image } : {}),
      ...(authors.length > 0 ? { authors } : {}),
    }

    const localeKey = resolveLocaleIndex(page.routePath, localeKeys)
    const group = items.get(localeKey) ?? []
    group.push(item)
    items.set(localeKey, group)
  }

  return { items, undated }
}

/** Newest first; entries of the same instant keep their page order. */
export function sortAndLimit(items: readonly FeedItem[], limit: number): FeedItem[] {
  return [...items]
    .sort((left, right) => right.date.getTime() - left.date.getTime())
    .slice(0, limit)
}

/** Only strings count: YAML dates are rejected by Core before they reach a plugin. */
export function parseDate(value: unknown): Date | undefined {
  if (typeof value !== 'string' || value.trim() === '') {
    return undefined
  }
  const time = Date.parse(value)
  return Number.isNaN(time) ? undefined : new Date(time)
}

function resolveAuthors(value: unknown, fallback: FeedAuthor | undefined): FeedAuthor[] {
  if (typeof value === 'string' && value.trim()) {
    return [{ name: value.trim() }]
  }
  if (value && typeof value === 'object' && typeof (value as FeedAuthor).name === 'string') {
    const { name, email, link } = value as FeedAuthor
    return [{
      name,
      ...(typeof email === 'string' ? { email } : {}),
      ...(typeof link === 'string' ? { link } : {}),
    }]
  }
  return fallback ? [fallback] : []
}

/**
 * Resolves `url` against the site address. A site path such as `/a.png`
 * lives under the site `base`, so it is joined to `hostname` rather than to
 * its origin. Relative paths start from the page.
 */
function resolveImage(image: string, pageUrl: string, hostname: string): string {
  if (EXTERNAL_URL_RE.test(image)) {
    return new URL(image, hostname).href
  }
  if (image.startsWith('/')) {
    return new URL(image.replace(LEADING_SLASHES_RE, ''), hostname).href
  }
  return new URL(image, pageUrl).href
}

/** Non-ASCII segments are encoded one by one, as in the sitemap. */
export function toAbsoluteUrl(routePath: string, hostname: string): string {
  const path = routePath.replace(LEADING_SLASHES_RE, '')
  return new URL(path.split('/').map(segment => encodeURIComponent(segment)).join('/'), hostname).href
}
