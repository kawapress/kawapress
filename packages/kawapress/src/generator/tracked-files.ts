/// <reference path="../types/picomatch.d.ts" />

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import picomatch from 'picomatch'
import { normalizePath } from 'vite'
import { findDataLoaderFiles } from './data/glob'

/** Files that exist or appear while the site is served. */
export type FileEvent = 'add' | 'change' | 'unlink'

/** A glob that was used, with the files it matched at that time. */
export interface GlobDependency {
  /** Absolute patterns; a leading `!` excludes. */
  patterns: readonly string[]
  matched: ReadonlySet<string>
  /** Directories to watch so that a new file can be noticed. */
  watchDirectories: readonly string[]
}

/** The files and globs a unit of generation (a page group, a data loader) read. */
export interface TrackedFiles {
  files: ReadonlySet<string>
  globs: readonly GlobDependency[]
}

export interface FileTracker {
  /** Reads a UTF-8 text file and records it. */
  read: (path: string) => Promise<string>
  /** Returns the sorted absolute paths matching the pattern and records the pattern. */
  glob: (pattern: string | readonly string[]) => Promise<string[]>
  /** Records a file that was read elsewhere. */
  addFile: (file: string) => void
  /** Records a glob that was matched elsewhere. */
  addGlob: (dependency: GlobDependency) => void
  snapshot: () => TrackedFiles
}

/** Records what is read and globbed; relative paths start from `root`. */
export function createFileTracker(root: string): FileTracker {
  const files = new Set<string>()
  const globs: GlobDependency[] = []

  return {
    async read(path) {
      const file = normalizePath(resolve(root, path))
      // Recorded before reading, so a file that does not exist yet is noticed once it appears.
      files.add(file)
      return readFile(file, 'utf8')
    },
    async glob(pattern) {
      const patterns = (typeof pattern === 'string' ? [pattern] : [...pattern])
        .map(item => item.startsWith('!')
          ? `!${normalizePath(resolve(root, item.slice(1)))}`
          : normalizePath(resolve(root, item)))
      const matched = await findDataLoaderFiles(patterns)
      globs.push(createGlobDependency(patterns, matched))
      return matched
    },
    addFile: file => files.add(normalizePath(file)),
    addGlob: dependency => globs.push(dependency),
    snapshot: () => ({ files: new Set(files), globs: [...globs] }),
  }
}

/** The dependency for absolute `patterns` that matched `matched`. */
export function createGlobDependency(patterns: readonly string[], matched: readonly string[]): GlobDependency {
  return {
    patterns,
    matched: new Set(matched),
    watchDirectories: patterns
      .filter(pattern => !pattern.startsWith('!'))
      .map(pattern => picomatch.scan(pattern).base),
  }
}

/** Paths a dev server has to watch for these dependencies to be noticed. */
export function listWatchTargets(tracked: TrackedFiles): string[] {
  return [
    ...tracked.files,
    ...tracked.globs.flatMap(glob => glob.watchDirectories),
  ]
}

/**
 * Whether a file event changes what something read: a read file was
 * edited, removed or created, or a file that fits a recorded glob appeared or
 * went.
 */
export function isAffectedBy(
  tracked: TrackedFiles,
  event: FileEvent,
  file: string,
): boolean {
  const path = normalizePath(file)
  if (tracked.files.has(path)) {
    return true
  }
  if (event === 'unlink') {
    return tracked.globs.some(glob => glob.matched.has(path))
  }
  return event === 'add' && tracked.globs.some(glob => globMatches(glob, path))
}

/** Everything either of two sets covers. */
export function mergeTrackedFiles(first: TrackedFiles, second: TrackedFiles): TrackedFiles {
  return {
    files: new Set([...first.files, ...second.files]),
    globs: [...first.globs, ...second.globs],
  }
}

function globMatches(glob: GlobDependency, path: string): boolean {
  const included = glob.patterns.filter(pattern => !pattern.startsWith('!'))
  const excluded = glob.patterns.filter(pattern => pattern.startsWith('!')).map(pattern => pattern.slice(1))
  return picomatch(included)(path) && (excluded.length === 0 || !picomatch(excluded)(path))
}
