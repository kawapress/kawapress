import type { KawaPressPlugin, LocaleConfig } from 'kawapress'
import type { VueReplConfig, VueReplEditor } from './fence'
import type { VueReplLabelOptions, VueReplLabels, VueReplLocaleLanguages } from './labels'
import type { ReplImportMap } from './playground'
import { createRequire } from 'node:module'
import { addPageComponent, definePlugin } from 'kawapress'
import { useRuntimeDependencies } from 'kawapress/generator'
import { DEFAULT_REPL_HEIGHT, installVueRepl, parseReplInfo } from './fence'
import { resolveVueReplLabels } from './labels'
import { createPlaygroundUrl } from './playground'

export interface VueReplPluginOptions extends VueReplLabelOptions {
  /** Extra import map, so a component library can put its own package into the REPL. */
  importMap?: ReplImportMap
  /** Extra stylesheets loaded inside the preview iframe, for example a component library's CSS. */
  previewStyles?: string[]
  /** Editor of the REPL. `monaco` is heavier and loads type declarations from a CDN. Default `codemirror`. */
  editor?: VueReplEditor
  /** Load the REPL as soon as the block enters the viewport instead of waiting for Run. Default `false`. */
  eager?: boolean
}

export type { ReplImportMap, VueReplConfig, VueReplEditor, VueReplLabelOptions, VueReplLabels }
export { createPlaygroundUrl, DEFAULT_REPL_HEIGHT, installVueRepl, parseReplInfo }

const PLUGIN_NAME = '@kawapress/plugin-vue-repl'
const COMPONENT_NAME = 'KawaVueRepl'
// Both editors are named: Vite scans every dynamic import, and finding one late
// in the dev server would reload the page in the middle of a click on Run.
const RUNTIME_DEPENDENCIES = ['@vue/repl', '@vue/repl/codemirror-editor', '@vue/repl/monaco-editor']
const DEFAULT_LOCALE_LANGUAGES: VueReplLocaleLanguages = { root: 'en' }
const COMPONENT_MODULE = resolveComponentModule()

export function vueReplPlugin(options: VueReplPluginOptions = {}): KawaPressPlugin {
  let localeLanguages = DEFAULT_LOCALE_LANGUAGES

  const config: VueReplConfig = {
    editor: options.editor ?? 'codemirror',
    eager: options.eager ?? false,
    importMap: options.importMap,
    previewStyles: options.previewStyles,
  }

  return definePlugin({
    name: PLUGIN_NAME,
    setup(api) {
      api.configResolved((resolved) => {
        localeLanguages = resolveLocaleLanguages(resolved.locales)
      })
      api.vite((viteConfig) => {
        useRuntimeDependencies(viteConfig, PLUGIN_NAME, RUNTIME_DEPENDENCIES)
      })
      api.markdown((markdown) => {
        installVueRepl(markdown, {
          config,
          resolveLabels: path => resolveVueReplLabels(path, localeLanguages, options),
          // A page only imports the component when it has a REPL block, so
          // other pages never download it.
          onRepl: env => addPageComponent(env, {
            name: COMPONENT_NAME,
            from: COMPONENT_MODULE,
          }),
        })
      })
    },
  })
}

export default vueReplPlugin

function resolveLocaleLanguages(
  locales: Record<string, LocaleConfig> | undefined,
): VueReplLocaleLanguages {
  return Object.fromEntries(
    Object.entries(locales ?? {}).map(([index, locale]) => [index, locale.lang]),
  )
}

/**
 * Absolute path of the module that default-exports the page component, so Vite
 * resolves it no matter which package the site installed.
 */
function resolveComponentModule(): string {
  const specifier = `${PLUGIN_NAME}/repl`
  try {
    return createRequire(import.meta.url).resolve(specifier)
  }
  catch {
    return specifier
  }
}
