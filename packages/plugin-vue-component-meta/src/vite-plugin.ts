import type { EnvironmentModuleNode, Plugin } from 'vite'
import type { ComponentDocService } from './checker'
import { normalizePath } from 'vite'
import { API_SECTIONS } from './api-table'

/**
 * Two query imports, both resolved to virtual modules:
 *
 * - `./Button.vue?component-doc` default-exports the `ComponentDoc` JSON.
 * - `./Button.vue?component-api` default-exports a component that renders the
 *   API tables of that file; the Markdown tag imports it into pages.
 *
 * Virtual ids matter: `@vitejs/plugin-vue` would otherwise take any `.vue` id
 * for an SFC and try to compile the generated JSON as one.
 */

const DOC_QUERY = 'component-doc'
const API_QUERY = 'component-api'
const DOC_PREFIX = '\0kawa-component-doc:'
const API_PREFIX = '\0kawa-component-api:'
const SOURCE_RE = /\.(?:vue|[cm]?[jt]sx?)$/

export interface ComponentDocVitePluginOptions {
  service: ComponentDocService
  /** Absolute path of the module that default-exports the table component. */
  apiComponent: string
}

export function createComponentDocVitePlugin(options: ComponentDocVitePluginOptions): Plugin {
  const { service } = options

  return {
    name: 'kawapress:vue-component-meta',
    enforce: 'pre',

    async resolveId(source, importer) {
      const [path, query = ''] = splitQuery(source)
      const params = new URLSearchParams(query)
      const kind = params.has(DOC_QUERY) ? DOC_QUERY : params.has(API_QUERY) ? API_QUERY : undefined
      if (!kind) {
        return null
      }

      const resolved = await this.resolve(path, importer, { skipSelf: true })
      if (!resolved) {
        this.error(`Cannot resolve "${path}" imported with ?${kind}${importer ? ` from ${importer}` : ''}.`)
      }
      const file = normalizePath(splitQuery(resolved.id)[0])
      if (kind === DOC_QUERY) {
        return `${DOC_PREFIX}${file}`
      }
      const only = params.get('only')
      if (only && !API_SECTIONS.includes(only as typeof API_SECTIONS[number])) {
        this.error(`?${API_QUERY}&only=${only} must be one of ${API_SECTIONS.join(', ')}.`)
      }
      return `${API_PREFIX}${only ?? ''}:${file}`
    },

    async load(id) {
      if (id.startsWith(DOC_PREFIX)) {
        const file = id.slice(DOC_PREFIX.length)
        this.addWatchFile(file)
        const doc = await service.getDoc(file)
        return `export default ${JSON.stringify(doc)}`
      }

      if (id.startsWith(API_PREFIX)) {
        const rest = id.slice(API_PREFIX.length)
        const separator = rest.indexOf(':')
        const only = rest.slice(0, separator)
        const file = rest.slice(separator + 1)
        // The page passes the labels; the data comes from the doc module.
        return `
import { h } from 'vue'
import Api from ${JSON.stringify(normalizePath(options.apiComponent))}
import doc from ${JSON.stringify(`${file}?${DOC_QUERY}`)}

export default function KawaComponentApi(props) {
  return h(Api, { ...props, doc${only ? `, only: ${JSON.stringify(only)}` : ''} })
}
`
      }
    },

    hotUpdate: {
      handler({ type, file, modules }) {
        if (!SOURCE_RE.test(file)) {
          return
        }
        if (type === 'update') {
          service.invalidateFile(file)
        }
        else if (type === 'delete') {
          service.deleteFile(file)
          service.reload()
        }
        else {
          service.reload()
        }

        const docs: EnvironmentModuleNode[] = []
        for (const [id, module] of this.environment.moduleGraph.idToModuleMap) {
          if (id.startsWith(DOC_PREFIX)) {
            this.environment.moduleGraph.invalidateModule(module)
            docs.push(module)
          }
        }
        return docs.length > 0 ? [...new Set([...modules, ...docs])] : undefined
      },
    },
  }
}

function splitQuery(id: string): [string, string?] {
  const index = id.indexOf('?')
  return index === -1 ? [id] : [id.slice(0, index), id.slice(index + 1)]
}
