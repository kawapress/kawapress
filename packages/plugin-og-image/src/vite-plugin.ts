import type { Plugin, UserConfig } from 'vite'
import { normalizePath } from 'vite'
import {
  OG_IMAGE_ENTRY_FILE,
  OG_IMAGE_ENTRY_ID,
  OG_IMAGE_ENVIRONMENT,
  OG_IMAGE_OUTPUT_DIR,
} from './constants'

const RESOLVED_ENTRY_ID = `\0${OG_IMAGE_ENTRY_ID}`

/**
 * Adds a Vite environment that bundles the card template with Vue's server
 * renderer into one module. The build writes it next to the site output, and
 * `importModule()` loads it, so the template is compiled by the same Vue
 * pipeline as the site itself.
 */
export function installOgImageEnvironment(config: UserConfig): void {
  config.environments ??= {}
  if (config.environments[OG_IMAGE_ENVIRONMENT]) {
    throw new Error(`KawaPress OG Image: Vite environment ${JSON.stringify(OG_IMAGE_ENVIRONMENT)} already exists.`)
  }
  config.environments[OG_IMAGE_ENVIRONMENT] = {
    consumer: 'server',
    build: {
      copyPublicDir: false,
      emptyOutDir: false,
      outDir: OG_IMAGE_OUTPUT_DIR,
      rollupOptions: {
        input: OG_IMAGE_ENTRY_ID,
        output: { entryFileNames: OG_IMAGE_ENTRY_FILE },
      },
    },
  }
}

export function createOgImageVitePlugin(options: {
  templateFile: string
  onResolved: (command: 'build' | 'serve') => void
}): Plugin {
  return {
    name: 'kawapress:og-image',
    configResolved(config) {
      options.onResolved(config.command)
    },
    configEnvironment(name, _config, { command }) {
      // The build bundles Vue with the template, so the module loaded from `dist`
      // has one copy of Vue whatever the site can resolve from there. The dev
      // runner cannot inline Vue's CommonJS files and loads Vue from node_modules.
      if (name === OG_IMAGE_ENVIRONMENT && command === 'build') {
        return { resolve: { noExternal: true, dedupe: ['vue'] } }
      }
    },
    applyToEnvironment(environment) {
      return environment.name === OG_IMAGE_ENVIRONMENT
    },
    resolveId(id) {
      if (id === OG_IMAGE_ENTRY_ID) {
        return RESOLVED_ENTRY_ID
      }
    },
    load(id) {
      if (id === RESOLVED_ENTRY_ID) {
        return `
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import Template from ${JSON.stringify(normalizePath(options.templateFile))}

export async function render(props) {
  return renderToString(createSSRApp(Template, props))
}
`
      }
    },
  }
}
