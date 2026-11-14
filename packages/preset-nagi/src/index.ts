import type { CodeBlockPluginOptions } from '@kawapress/plugin-code-block'
import type { LlmsPluginOptions } from '@kawapress/plugin-llms'
import type { SitemapPluginOptions } from '@kawapress/plugin-sitemap'
import type { KawapressConfig } from 'kawapress'
import { badgePlugin } from '@kawapress/plugin-badge'
import { codeBlockPlugin } from '@kawapress/plugin-code-block'
import { codeGroupPlugin } from '@kawapress/plugin-code-group'
import { containerPlugin } from '@kawapress/plugin-container'
import { emojiPlugin } from '@kawapress/plugin-emoji'
import { githubAlertsPlugin } from '@kawapress/plugin-github-alerts'
import { llmsPlugin } from '@kawapress/plugin-llms'
import { searchPlugin } from '@kawapress/plugin-search'
import { shikiPlugin } from '@kawapress/plugin-shiki'
import { sitemapPlugin } from '@kawapress/plugin-sitemap'
import { tocPlugin } from '@kawapress/plugin-toc'
import { unocssPlugin } from '@kawapress/plugin-unocss'
import { definePreset } from 'kawapress'
import { nagiThemePlugin } from './theme-plugin'

export type NagiConfig = KawapressConfig & {
  codeBlock?: CodeBlockPluginOptions
  llms?: LlmsPluginOptions
  /**
   * `false` leaves out the built-in local search, for a site that brings its
   * own, such as `@kawapress/plugin-algolia-search`.
   */
  search?: false
  sitemap?: SitemapPluginOptions
}
export type {
  NagiHomeAction,
  NagiHomeFeature,
  NagiHomeHero,
  NagiHomeImage,
  NagiImageSource,
  NagiThemeableImage,
} from './home'
export { defineLocalizedSidebars } from './sidebar'
export type {
  DefineLocalizedSidebarsOptions,
  LocalizedSidebarItem,
  LocalizedSidebarText,
  NagiSidebarConfig,
  NagiSidebarItem,
  NagiSidebarSection,
} from './sidebar'
export type { NagiSocialIcons, NagiSocialLink, NagiSocialLinkIcon } from './social-links'
export type { NagiNavItem } from './theme-config'

export function nagi(userConfig: NagiConfig = {}): NagiConfig {
  const { codeBlock, llms, search, sitemap, ...siteConfig } = userConfig
  const createConfig = definePreset({
    plugins: [
      nagiThemePlugin(),
      containerPlugin(),
      githubAlertsPlugin(),
      badgePlugin(),
      tocPlugin(),
      emojiPlugin(),
      unocssPlugin(),
      codeBlockPlugin(codeBlock),
      codeGroupPlugin(),
      // The search reads the same callouts as the content plugins above.
      ...(search === false
        ? []
        : [searchPlugin({ containers: true, githubAlerts: true, toc: true })]),
      shikiPlugin({
        twoslash: true,
        themes: {
          light: 'github-light',
          dark: 'github-dark',
        },
      }),
      llmsPlugin(llms),
      sitemapPlugin(sitemap),
    ],
  })

  return createConfig(siteConfig)
}

export default nagi
