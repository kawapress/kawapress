import { XMLParser } from 'fast-xml-parser'
import { describe, expect, it } from 'vitest'
import { renderFeed } from './render'

const channel = {
  title: 'Blog',
  description: 'Posts',
  language: 'en',
  link: 'https://example.com/docs/',
  copyright: '© Example',
  urls: {
    rss: 'https://example.com/docs/feed.xml',
    atom: 'https://example.com/docs/atom.xml',
    json: 'https://example.com/docs/feed.json',
  },
}
const items = [
  {
    title: 'Hello',
    link: 'https://example.com/docs/blog/hello',
    date: new Date('2026-01-02T00:00:00Z'),
    description: 'First <post> & more',
    image: 'https://example.com/docs/a.png',
    authors: [{ name: 'Ann', email: 'ann@example.com' }],
  },
]
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })

describe('renderFeed', () => {
  it('writes a parsable RSS 2.0 document', () => {
    const { rss } = parser.parse(renderFeed('rss', channel, items))
    expect(rss['@_version']).toBe('2.0')
    expect(rss.channel).toMatchObject({
      title: 'Blog',
      link: 'https://example.com/docs/',
      description: 'Posts',
      language: 'en',
      copyright: '© Example',
    })
    expect(rss.channel['atom:link']['@_href']).toBe('https://example.com/docs/feed.xml')
    expect(rss.channel.item).toMatchObject({
      title: 'Hello',
      link: 'https://example.com/docs/blog/hello',
      description: 'First <post> & more',
      author: 'ann@example.com (Ann)',
    })
    expect(rss.channel.item.pubDate).toBe('Fri, 02 Jan 2026 00:00:00 GMT')
    expect(rss.channel.item.enclosure['@_url']).toBe('https://example.com/docs/a.png')
  })

  it('writes a parsable Atom document', () => {
    const { feed } = parser.parse(renderFeed('atom', channel, items))
    expect(feed).toMatchObject({ id: 'https://example.com/docs/', title: 'Blog', subtitle: 'Posts', rights: '© Example' })
    expect(feed.updated).toBe('2026-01-02T00:00:00.000Z')
    expect(feed.entry).toMatchObject({
      title: { '#text': 'Hello' },
      id: 'https://example.com/docs/blog/hello',
      updated: '2026-01-02T00:00:00.000Z',
      author: { name: 'Ann', email: 'ann@example.com' },
    })
    expect(JSON.stringify(feed.link)).toContain('https://example.com/docs/atom.xml')
  })

  it('writes a JSON Feed document', () => {
    const json = JSON.parse(renderFeed('json', channel, items))
    expect(json).toMatchObject({
      version: 'https://jsonfeed.org/version/1',
      title: 'Blog',
      home_page_url: 'https://example.com/docs/',
      feed_url: 'https://example.com/docs/feed.json',
    })
    expect(json.items[0]).toMatchObject({
      id: 'https://example.com/docs/blog/hello',
      url: 'https://example.com/docs/blog/hello',
      title: 'Hello',
      image: 'https://example.com/docs/a.png',
      date_modified: '2026-01-02T00:00:00.000Z',
    })
  })
})
