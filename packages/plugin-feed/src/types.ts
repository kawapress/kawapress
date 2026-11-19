import type { MaybePromise } from 'kawapress'

export type FeedFormat = 'rss' | 'atom' | 'json'

export interface FeedAuthor {
  name: string
  email?: string
  link?: string
}

/** One entry of a feed. */
export interface FeedItem {
  title: string
  /** Absolute address of the page, including the site `base`. */
  link: string
  /** Stable identifier. Defaults to `link`. */
  id?: string
  /** Publication date. */
  date: Date
  description?: string
  /** Absolute address of the cover image. */
  image?: string
  authors?: FeedAuthor[]
}

export interface FeedTransformContext {
  /** Key of the locale the items belong to, `root` for the default one. */
  locale: string
}

export interface FeedPluginOptions {
  /**
   * Absolute address of the site, for example `https://example.com`. The site
   * `base` is appended for you.
   */
  hostname: string
  /** Globs relative to `srcDir`. Only matching pages enter the feeds. */
  include: string[]
  exclude?: string[]
  /**
   * Formats to write. Files are always named `feed.xml`, `atom.xml` and `feed.json`.
   * @default ['rss', 'atom', 'json']
   */
  formats?: FeedFormat[]
  /**
   * Maximum number of entries per feed, newest first.
   * @default 20
   */
  limit?: number
  /** Feed title. Defaults to the title of the site or of the locale. */
  title?: string
  /** Feed description. Defaults to the description of the site or of the locale. */
  description?: string
  copyright?: string
  /** Default author. The `author` of a page's frontmatter wins. */
  author?: string | FeedAuthor
  /**
   * Add, remove or change entries before they are written. Returning
   * `undefined` keeps the original array.
   */
  transformItems?: (
    items: FeedItem[],
    context: FeedTransformContext,
  ) => MaybePromise<FeedItem[] | undefined>
}
