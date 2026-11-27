import type { LocaleConfig } from 'kawapress'
import type { MarkdownPageScope, SitePage } from 'kawapress/generator'
import type { Dirent } from 'node:fs'
import type { HmrContext, ModuleNode, Plugin, ViteDevServer } from 'vite'
import type { SidebarMeta, SidebarMetaEntry, SidebarMetaItem, SidebarPages } from './sidebar'
import type { SidebarPageReader, SidebarPageScope } from './sidebar-pages'
import { readdir, readFile } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, relative, sep } from 'node:path'
import { parseJson, stringifyJson } from 'kawapress'
import { isMarkdownPage, markdownFileToRoutePath } from 'kawapress/generator'
import { createSidebarPageReader } from './sidebar-pages'

export const SIDEBAR_META_MODULE_ID = 'virtual:kawapress-nagi-sidebar-meta'
const RESOLVED_ID = `\0${SIDEBAR_META_MODULE_ID}`
const META_FILE_NAME = '_meta.json'
const IGNORED_DIRECTORIES = new Set(['dist', 'node_modules'])

export interface NagiSidebarMetaPluginOptions {
  /** The site's Markdown files, from `resolveMarkdownPageScope()`. */
  scope: MarkdownPageScope
  /** Every page of the site, Markdown files and plugin pages, from `listSitePages()`. */
  listPages: () => Promise<SitePage[]>
  /** Calls the listener when the set or the source of the site's pages changed, from `onSitePagesChange()`. */
  onPagesChange: (listener: () => void) => () => void
  /** `themeConfig` of the site config; only `sidebar` is read. */
  themeConfig?: object | undefined
  /** `locales` of the site config, which can each declare their own sidebar. */
  locales?: Readonly<Record<string, LocaleConfig>> | undefined
}

export function nagiSidebarMetaPlugin(options: NagiSidebarMetaPluginOptions): Plugin {
  const scope: SidebarPageScope = {
    ...options.scope,
    themeConfig: options.themeConfig,
    locales: options.locales,
  }
  /**
   * Page list of the module as the browser last received it, so editing a page
   * only refreshes the browser when the sidebar would show something else.
   */
  let pages: SidebarPages | undefined
  const pageReader: SidebarPageReader = createSidebarPageReader(() => scope, options.listPages)
  const isPage = (file: string) => isMarkdownPage(file, scope)
  /**
   * The module and the fresh copy that replaces it. Returning them lets Vite
   * re-run the module; a browser that never asked for it needs no update.
   */
  const hotUpdate = (
    context: HmrContext,
    server: ViteDevServer,
  ): ModuleNode[] | undefined => {
    const virtualModule = invalidateModule(server)
    return virtualModule && [...context.modules, virtualModule]
  }

  /**
   * Reads the pages again and replaces the module when the sidebar would show
   * something else. A plugin page whose body changed keeps its HMR update.
   */
  const refreshPages = async (server: ViteDevServer): Promise<void> => {
    const previous = pages
    const next = await pageReader.readAll()
    if (previous !== undefined && JSON.stringify(previous) === JSON.stringify(next)) {
      return
    }
    pages = undefined
    if (invalidateModule(server)) {
      server.hot.send({ type: 'full-reload' })
    }
  }

  return {
    name: 'kawapress:nagi-sidebar-meta',
    resolveId(id) {
      if (id === SIDEBAR_META_MODULE_ID) {
        return RESOLVED_ID
      }
    },
    async load(id) {
      if (id !== RESOLVED_ID) {
        return
      }
      const meta = await loadSidebarMeta(scope.sourceRoot)
      pages = await pageReader.readAll()
      return renderSidebarMetaModule(meta, pages)
    },
    configureServer(server) {
      // A page that is added, removed or comes from a plugin is in no module
      // the browser knows about, so the page list has to report it and the
      // browser has to ask the server for the whole page again.
      const stop = options.onPagesChange(() => {
        refreshPages(server).catch((error: unknown) => {
          server.config.logger.error(`KawaPress nagi: reading the sidebar pages failed: ${String(error)}`)
        })
      })
      server.httpServer?.once('close', stop)
    },
    async handleHotUpdate(context) {
      if (isMetaFile(context.file, scope.sourceRoot)) {
        return hotUpdate(context, context.server)
      }
      if (!isPage(context.file) || !pages) {
        return
      }

      const routePath = markdownFileToRoutePath(context.file, scope.sourceRoot, scope.rewrites)
      if (isSameEntry(pages[routePath], await pageReader.readChanged(context.file))) {
        return
      }

      pages = undefined
      return hotUpdate(context, context.server)
    },
  }
}

