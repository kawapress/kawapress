import type { KawaPressPlugin, LocaleConfig } from 'kawapress'
import type { ApiSection } from './api-table'
import type { ComponentApiLabelOptions, ComponentApiLabels, ComponentApiLocaleLanguages } from './labels'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import process from 'node:process'
import { addPageComponent, definePlugin } from 'kawapress'
import { ComponentDocService } from './checker'
import { resolveComponentApiLabels } from './labels'
import { installComponentApi } from './markdown'
import { createComponentDocVitePlugin } from './vite-plugin'

export interface VueComponentMetaPluginOptions extends ComponentApiLabelOptions {
  /** tsconfig used to check the components, relative to the site root. Default: the nearest one above each component. */
  tsconfig?: string
  /** Type names that are not expanded, for example large DOM types. They show only as a type name. */
  ignoreTypes?: string[]
  /** Tag name in Markdown. Default `ComponentApi`. */
  tag?: string
}

export type { ApiSection, ComponentApiLabelOptions, ComponentApiLabels }
export type {
  ComponentDoc,
  EventDoc,
  ExposedDoc,
  PropControl,
  PropControlKind,
  PropDoc,
  SlotDoc,
} from './types'
export { PROP_CONTROL_KINDS } from './types'

const PLUGIN_NAME = '@kawapress/plugin-vue-component-meta'
const DEFAULT_TAG = 'ComponentApi'
const DEFAULT_LOCALE_LANGUAGES: ComponentApiLocaleLanguages = { root: 'en' }
const API_COMPONENT_MODULE = resolveApiComponentModule()

export function vueComponentMetaPlugin(options: VueComponentMetaPluginOptions = {}): KawaPressPlugin {
  let localeLanguages = DEFAULT_LOCALE_LANGUAGES
  let root = process.cwd()
  let srcDir = '.'

  return definePlugin({
    name: PLUGIN_NAME,
    setup(api) {
      api.configResolved((resolved) => {
        localeLanguages = resolveLocaleLanguages(resolved.locales)
        root = resolved.root
        srcDir = resolved.srcDir
      })
      api.vite((viteConfig) => {
        const service = new ComponentDocService({
          get root() {
            return root
          },
          tsconfig: options.tsconfig,
          ignoreTypes: options.ignoreTypes,
          warn: message => console.warn(message),
        })
        viteConfig.plugins = [
          ...(viteConfig.plugins ?? []),
          createComponentDocVitePlugin({ service, apiComponent: API_COMPONENT_MODULE }),
        ]
      })
      api.markdown((markdown) => {
        installComponentApi(markdown, {
          tag: options.tag ?? DEFAULT_TAG,
          sourceRoot: () => resolve(root, srcDir),
          resolveLabels: path => resolveComponentApiLabels(path, localeLanguages, options),
          // A page only imports the table component when it has the tag.
          onApi: (env, component) => addPageComponent(env, component),
        })
      })
    },
  })
}

export default vueComponentMetaPlugin

function resolveLocaleLanguages(
  locales: Record<string, LocaleConfig> | undefined,
): ComponentApiLocaleLanguages {
  return Object.fromEntries(
    Object.entries(locales ?? {}).map(([index, locale]) => [index, locale.lang]),
  )
}

/**
 * Absolute path of the module that default-exports the table component, so
 * Vite resolves it no matter which package the site installed.
 */
function resolveApiComponentModule(): string {
  const specifier = `${PLUGIN_NAME}/api`
  try {
    return createRequire(import.meta.url).resolve(specifier)
  }
  catch {
    return specifier
  }
}
