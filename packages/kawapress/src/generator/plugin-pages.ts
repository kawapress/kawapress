/**
 * Request id of a plugin page module, `/@kawapress-page/<sourcePath>`. It has
 * no `\0`, so `@vitejs/plugin-vue` accepts it. The module resolves to a path
 * below the site root (see {@link resolvePluginPageId}), where no file exists:
 * the page source comes from the plugin.
 */
const PLUGIN_PAGE_REQUEST_PREFIX = '/@kawapress-page/'

/** A page of a plugin's `pages()` group, checked and with its route worked out. */
export interface PluginPageRecord {
  /** Name of the plugin that registered the group. */
  plugin: string
  /** Route template of the group, for example `/packages/[name]`. */
  template: string
  /** Markdown with the frontmatter the plugin gave merged in. */
  markdown: string
  /** Directory of the source file of a file-template page; relative assets start there. */
  sourceDirectory?: string
  /** `<plugin name><pagePath>`, for example `@typedoc/core/define-plugin.md`. */
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

/** Names a `pages()` call in error messages. */
export function describePageGroup(plugin: string, template: string): string {
  return `pages(${JSON.stringify(template)}) of plugin ${JSON.stringify(plugin)}`
}

/** `/x/` becomes `/x/index.md`, `/x/y` becomes `/x/y.md`. */
export function routeToPagePath(route: string): string {
  return route.endsWith('/') ? `${route}index.md` : `${route}.md`
}

/** Source path the core generates for a plugin page: `<plugin name><pagePath>`. */
export function generatePluginSourcePath(plugin: string, pagePath: string): string {
  return `${plugin}${pagePath}`
}

/**
 * Throws when two pages of plugins end up on one route, naming the group
 * that produced each.
 */
export function assertUniquePluginRoutes(records: readonly PluginPageRecord[]): void {
  const byRoute = new Map<string, PluginPageRecord>()
  for (const record of records) {
    const first = byRoute.get(record.routePath)
    if (first) {
      const [one, other] = [describePageGroup(first.plugin, first.template), describePageGroup(record.plugin, record.template)]
      throw new Error(
        one === other
          ? `KawaPress: ${one} produces the route ${JSON.stringify(record.routePath)} more than once.`
          : `KawaPress: ${one} and ${other} both produce the route ${JSON.stringify(record.routePath)}.`,
      )
    }
    byRoute.set(record.routePath, record)
  }
}
