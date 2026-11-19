import type { HeadConfig, ResolvedSiteConfig } from 'kawapress'
import type { FeedPageMatcher } from './items'
import type { FeedChannel } from './render'
import type { FeedAuthor, FeedFormat, FeedPluginOptions } from './types'
import { consola } from 'consola'
import { definePlugin, resolveLocaleIndex } from 'kawapress'
import { listMarkdownPages, resolveMarkdownPageScope } from 'kawapress/generator'
import { resolveFeedHostname } from './hostname'
import { createFeedItems, createPageMatcher, sortAndLimit } from './items'
import { FEED_FILES, FEED_MIME_TYPES, renderFeed } from './render'

const ALL_FORMATS: readonly FeedFormat[] = ['rss', 'atom', 'json']
const DEFAULT_LIMIT = 20

export function feedPlugin(options: FeedPluginOptions) {
  const settings = validateOptions(options)
  const { matches } = settings
  let site: ResolvedSiteConfig | undefined
  let hostname = ''
  let localesWithFeed: Promise<Set<string>> | undefined

  const channelOf = (localeKey: string): FeedChannel => {
    const resolved = site!
    const locale = resolved.locales[localeKey]
    const prefix = localeKey === 'root' ? '' : `${localeKey}/`
    const description = options.description ?? locale?.description ?? resolved.description
    return {
      title: options.title ?? locale?.title ?? resolved.title,
      link: new URL(prefix, hostname).href,
      urls: {
        rss: new URL(`${prefix}${FEED_FILES.rss}`, hostname).href,
        atom: new URL(`${prefix}${FEED_FILES.atom}`, hostname).href,
        json: new URL(`${prefix}${FEED_FILES.json}`, hostname).href,
      },
      ...(description ? { description } : {}),
      ...(locale?.lang ? { language: locale.lang } : {}),
      ...(options.copyright ? { copyright: options.copyright } : {}),
      ...(settings.author ? { author: settings.author } : {}),
    }
  }

  /**
   * Locales that get a feed: those with at least one page matching `include`.
   * Autodiscovery links are page head data, written before the build ends, so
   * this decides from paths alone. Such a locale always gets its files, empty
   * when none of its pages has a date, so a discovered link never 404s.
   */
  const findLocalesWithFeed = (): Promise<Set<string>> => {
    localesWithFeed ??= (async () => {
      const resolved = site!
      const localeKeys = Object.keys(resolved.locales)
      const found = new Set<string>()
      const pages = await listMarkdownPages(resolveMarkdownPageScope(resolved))
      await Promise.all(pages.map(async (page) => {
        if (!matches(page.sourcePath)) {
          return
        }
        found.add(resolveLocaleIndex(page.routePath, localeKeys))
      }))
      return found
    })()
    return localesWithFeed
  }

  return definePlugin({
    name: '@kawapress/plugin-feed',
    setup(api) {
      api.configResolved((resolved) => {
        site = resolved
        hostname = resolveFeedHostname(options.hostname, resolved.base)
        localesWithFeed = undefined
      })

      api.pageData(async (pageData) => {
        const localeKey = resolveLocaleIndex(pageData.path, Object.keys(site!.locales))
        if (!(await findLocalesWithFeed()).has(localeKey)) {
          return
        }
        const channel = channelOf(localeKey)
        const links: HeadConfig[] = settings.formats.map(format => ['link', {
          rel: 'alternate',
          type: FEED_MIME_TYPES[format],
          title: channel.title,
          href: channel.urls[format],
        }])
        pageData.head = [...(pageData.head ?? []), ...links]
      })

      api.buildArtifacts(async ({ pages, emitFile }) => {
        consola.start('feed 正在生成中…')
        const { items: groups, undated } = createFeedItems({
          pages,
          locales: site!.locales,
          hostname,
          matches,
          author: settings.author,
        })
        if (undated.length > 0) {
          consola.warn(`feed：以下页面匹配 include，但没有可解析的字符串 date，已跳过：\n${undated.map(route => `  - ${route}`).join('\n')}`)
        }

        const feedLocales = await findLocalesWithFeed()
        if (feedLocales.size === 0) {
          consola.warn('feed：没有任何页面匹配 include，未输出文件。')
          return
        }

        let fileCount = 0
        let itemCount = 0
        for (const localeKey of feedLocales) {
          let items = sortAndLimit(groups.get(localeKey) ?? [], settings.limit)
          items = (await options.transformItems?.(items, { locale: localeKey })) || items
          if (items.length === 0) {
            consola.warn(`feed：${localeKey} 的订阅源没有条目，已输出空订阅源。请检查页面 frontmatter 的 date。`)
          }
          const channel = channelOf(localeKey)
          const prefix = localeKey === 'root' ? '' : `${localeKey}/`
          for (const format of settings.formats) {
            await emitFile(`${prefix}${FEED_FILES[format]}`, renderFeed(format, channel, items))
            fileCount++
          }
          itemCount += items.length
        }

        consola.success(`feed 已生成：共计 ${fileCount} 个文件、${itemCount} 个条目`)
      })
    },
  })
}

interface FeedSettings {
  matches: FeedPageMatcher
  formats: FeedFormat[]
  limit: number
  author: FeedAuthor | undefined
}

function validateOptions(options: FeedPluginOptions): FeedSettings {
  // Checks the shape only; the site `base` is joined once the config is resolved.
  resolveFeedHostname(options?.hostname, '/')

  if (!Array.isArray(options.include) || options.include.length === 0 || options.include.some(pattern => typeof pattern !== 'string')) {
    throw new TypeError('KawaPress Feed: the "include" option must be a non-empty array of globs relative to srcDir, for example ["blog/**/*.md"].')
  }
  const formats = options.formats ?? [...ALL_FORMATS]
  if (formats.length === 0 || formats.some(format => !ALL_FORMATS.includes(format))) {
    throw new TypeError(`KawaPress Feed: "formats" must be a non-empty list of ${ALL_FORMATS.map(format => JSON.stringify(format)).join(', ')}.`)
  }
  const limit = options.limit ?? DEFAULT_LIMIT
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError(`KawaPress Feed: "limit" must be a positive integer, received ${JSON.stringify(options.limit)}.`)
  }
  const author = typeof options.author === 'string' ? { name: options.author } : options.author

  return {
    matches: createPageMatcher(options.include, options.exclude),
    formats: [...new Set(formats)],
    limit,
    author,
  }
}

export default feedPlugin
