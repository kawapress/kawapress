/** Version rules across packages: the core version group, peer ranges, and forgotten bumps. */

import { run } from './runtime.mjs'
import { compareSemver, parseSemver } from './semver.mjs'

/**
 * Packages that share one version and are released together: they depend on each
 * other and form one product. Every other package has its own version.
 */
export const coreVersionGroup = ['kawapress', 'create-kawapress', '@kawapress/preset-nagi']

const COMPARATOR_RE = /^([<>]=?|=)?v?(\d+\.\d+\.\d+(?:-[\w.]+)?)$/
/** Whether a comparison result (-1, 0, 1) passes each operator. */
const OPERATORS = {
  '>=': order => order >= 0,
  '<=': order => order <= 0,
  '>': order => order > 0,
  '<': order => order < 0,
  '=': order => order === 0,
}

/** Problems with the bumps of the core group, or an empty list. */
export function findVersionGroupProblems(packages, bumps) {
  const bumped = coreVersionGroup.filter(name => bumps.has(name))
  if (bumped.length === 0)
    return []

  const missing = coreVersionGroup.filter(name => !bumps.has(name))
  if (missing.length > 0) {
    return [`${coreVersionGroup.join(', ')} share one version and are released together. Also bump ${missing.join(', ')}.`]
  }
  const versions = new Set(bumped.map(name => bumps.get(name)))
  if (versions.size > 1) {
    return [`${coreVersionGroup.join(', ')} share one version, got ${bumped.map(name => `${name}=${bumps.get(name)}`).join(', ')}.`]
  }
  return []
}

/**
 * Whether `version` satisfies a range of space-separated comparators such as
 * `>=0.8.3 <0.10.0`. Returns `undefined` for a range it cannot read.
 */
export function satisfiesComparators(version, range) {
  const parsed = parseSemver(version)
  const comparators = range.trim().split(/\s+/)
  for (const comparator of comparators) {
    const match = COMPARATOR_RE.exec(comparator)
    if (!match)
      return undefined
    const order = compareSemver(parsed, parseSemver(match[2]))
    if (!OPERATORS[match[1] ?? '='](order))
      return false
  }
  return true
}

/**
 * Packages whose `kawapress` peer range leaves out the core version of this release.
 * `workspace:^` and friends follow the core and are skipped.
 */
export function findPeerRangeConflicts(packages, bumps) {
  const kawapress = packages.find(({ manifest }) => manifest.name === 'kawapress')
  const coreVersion = bumps.get('kawapress') ?? kawapress?.manifest.version
  if (!coreVersion)
    return []

  const conflicts = []
  for (const { manifest } of packages) {
    const specifier = manifest.peerDependencies?.kawapress
    if (typeof specifier !== 'string' || /^workspace:[*^~]?$/.test(specifier))
      continue
    const range = specifier.replace(/^workspace:/, '')
    const satisfied = satisfiesComparators(coreVersion, range)
    if (satisfied === false)
      conflicts.push(`${manifest.name} declares kawapress@${range}, which leaves out ${coreVersion}. Widen the range and bump ${manifest.name}.`)
    else if (satisfied === undefined)
      conflicts.push(`${manifest.name} declares kawapress@${range}; write it as comparators such as ">=0.8.3 <0.10.0".`)
  }
  return conflicts
}

/** Files that change a package's published contents; tests do not. */
const TEST_FILE_RE = /(?:^|\/)(?:__tests__\/|[^/]+\.(?:test|spec)\.[cm]?[jt]sx?$)/

/** The most recent release tag reachable from HEAD, or `undefined`. */
export async function findLastReleaseTag() {
  const result = await run('git', ['describe', '--tags', '--abbrev=0', '--match', 'v*'], { allowFailure: true, capture: true })
  return result.exitCode === 0 ? result.stdout.trim() || undefined : undefined
}

/**
 * Packages whose published files changed since `tag` while their version did not,
 * and that this release does not bump either. Their changes would stay unpublished.
 */
export async function findUnbumpedPackages(packages, bumps, tag) {
  const unbumped = []
  for (const { manifest, relativeDirectory } of packages) {
    if (bumps.has(manifest.name))
      continue
    const previous = await run('git', ['show', `${tag}:${relativeDirectory}/package.json`], { allowFailure: true, capture: true })
    // Not released at that tag yet: the first release of a new package is checked by bootstrap.
    if (previous.exitCode !== 0)
      continue
    if (JSON.parse(previous.stdout).version !== manifest.version)
      continue
    const { stdout } = await run('git', ['diff', '--name-only', tag, 'HEAD', '--', relativeDirectory], { capture: true })
    const changed = filterPublishedChanges(stdout.split('\n'), relativeDirectory)
    if (changed.length > 0)
      unbumped.push({ name: manifest.name, version: manifest.version, files: changed })
  }
  return unbumped
}

export function filterPublishedChanges(paths, relativeDirectory) {
  return paths
    .map(path => path.trim())
    .filter(path => path && !TEST_FILE_RE.test(path.slice(relativeDirectory.length + 1)))
}
