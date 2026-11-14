import type { Dirent } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'
import picomatch from 'picomatch'
import { markdownFileToSourcePath } from '../compiler/page-loader'
import { markdownPagePathToRoutePath } from '../core/markdown-route'

/** Directories that never hold pages: build output and installed packages. */
const IGNORED_DIRECTORIES = new Set(['dist', 'node_modules'])

/** One Markdown page on disk. */
export interface MarkdownPage {
  /** Absolute path of the Markdown file. */
  file: string
  /** Path relative to the source root, for example `/guide/intro.md`. */
  sourcePath: string
  /** Public route path of the page, for example `/guide/intro`. */
  routePath: string
}

/** Where the pages of a site are. */
export interface MarkdownPageScope {
  /** Absolute directory holding the Markdown sources, that is the resolved `srcDir`. */
  sourceRoot: string
  /**
   * Absolute directory of files that are copied as they are, that is the
   * resolved `publicDir`. Markdown inside it is not a page. Leave it out when
   * the site has no public directory.
   */
  publicDir?: string | undefined
  /**
   * Glob patterns, relative to `sourceRoot`, of Markdown files that are not
   * pages, that is the resolved `srcExclude`. Leave it out to keep every file.
   */
  exclude?: readonly string[] | undefined
}

/**
 * Every Markdown page below `scope.sourceRoot`, in the order the site itself
 * reads them: directories before their content, both sorted by name, files
 * outside the public directory only.
 */
export async function listMarkdownPages(
  scope: MarkdownPageScope,
): Promise<MarkdownPage[]> {
  const sourceRoot = resolve(scope.sourceRoot)
  const isExcluded = createExcludeMatcher(sourceRoot, scope.exclude)
  const files = await findMarkdownFiles(sourceRoot, resolvePublicDirectory(scope))
  return files.filter(file => !isExcluded(file)).map((file) => {
    const sourcePath = markdownFileToSourcePath(file, sourceRoot)
    return { file, sourcePath, routePath: markdownPagePathToRoutePath(sourcePath) }
  })
}

/** Whether `file` is a page of this scope, without reading any directory. */
export function isMarkdownPage(file: string, scope: MarkdownPageScope): boolean {
  const sourceRoot = resolve(scope.sourceRoot)
  return isMarkdownPageFile(file, sourceRoot, resolvePublicDirectory(scope))
    && !createExcludeMatcher(sourceRoot, scope.exclude)(file)
}

/**
 * Whether a file matches one of the exclude patterns. Patterns use the glob
 * syntax of `picomatch` and are matched against the path below `sourceRoot`.
 */
function createExcludeMatcher(
  sourceRoot: string,
  patterns: readonly string[] | undefined,
): (file: string) => boolean {
  if (!patterns?.length) {
    return () => false
  }
  const matches = picomatch([...patterns], { dot: true })
  return file => matches(relative(sourceRoot, file).split(sep).join('/'))
}

/**
 * Public route path of a Markdown file. Dev servers report changed files as
 * absolute paths, which this turns back into the route the site serves.
 */
export function markdownFileToRoutePath(
  file: string,
  sourceRoot: string,
): string {
  return markdownPagePathToRoutePath(markdownFileToSourcePath(file, resolve(sourceRoot)))
}

async function findMarkdownFiles(
  directory: string,
  publicDirectory: string | undefined,
): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(entries
    .sort(compareEntries)
    .map(async (entry) => {
      const path = join(directory, entry.name)
      if (shouldIgnore(entry, path, publicDirectory)) {
        return []
      }
      if (entry.isDirectory()) {
        return findMarkdownFiles(path, publicDirectory)
      }
      return entry.isFile() && entry.name.endsWith('.md') ? [path] : []
    }))

  return files.flat()
}

function isMarkdownPageFile(
  file: string,
  sourceRoot: string,
  publicDirectory: string | undefined,
): boolean {
  const relativePath = relative(sourceRoot, file)
  return file.endsWith('.md')
    && !isAbsolute(relativePath)
    && relativePath !== '..'
    && !relativePath.startsWith(`..${sep}`)
    && !isInDirectory(file, publicDirectory)
}

function resolvePublicDirectory(scope: MarkdownPageScope): string | undefined {
  return scope.publicDir ? resolve(scope.publicDir) : undefined
}

function compareEntries(a: Dirent, b: Dirent): number {
  return a.name.localeCompare(b.name)
}

function isInDirectory(file: string, directory: string | undefined): boolean {
  if (!directory) {
    return false
  }

  const relativePath = relative(directory, file)
  return relativePath === ''
    || (!isAbsolute(relativePath)
      && relativePath !== '..'
      && !relativePath.startsWith(`..${sep}`))
}

function shouldIgnore(
  entry: Dirent,
  path: string,
  publicDirectory: string | undefined,
): boolean {
  return entry.name.startsWith('.')
    || path === publicDirectory
    || (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name))
}
