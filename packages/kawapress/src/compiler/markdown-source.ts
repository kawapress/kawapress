import { readFileSync } from 'node:fs'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import matter from 'gray-matter'
import { normalizeFrontmatterSource } from '../core/frontmatter'
import { parseCodeSnippet, renderCodeSnippet } from './code-snippet'
import { findSourceRegion } from './source-region'

/** `<!--@include: path-->`, with an optional `#region` and `{start,end}` range. */
const INCLUDE_RE = /<!--\s*@include:([^>]*)-->/g
/** `{start,end}` line range and `#region` at the end of an include target. */
const INCLUDE_RANGE_RE = /\{(\d*),(\d*)\}$/
const INCLUDE_REGION_RE = /#([\w-]+)$/
/** `<<< path`, alone on its line. */
const SNIPPET_LINE_RE = /^(\s*)<<<(.*)$/
/** Opening or closing line of a fenced code block. */
const FENCE_RE = /^ {0,3}(`{3,}|~{3,})/

/** Where the Markdown being expanded comes from. */
export interface MarkdownSourceLocation {
  /** Absolute path of the Markdown file. */
  file: string
  /** Absolute source directory, which `@/` paths start from. */
  sourceRoot: string
}

export interface ExpandedMarkdownSource {
  /** The page source with every include and snippet written out. */
  source: string
  /** Absolute paths of every file the expanded source was read from, the page excluded. */
  dependencies: string[]
  /**
   * For each line of `source`, the 1-based line of the page file it comes
   * from. Lines written by an include or a snippet point at that directive.
   */
  lineOrigins: number[]
}

/**
 * Writes out `<!--@include: ...-->` and `<<< ...` in a page source, so every
 * reader of the page, from the compiler to the search index, sees the same
 * Markdown. Directives inside fenced code blocks stay as they are written,
 * which lets a page show the syntax itself.
 */
export function expandMarkdownSource(
  source: string,
  location: MarkdownSourceLocation,
): ExpandedMarkdownSource {
  const dependencies = new Set<string>()
  const lines = expandLines(source, location, dependencies, [location.file])
  return {
    source: lines.map(line => line.text).join('\n'),
    dependencies: [...dependencies],
    lineOrigins: lines.map(line => line.origin),
  }
}

/** Reads a Markdown page and expands its includes and snippets. */
export function readMarkdownSource(location: MarkdownSourceLocation): ExpandedMarkdownSource {
  return expandMarkdownSource(readFileSync(location.file, 'utf8'), location)
}

interface ExpandedLine {
  text: string
  /** 1-based line of the top-level file this line comes from. */
  origin: number
}

function expandLines(
  source: string,
  location: MarkdownSourceLocation,
  dependencies: Set<string>,
  stack: readonly string[],
): ExpandedLine[] {
  const output: ExpandedLine[] = []
  let fence: string | undefined

  for (const [index, text] of source.split(/\r?\n/).entries()) {
    const origin = index + 1
    const fenceMarker = FENCE_RE.exec(text)?.[1]
    if (fence) {
      if (fenceMarker && fenceMarker[0] === fence[0] && fenceMarker.length >= fence.length && !text.trim().slice(fenceMarker.length).trim()) {
        fence = undefined
      }
      output.push({ text, origin })
      continue
    }
    if (fenceMarker) {
      fence = fenceMarker
      output.push({ text, origin })
      continue
    }

    const at = `${location.file}:${origin}`
    const expanded = expandSnippetLine(text, location, dependencies, at)
      ?? expandIncludes(text, location, dependencies, stack, at)
    output.push(...expanded.map(line => ({ text: line, origin })))
  }

  return output
}

function expandSnippetLine(
  text: string,
  location: MarkdownSourceLocation,
  dependencies: Set<string>,
  at: string,
): string[] | undefined {
  const match = SNIPPET_LINE_RE.exec(text)
  const rawPath = match?.[2]?.trim()
  if (!match || !rawPath) {
    return
  }
  const indent = match[1]
  const request = parseCodeSnippet(rawPath)
  if (!request) {
    throw new Error(`KawaPress: cannot read the code snippet "<<< ${rawPath}" at ${at}.`)
  }

  const file = resolveDirectivePath(request.path, location)
  dependencies.add(file)
  try {
    return renderCodeSnippet(request, file).map(line => `${indent}${line}`)
  }
  catch (cause) {
    throw new Error(`KawaPress: cannot import the code snippet "<<< ${rawPath}" at ${at}: ${describeError(cause)}.`, { cause })
  }
}

function expandIncludes(
  text: string,
  location: MarkdownSourceLocation,
  dependencies: Set<string>,
  stack: readonly string[],
  at: string,
): string[] {
  if (!text.includes('@include')) {
    return [text]
  }

  const directiveOnly = text.trim().replace(INCLUDE_RE, '') === ''
  const indent = directiveOnly ? /^\s*/.exec(text)![0] : ''
  const replaced = text.replace(INCLUDE_RE, (directive, rawTarget: string) => {
    const target = rawTarget.trim()
    if (!target) {
      return directive
    }
    const included = readInclude(target, location, dependencies, stack, at)
    return indent ? included.split('\n').join(`\n${indent}`) : included
  })
  return replaced.split('\n')
}

function readInclude(
  target: string,
  location: MarkdownSourceLocation,
  dependencies: Set<string>,
  stack: readonly string[],
  at: string,
): string {
  const { path, region, start, end } = parseIncludeTarget(target)
  const file = resolveDirectivePath(path.trim(), location)
  if (stack.includes(file)) {
    throw new Error(`KawaPress: "<!--@include: ${target}-->" at ${at} includes itself through ${stack.map(entry => JSON.stringify(entry)).join(' -> ')}.`)
  }
  dependencies.add(file)

  let content: string
  try {
    content = readFileSync(file, 'utf8').replace(/\r\n?/g, '\n')
  }
  catch (cause) {
    throw new Error(`KawaPress: "<!--@include: ${target}-->" at ${at} points at a file that cannot be read: ${describeError(cause)}.`, { cause })
  }

  const hasPart = Boolean(region || start || end)
  if (region) {
    content = readRegion(content, region, target, at)
  }
  if (start || end) {
    content = content
      .split('\n')
      .slice(start ? Number(start) - 1 : undefined, end ? Number(end) : undefined)
      .join('\n')
  }
  if (!hasPart && file.endsWith('.md')) {
    content = matter(normalizeFrontmatterSource(content)).content
  }

  const nested = expandLines(
    content.replace(/\n$/, ''),
    { file, sourceRoot: location.sourceRoot },
    dependencies,
    [...stack, file],
  )
  return nested.map(line => line.text).join('\n')
}

function readRegion(content: string, name: string, target: string, at: string): string {
  const lines = content.split('\n')
  const region = findSourceRegion(lines, name)
  if (!region) {
    throw new Error(`KawaPress: "<!--@include: ${target}-->" at ${at} names region ${JSON.stringify(name)}, which the file does not have.`)
  }
  return lines.slice(region.start, region.end).join('\n')
}

/**
 * A directive path is relative to the file that holds it. `@/` starts at the
 * source directory instead, so shared files can be named the same way from
 * every page.
 */
function resolveDirectivePath(path: string, location: MarkdownSourceLocation): string {
  if (path.startsWith('@')) {
    return join(location.sourceRoot, path.replace(/^@\/?/, ''))
  }
  return isAbsolute(path) ? path : resolve(dirname(location.file), path)
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** Splits an include target written as `path#region{start,end}`. */
function parseIncludeTarget(target: string): {
  path: string
  region?: string | undefined
  start?: string | undefined
  end?: string | undefined
} {
  let path = target
  const range = INCLUDE_RANGE_RE.exec(path)
  if (range) {
    path = path.slice(0, range.index)
  }
  const region = INCLUDE_REGION_RE.exec(path)
  if (region) {
    path = path.slice(0, region.index)
  }
  return { path, region: region?.[1], start: range?.[1], end: range?.[2] }
}
