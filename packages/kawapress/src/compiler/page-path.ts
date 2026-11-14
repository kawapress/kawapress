import type { PageRewrites } from '../core/site'
import { relative, resolve, sep } from 'node:path'
import { compile, match } from 'path-to-regexp'
import { markdownPagePathToRoutePath } from '../core/markdown-route'

/** Turns the source path of a page into the page path its route comes from. */
export type PagePathRewriter = (sourcePath: string) => string

const KEEP: PagePathRewriter = sourcePath => sourcePath
const rewriters = new WeakMap<object, PagePathRewriter>()

/** Path of a Markdown file relative to srcDir, for example `/guide/intro.md`. */
export function markdownFileToSourcePath(file: string, sourceRoot: string): string {
  return `/${relative(sourceRoot, file).split(sep).join('/')}`
}

/**
 * Page path of a Markdown file: its source path after `rewrites`, for example
 * `/a/intro.md` for `packages/a/src/intro.md` and the rule
 * `'packages/:pkg/src/:page*': ':pkg/:page*'`. Without rewrites it is the
 * source path. The route of the page and its relative links both start here.
 */
export function markdownFileToPagePath(
  file: string,
  sourceRoot: string,
  rewrites?: PageRewrites,
): string {
  return resolvePagePathRewriter(rewrites)(markdownFileToSourcePath(file, resolve(sourceRoot)))
}

/** Public route of a Markdown file, after `rewrites`. */
export function markdownFileToRoutePath(
  file: string,
  sourceRoot: string,
  rewrites?: PageRewrites,
): string {
  return markdownPagePathToRoutePath(markdownFileToPagePath(file, sourceRoot, rewrites))
}

/**
 * The rewriter of a `rewrites` value, compiled once per value.
 *
 * Paths are matched the way `rewrites` is written: relative to srcDir, without
 * the leading slash. A function returns the new path, or nothing to keep the
 * page where it is. Rules of an object are tried in order and the first match
 * wins; a rule starting with `^` is a regular expression. Rules use the
 * `path-to-regexp` 6 syntax, the same as VitePress.
 */
export function resolvePagePathRewriter(rewrites: PageRewrites | undefined): PagePathRewriter {
  if (!rewrites) {
    return KEEP
  }
  let rewriter = rewriters.get(rewrites)
  if (!rewriter) {
    rewriter = typeof rewrites === 'function'
      ? fromFunction(rewrites)
      : fromRules(rewrites)
    rewriters.set(rewrites, rewriter)
  }
  return rewriter
}

function fromFunction(rewrite: (id: string) => string | undefined): PagePathRewriter {
  return (sourcePath) => {
    const destination = rewrite(sourcePath.slice(1))
    return destination ? toPagePath(destination) : sourcePath
  }
}

function fromRules(rules: Record<string, string>): PagePathRewriter {
  const compiled = Object.entries(rules).map(([from, to]) => ({
    matches: match(from.startsWith('^') ? new RegExp(from) : from),
    toPath: compile(`/${to}`, { validate: false }),
  }))
  if (compiled.length === 0) {
    return KEEP
  }

  return (sourcePath) => {
    const id = sourcePath.slice(1)
    for (const { matches, toPath } of compiled) {
      const result = matches(id)
      if (result) {
        return toPagePath(toPath(result.params))
      }
    }
    return sourcePath
  }
}

function toPagePath(path: string): string {
  return `/${path.replace(/^\/+/, '')}`
}
