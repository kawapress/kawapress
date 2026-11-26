import type { KawaPressPlugin, ResolvedSiteConfig } from 'kawapress'
import type { SearchCalloutOptions } from './search-index-plugin'
import { definePlugin } from 'kawapress'
import { listSitePages, onSitePagesChange, resolveMarkdownPageScope } from 'kawapress/generator'
import { searchIndexPlugin } from './search-index-plugin'

export type SearchPluginOptions = SearchCalloutOptions

export function searchPlugin(options: SearchPluginOptions = {}): KawaPressPlugin {
  let site: ResolvedSiteConfig | undefined

  return definePlugin({
    name: '@kawapress/plugin-search',
    setup(api) {
      api.configResolved((resolved) => {
        site = resolved
      })
      api.vite((config) => {
        if (!site)
          throw new Error('KawaPress Search: the site config is not resolved yet.')
        const resolved = site
        config.plugins ??= []
        config.plugins.push(searchIndexPlugin({
          scope: resolveMarkdownPageScope(resolved),
          listPages: () => listSitePages(resolved),
          onPagesChange: listener => onSitePagesChange(resolved, listener),
          locales: Object.keys(resolved.locales),
          localeLanguages: Object.fromEntries(
            Object.entries(resolved.locales).map(([locale, localeConfig]) => (
              [locale, localeConfig.lang]
            )),
          ),
          callouts: options,
        }))
      })
    },
  })
}
