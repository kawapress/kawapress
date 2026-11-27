import type { Plugin } from 'vite'
import type { MarkdownPageLoader } from '../../../compiler/page-loader'
import type { SitePageRegistry } from '../../site-pages'
import { readFile } from 'node:fs/promises'
import { rewriteRelativeAssetUrls } from '../../../compiler/asset-urls'
import { assembleVueSfc } from '../../../compiler/markdown'
import { pluginPageSourcePath, resolvePluginPageId } from '../../plugin-pages'

export function markdownPlugin(
  pageLoader: MarkdownPageLoader,
  registry: SitePageRegistry,
): Plugin {
  let root = ''
  return {
    name: 'kawapress:markdown',
    // Claiming a plugin page id first keeps Vite from looking for a file of
    // that name below the site root.
    enforce: 'pre',
    configResolved(config) {
      root = config.root
    },
    resolveId(id) {
      return resolvePluginPageId(id, root)
    },
    async load(id) {
      const [file, query] = id.split('?', 2)
      if (query || !file.endsWith('.md')) {
        return null
      }

      const pluginSourcePath = pluginPageSourcePath(file)
      if (pluginSourcePath !== undefined) {
        return loadPluginPage(pageLoader, registry, pluginSourcePath)
      }

      const source = await readFile(file, 'utf8')
      const { html, env, pageData, dependencies } = await pageLoader.load(
        source,
        pageLoader.resolveFilePage(file),
      )
      // An edit to an included file or a code snippet then updates the page.
      for (const dependency of dependencies) {
        this.addWatchFile(dependency)
      }
      return assembleVueSfc(html, env, pageData)
    },
  }
}

async function loadPluginPage(
  pageLoader: MarkdownPageLoader,
  registry: SitePageRegistry,
  sourcePath: string,
): Promise<string> {
  const page = (await registry.list()).find(candidate => (
    candidate.origin === 'plugin' && candidate.sourcePath === sourcePath
  ))
  if (!page) {
    throw new Error(
      `KawaPress: no plugin adds the page ${JSON.stringify(sourcePath)}. A plugin's pages() may have stopped returning it.`,
    )
  }
  const { html, env, pageData } = await pageLoader.load(await page.readSource(), page)
  // Relative assets of a page made from a file start at that file's directory.
  const template = page.sourceDirectory === undefined
    ? html
    : rewriteRelativeAssetUrls(html, page.sourceDirectory)
  return assembleVueSfc(template, env, pageData)
}
