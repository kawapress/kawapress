import type { LocaleConfig } from 'kawapress'
import type { MarkdownPageScope, SitePage } from 'kawapress/generator'
import type { NagiSidebarConfig, SidebarPage, SidebarPages } from './sidebar'
import { resolveLocaleIndex } from 'kawapress'
import {
  createPageSummaryReader,
  markdownFileToRoutePath,
  readMarkdownSource,
} from 'kawapress/generator'
import { isDocumentPage, resolveConfiguredSidebar } from './sidebar'

/** Where the Markdown files of the site are and which pages a hand-written sidebar shows. */
export interface SidebarPageScope extends MarkdownPageScope {
  /** Site `themeConfig`, as the site config declares it; only `sidebar` is read. */
  themeConfig?: object | undefined
  /** Site locales, whose `themeConfig` can replace the site sidebar. */
  locales?: Record<string, LocaleConfig> | undefined
}

export interface SidebarPageReader {
  /** Every page the automatic sidebar shows, keyed by route path. */
  readAll: () => Promise<SidebarPages>
  /** The entry `readAll` gives for one Markdown file, read from disk. Plugin pages have no file. */
  readChanged: (file: string) => Promise<SidebarPage | undefined>
}

/**
 * Reads what the automatic sidebar needs from the page sources: the title, the
 * layout, and whether a hand-written sidebar covers the route. Reading a page
 * never renders it, so no `pageData()` handler and no Markdown plugin runs.
 */
export function createSidebarPageReader(
  getScope: () => SidebarPageScope,
  listPages: () => Promise<SitePage[]>,
): SidebarPageReader {
  const summaryReader = createPageSummaryReader()

  function readPage(
    scope: SidebarPageScope,
    routePath: string,
    cacheKey: string,
    source: string,
  ): SidebarPage | undefined {
    if (isCoveredByConfiguredSidebar(scope, routePath)) {
      return
    }

    const { title, layout } = summaryReader.read(source, cacheKey)
    if (!isDocumentPage({ title, layout })) {
      return
    }
    // Only the two fields the sidebar reads, so a richer summary costs nothing.
    return layout === undefined ? { title } : { title, layout }
  }

  return {
    async readAll() {
      const scope = getScope()
      const pages = await listPages()
      const entries = await Promise.all(pages.map(async (page) => {
        const entry = readPage(scope, page.routePath, page.file ?? page.sourcePath, await page.readSource())
        return entry === undefined ? [] : [[page.routePath, entry] as [string, SidebarPage]]
      }))
      return Object.fromEntries(entries.flat())
    },
    async readChanged(file) {
      const scope = getScope()
      const routePath = markdownFileToRoutePath(file, scope.sourceRoot, scope.rewrites)
      return readPage(scope, routePath, file, readMarkdownSource({ file, sourceRoot: scope.sourceRoot }).source)
    },
  }
}

/**
 * Whether a hand-written `themeConfig.sidebar` shows this route. Core merges
 * the site themeConfig with the one of the route's locale, the locale winning
 * key by key, so that merged sidebar is the one that decides.
 */
function isCoveredByConfiguredSidebar(
  scope: SidebarPageScope,
  routePath: string,
): boolean {
  const sidebar = resolveSidebar(scope, routePath)
  return resolveConfiguredSidebar(sidebar, routePath) !== undefined
}

function resolveSidebar(
  scope: SidebarPageScope,
  routePath: string,
): NagiSidebarConfig | undefined {
  const locales = scope.locales ?? {}
  const locale = locales[resolveLocaleIndex(routePath, Object.keys(locales))]
  const themeConfig = {
    ...(scope.themeConfig ?? {}),
    ...(locale?.themeConfig ?? {}),
  } as { sidebar?: NagiSidebarConfig }
  return themeConfig.sidebar
}
