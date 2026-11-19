import type { KawaPressPlugin } from 'kawapress'
import type { AnalyticsPluginOptions } from './options'
import process from 'node:process'
import { definePlugin } from 'kawapress'
import { createAnalyticsHead } from './head'
import { resolveAnalyticsOptions } from './options'
import { analyticsOptionsPlugin } from './vite-plugin'

export const ANALYTICS_PLUGIN_NAME = '@kawapress/plugin-analytics'

/**
 * Whether this process was started by `kawapress build`.
 *
 * The public plugin API does not tell `config()` which command is running
 * (Vite's `command` only exists after the site head is frozen), so the CLI
 * arguments decide. A program that calls the build in-process gets no scripts,
 * which is the safe side for analytics.
 */
export function isBuildCommand(argv: readonly string[] = process.argv): boolean {
  return argv.slice(2).includes('build')
}

/**
 * Adds web analytics scripts to the site `<head>` and, for Google, reports a
 * page view for every in-site navigation.
 */
export function analyticsPlugin(options: AnalyticsPluginOptions): KawaPressPlugin {
  const resolved = resolveAnalyticsOptions(options)

  return definePlugin({
    name: ANALYTICS_PLUGIN_NAME,
    setup(api) {
      api.config((config) => {
        if (!resolved.dev && !isBuildCommand()) {
          return
        }
        config.head = [...(config.head ?? []), ...createAnalyticsHead(resolved)]
      })

      api.vite((config) => {
        config.plugins ??= []
        config.plugins.push(analyticsOptionsPlugin({ google: resolved.google !== undefined }))
      })
    },
  })
}

export default analyticsPlugin

export type {
  AnalyticsPluginOptions,
  CloudflareAnalyticsOptions,
  GoogleAnalyticsOptions,
  PlausibleOptions,
  ResolvedAnalyticsOptions,
  UmamiOptions,
} from './options'
