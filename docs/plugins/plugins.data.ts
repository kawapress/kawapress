import type { PluginCategory } from './plugin-catalog'
import { readFile } from 'node:fs/promises'
import { basename, dirname } from 'node:path'
import { pluginCatalog } from './plugin-catalog'

export interface MarketPlugin {
  name: string
  version: string
  category: PluginCategory
  docs?: string
  description: { zhCN: string, en: string }
  /** The default nagi preset already includes it. */
  inNagi: boolean
}

declare const data: MarketPlugin[]
export { data }

interface PackageManifest {
  name: string
  version: string
  private?: boolean
  dependencies?: Record<string, string>
}

const NAGI_DIRECTORY = 'preset-nagi'

/**
 * The plugin market reads names, versions and nagi membership from the
 * packages themselves, so it never goes stale; only the presentation comes
 * from `plugin-catalog.ts`. A public plugin missing from the catalog, or a
 * catalog entry without a package, fails the build.
 */
export default {
  watch: [
    '../../packages/plugin-*/package.json',
    `../../packages/${NAGI_DIRECTORY}/package.json`,
  ],
  async load(files: string[]): Promise<MarketPlugin[]> {
    const manifests = await Promise.all(files.map(async file => ({
      directory: basename(dirname(file)),
      manifest: JSON.parse(await readFile(file, 'utf8')) as PackageManifest,
    })))

    const nagi = manifests.find(entry => entry.directory === NAGI_DIRECTORY)?.manifest
    if (!nagi) {
      throw new Error(`Plugin market: packages/${NAGI_DIRECTORY}/package.json was not found.`)
    }
    const inNagi = new Set(Object.keys(nagi.dependencies ?? {}))

    const plugins = manifests
      .filter(entry => entry.directory !== NAGI_DIRECTORY && !entry.manifest.private)
      .map(entry => entry.manifest)

    const names = new Set(plugins.map(plugin => plugin.name))
    const missing = [...names].filter(name => !(name in pluginCatalog))
    const unknown = Object.keys(pluginCatalog).filter(name => !names.has(name))
    if (missing.length > 0 || unknown.length > 0) {
      throw new Error([
        'Plugin market: docs/plugins/plugin-catalog.ts is out of date.',
        ...missing.map(name => `  missing entry: ${name}`),
        ...unknown.map(name => `  no such package: ${name}`),
      ].join('\n'))
    }

    return plugins
      .map(plugin => ({
        name: plugin.name,
        version: plugin.version,
        ...pluginCatalog[plugin.name]!,
        inNagi: inNagi.has(plugin.name),
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  },
}
