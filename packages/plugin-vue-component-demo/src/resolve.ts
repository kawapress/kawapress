import { existsSync, statSync } from 'node:fs'
import { dirname, isAbsolute, resolve } from 'node:path'

/** The shapes `resolve.alias` of a Vite config can take. */
export type ViteAlias
  = | Record<string, string>
    | readonly { find: string | RegExp, replacement: string }[]
    | undefined

export interface ResolveDemoFileOptions {
  /** Absolute path of the Markdown file that wrote the tag, when it is known. */
  pageFile: string | undefined
  /** Absolute path of the site root. */
  root: string
  alias: ViteAlias
}

export class DemoFileError extends Error {}

/**
 * Finds the file a `src` attribute names: relative to the Markdown file, a Vite
 * alias, an absolute path, or a path from the site root. The result is an
 * absolute path with forward slashes; the file is checked to exist.
 */
export function resolveDemoFile(spec: string, options: ResolveDemoFileOptions): string {
  const candidate = candidatePath(spec, options)
  if (!candidate) {
    throw new DemoFileError(
      `cannot resolve src ${JSON.stringify(spec)}. Use a path relative to the Markdown file, such as "./demos/Basic.vue", or a Vite alias.`,
    )
  }
  if (!existsSync(candidate) || !statSync(candidate).isFile()) {
    throw new DemoFileError(
      `cannot find the demo file ${JSON.stringify(spec)} (looked for ${candidate}).`,
    )
  }
  return candidate.replaceAll('\\', '/')
}

function candidatePath(spec: string, options: ResolveDemoFileOptions): string | undefined {
  if (spec.startsWith('./') || spec.startsWith('../')) {
    return options.pageFile ? resolve(dirname(options.pageFile), spec) : undefined
  }

  const aliased = applyAlias(spec, options.alias)
  if (aliased !== undefined) {
    return isAbsolute(aliased) ? resolve(aliased) : resolve(options.root, aliased)
  }
  if (isAbsolute(spec) && existsSync(spec)) {
    return resolve(spec)
  }
  // Vite serves `/src/Demo.vue` from the site root.
  return spec.startsWith('/') ? resolve(options.root, spec.slice(1)) : undefined
}

function applyAlias(spec: string, alias: ViteAlias): string | undefined {
  const entries = Array.isArray(alias)
    ? alias
    : Object.entries(alias ?? {}).map(([find, replacement]) => ({ find, replacement }))

  for (const { find, replacement } of entries as { find: string | RegExp, replacement: string }[]) {
    if (typeof find === 'string') {
      if (spec === find) {
        return replacement
      }
      if (spec.startsWith(`${find}/`)) {
        return `${replacement}${spec.slice(find.length)}`
      }
    }
    else if (find.test(spec)) {
      return spec.replace(find, replacement)
    }
  }
  return undefined
}
