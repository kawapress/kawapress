import type {
  KawaPressPlugin,
  PageBuildArtifact,
  ResolvedSiteConfig,
} from 'kawapress'
import type { MarkdownExit } from 'markdown-exit'
import type { InlineConfig } from 'vite'
import type { SsgMarkdownBundle } from './ssg/render'
import type { LlmsPluginOptions } from './types'
import { rm, rmdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { definePlugin } from 'kawapress'
import { createLlmsArtifacts } from './artifacts'
import { SSG_MD_ENVIRONMENT } from './constants'
import { renderMarkdownPages } from './ssg/render'
import { createSsrResolveInheritancePlugin } from './ssr-resolve'
import {
  createLlmsDevMiddlewarePlugin,
  createSsgMarkdownVitePlugin,
  SSG_MD_ENTRY_ID,
  ssgMarkdownDefine,
} from './vite-plugin'

const SSG_MD_OUTPUT_DIR = 'dist/.kawapress/llms'
const SSG_MD_ENTRY_FILE = 'render.mjs'
const SSG_MD_ENTRY_OUTPUT_PATH = `.kawapress/llms/${SSG_MD_ENTRY_FILE}`

export function llmsPlugin(
  options: LlmsPluginOptions = {},
): KawaPressPlugin {
  let markdown: MarkdownExit | undefined
  const pageArtifacts = new Map<string, PageBuildArtifact>()
  assertNoRemovedOptions(options)
  let site: ResolvedSiteConfig | undefined
  const getSite = (): ResolvedSiteConfig => {
    if (!site)
      throw new Error('KawaPress LLMS: the site config is not resolved yet.')
    return site
  }

  const getPages = (): readonly PageBuildArtifact[] => (
    [...pageArtifacts.values()].sort((left, right) => (
      left.sourcePath.localeCompare(right.sourcePath)
    ))
  )
  const vitePluginOptions = {
    getMarkdown: () => markdown,
    getPages,
    getSite,
    pluginOptions: options,
  }

  return definePlugin({
    name: '@kawapress/plugin-llms',
    setup(api) {
      api.configResolved((config) => {
        site = config
      })
      api.markdown((compiler) => {
        markdown = compiler
      })
      api.pageArtifact((page) => {
        pageArtifacts.set(page.file ?? page.sourcePath, page)
      })
      api.vite((config) => {
        installSsgMarkdownEnvironment(config)
        installSsgMarkdownPlugins(config, vitePluginOptions)
      })
      api.buildArtifacts(async ({ emitFile, importModule }) => {
        const { root } = getSite()
        const outputDirectory = resolve(root, SSG_MD_OUTPUT_DIR)
        try {
          const bundle = await importModule<SsgMarkdownBundle>(
            SSG_MD_ENTRY_OUTPUT_PATH,
          )
          const rendered = await renderMarkdownPages(bundle, getPages())
          const artifacts = await createLlmsArtifacts(rendered, getSite(), options)
          for (const [path, content] of artifacts) {
            await emitFile(path, content)
          }
        }
        finally {
          await rm(outputDirectory, { force: true, recursive: true })
          await removeEmptyDirectory(resolve(root, 'dist/.kawapress'))
        }
      })
    },
  })
}

export default llmsPlugin

function installSsgMarkdownPlugins(
  config: InlineConfig,
  options: Parameters<typeof createSsgMarkdownVitePlugin>[0],
): void {
  config.plugins ??= []
  const markdownIndex = config.plugins.findIndex(plugin => (
    plugin !== null
    && plugin !== false
    && typeof plugin === 'object'
    && !Array.isArray(plugin)
    && 'name' in plugin
    && plugin.name === 'kawapress:markdown'
  ))
  if (markdownIndex < 0) {
    throw new Error('KawaPress LLMS: cannot find the KawaPress Markdown Vite plugin.')
  }
  config.plugins.splice(
    markdownIndex + 1,
    0,
    createSsgMarkdownVitePlugin(options),
  )
  config.plugins.push(
    createLlmsDevMiddlewarePlugin(options),
    createSsrResolveInheritancePlugin(),
  )
}

function installSsgMarkdownEnvironment(config: InlineConfig): void {
  config.define = {
    ...config.define,
    'import.meta.env.SSG_MD': 'false',
  }
  config.environments ??= {}
  if (config.environments[SSG_MD_ENVIRONMENT]) {
    throw new Error(
      `KawaPress LLMS: Vite environment ${JSON.stringify(SSG_MD_ENVIRONMENT)} already exists.`,
    )
  }
  config.environments[SSG_MD_ENVIRONMENT] = {
    consumer: 'server',
    define: ssgMarkdownDefine(),
    build: {
      copyPublicDir: false,
      emptyOutDir: false,
      outDir: SSG_MD_OUTPUT_DIR,
      rollupOptions: {
        input: SSG_MD_ENTRY_ID,
        output: {
          entryFileNames: SSG_MD_ENTRY_FILE,
        },
      },
    },
  }
}

async function removeEmptyDirectory(directory: string): Promise<void> {
  try {
    await rmdir(directory)
  }
  catch (error) {
    if (
      !(error instanceof Error)
      || !('code' in error)
      || (error.code !== 'ENOENT' && error.code !== 'ENOTEMPTY')
    ) {
      throw error
    }
  }
}

/** `description` moved to the site and locale config in 0.8. */
function assertNoRemovedOptions(options: LlmsPluginOptions): void {
  if ('description' in options) {
    throw new Error(
      'KawaPress LLMS: `llms.description` was removed. Set `description` on the site config '
      + 'or on `locales.<key>`; llms.txt uses the same summary as the page description meta.',
    )
  }
}
