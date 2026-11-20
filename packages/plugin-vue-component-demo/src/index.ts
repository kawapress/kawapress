import type { KawaPressPlugin, LocaleConfig } from 'kawapress'
import type { MarkdownExit } from 'markdown-exit'
import type { UserConfig } from 'vite'
import type { ComponentDemoLabelOptions, ComponentDemoLabels, ComponentDemoLocaleLanguages } from './labels'
import type { ViteAlias } from './resolve'
import type { DemoSource } from './source'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import process from 'node:process'
import { definePlugin } from 'kawapress'
import { DEFAULT_TAG, META_VITE_PLUGIN_NAME, PLUGIN_NAME } from './constants'
import { resolveComponentDemoLabels } from './labels'
import { installComponentDemo } from './markdown'
import { createComponentDemoVitePlugins } from './vite-plugin'

export interface VueComponentDemoPluginOptions extends ComponentDemoLabelOptions {
  /** Tag name used in Markdown. Default `ComponentDemo`. */
  tag?: string
  /** Show the source expanded instead of collapsed. Default `false`. */
  expandSource?: boolean
}

export type { ComponentDemoLabelOptions, ComponentDemoLabels, DemoSource }
export { installComponentDemo }

const TAG_RE = /^[A-Z][\w-]*$/i
const DEFAULT_LOCALE_LANGUAGES: ComponentDemoLocaleLanguages = { root: 'en' }
const COMPONENT_MODULE = resolveComponentModule('demo')
const PLAYGROUND_MODULE = resolveComponentModule('playground')
const PROPS_TABLE_MODULE = resolveComponentModule('props-table')

export function vueComponentDemoPlugin(
  options: VueComponentDemoPluginOptions = {},
): KawaPressPlugin {
  const tag = options.tag ?? DEFAULT_TAG
  if (!TAG_RE.test(tag)) {
    throw new Error(
      `${PLUGIN_NAME}: the tag option ${JSON.stringify(tag)} is not a valid tag name. Use letters, digits, "_" and "-", starting with a letter.`,
    )
  }

  let localeLanguages = DEFAULT_LOCALE_LANGUAGES
  let root = process.cwd()
  let srcDir = '.'
  let viteConfig: UserConfig = {}
  let markdown: MarkdownExit | undefined

  return definePlugin({
    name: PLUGIN_NAME,
    setup(api) {
      api.configResolved((resolved) => {
        localeLanguages = resolveLocaleLanguages(resolved.locales)
        root = resolved.root
        srcDir = resolved.srcDir
      })
      api.vite((config) => {
        viteConfig = config
        config.plugins ??= []
        config.plugins.push(...createComponentDemoVitePlugins({ getMarkdown: () => markdown }))
      })
      api.markdown((instance) => {
        markdown = instance
        installComponentDemo(instance, {
          tag,
          expandSource: options.expandSource ?? false,
          resolveLabels: path => resolveComponentDemoLabels(path, localeLanguages, options),
          // The alias list is read per tag: other plugins may still edit it
          // after this one has seen the config.
          getSite: () => ({
            root: resolve(root),
            srcDir,
            alias: viteConfig.resolve?.alias as ViteAlias,
          }),
          componentModule: COMPONENT_MODULE,
          playgroundModule: PLAYGROUND_MODULE,
          propsTableModule: PROPS_TABLE_MODULE,
          // Read per tag too: the meta plugin may add its Vite plugin after this one ran.
          hasMeta: () => hasVitePlugin(viteConfig, META_VITE_PLUGIN_NAME),
        })
      })
    },
  })
}

export default vueComponentDemoPlugin

function hasVitePlugin(config: UserConfig, name: string): boolean {
  const walk = (plugins: unknown): boolean => (
    Array.isArray(plugins)
      ? plugins.some(walk)
      : typeof plugins === 'object' && plugins !== null && (plugins as { name?: unknown }).name === name
  )
  return walk(config.plugins)
}

function resolveLocaleLanguages(
  locales: Record<string, LocaleConfig> | undefined,
): ComponentDemoLocaleLanguages {
  return Object.fromEntries(
    Object.entries(locales ?? {}).map(([index, locale]) => [index, locale.lang]),
  )
}

/**
 * Absolute path of the module that default-exports the page component, so Vite
 * resolves it no matter which package the site installed.
 */
function resolveComponentModule(entry: string): string {
  const specifier = `${PLUGIN_NAME}/${entry}`
  try {
    return createRequire(import.meta.url).resolve(specifier)
  }
  catch {
    return specifier
  }
}
