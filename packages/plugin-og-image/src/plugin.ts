import type { KawaPressPlugin, ResolvedSiteConfig } from 'kawapress'
import type { DevEnvironment } from 'vite'
import type { CardContext, TemplateBundle } from './cards'
import type { LoadedFonts } from './fonts'
import type { OgImagePluginOptions, OgImageTemplateProps } from './types'
import { Buffer } from 'node:buffer'
import { existsSync } from 'node:fs'
import { rm, rmdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { consola } from 'consola'
import { definePlugin, resolveLocaleIndex } from 'kawapress'
import picomatch from 'picomatch'
import { isRunnableDevEnvironment } from 'vite'
import { formatMissingGlyphWarning, renderCard } from './cards'
import {
  OG_IMAGE_DEV_PREFIX,
  OG_IMAGE_ENTRY_ID,
  OG_IMAGE_ENTRY_OUTPUT_PATH,
  OG_IMAGE_ENVIRONMENT,
  OG_IMAGE_OUTPUT_DIR,
  OG_IMAGE_PLUGIN_NAME,
} from './constants'
import { loadFonts } from './fonts'
import { createOgImageHead, hasOgImage, imageUrl, resolveHostname, routeToImagePath } from './head'
import { createCardCache } from './render'
import { createOgImageVitePlugin, installOgImageEnvironment } from './vite-plugin'

const BUILT_IN_TEMPLATE = fileURLToPath(new URL('./template/OgTemplate.vue', import.meta.url))
const CACHE_DIRECTORY = 'node_modules/.cache/kawapress-og-image'
const DEFAULT_LANG = 'en'

export function ogImagePlugin(options: OgImagePluginOptions): KawaPressPlugin {
  if (!options || typeof options.hostname !== 'string' || !options.hostname) {
    throw new TypeError('KawaPress OG Image: the "hostname" option is required, because og:image must be an absolute URL.')
  }
  const isExcluded = createExcludeMatcher(options.exclude)

  let site: ResolvedSiteConfig | undefined
  let hostname = ''
  let templateFile = BUILT_IN_TEMPLATE
  let command: 'build' | 'serve' = 'build'
  /** Pages that get a card, by source path. */
  const cardPages = new Set<string>()
  /** Dev preview data, by route. */
  const devProps = new Map<string, OgImageTemplateProps>()
  let fonts: Promise<LoadedFonts> | undefined

  const getSite = (): ResolvedSiteConfig => {
    if (!site) {
      throw new Error('KawaPress OG Image: the site config is not resolved yet.')
    }
    return site
  }
  const getFonts = (): Promise<LoadedFonts> => {
    fonts ??= loadFonts(getSite().root, options.fonts)
    return fonts
  }
  const createContext = async (bundle: TemplateBundle): Promise<CardContext> => {
    const { root, srcDir, publicDir } = getSite()
    return {
      bundle,
      fonts: await getFonts(),
      cache: createCardCache(join(root, CACHE_DIRECTORY)),
      imageDirectories: [resolve(root, srcDir, publicDir), root],
    }
  }
  const createProps = (
    routePath: string,
    pageData: { title: string, description?: string, frontmatter: Record<string, unknown> },
  ): OgImageTemplateProps => {
    const { title, description, locales } = getSite()
    const locale = locales[resolveLocaleIndex(routePath, Object.keys(locales))]
    return {
      title: pageData.title,
      description: pageData.description ?? locale?.description ?? description ?? '',
      siteTitle: locale?.title ?? title,
      lang: locale?.lang ?? DEFAULT_LANG,
      routePath,
      frontmatter: pageData.frontmatter,
    }
  }

  return definePlugin({
    name: OG_IMAGE_PLUGIN_NAME,
    setup(api) {
      api.configResolved((config) => {
        site = config
        hostname = resolveHostname(options.hostname, config.base)
        if (options.template) {
          templateFile = resolve(config.root, options.template)
          if (!existsSync(templateFile)) {
            throw new Error(`KawaPress OG Image: template ${JSON.stringify(options.template)} does not exist.`)
          }
        }
      })

      api.pageData((pageData, { sourcePath }) => {
        if (command === 'serve') {
          devProps.set(pageData.path, createProps(pageData.path, pageData))
          return
        }
        if (pageData.frontmatter.ogImage === false || isExcluded(sourcePath)) {
          return
        }
        // A tag the author wrote wins, and then the page needs no generated card.
        const { head, locales } = getSite()
        const locale = locales[resolveLocaleIndex(pageData.path, Object.keys(locales))]
        if (hasOgImage(head, locale?.head, pageData.head)) {
          return
        }

        cardPages.add(sourcePath)
        pageData.head = [
          ...(pageData.head ?? []),
          ...createOgImageHead(imageUrl(hostname, routeToImagePath(pageData.path))),
        ]
      })

      api.vite((config) => {
        installOgImageEnvironment(config)
        config.plugins ??= []
        config.plugins.push(
          createOgImageVitePlugin({
            get templateFile() {
              return templateFile
            },
            onResolved(resolvedCommand) {
              command = resolvedCommand
            },
          }),
          {
            name: 'kawapress:og-image-dev-preview',
            apply: 'serve',
            configureServer(server) {
              server.middlewares.use((request, response, next) => {
                const route = requestedRoute(request.url, server.config.base)
                if (route === undefined) {
                  next()
                  return
                }
                void serveDevCard(server.environments[OG_IMAGE_ENVIRONMENT], route, response).catch((error) => {
                  response.statusCode = 500
                  response.setHeader('Content-Type', 'text/plain; charset=utf-8')
                  response.end(error instanceof Error ? error.stack : String(error))
                })
              })
            },
          },
        )
      })

      api.buildArtifacts(async ({ pages, emitFile, importModule }) => {
        const { root } = getSite()
        const targets = pages.filter(page => cardPages.has(page.sourcePath))
        try {
          if (targets.length === 0) {
            return
          }
          consola.start(`og-image: rendering ${targets.length} card${targets.length === 1 ? '' : 's'}…`)
          const started = performance.now()
          const bundle = await importModule<TemplateBundle>(OG_IMAGE_ENTRY_OUTPUT_PATH)
          const context = await createContext(bundle)

          const missing = new Map<string, string[]>()
          let reused = 0
          for (const page of targets) {
            const card = await renderCard(createProps(page.routePath, page.pageData), context)
            if (card.cached) {
              reused++
            }
            if (card.missingCharacters.length > 0) {
              missing.set(page.routePath, card.missingCharacters)
            }
            await emitFile(routeToImagePath(page.routePath), card.png)
          }
          if (missing.size > 0) {
            consola.warn(formatMissingGlyphWarning(missing))
          }
          const seconds = ((performance.now() - started) / 1000).toFixed(1)
          consola.success(`og-image: ${targets.length} card${targets.length === 1 ? '' : 's'} ready in ${seconds}s (${reused} from cache)`)
        }
        finally {
          await rm(resolve(root, OG_IMAGE_OUTPUT_DIR), { force: true, recursive: true })
          await rmdirIfEmpty(resolve(root, 'dist/.kawapress'))
        }
      })
    },
  })

  async function serveDevCard(
    environment: DevEnvironment | undefined,
    route: string,
    response: import('node:http').ServerResponse,
  ): Promise<void> {
    if (!environment || !isRunnableDevEnvironment(environment)) {
      throw new Error('KawaPress OG Image: the template environment is not runnable.')
    }
    const props = devProps.get(route) ?? devProps.get(`${route}/`)
    if (!props) {
      response.statusCode = 404
      response.setHeader('Content-Type', 'text/plain; charset=utf-8')
      response.end(`KawaPress OG Image: no page data for ${route} yet. Open the page once in the dev server, then reload this address.`)
      return
    }
    const bundle = await environment.runner.import(OG_IMAGE_ENTRY_ID) as TemplateBundle
    const card = await renderCard(props, await createContext(bundle))
    if (card.missingCharacters.length > 0) {
      consola.warn(`KawaPress OG Image: ${route} uses characters no font draws: ${card.missingCharacters.join('')}`)
    }
    response.statusCode = 200
    response.setHeader('Cache-Control', 'no-store')
    response.setHeader('Content-Type', 'image/png')
    response.end(Buffer.from(card.png))
  }
}

export default ogImagePlugin

function createExcludeMatcher(patterns: readonly string[] | undefined): (sourcePath: string) => boolean {
  if (!patterns || patterns.length === 0) {
    return () => false
  }
  const matches = picomatch([...patterns], { dot: true })
  // `sourcePath` starts with `/`; patterns may be written with or without it.
  return sourcePath => matches(sourcePath) || matches(sourcePath.replace(/^\/+/, ''))
}

/** `/__og-image/guide/intro.png` is the preview of the route `/guide/intro`. */
function requestedRoute(url: string | undefined, base: string): string | undefined {
  if (!url) {
    return undefined
  }
  let pathname: string
  try {
    pathname = decodeURIComponent(url.split('?')[0])
  }
  catch {
    return undefined
  }
  const prefix = `${base}${OG_IMAGE_DEV_PREFIX}/`
  if (!pathname.startsWith(prefix) || !pathname.endsWith('.png')) {
    return undefined
  }
  const route = pathname.slice(prefix.length, -'.png'.length)
  return route === 'index' ? '/' : `/${route}`
}

async function rmdirIfEmpty(directory: string): Promise<void> {
  try {
    await rmdir(directory)
  }
  catch {
    // Not empty or already gone.
  }
}
