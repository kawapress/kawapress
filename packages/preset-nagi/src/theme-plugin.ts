import type { KawaPressPlugin, ResolvedSiteConfig } from 'kawapress'
import { definePlugin } from 'kawapress'
import { resolveMarkdownPageScope, useRuntimeDependencies } from 'kawapress/generator'
import { nagiSidebarMetaPlugin } from './sidebar-meta-plugin'
import { nagiSocialIconsPlugin } from './social-icons-plugin'

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
      api.vite((config) => {
        if (!site)
          throw new Error('nagi: the site config is not resolved yet.')
        config.plugins ??= []
        config.plugins.push(nagiSidebarMetaPlugin({
          scope: resolveMarkdownPageScope(site),
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
