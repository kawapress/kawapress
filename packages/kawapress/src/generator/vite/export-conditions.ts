/**
 * Export conditions that pick a file per platform on purpose. A package that
 * answers `browser` with one file and the default with another ships two builds
 * that are meant to render the same thing, so loading one on each side is not a
 * fault.
 */
export const PLATFORM_CONDITIONS: ReadonlySet<string> = new Set(['browser', 'node'])

/**
 * Conditions every Vite environment answers on its own, so they never explain
 * why the two sides of a build disagree.
 */
const IMPLICIT_CONDITIONS: ReadonlySet<string> = new Set([
  'default',
  'import',
  'require',
  'module',
  'production',
  'development',
  'types',
])

/**
 * Every chain of `exports` conditions under which a package exposes `file` for
 * `subpath`, in the order the manifest lists them. `subpath` is `.` or starts
 * with `./`; `file` is relative to the package root, for example `dist/index.js`.
 * An empty list means the manifest does not lead to `file` at all.
 */
export function findExportConditions(
  exportsField: unknown,
  subpath: string,
  file: string,
): string[][] {
  const target = selectSubpath(exportsField, subpath)
  if (!target) {
    return []
  }
  const chains: string[][] = []
  collectLeaves(target.value, [], (conditions, leaf) => {
    if (normalizeTarget(leaf.replaceAll('*', target.wildcard)) === file) {
      chains.push(conditions)
    }
  })
  return chains
}

/** Conditions of a chain that a site has to configure itself, such as `source`. */
export function customConditions(chain: readonly string[]): string[] {
  return chain.filter(condition =>
    !IMPLICIT_CONDITIONS.has(condition) && !PLATFORM_CONDITIONS.has(condition),
  )
}

interface SelectedSubpath {
  value: unknown
  wildcard: string
}

function selectSubpath(exportsField: unknown, subpath: string): SelectedSubpath | undefined {
  if (!isSubpathMap(exportsField)) {
    return subpath === '.' && exportsField != null
      ? { value: exportsField, wildcard: '' }
      : undefined
  }
  if (Object.hasOwn(exportsField, subpath)) {
    return { value: exportsField[subpath], wildcard: '' }
  }
  // Node picks the pattern with the longest prefix before the `*`.
  let best: (SelectedSubpath & { prefixLength: number }) | undefined
  for (const [key, value] of Object.entries(exportsField)) {
    const star = key.indexOf('*')
    if (star === -1 || key.includes('*', star + 1)) {
      continue
    }
    const prefix = key.slice(0, star)
    const suffix = key.slice(star + 1)
    if (
      subpath.length >= key.length
      && subpath.startsWith(prefix)
      && subpath.endsWith(suffix)
      && (!best || prefix.length > best.prefixLength)
    ) {
      best = {
        value,
        wildcard: subpath.slice(prefix.length, subpath.length - suffix.length),
        prefixLength: prefix.length,
      }
    }
  }
  return best && { value: best.value, wildcard: best.wildcard }
}

function isSubpathMap(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }
  return Object.keys(value).some(key => key.startsWith('.'))
}

function collectLeaves(
  value: unknown,
  conditions: string[],
  visit: (conditions: string[], leaf: string) => void,
): void {
  if (typeof value === 'string') {
    visit(conditions, value)
  }
  else if (Array.isArray(value)) {
    for (const item of value) {
      collectLeaves(item, conditions, visit)
    }
  }
  else if (typeof value === 'object' && value !== null) {
    for (const [condition, nested] of Object.entries(value)) {
      collectLeaves(nested, [...conditions, condition], visit)
    }
  }
}

function normalizeTarget(target: string): string {
  return target.replace(/^\.\//, '')
}
