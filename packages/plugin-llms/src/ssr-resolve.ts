import type { Plugin, UserConfig } from 'vite'
import { SSG_MD_ENVIRONMENT } from './constants'

/**
 * Gives the Markdown render environment the module resolution of the SSR
 * build. Vite copies the top-level `ssr` options into the `ssr` environment
 * only, while the Markdown environment renders the same app. Without them it
 * would leave Vue external whenever the site can resolve `@vue/server-renderer`
 * itself, and Node would load a second copy of Vue next to the bundled one.
 *
 * The hook runs last so it sees what every plugin added to `ssr`.
 */
export function createSsrResolveInheritancePlugin(): Plugin {
  return {
    name: 'kawapress:llms-ssr-resolve',
    config: {
      order: 'post',
      handler(config) {
        inheritSsrResolve(config)
      },
    },
  }
}

export function inheritSsrResolve(config: UserConfig): void {
  const environment = config.environments?.[SSG_MD_ENVIRONMENT]
  if (!environment || !config.ssr) {
    return
  }
  const { external, noExternal, resolve } = config.ssr
  environment.resolve = {
    ...(external === undefined ? {} : { external }),
    ...(noExternal === undefined ? {} : { noExternal }),
    ...(resolve?.conditions === undefined ? {} : { conditions: resolve.conditions }),
    ...(resolve?.externalConditions === undefined ? {} : { externalConditions: resolve.externalConditions }),
    ...(resolve?.mainFields === undefined ? {} : { mainFields: resolve.mainFields }),
    ...environment.resolve,
  }
}
