import type { PluginPage, PluginPagesContext } from '../api/plugin'
import type { GeneratorPluginRunner } from '../plugin/generator-runner'
import { markdownPagePathToRoutePath } from '../core/markdown-route'

/**
 * Request id of a plugin page module, `/@kawapress-page/<sourcePath>`. It has
 * no `\0`, so `@vitejs/plugin-vue` accepts it. The module resolves to a path
 * below the site root (see {@link resolvePluginPageId}), where no file exists:
 * the page source comes from the plugin.
 */
const PLUGIN_PAGE_REQUEST_PREFIX = '/@kawapress-page/'

/** A page returned by a plugin's `pages()`, checked and with its route worked out. */
export interface PluginPageRecord {
  /** Name of the plugin that returned the page. */
  plugin: string
  markdown: string
  sourcePath: string
  pagePath: string
  routePath: string
}

/** Id a plugin page is imported and requested by, for example `/@kawapress-page/@typedoc/a.md`. */
export function pluginPageModuleId(sourcePath: string): string {
  return `${PLUGIN_PAGE_REQUEST_PREFIX}${sourcePath}`
}

/**
 * Source path of a plugin page, read from either form of its id: the request
 * id or the resolved id below the site root. `undefined` for any other id.
 */
export function pluginPageSourcePath(id: string): string | undefined {
  const normalized = id.replaceAll('\\', '/')
  const start = normalized.indexOf(PLUGIN_PAGE_REQUEST_PREFIX)
  return start === -1
    ? undefined
    : normalized.slice(start + PLUGIN_PAGE_REQUEST_PREFIX.length)
}

/**
 * The id a plugin page module has in the module graph: a path below the site
 * root, `<root>/@kawapress-page/<sourcePath>`. The client manifest therefore
 * keys the page as `@kawapress-page/<sourcePath>`, root-relative like a file
 * page. Takes the request id or the resolved id; `undefined` for another id.
 */
export function resolvePluginPageId(id: string, root: string): string | undefined {
  const sourcePath = pluginPageSourcePath(id)
  return sourcePath === undefined
    ? undefined
    : `${root.replaceAll('\\', '/').replace(/\/+$/, '')}${PLUGIN_PAGE_REQUEST_PREFIX}${sourcePath}`
}

/**
 * Runs every `pages()` handler once, in plugin order, and checks what they
 * return. Routes against Markdown files are checked by the page list, which
 * knows both sides.
 */
export async function collectPluginPages(
  pluginRunner: GeneratorPluginRunner,
  context: Readonly<PluginPagesContext>,
): Promise<PluginPageRecord[]> {
  const answers = await pluginRunner.collectPages(context)
  const records: PluginPageRecord[] = []
  const bySourcePath = new Map<string, PluginPageRecord>()
  const byRoute = new Map<string, PluginPageRecord>()

  for (const { pluginName, result } of answers) {
    if (!Array.isArray(result)) {
      throw new TypeError(
        `KawaPress: pages() of plugin ${JSON.stringify(pluginName)} must return an array of pages, got ${describe(result)}.`,
      )
    }
    for (const [index, page] of result.entries()) {
      const record = toRecord(pluginName, page, index)
      const sameSource = bySourcePath.get(record.sourcePath)
      if (sameSource) {
        throw new Error(
          `KawaPress: plugins ${JSON.stringify(sameSource.plugin)} and ${JSON.stringify(record.plugin)} both add a page with the sourcePath ${JSON.stringify(record.sourcePath)}. A sourcePath must be unique in a site; start it with the plugin name.`,
        )
      }
      const sameRoute = byRoute.get(record.routePath)
      if (sameRoute) {
        throw new Error(
          `KawaPress: ${describePluginPage(sameRoute)} and ${describePluginPage(record)} both become the route ${JSON.stringify(record.routePath)}.`,
        )
      }
      bySourcePath.set(record.sourcePath, record)
      byRoute.set(record.routePath, record)
      records.push(record)
    }
  }
  return records
}

export function describePluginPage(page: Pick<PluginPageRecord, 'plugin' | 'sourcePath'>): string {
  return `${JSON.stringify(page.sourcePath)} of plugin ${JSON.stringify(page.plugin)}`
}

function toRecord(plugin: string, page: PluginPage, index: number): PluginPageRecord {
  const where = `pages()[${index}] of plugin ${JSON.stringify(plugin)}`
  if (typeof page !== 'object' || page === null) {
    throw new TypeError(`KawaPress: ${where} must be an object with path, markdown and sourcePath, got ${describe(page)}.`)
  }
  const { path, markdown, sourcePath } = page
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) {
    throw new Error(`KawaPress: ${where} must have a path that starts with a single "/", got ${JSON.stringify(path)}.`)
  }
  if (typeof sourcePath !== 'string' || sourcePath.startsWith('/') || !sourcePath.endsWith('.md')) {
    throw new Error(
      `KawaPress: ${where} must have a sourcePath that does not start with "/" and ends with ".md", got ${JSON.stringify(sourcePath)}.`,
    )
  }
  if (typeof markdown !== 'string') {
    throw new TypeError(`KawaPress: ${where} must have a markdown string, got ${describe(markdown)}.`)
  }

  const pagePath = routeToPagePath(path)
  return {
    plugin,
    markdown,
    sourcePath,
    pagePath,
    routePath: markdownPagePathToRoutePath(pagePath),
  }
}

/** `/x/` → `/x/index.md`, `/x/y` → `/x/y.md`. */
function routeToPagePath(path: string): string {
  return path.endsWith('/') ? `${path}index.md` : `${path}.md`
}

function describe(value: unknown): string {
  if (value === null) {
    return 'null'
  }
  return Array.isArray(value) ? 'an array' : typeof value
}
