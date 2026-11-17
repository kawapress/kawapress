import type { InlineConfig } from 'vite'
import process from 'node:process'
import { consola } from 'consola'
import { createBuilder } from 'vite'
import { PAGE_CHUNK_FILE_PATTERN } from '../core/page-chunk'
import { loadSiteConfig } from '../generator/load-config'
import { appChunkGroup } from '../generator/vite/app-chunk'
import {
  createBaseViteConfig,
  createSitePageLoader,
} from '../generator/vite/config'
import { entryClientPath, entryServerPath, SERVER_ENTRY_FILE, SERVER_OUT_DIR } from '../generator/vite/entries'
import { createPageInputs } from '../generator/vite/page-inputs'
import { createResolutionCheck, formatResolutionWarning } from '../generator/vite/plugins/resolution-check'
import {
  createBuildArtifactEmitter,
  createBuildArtifactImporter,
} from './build-artifacts'
import {
  ensureProductionNodeEnv,
  warnAboutReplacedNodeEnv,
} from './build-node-env'
import { checkDeadLinks } from './check-dead-links'
import { prerenderPages } from './prerender'

/** Vite mode of a build; the mode drives `import.meta.env` and which `.env.*` files load. */
const BUILD_MODE = 'production'

/**
 * Vue's compile-time flag that keeps the detailed hydration mismatch warnings
 * in a production build. Off by default because it adds the warning code to
 * every visitor's download.
 */
const HYDRATION_MISMATCH_DETAILS_FLAG = '__VUE_PROD_HYDRATION_MISMATCH_DETAILS__'

const DEBUG_HYDRATION_NOTICE = 'KawaPress: this build keeps Vue\'s hydration mismatch details (--debug-hydration). '
  + 'Rebuild without the flag before deploying.'

export interface BuildSiteOptions {
  /**
   * Keep Vue's detailed hydration mismatch warnings in the production bundle,
   * so `kawapress preview` shows which node differs. Meant for diagnosis, not
   * for deployment.
   */
  debugHydration?: boolean
}

export async function buildSite(root: string, options: BuildSiteOptions = {}) {
  // Pinned before the site config loads, because loading it through Vite's
  // runnerImport() would otherwise leave NODE_ENV at "development" for the
  // client build. See ensureProductionNodeEnv().
  warnAboutReplacedNodeEnv(ensureProductionNodeEnv(process.env))
  const siteConfig = await loadSiteConfig(root)
  const pageLoader = createSitePageLoader(root, siteConfig)
  const pageInputs = await createPageInputs(pageLoader, siteConfig.publicDir)
  const viteConfig: InlineConfig = {
    ...createBaseViteConfig(root, siteConfig, { pageLoader }),
    mode: BUILD_MODE,
    environments: {
      client: {
        build: {
          outDir: 'dist',
          manifest: true,
          rolldownOptions: {
            // Every Markdown page is an input of its own, so each page becomes a
            // chunk with a content hash and no loader needs a dynamic `import()`
            // that Vite would answer with a preload dependency table.
            input: { 'entry-client': entryClientPath, ...pageInputs },
            // A page chunk keeps its own exports: the page table imports it and
            // reads the default component out of it.
            preserveEntrySignatures: 'allow-extension',
            output: {
              // Pinned so a page chunk name is predictable from its route; the
              // page table stores the content hash alone. Prerendering verifies
              // the names the bundle reports against this layout.
              entryFileNames: PAGE_CHUNK_FILE_PATTERN,
              codeSplitting: {
                groups: [
                  // `$initial` would treat page-only code as app code as well,
                  // because page entries are initial entries too.
                  { name: appChunkGroup(entryClientPath), test: () => true },
                ],
              },
            },
          },
        },
      },
      ssr: {
        consumer: 'server',
        build: {
          outDir: SERVER_OUT_DIR,
          rolldownOptions: {
            input: entryServerPath,
            output: { entryFileNames: SERVER_ENTRY_FILE },
          },
        },
      },
    },
  }
  await siteConfig.pluginRunner.runVite(viteConfig)
  // Appended after the plugin `vite` hooks, which may replace the plugin list.
  const resolutionCheck = createResolutionCheck()
  viteConfig.plugins = [...(viteConfig.plugins ?? []), resolutionCheck.plugin]
  if (options.debugHydration) {
    // Set after the site config and plugin hooks, so the flag wins over a
    // `define` that turns the details off.
    viteConfig.define = { ...viteConfig.define, [HYDRATION_MISMATCH_DETAILS_FLAG]: 'true' }
    consola.warn(DEBUG_HYDRATION_NOTICE)
  }

  // Plugin `vite` hooks mutate the config above, so the build states its mode again
  // rather than trusting whatever they left in it.
  const builder = await createBuilder({ ...viteConfig, mode: BUILD_MODE })
  await builder.buildApp()
  const resolutionWarning = formatResolutionWarning(resolutionCheck.findMismatches())
  if (resolutionWarning) {
    consola.warn(resolutionWarning)
  }
  await checkDeadLinks({ root, siteConfig, pageLoader })
  await siteConfig.pluginRunner.runBuildArtifacts({
    emitFile: createBuildArtifactEmitter(root),
    importModule: createBuildArtifactImporter(root),
  })
  await prerenderPages(root)

  consola.success('KawaPress: build complete')
  if (options.debugHydration) {
    // Repeated so the last thing on screen says this output is not for deployment.
    consola.warn(DEBUG_HYDRATION_NOTICE)
  }
}