function isSameEntry(
  previous: SidebarPages[string] | undefined,
  next: SidebarPages[string] | undefined,
): boolean {
  return previous?.title === next?.title && previous?.layout === next?.layout
}

/**
 * Marks the module stale and returns it when the dev server holds a copy, which
 * is the case as soon as a browser asked for it.
 */
function invalidateModule(server: ViteDevServer): ModuleNode | undefined {
  const virtualModule = server.moduleGraph.getModuleById(RESOLVED_ID)
  if (!virtualModule) {
    return
  }
  server.moduleGraph.invalidateModule(virtualModule)
  return virtualModule
}

function renderSidebarMetaModule(meta: SidebarMeta, pages: SidebarPages): string {
  return [
    `export const sidebarMeta = ${stringifyJson(meta, {
      label: 'nagi sidebar metadata',
      path: 'sidebarMeta',
    })}`,
    `export const sidebarPages = ${stringifyJson(pages, {
      label: 'nagi sidebar pages',
      path: 'sidebarPages',
    })}`,
    '',
  ].join('\n')
}

export async function loadSidebarMeta(sourceRoot: string): Promise<SidebarMeta> {
  const files = await findMetaFiles(sourceRoot)
  const entries = await Promise.all(files.map(async (file) => {
    const value = parseJson<unknown>(await readFile(file, 'utf8'), {
      label: `nagi sidebar metadata at ${JSON.stringify(file)}`,
    })
    return [directoryToRoute(dirname(file), sourceRoot), parseMeta(value, file)]
  }))
  return Object.fromEntries(entries)
}

function parseMeta(value: unknown, file: string): SidebarMetaItem[] {
  if (!Array.isArray(value)) {
    throw metaError(file, 'the root value must be an array')
  }

  const names = new Set<string>()
  return value.map((item, index) => {
    const parsed = parseMetaItem(item, file, index)
    const name = typeof parsed === 'string' ? parsed : parsed.name
    if (names.has(name)) {
      throw metaError(file, `item ${index} duplicates ${JSON.stringify(name)}`)
    }
    names.add(name)
    return parsed
  })
}

function parseMetaItem(
  value: unknown,
  file: string,
  index: number,
): SidebarMetaItem {
  if (typeof value === 'string' && value.length > 0) {
    return value
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw metaError(file, `item ${index} must be a non-empty string or object`)
  }

  const item = value as Record<string, unknown>
  if (item.type !== 'file' && item.type !== 'dir') {
    throw metaError(file, `item ${index}.type must be "file" or "dir"`)
  }
  if (typeof item.name !== 'string' || item.name.length === 0) {
    throw metaError(file, `item ${index}.name must be a non-empty string`)
  }
  if (item.label !== undefined && typeof item.label !== 'string') {
    throw metaError(file, `item ${index}.label must be a string`)
  }
  if (item.collapsed !== undefined && (item.type !== 'dir' || typeof item.collapsed !== 'boolean')) {
    throw metaError(file, `item ${index}.collapsed must be a boolean on a "dir" item`)
  }

  const parsed: SidebarMetaEntry = {
    type: item.type,
    name: item.name,
  }
  if (item.label !== undefined) {
    parsed.label = item.label
  }
  if (item.collapsed !== undefined) {
    parsed.collapsed = item.collapsed
  }
  return parsed
}

async function findMetaFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(entries
    .sort(compareEntries)
    .filter(entry => !shouldIgnore(entry))
    .map(async (entry) => {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) {
        return findMetaFiles(path)
      }
      return entry.isFile() && entry.name === META_FILE_NAME ? [path] : []
    }))
  return files.flat()
}

function directoryToRoute(directory: string, sourceRoot: string): string {
  const path = relative(sourceRoot, directory).split(sep).join('/')
  return path ? `/${path}` : '/'
}

function isMetaFile(file: string, sourceRoot: string): boolean {
  const relativePath = relative(sourceRoot, file)
  return basename(file) === META_FILE_NAME
    && !isAbsolute(relativePath)
    && relativePath !== '..'
    && !relativePath.startsWith(`..${sep}`)
}

function compareEntries(a: Dirent, b: Dirent): number {
  return a.name.localeCompare(b.name)
}

function shouldIgnore(entry: Dirent): boolean {
  return entry.name.startsWith('.')
    || (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name))
}

function metaError(file: string, message: string): TypeError {
  return new TypeError(`KawaPress: invalid nagi sidebar metadata at ${JSON.stringify(file)}; ${message}.`)
}
