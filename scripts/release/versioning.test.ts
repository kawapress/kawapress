import { describe, expect, it } from 'vitest'
import {
  filterPublishedChanges,
  findPeerRangeConflicts,
  findReleaseTag,
  findVersionGroupProblems,
  satisfiesComparators,
} from './versioning.mjs'

function pkg(name: string, version: string, peer?: string) {
  return { manifest: { name, version, peerDependencies: peer ? { kawapress: peer } : undefined } }
}

const packages = [
  pkg('kawapress', '0.8.3'),
  pkg('create-kawapress', '0.8.3'),
  pkg('@kawapress/preset-nagi', '0.8.3', 'workspace:^'),
  pkg('@kawapress/plugin-mermaid', '0.8.3', 'workspace:>=0.8.3 <0.10.0'),
  pkg('@kawapress/plugin-feed', '0.1.0', 'workspace:>=0.8.3 <0.10.0'),
]

describe('findVersionGroupProblems', () => {
  it('lets plugins be released alone', () => {
    expect(findVersionGroupProblems(packages, new Map([['@kawapress/plugin-feed', '0.1.1']]))).toEqual([])
  })

  it('releases the core group together at one version', () => {
    const group = new Map([['kawapress', '0.9.0'], ['create-kawapress', '0.9.0'], ['@kawapress/preset-nagi', '0.9.0']])
    expect(findVersionGroupProblems(packages, group)).toEqual([])
    expect(findVersionGroupProblems(packages, new Map([['@kawapress/preset-nagi', '0.8.4']]))[0])
      .toContain('Also bump kawapress, create-kawapress')
    expect(findVersionGroupProblems(packages, new Map([...group, ['create-kawapress', '0.9.1']]))[0])
      .toContain('share one version')
  })
})

describe('satisfiesComparators', () => {
  it('reads comparator ranges', () => {
    expect(satisfiesComparators('0.9.2', '>=0.8.3 <0.10.0')).toBe(true)
    expect(satisfiesComparators('0.10.0', '>=0.8.3 <0.10.0')).toBe(false)
    expect(satisfiesComparators('0.8.2', '>=0.8.3')).toBe(false)
    expect(satisfiesComparators('0.8.3', '0.8.3')).toBe(true)
    expect(satisfiesComparators('0.8.3', '^0.8.0')).toBeUndefined()
  })
})

describe('findPeerRangeConflicts', () => {
  it('reports plugins whose peer range leaves out the new core version', () => {
    expect(findPeerRangeConflicts(packages, new Map([['kawapress', '0.9.0']]))).toEqual([])
    const conflicts = findPeerRangeConflicts(packages, new Map([['kawapress', '0.10.0']]))
    expect(conflicts).toHaveLength(2)
    expect(conflicts[0]).toContain('@kawapress/plugin-mermaid declares kawapress@>=0.8.3 <0.10.0, which leaves out 0.10.0')
  })
})

describe('filterPublishedChanges', () => {
  it('ignores tests', () => {
    expect(filterPublishedChanges([
      'packages/plugin-feed/src/feed.ts',
      'packages/plugin-feed/src/feed.test.ts',
      'packages/plugin-feed/src/__tests__/fixture.md',
      '',
    ], 'packages/plugin-feed')).toEqual(['packages/plugin-feed/src/feed.ts'])
  })
})

describe('findReleaseTag', () => {
  const versions: Record<string, string | undefined> = {
    'v0.8.0': undefined,
    'v0.8.3': '0.0.1',
    'v2026-11-20-plugins': '0.1.0',
    'v0.8.4': '0.1.0',
  }
  const read = async (tag: string) => versions[tag]

  it('returns the earliest tag that has the version, not the latest tag', async () => {
    expect(await findReleaseTag(Object.keys(versions), '0.1.0', read)).toBe('v2026-11-20-plugins')
  })

  it('returns undefined when the version was never released', async () => {
    expect(await findReleaseTag(Object.keys(versions), '0.2.0', read)).toBeUndefined()
  })
})
