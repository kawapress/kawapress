import type { KawaPressPlugin, SiteConfig } from 'kawapress'
import { definePlugin } from 'kawapress'
import { useRuntimeDependencies } from 'kawapress/generator'
import { nagiSidebarMetaPlugin } from './sidebar-meta-plugin'
import { nagiSocialIconsPlugin } from './social-icons-plugin'

const PLUGIN_NAME = '@kawapress/preset-nagi'
const RUNTIME_DEPENDENCIES = ['overlayscrollbars']

export function nagiThemePlugin(): KawaPressPlugin {
  let siteConfig: SiteConfig | undefined

  return definePlugin({
    name: PLUGIN_NAME,
    setup(api) {
      api.config((config) => {
        siteConfig = config
      })
      api.vite((config) => {
        config.plugins ??= []
        config.plugins.push(nagiSidebarMetaPlugin({
          srcDir: siteConfig?.srcDir ?? '.',
          srcExclude: siteConfig?.srcExclude,
          rewrites: siteConfig?.rewrites,
          themeConfig: siteConfig?.themeConfig,
          locales: siteConfig?.locales,
        }))
        config.plugins.push(nagiSocialIconsPlugin({
          themeConfig: siteConfig?.themeConfig,
          locales: siteConfig?.locales,
        }))
        useRuntimeDependencies(config, PLUGIN_NAME, RUNTIME_DEPENDENCIES)
      })
    },
  })
}
