import type { Plugin } from 'vite'
import { readFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { customConditions, findExportConditions } from '../export-conditions'

/** The two environments of a site build whose output meets during hydration. */
const COMPARED_ENVIRONMENTS = ['client', 'ssr'] as const
type ComparedEnvironment = typeof COMPARED_ENVIRONMENTS[number]

/** `name` or `@scope/name`, optionally followed by a subpath. */
const BARE_SPECIFIER = /^(?<name>(?:@[^/:\0]+\/)?[^./:\0#@][^/:\0]*)(?<subpath>\/[^?#\0]*)?$/

/** Imports listed per package before the warning summarises the rest. */
const LISTED_IMPORTS_PER_PACKAGE = 3

interface PackageManifest {
  name?: unknown
  exports?: unknown
  browser?: unknown
}

interface PackageLocation {
  root: string
  manifest: PackageManifest
}

/** One bare import of one installed copy of a package, and what each side loaded for it. */
interface ImportRecord {
  packageName: string
  location: PackageLocation
  specifier: string
  subpath: string
  files: Record<ComparedEnvironment, Set<string>>
}

/** How one side resolved an import: a file relative to the package and the export conditions that reach it. */
export interface ResolvedSide {
  file: string
  /** `undefined` when the package's `exports` do not lead to the file. */
  conditions: string[] | undefined
}

export interface ImportMismatch {
  specifier: string
  client: ResolvedSide
  ssr: ResolvedSide
}

export interface PackageResolutionMismatch {
  packageName: string
  imports: ImportMismatch[]
}

export interface ResolutionCheck {
  /** Records how the `client` and `ssr` environments resolve each bundled bare import. */
  plugin: Plugin
  /** Packages whose bundled imports the two environments resolved to different builds. */
  findMismatches: () => PackageResolutionMismatch[]
}

/**
 * Catches a package that the browser bundle and the server bundle take from
 * different files, for example the client from `src/` through a `source` export
 * condition and SSR from the prebuilt `dist/`. The server then renders one build
 * and the browser hydrates with another, and the only symptom is a hydration
 * mismatch that a production build reports without details.
 *
 * Only imports both environments bundle are compared: an import SSR leaves
 * external runs from `node_modules` in Node.js and never meets the client
 * bundle's resolution. A difference that the package's `exports` explain with
 * platform conditions alone (`browser` against the default, as
 * `@floating-ui/dom` ships) is intended and not reported.
 */
export function createResolutionCheck(): ResolutionCheck {
  const records = new Map<string, ImportRecord>()
  const locations = new Map<string, PackageLocation | null>()

  const plugin: Plugin = {
    name: 'kawapress:resolution-check',
    resolveId: {
      order: 'pre',
      async handler(source, importer, options) {
        const environment = this.environment.name
        if (!isComparedEnvironment(environment)) {
          return null
        }
        const match = BARE_SPECIFIER.exec(source)
        if (!match) {
          return null
        }
        const resolved = await this.resolve(source, importer, { ...options, skipSelf: true })
        if (!resolved || resolved.external) {
          return resolved
        }
        const file = resolved.id.split('?')[0]!
        const packageName = match.groups!.name!
        const location = findPackage(file, packageName, locations)
        if (!location) {
          return resolved
        }
        const key = `${location.root}\0${source}`
        let record = records.get(key)
        if (!record) {
          record = {
            packageName,
            location,
            specifier: source,
            subpath: `.${match.groups!.subpath ?? ''}`,
            files: { client: new Set(), ssr: new Set() },
          }
          records.set(key, record)
        }
        record.files[environment].add(toPosix(relative(location.root, file)))
        return resolved
      },
    },
  }

  return {
    plugin,
    findMismatches: () => groupByPackage(
      [...records.values()].flatMap(record => compareRecord(record) ?? []),
    ),
  }
}

function compareRecord(record: ImportRecord): (ImportMismatch & { packageName: string }) | undefined {
  const clientFile = first(record.files.client)
  const ssrFile = first(record.files.ssr)
  if (clientFile === undefined || ssrFile === undefined || record.files.ssr.has(clientFile)) {
    return undefined
  }
  const { manifest } = record.location
  if (manifest.exports === undefined) {
    // A package without `exports` that maps files through the `browser` field
    // ships a browser build on purpose.
    if (manifest.browser !== undefined) {
      return undefined
    }
    return {
      packageName: record.packageName,
      specifier: record.specifier,
      client: { file: clientFile, conditions: undefined },
      ssr: { file: ssrFile, conditions: undefined },
    }
  }
  const client = resolvedSide(manifest.exports, record.subpath, clientFile)
  const ssr = resolvedSide(manifest.exports, record.subpath, ssrFile)
  if (
    client.conditions
    && ssr.conditions
    && sameConditions(customConditions(client.conditions), customConditions(ssr.conditions))
  ) {
    return undefined
  }
  return { packageName: record.packageName, specifier: record.specifier, client, ssr }
}

function resolvedSide(exportsField: unknown, subpath: string, file: string): ResolvedSide {
  return { file, conditions: findExportConditions(exportsField, subpath, file)[0] }
}

function groupByPackage(
  mismatches: (ImportMismatch & { packageName: string })[],
): PackageResolutionMismatch[] {
  const packages = new Map<string, ImportMismatch[]>()
  for (const { packageName, ...mismatch } of mismatches) {
    const imports = packages.get(packageName) ?? []
    imports.push(mismatch)
    packages.set(packageName, imports)
  }
  return [...packages]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([packageName, imports]) => ({
      packageName,
      imports: imports.sort((a, b) => a.specifier.localeCompare(b.specifier)),
    }))
}

/** The build warning for `mismatches`, or `undefined` when there are none. */
export function formatResolutionWarning(mismatches: PackageResolutionMismatch[]): string | undefined {
  if (mismatches.length === 0) {
    return undefined
  }
  const lines = [
    `KawaPress: the client and SSR builds load different files for ${describeCount(mismatches.length, 'package')}. `
    + 'The server renders one build and the browser hydrates it with another, which causes hydration mismatches.',
  ]
  for (const { packageName, imports } of mismatches) {
    lines.push(`  ${packageName}`)
    for (const mismatch of imports.slice(0, LISTED_IMPORTS_PER_PACKAGE)) {
      lines.push(
        `    "${mismatch.specifier}": client ${describeSide(mismatch.client)}, SSR ${describeSide(mismatch.ssr)}`,
      )
    }
    if (imports.length > LISTED_IMPORTS_PER_PACKAGE) {
      lines.push(`    … and ${describeCount(imports.length - LISTED_IMPORTS_PER_PACKAGE, 'more import')}`)
    }
  }
  lines.push(...describeFix(mismatches))
  return lines.join('\n')
}

function describeFix(mismatches: PackageResolutionMismatch[]): string[] {
  const clientOnly = new Set<string>()
  const ssrOnly = new Set<string>()
  for (const { imports } of mismatches) {
    for (const { client, ssr } of imports) {
      const clientConditions = customConditions(client.conditions ?? [])
      const ssrConditions = customConditions(ssr.conditions ?? [])
      for (const condition of clientConditions) {
        if (!ssrConditions.includes(condition)) {
          clientOnly.add(condition)
        }
      }
      for (const condition of ssrConditions) {
        if (!clientConditions.includes(condition)) {
          ssrOnly.add(condition)
        }
      }
    }
  }
  const lines = [
    'Since Vite 6, `resolve.conditions` applies to the client only; the SSR build reads `ssr.resolve.conditions`. '
    + 'Give both the same conditions in the `vite` option of the KawaPress config',
  ]
  if (clientOnly.size > 0) {
    lines[0] += ':'
    lines.push(`  vite: { ssr: { resolve: { conditions: [${[...clientOnly].map(quote).join(', ')}] } } }`)
  }
  else if (ssrOnly.size > 0) {
    lines[0] += ':'
    lines.push(`  vite: { resolve: { conditions: [${[...ssrOnly].map(quote).join(', ')}, 'module', 'browser', 'development|production'] } }`)
  }
  else {
    lines[0] += ', and resolve the package the same way on both sides (check `resolve.alias` and plugins).'
  }
  return lines
}

function describeSide(side: ResolvedSide): string {
  if (!side.conditions) {
    return side.file
  }
  const conditions = side.conditions.length > 0
    ? side.conditions.map(quote).join(' > ')
    : 'no condition'
  return `${side.file} (${conditions})`
}

function describeCount(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}

function quote(value: string): string {
  return `'${value}'`
}

function sameConditions(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every(condition => b.includes(condition))
}

function first(values: Set<string>): string | undefined {
  return [...values].sort()[0]
}

function isComparedEnvironment(name: string): name is ComparedEnvironment {
  return (COMPARED_ENVIRONMENTS as readonly string[]).includes(name)
}

/**
 * The installed copy of `name` that contains `file`: the closest directory
 * above it whose `package.json` has that name. A nested `package.json`, such as
 * `dist/package.json` declaring only `type`, is skipped.
 */
function findPackage(
  file: string,
  name: string,
  cache: Map<string, PackageLocation | null>,
): PackageLocation | undefined {
  const visited: string[] = []
  let directory = dirname(file)
  let found: PackageLocation | null = null
  while (true) {
    const key = `${directory}\0${name}`
    const cached = cache.get(key)
    if (cached !== undefined) {
      found = cached
      break
    }
    visited.push(key)
    const manifest = readManifest(join(directory, 'package.json'))
    if (manifest?.name === name) {
      found = { root: directory, manifest }
      break
    }
    const parent = dirname(directory)
    if (parent === directory) {
      break
    }
    directory = parent
  }
  for (const key of visited) {
    cache.set(key, found)
  }
  return found ?? undefined
}

function readManifest(path: string): PackageManifest | undefined {
  try {
    const manifest = JSON.parse(readFileSync(path, 'utf8')) as unknown
    return typeof manifest === 'object' && manifest !== null ? manifest as PackageManifest : undefined
  }
  catch {
    return undefined
  }
}

function toPosix(path: string): string {
  return path.replaceAll('\\', '/')
}
