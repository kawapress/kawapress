import type { PageOrigin } from '../api/plugin'
import type { PageRewrites } from '../core/site'
import type { GeneratorPluginRunner } from '../plugin/generator-runner'
import type { LinkRegistry } from './link-registry'
import type { ParsedMarkdown } from './markdown'
import type { ExpandedMarkdownSource } from './markdown-source'
import { resolve } from 'node:path'
import { markdownPagePathToRoutePath } from '../core/markdown-route'
import { assertPageDataSerializable } from '../core/site'
import { createLinkRegistry } from './link-registry'
import { createMarkdownCompiler, parseMarkdown } from './markdown'
import { expandMarkdownSource } from './markdown-source'
import { markdownFileToSourcePath, resolvePagePathRewriter } from './page-path'

interface CachedPage {
  source: string
  parsed: Promise<LoadedMarkdownPage>
}

export interface LoadedMarkdownPage extends ParsedMarkdown {
  /** Files the page reads through `<!--@include-->` and `<<<`, as absolute paths. */
  dependencies: string[]
}

/** Which page a source is compiled as; the loader derives nothing from the source itself. */
export interface PageLoadTarget {
  origin: PageOrigin
  /** Absolute path of the Markdown file. Missing for a plugin page. */
  file?: string
  sourcePath: string
  pagePath: string
  routePath: string
}

export interface MarkdownPageLoader {
  sourceRoot: string
  /** Glob patterns, relative to `sourceRoot`, of Markdown files that are not pages. */
  srcExclude: readonly string[]
  /** `rewrites` of the site config, which moves pages to other routes. */
  rewrites: PageRewrites | undefined
  /** Links and heading IDs of every page loaded so far. */
  registry: LinkRegistry
  /** The page a Markdown file is: its source path and route follow from its location and `rewrites`. */
  resolveFilePage: (file: string) => PageLoadTarget
  /**
   * Compiles `source`, the page's text as written. A file page expands
   * `<!--@include-->` and `<<<`; a plugin page is compiled as it is.
   */
  load: (source: string, page: PageLoadTarget) => Promise<LoadedMarkdownPage>
}

export interface MarkdownPageLoaderOptions {
  root: string
  base: string
  srcDir: string
  srcExclude?: readonly string[]
  rewrites?: PageRewrites | undefined
  pluginRunner: GeneratorPluginRunner
}

export function createMarkdownPageLoader(
  options: MarkdownPageLoaderOptions,
): MarkdownPageLoader {
  const sourceRoot = resolve(options.root, options.srcDir)
  const registry = createLinkRegistry()
  const mdPromise = createMarkdownCompiler({
    base: options.base,
    pluginRunner: options.pluginRunner,
  })
  const cache = new Map<string, CachedPage>()
  const rewrite = resolvePagePathRewriter(options.rewrites)

  return {
    sourceRoot,
    srcExclude: options.srcExclude ?? [],
    rewrites: options.rewrites,
    registry,
    resolveFilePage(file) {
      const sourcePath = markdownFileToSourcePath(file, sourceRoot)
      const pagePath = rewrite(sourcePath)
      return {
        origin: 'file',
        file,
        sourcePath,
        pagePath,
        routePath: markdownPagePathToRoutePath(pagePath),
      }
    },
    load(rawSource, page) {
      // Expanding first makes an edit to an included file a new page source,
      // so the cache can never return a page built from an older include.
      let expanded: Omit<ExpandedMarkdownSource, 'lineOrigins'> & { lineOrigins?: number[] }
      try {
        expanded = page.file === undefined
          ? { source: rawSource, dependencies: [] }
          : expandMarkdownSource(rawSource, { file: page.file, sourceRoot })
      }
      catch (error) {
        return Promise.reject(error)
      }
      const { source, dependencies, lineOrigins } = expanded
      const cached = cache.get(page.sourcePath)
      if (cached?.source === source) {
        return cached.parsed
      }

      const parsed = mdPromise.then(async (md) => {
        const { file, sourcePath, pagePath, routePath, origin } = page
        // Relative links start from where the page is served, so a page moved
        // by rewrites links as if its file were at the new path.
        const result = await parseMarkdown(
          md,
          source,
          routePath,
          pagePath,
          lineOrigins,
        )
        registry.set({
          route: routePath,
          source: sourcePath,
          headings: result.env.headings ?? [],
          links: result.env.links ?? [],
        })
        assertPageDataSerializable(result.pageData)
        await options.pluginRunner.runPageData(result.pageData, {
          origin,
          ...(file === undefined ? {} : { file }),
          sourcePath,
        })
        assertPageDataSerializable(result.pageData)
        await options.pluginRunner.runPageArtifact({
          source,
          origin,
          ...(file === undefined ? {} : { file }),
          sourcePath,
          pagePath,
          routePath,
          pageData: result.pageData,
        })
        return { ...result, dependencies }
      })
      cache.set(page.sourcePath, { source, parsed })
      return parsed
    },
  }
}
