import { readFileSync } from 'node:fs'
import { extname } from 'node:path'
import { dedent, findSourceRegion, isAnyRegionMarker } from './source-region'

/** `{1,3-5}` line numbers to highlight, the first part inside the braces. */
const HIGHLIGHT_RE = /^\d+(?:[,-]\d+)*$/
/** `#region` at the end of the path. */
const REGION_RE = /#([\w-]+)$/

export interface CodeSnippetRequest {
  path: string
  region?: string
  highlight?: string
  lang?: string
  attrs?: string
  title?: string
}

/**
 * Splits the text after `<<<`, written as `path#region{lines lang attrs} [title]`:
 *
 * - `path`: the file to show, relative to the page or `@/` for srcDir.
 * - `#region`: only the lines between the region markers.
 * - `{1,3-5 ts:line-numbers}`: lines to highlight, then optionally a language
 *   and extra fence attributes.
 * - `[title]`: the tab label inside a code group, the file name by default.
 */
export function parseCodeSnippet(rawPath: string): CodeSnippetRequest | undefined {
  let rest = rawPath.trim()
  const request: Omit<CodeSnippetRequest, 'path'> = {}

  if (rest.endsWith(']') && rest.includes('[')) {
    const open = rest.lastIndexOf('[')
    const title = rest.slice(open + 1, -1).trim()
    if (title) {
      request.title = title
    }
    rest = rest.slice(0, open).trimEnd()
  }

  if (rest.endsWith('}') && rest.includes('{')) {
    const open = rest.lastIndexOf('{')
    const parts = rest.slice(open + 1, -1).trim().split(/\s+/).filter(Boolean)
    if (parts[0] && HIGHLIGHT_RE.test(parts[0])) {
      request.highlight = parts.shift()
    }
    if (parts.length > 2) {
      return
    }
    const [lang, attrs] = parts
    if (lang) {
      request.lang = lang
    }
    if (attrs) {
      request.attrs = attrs
    }
    rest = rest.slice(0, open).trimEnd()
  }

  const region = REGION_RE.exec(rest)
  if (region) {
    request.region = region[1]
    rest = rest.slice(0, region.index)
  }

  const path = rest.trim()
  return path ? { path, ...request } : undefined
}

/**
 * Reads the snippet file and writes it as a fenced code block, so every later
 * step, from highlighting to the search index, sees an ordinary code block.
 */
export function renderCodeSnippet(
  request: CodeSnippetRequest,
  file: string,
): string[] {
  const code = readSnippetCode(file, request.region)
  const lang = request.lang ?? extname(file).slice(1)
  const title = request.title ?? file.split(/[/\\]/).pop() ?? ''
  const info = [
    lang,
    request.highlight ? `{${request.highlight}}` : '',
    request.attrs ?? '',
    title ? `[${title}]` : '',
  ].filter(Boolean).join(' ')
  const fence = '`'.repeat(Math.max(3, longestBacktickRun(code) + 1))

  return [`${fence}${info}`, ...code.split('\n'), fence]
}

function readSnippetCode(file: string, regionName: string | undefined): string {
  const content = readFileSync(file, 'utf8').replace(/\r\n?/g, '\n').replace(/\n$/, '')
  if (!regionName) {
    return content
  }

  const lines = content.split('\n')
  const region = findSourceRegion(lines, regionName)
  if (!region) {
    throw new Error(`region ${JSON.stringify(regionName)} does not exist in ${JSON.stringify(file)}`)
  }
  return dedent(lines
    .slice(region.start, region.end)
    .filter(line => !isAnyRegionMarker(line, region.marker))
    .join('\n'))
}

function longestBacktickRun(code: string): number {
  return Math.max(0, ...(code.match(/`+/g) ?? []).map(run => run.length))
}
