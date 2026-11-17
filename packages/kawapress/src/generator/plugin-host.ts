import type { KawapressConfig } from '../api/config'
import type { ResolvedSiteConfig } from '../core/site'
import type { GeneratorPluginRunner } from '../plugin/generator-runner'
import type { ResolveSiteConfigOptions } from './config'
import { resolveSiteConfig } from './config'

/** Plugins set up on a resolved site, ready to run their remaining hooks. */
export interface GeneratorPluginHost extends Omit<
  GeneratorPluginRunner,
  'runConfig' | 'runConfigResolved'
> {
  site: ResolvedSiteConfig
}

/**
 * Sets up the plugins of a site config the way `kawapress build` does: runs
 * each plugin's `setup()`, `config()` and `configResolved()` with KawaPress's
 * own defaults and checks. Plugin tests and tools drive the other hooks
 * through the returned host instead of imitating the plugin API.
 */
export async function setupGeneratorPlugins(
  config: KawapressConfig,
  options: ResolveSiteConfigOptions = {},
): Promise<GeneratorPluginHost> {
  const {
    plugins: _plugins,
    vite: _vite,
    runtimePlugin: _runtimePlugin,
    deadLinks: _deadLinks,
    pluginRunner,
    ...site
  } = await resolveSiteConfig(config, options)
  const { runConfig: _runConfig, runConfigResolved: _runConfigResolved, ...hooks } = pluginRunner
  return { site, ...hooks }
}
