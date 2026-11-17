import type { UserConfig } from 'vite'
import type { DeadLinkConfig } from '../core/dead-links'
import type { ThemeConfig } from '../core/extension-points'
import type { HeadConfig } from '../core/head'
import type { LocaleConfig, PageRewrites } from '../core/site'
import type { KawaPressPlugin } from './plugin'

export interface KawapressConfig {
  title?: string
  /**
   * `<meta name="description">` of pages that set no `description` in
   * frontmatter. A locale's own `description` takes precedence.
   */
  description?: string
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
    plugins: mergePresetPlugins(
      presetConfig.plugins ?? [],
      userConfig.plugins ?? [],
    ),
  })
}

/**
 * A user plugin with the same `name` as a preset plugin takes its place, so it
 * runs where the preset put it; every other user plugin runs after the preset's.
 */
function mergePresetPlugins(
  presetPlugins: readonly KawaPressPlugin[],
  userPlugins: readonly KawaPressPlugin[],
): KawaPressPlugin[] {
  const presetNames = new Set(presetPlugins.map(plugin => plugin.name))
  const replacements = new Map<string, KawaPressPlugin>()
  const appended: KawaPressPlugin[] = []
  for (const plugin of userPlugins) {
    // A second plugin of the same name stays in the list, so the plugin runner
    // reports the duplicate instead of one of them silently disappearing.
    if (presetNames.has(plugin.name) && !replacements.has(plugin.name))
      replacements.set(plugin.name, plugin)
    else
      appended.push(plugin)
  }
  return [
    ...presetPlugins.map(plugin => replacements.get(plugin.name) ?? plugin),
    ...appended,
  ]
}
