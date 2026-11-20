import type { MarkdownExit } from 'markdown-exit'
import type { Plugin } from 'vite'
import type { DemoSource } from './source'
import { readFile } from 'node:fs/promises'
import { normalizePath } from 'vite'
import { parseDemoQueryId } from './query'
import { renderDemoSource } from './source'

export interface DemoVitePluginOptions {
  /** The Markdown renderer of the site, which owns the Shiki configuration. */
  getMarkdown: () => MarkdownExit | undefined
}

/**
 * Serves the two generated modules every demo file can be imported as:
 *
 * - `?component-demo-source`: `{ html, code }`, the highlighted source.
 * - `?component-demo-client`: the demo as a component that loads in the browser
 *   only, so a demo that touches `window` never runs during server rendering.
 *
 * Both belong to the demo file, so editing it updates them in the dev server.
 */
export function createComponentDemoVitePlugins(options: DemoVitePluginOptions): Plugin[] {
  return [createLoaderPlugin(options), createHotUpdatePlugin()]
}

function createLoaderPlugin(options: DemoVitePluginOptions): Plugin {
  return {
    name: 'kawapress:vue-component-demo',
    // Before `@vitejs/plugin-vue`, which would otherwise compile a `.vue` id.
    enforce: 'pre',
    resolveId(id) {
      return parseDemoQueryId(id) ? id : undefined
    },
    async load(id) {
      const request = parseDemoQueryId(id)
      if (!request) {
        return undefined
      }

      if (request.kind === 'client') {
        this.addWatchFile(request.file)
        return `import { defineAsyncComponent } from 'vue'
export default import.meta.env.SSR
  ? { render: () => null }
  : defineAsyncComponent(() => import(${JSON.stringify(normalizePath(request.file))}))
`
      }

      const markdown = options.getMarkdown()
      if (!markdown) {
        throw new Error(
          `KawaPress component demo: the Markdown renderer is not ready, so ${request.file} cannot be highlighted.`,
        )
      }
      this.addWatchFile(request.file)
      const source = await renderDemoSource(markdown, await readFile(request.file, 'utf8'))
      return createSourceModule(source)
    },
  }
}

/**
 * `@vitejs/plugin-vue` narrows an update of a `.vue` file to the component
 * itself. The highlighted source belongs to the same file, so it joins the
 * update; it accepts the update by itself and the page is not reloaded.
 */
function createHotUpdatePlugin(): Plugin {
  return {
    name: 'kawapress:vue-component-demo:hot-update',
    enforce: 'post',
    hotUpdate({ file, modules }) {
      const sources = [...this.environment.moduleGraph.getModulesByFile(file) ?? []]
        .filter(module => module.id && parseDemoQueryId(module.id)?.kind === 'source')
        .filter(module => !modules.includes(module))
      return sources.length > 0 ? [...modules, ...sources] : undefined
    },
  }
}

/**
 * In the dev server the source object keeps its identity across updates and is
 * changed in place, so the page that imported it re-renders the demo block
 * instead of being re-executed (which would reset the block and hydrate again).
 */
function createSourceModule(source: DemoSource): string {
  return `import { shallowReactive } from 'vue'
const next = ${JSON.stringify(source)}
const source = import.meta.hot ? (import.meta.hot.data.source ??= shallowReactive({})) : next
if (import.meta.hot) {
  Object.assign(source, next)
  import.meta.hot.accept()
}
export default source
`
}
