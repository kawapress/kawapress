import type { Plugin } from 'vite'
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { virtualRuntimePluginsPlugin } from './runtime-plugins'

let directory: string

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'kawapress-runtime-plugins-'))
})

afterEach(async () => {
  await rm(directory, { force: true, recursive: true })
})

async function writePackage(path: string, manifest: object): Promise<void> {
  await mkdir(path, { recursive: true })
  await writeFile(join(path, 'package.json'), JSON.stringify(manifest))
}

/**
 * Lays out the site the way pnpm does: the site links `kawapress` from a
 * virtual store, and the preset `kawapress` depends on is a sibling of the real
 * package there. Only the site's own `node_modules` holds the link.
 */
async function createPnpmSite(): Promise<string> {
  const store = join(directory, 'store/node_modules')
  const site = join(directory, 'site')
  await writePackage(join(store, 'kawapress'), { name: 'kawapress' })
  await writePackage(join(store, 'acme-preset'), {
    name: 'acme-preset',
    exports: { './runtime-plugin': './runtime-plugin.js' },
  })
  await mkdir(join(site, 'node_modules'), { recursive: true })
  await symlink(join(store, 'kawapress'), join(site, 'node_modules/kawapress'), 'dir')
  await writeFile(join(site, 'package.json'), JSON.stringify({ name: 'site' }))
  return site
}

async function loadRuntimePlugins(site: string, pluginNames: string[]): Promise<string> {
  const plugin = virtualRuntimePluginsPlugin({ pluginNames }) as Required<Pick<Plugin, 'configResolved' | 'load'>>
  const configResolved = plugin.configResolved as (config: { root: string }) => void
  configResolved({ root: site })
  const load = plugin.load as (this: unknown, id: string) => Promise<string>
  const source = await load.call({
    resolve: async (specifier: string) => ({ id: `resolved:${specifier}` }),
  }, '\0virtual:kawapress-runtime-plugins')
  return source
}

describe('virtualRuntimePluginsPlugin', () => {
  it('finds a plugin package that sits beside the real kawapress package', async () => {
    const site = await createPnpmSite()

    const source = await loadRuntimePlugins(site, ['acme-preset'])

    expect(source).toContain('resolved:acme-preset/runtime-plugin')
  })

  it('skips a plugin package nobody can reach', async () => {
    const site = await createPnpmSite()

    const source = await loadRuntimePlugins(site, ['missing-plugin'])

    expect(source).toBe('export const runtimePlugins = []')
  })
})
