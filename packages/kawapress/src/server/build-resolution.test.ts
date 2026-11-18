import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const run = promisify(execFile)

const kawapressPackageDirectory = fileURLToPath(new URL('../..', import.meta.url))
const kawapressBin = join(kawapressPackageDirectory, 'bin/kawapress.mjs')

/** First line of the warning, present only when the check found a package. */
const WARNING_MARKER = 'the client and SSR builds load different files'

/** What the astryx-vue docs set: the client reads a component library's sources. */
const CLIENT_SOURCE_CONDITIONS = `resolve: { conditions: ['source', 'module', 'browser', 'development|production'] },`

const HOME_PAGE = `---
title: Home
---

<script setup>
import { build } from 'source-lib'
import { button } from 'source-lib/button'
import { platform } from 'platform-lib'
import { field } from 'browser-field-lib'
</script>

# Resolution Test

{{ build }} {{ button }} {{ platform }} {{ field }}
`

/** Files of a package, keyed by their path inside it. */
type PackageFiles = Record<string, string>

/**
 * Ships its sources through a `source` condition next to the prebuilt files,
 * the way a workspace component library does.
 */
const SOURCE_LIB: PackageFiles = {
  'package.json': JSON.stringify({
    name: 'source-lib',
    type: 'module',
    exports: {
      '.': { source: './src/index.js', import: './dist/index.js' },
      './button': { source: './src/button.js', import: './dist/button.js' },
    },
  }),
  'src/index.js': `export const build = 'source'\n`,
  'dist/index.js': `export const build = 'dist'\n`,
  'src/button.js': `export const button = 'source button'\n`,
  'dist/button.js': `export const button = 'dist button'\n`,
}

/** Ships a browser build next to its default one on purpose, like `@floating-ui/dom`. */
const PLATFORM_LIB: PackageFiles = {
  'package.json': JSON.stringify({
    name: 'platform-lib',
    type: 'module',
    exports: {
      '.': { browser: './dist/browser.js', default: './dist/index.js' },
    },
  }),
  'dist/browser.js': `export const platform = 'platform'\n`,
  'dist/index.js': `export const platform = 'platform'\n`,
}

/**
 * Maps its `exports` target to a browser build through the `browser` field,
 * the way axios does. Vite applies the field on the client only.
 */
const BROWSER_FIELD_LIB: PackageFiles = {
  'package.json': JSON.stringify({
    name: 'browser-field-lib',
    type: 'module',
    exports: { '.': './dist/index.js' },
    browser: { './dist/index.js': './dist/browser.js' },
  }),
  'dist/browser.js': `export const field = 'field'\n`,
  'dist/index.js': `export const field = 'field'\n`,
}

let siteDirectory: string

beforeEach(async () => {
  siteDirectory = await mkdtemp(join(tmpdir(), 'kawapress-resolution-'))
})

afterEach(async () => {
  await rm(siteDirectory, { force: true, recursive: true })
})

/**
 * Writes a site whose libraries live in `packages/` and are linked into
 * `node_modules`, as a workspace links them. SSR bundles a linked package
 * instead of leaving it external, so both builds resolve it.
 */
async function createSite(viteOptions: string): Promise<void> {
  await writeFile(join(siteDirectory, 'package.json'), JSON.stringify({
    name: 'resolution-test',
    private: true,
    type: 'module',
  }))
  await writeFile(join(siteDirectory, 'kawapress.config.ts'), `export default {
  title: 'Resolution Test',
  vite: {
    ${viteOptions}
  },
}
`)
  await writeFile(join(siteDirectory, 'index.md'), HOME_PAGE)
  await mkdir(join(siteDirectory, 'node_modules'), { recursive: true })
  await symlink(kawapressPackageDirectory, join(siteDirectory, 'node_modules/kawapress'), 'dir')
  for (const [name, files] of Object.entries({ 'source-lib': SOURCE_LIB, 'platform-lib': PLATFORM_LIB, 'browser-field-lib': BROWSER_FIELD_LIB })) {
    const packageDirectory = join(siteDirectory, 'packages', name)
    for (const [path, content] of Object.entries(files)) {
      await mkdir(dirname(join(packageDirectory, path)), { recursive: true })
      await writeFile(join(packageDirectory, path), content)
    }
    await symlink(packageDirectory, join(siteDirectory, 'node_modules', name), 'dir')
  }
}

/** Builds the site and returns everything it printed. */
async function build(): Promise<string> {
  const env: NodeJS.ProcessEnv = { ...process.env }
  delete env.NODE_ENV
  const { stdout, stderr } = await run(process.execPath, [kawapressBin, 'build'], {
    cwd: siteDirectory,
    env,
  })
  return `${stdout}${stderr}`
}

describe('buildSite resolution check', () => {
  it('warns when the client and SSR load a package from different export conditions', async () => {
    await createSite(CLIENT_SOURCE_CONDITIONS)

    const output = await build()

    expect(output).toContain(WARNING_MARKER)
    expect(output).toContain(`"source-lib": client src/index.js ('source'), SSR dist/index.js ('import')`)
    expect(output).toContain(`"source-lib/button": client src/button.js ('source'), SSR dist/button.js ('import')`)
    expect(output).toContain(`vite: { ssr: { resolve: { conditions: ['source'] } } }`)
    // A browser build next to a default one is intended, not a mismatch.
    expect(output).not.toContain('platform-lib')
    expect(output).not.toContain('browser-field-lib')
  }, 300_000)

  it('stays quiet when SSR is given the same conditions', async () => {
    await createSite(`${CLIENT_SOURCE_CONDITIONS}
    ssr: { resolve: { conditions: ['source'] } },`)

    expect(await build()).not.toContain(WARNING_MARKER)
  }, 300_000)

  it('stays quiet for a site that sets no conditions', async () => {
    await createSite('')

    expect(await build()).not.toContain(WARNING_MARKER)
  }, 300_000)
})
