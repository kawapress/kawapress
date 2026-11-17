import type { UserConfig } from 'vite'
import type { DeadLinkConfig } from '../core/dead-links'
import type { ThemeConfig } from '../core/extension-points'
import type { HeadConfig } from '../core/head'
import type { LocaleConfig, PageRewrites } from '../core/site'
import type { KawaPressPlugin } from './plugin'

export interface KawapressConfig {
  title?: string
  base?: string
  srcDir?: string
  /**
   * Glob patterns, relative to `srcDir`, of Markdown files that are not pages,
   * for example `snippets/**` for a folder of shared parts.
   */
  srcExclude?: string[]
  /**
   * Moves pages to other routes without moving their files, for example
   * `{ 'packages/:pkg/src/:page*': ':pkg/:page*' }`.
   */
  rewrites?: PageRewrites
  publicDir?: string
  head?: HeadConfig[]
  themeConfig?: Partial<ThemeConfig>
  locales?: Record<string, LocaleConfig>
  plugins?: KawaPressPlugin[]
  /** Extra Vite configuration, merged before plugin `vite()` hooks run. */
  vite?: UserConfig
  /** A site-local Runtime Plugin module, relative to the site root. */
  runtimePlugin?: string
  /** Internal link checking. Defaults to `{ level: 'error' }`; `false` disables it. */
  deadLinks?: false | DeadLinkConfig
}

export function defineConfig(config: KawapressConfig): KawapressConfig {
  return config
}

export type KawapressPreset = (config?: KawapressConfig) => KawapressConfig

export function definePreset(presetConfig: KawapressConfig): KawapressPreset {
  return (userConfig = {}) => ({
    ...presetConfig,
    ...userConfig,
    plugins: [
      ...(presetConfig.plugins ?? []),
      ...(userConfig.plugins ?? []),
    ],
  })
}
