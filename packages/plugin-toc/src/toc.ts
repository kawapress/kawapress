import type { MarkdownExit, RuleBlock, Token } from 'markdown-exit'
import { resolveHeadingTitle } from 'kawapress'

export interface TocOptions {
  /**
   * Heading levels the table lists.
   * @default [2, 3]
   */
  level?: number[]
}

interface TocEntry {
  level: number
  id: string
  title: string
  children: TocEntry[]
}

/** A line that holds only the marker, in any letter case. */
export const TOC_MARKER_RE = /^\[\[toc\]\]$/i

const TOC_TOKEN = 'kawa_toc'

const tocBlockRule: RuleBlock = (state, startLine, _endLine, silent) => {
  // Four spaces of indent make an indented code block, not a marker.
  if (state.sCount[startLine] - state.blkIndent >= 4) {
    return false
  }
  const start = state.bMarks[startLine] + state.tShift[startLine]
  const line = state.src.slice(start, state.eMarks[startLine]).trim()
  if (!TOC_MARKER_RE.test(line)) {
    return false
  }
  if (!silent) {
    const token = state.push(TOC_TOKEN, 'nav', 0)
    token.map = [startLine, startLine + 1]
    token.markup = line
  }
  state.line = startLine + 1
  return true
}

export function installToc(markdown: MarkdownExit, options: TocOptions = {}): void {
  const levels = new Set(options.level ?? [2, 3])

  markdown.block.ruler.before('paragraph', TOC_TOKEN, tocBlockRule)
  markdown.renderer.rules[TOC_TOKEN] = (tokens) => {
    const entries = nestEntries(collectEntries(tokens, levels))
    return entries.length > 0
      ? `<nav class="kawa-toc">${renderEntries(entries, markdown.utils.escapeHtml)}</nav>\n`
      : ''
  }
}

/**
 * Reads the headings at the top level of the page, so a heading inside a
 * container or a block quote stays out of the table. The ID is the final
 * anchor ID and the title follows the heading title rule of KawaPress, the
 * same title the outline and the search index show.
 */
function collectEntries(tokens: readonly Token[], levels: ReadonlySet<number>): TocEntry[] {
  const entries: TocEntry[] = []

  for (const [index, token] of tokens.entries()) {
    if (token.type !== 'heading_open' || token.level !== 0) {
      continue
    }
    const level = Number.parseInt(token.tag.slice(1), 10)
    const id = token.attrGet('id')
    const inline = tokens[index + 1]
    if (!levels.has(level) || !id || inline?.type !== 'inline') {
      continue
    }
    const title = resolveHeadingTitle(inline)
    if (title) {
      entries.push({ level, id, title, children: [] })
    }
  }

  return entries
}

/** Puts each heading under the closest earlier heading of a higher level. */
function nestEntries(entries: TocEntry[]): TocEntry[] {
  const root: TocEntry[] = []
  const stack: TocEntry[] = []

  for (const entry of entries) {
    while (stack.length > 0 && stack.at(-1)!.level >= entry.level) {
      stack.pop()
    }
    const parent = stack.at(-1)
    if (parent) {
      parent.children.push(entry)
    }
    else {
      root.push(entry)
    }
    stack.push(entry)
  }

  return root
}

function renderEntries(entries: readonly TocEntry[], escapeHtml: (text: string) => string): string {
  const items = entries.map((entry) => {
    const link = `<a href="#${escapeHtml(entry.id)}">${escapeHtml(entry.title)}</a>`
    const children = entry.children.length > 0 ? renderEntries(entry.children, escapeHtml) : ''
    return `<li>${link}${children}</li>`
  })
  return `<ul>${items.join('')}</ul>`
}
