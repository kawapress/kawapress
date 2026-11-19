import type { FeedAuthor, FeedFormat, FeedItem } from './types'
import { Feed } from 'feed'

export const FEED_FILES: Readonly<Record<FeedFormat, string>> = {
  rss: 'feed.xml',
  atom: 'atom.xml',
  json: 'feed.json',
}

export const FEED_MIME_TYPES: Readonly<Record<FeedFormat, string>> = {
  rss: 'application/rss+xml',
  atom: 'application/atom+xml',
  json: 'application/feed+json',
}

export interface FeedChannel {
  title: string
  description?: string
  /** BCP 47 language tag of the locale. */
  language?: string
  /** Home page of the locale, absolute. */
  link: string
  copyright?: string
  author?: FeedAuthor
  /** Absolute address of each feed file the channel writes. */
  urls: Readonly<Record<FeedFormat, string>>
}

export function renderFeed(
  format: FeedFormat,
  channel: FeedChannel,
  items: readonly FeedItem[],
): string {
  const latest = items.reduce<Date | undefined>(
    (current, item) => (!current || item.date > current ? item.date : current),
    undefined,
  )
  const feed = new Feed({
    id: channel.link,
    title: channel.title,
    link: channel.link,
    generator: 'KawaPress',
    feedLinks: { rss: channel.urls.rss, atom: channel.urls.atom, json: channel.urls.json },
    ...(channel.description ? { description: channel.description } : {}),
    ...(channel.language ? { language: channel.language } : {}),
    ...(channel.copyright ? { copyright: channel.copyright } : {}),
    ...(channel.author ? { author: channel.author } : {}),
    ...(latest ? { updated: latest } : {}),
  })
  for (const item of items) {
    feed.addItem({
      id: item.id ?? item.link,
      title: item.title,
      link: item.link,
      date: item.date,
      ...(item.description ? { description: item.description } : {}),
      ...(item.image ? { image: item.image } : {}),
      ...(item.authors ? { author: item.authors } : {}),
    })
  }

  switch (format) {
    case 'rss':
      return feed.rss2()
    case 'atom':
      return feed.atom1()
    case 'json':
      return feed.json1()
  }
}
