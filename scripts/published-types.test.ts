/**
 * The public packages ship TypeScript sources, so a site that type-checks its
 * config also type-checks every module those sources import. Types that only
 * the monorepo root installs (a root `@types/*` devDependency) pass our own
 * typecheck and fail in every consumer. This test reads each published source
 * file and checks that every dependency it imports brings its types along:
 * the dependency ships them, or the package also depends on its `@types/*`.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { isBuiltin } from 'node:module'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const SOURCE_FILE_RE = /\.(?:[cm]?ts|vue)$/
const TEST_FILE_RE = /\.test\.[cm]?ts$/
// `from 'x'`, `import 'x'` and `import('x')`; type-only imports need types too.
const SPECIFIER_RE = /(?:\bfrom\s+|\bimport(?:\s*\(\s*|\s+))'([^'\n]+)'/g
const DECLARED_MODULE_RE = /declare\s+module\s+'([^']+)'/g

interface PackageJson {
  name: string
  private?: boolean
  types?: string
  typings?: string
  main?: string
  module?: string
  exports?: unknown
  dependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
}

function readJson(file: string): PackageJson {
  return JSON.parse(readFileSync(file, 'utf8')) as PackageJson
}

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? listFiles(path) : [path]
  })
}

/** `@scope/name/sub?raw` → `@scope/name`; relative and virtual ids → undefined. */
function packageNameOf(specifier: string): string | undefined {
  const id = specifier.split('?')[0]
  // `${…}` belongs to code a plugin generates, not to its own imports.
  if (/^[./]|^[a-z]+:|^#/i.test(id) || id.includes('${') || isBuiltin(id))
    return undefined
  const parts = id.split('/')
  return id.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]
}

function findInstalledDir(fromDir: string, name: string): string | undefined {
  let dir = fromDir
  while (true) {
    const candidate = join(dir, 'node_modules', name)
    if (existsSync(join(candidate, 'package.json')))
      return candidate
    const parent = dirname(dir)
    if (parent === dir)
      return undefined
    dir = parent
  }
}

function collectTargets(value: unknown): string[] {
  if (typeof value === 'string')
    return [value]
  if (value && typeof value === 'object')
    return Object.values(value).flatMap(collectTargets)
  return []
}

/** TypeScript reads `x.d.ts`, `x.d.mts` or `x.d.cts` next to an entry `x.js`, `x.mjs` or `x.cjs`. */
function hasSiblingDeclaration(installedDir: string, target: string): boolean {
  const base = target.replace(/\.[cm]?js$/, '')
  return base !== target && ['.d.ts', '.d.mts', '.d.cts'].some(ext => existsSync(join(installedDir, base + ext)))
}

function shipsTypes(fromDir: string, name: string): boolean {
  const installedDir = findInstalledDir(fromDir, name)
  if (!installedDir)
    return false
  const manifest = readJson(join(installedDir, 'package.json'))
  if (manifest.types || manifest.typings || JSON.stringify(manifest.exports ?? {}).includes('"types"'))
    return true
  const entries = [...collectTargets(manifest.exports), manifest.main, manifest.module, 'index.js']
    .filter((target): target is string => typeof target === 'string')
  return existsSync(join(installedDir, 'index.d.ts'))
    || entries.some(target => hasSiblingDeclaration(installedDir, target))
}

/** `@scope/name` is typed by `@types/scope__name`. */
function typesPackageOf(name: string): string {
  return `@types/${name.startsWith('@') ? name.slice(1).replace('/', '__') : name}`
}

const packages = readdirSync(join(ROOT, 'packages'))
  .map(name => join(ROOT, 'packages', name))
  .filter(dir => existsSync(join(dir, 'package.json')))
  .map(dir => ({ dir, manifest: readJson(join(dir, 'package.json')) }))
  .filter(({ manifest }) => !manifest.private)

describe('published package types', () => {
  it.each(packages.map(item => [item.manifest.name, item] as const))('%s ships the types of what it imports', (_, { dir, manifest }) => {
    const sources = existsSync(join(dir, 'src'))
      ? listFiles(join(dir, 'src')).filter(file => SOURCE_FILE_RE.test(file) && !TEST_FILE_RE.test(file))
      : []
    const declared = new Set([
      ...Object.keys(manifest.dependencies ?? {}),
      ...Object.keys(manifest.peerDependencies ?? {}),
      ...Object.keys(manifest.optionalDependencies ?? {}),
    ])
    const locallyDeclared = new Set(sources
      .filter(file => file.endsWith('.d.ts'))
      .flatMap(file => [...readFileSync(file, 'utf8').matchAll(DECLARED_MODULE_RE)].map(match => match[1])))

    const problems: string[] = []
    for (const file of sources) {
      for (const [, specifier] of readFileSync(file, 'utf8').matchAll(SPECIFIER_RE)) {
        const name = packageNameOf(specifier)
        // Imports that are no dependency of this package resolve through `kawapress`;
        // see kawapress/kawapress#84 for how those should be declared.
        if (!name || name === manifest.name || !declared.has(name) || locallyDeclared.has(specifier))
          continue
        if (!shipsTypes(dir, name) && !declared.has(typesPackageOf(name)))
          problems.push(`${relative(ROOT, file)}: ${name} has no types; add ${typesPackageOf(name)} to the dependencies of ${manifest.name}`)
      }
    }
    expect([...new Set(problems)]).toEqual([])
  })
})
