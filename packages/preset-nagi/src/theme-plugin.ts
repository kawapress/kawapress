import type { KawaPressPlugin, ResolvedSiteConfig } from 'kawapress'
import { definePlugin } from 'kawapress'
import { listSitePages, onSitePagesChange, resolveMarkdownPageScope, useRuntimeDependencies } from 'kawapress/generator'
import { nagiSidebarMetaPlugin } from './sidebar-meta-plugin'
import { nagiSocialIconsPlugin } from './social-icons-plugin'
import { installTableWrapper } from './tables'

const PLUGIN_NAME = '@kawapress/preset-nagi'
const RUNTIME_DEPENDENCIES = ['overlayscrollbars']

export function nagiThemePlugin(): KawaPressPlugin {
  let site: ResolvedSiteConfig | undefined

  return definePlugin({
    name: PLUGIN_NAME,
    setup(api) {
      api.configResolved((resolved) => {
        site = resolved
      })
      api.markdown(installTableWrapper)
      api.vite((config) => {
        if (!site)
          throw new Error('nagi: the site config is not resolved yet.')
        const resolved = site
        config.plugins ??= []
        config.plugins.push(nagiSidebarMetaPlugin({
          scope: resolveMarkdownPageScope(site),
          listPages: () => listSitePages(resolved),
          onPagesChange: listener => onSitePagesChange(resolved, listener),
          themeConfig: site.themeConfig,
          locales: site.locales,
        }))
        config.plugins.push(nagiSocialIconsPlugin({
          themeConfig: site.themeConfig,
          locales: site.locales,
        }))
        useRuntimeDependencies(config, PLUGIN_NAME, RUNTIME_DEPENDENCIES)
      })
    },
  })
}
