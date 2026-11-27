import type { SitePageRegistry } from '../site-pages'
import { pageInputName } from '../../core/page-chunk'

/**
 * One client build input per page of the site, keyed by the entry name and
 * holding the module to build: the absolute path of a Markdown file, or the
 * module id of a plugin page.
 *
 * Pages are inputs of their own instead of being reached through a dynamic
 * import, so each page becomes a chunk with a content hash without Vite writing
 * a preload dependency table for every loader.
 */
export async function createPageInputs(
  registry: SitePageRegistry,
): Promise<Record<string, string>> {
  const pages = await registry.list()
  return Object.fromEntries(
    pages.map(page => [pageInputName(page.routePath), page.file ?? page.moduleId]),
  )
}
