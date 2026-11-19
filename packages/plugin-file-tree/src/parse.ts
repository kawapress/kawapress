export type TreeNodeKind = 'directory' | 'file' | 'ellipsis'

export interface TreeNode {
  kind: TreeNodeKind
  /** Entry name without the trailing `/`, the `**` marks and the comment. */
  name: string
  comment?: string
  highlight: boolean
  /** Directories only: starts closed. */
  collapsed: boolean
  children: TreeNode[]
}

/** A tree the author wrote wrongly. `line` counts from 1 inside the fence. */
export class TreeSyntaxError extends Error {
  readonly line: number
  readonly detail: string

  constructor(line: number, detail: string) {
    super(`line ${line}: ${detail}`)
    this.name = 'TreeSyntaxError'
    this.line = line
    this.detail = detail
  }
}

const COLLAPSED_SUFFIX = /\s+\(collapsed\)$/
const COMMENT_START = /(?:^|\s)#/

/**
 * Parses the indented text of a `tree` fence. One level is two spaces or one
 * tab, and a tree uses one of them throughout.
 */
export function parseTree(source: string): TreeNode[] {
  const roots: TreeNode[] = []
  /** `stack[level]` is the latest node at that level. */
  const stack: TreeNode[] = []
  let indentChar: ' ' | '\t' | undefined

  for (const [index, rawLine] of source.split(/\r?\n/).entries()) {
    const lineNumber = index + 1
    if (rawLine.trim() === '') {
      continue
    }

    const indent = /^[ \t]*/.exec(rawLine)![0]
    const level = readLevel(indent, lineNumber, indentChar)
    if (indent.length > 0) {
      indentChar = indent[0] as ' ' | '\t'
    }
    if (level > stack.length) {
      throw new TreeSyntaxError(
        lineNumber,
        stack.length === 0
          ? 'the first entry cannot be indented'
          : `indented ${level - stack.length + 1} levels deeper than the entry above`,
      )
    }

    const node = parseEntry(rawLine.slice(indent.length), lineNumber)
    if (level > 0) {
      const parent = stack[level - 1]!
      if (parent.kind !== 'directory') {
        throw new TreeSyntaxError(
          lineNumber,
          `${JSON.stringify(parent.name)} has children but does not end with "/", so it is a file`,
        )
      }
      parent.children.push(node)
    }
    else {
      roots.push(node)
    }
    stack.length = level
    stack.push(node)
  }

  return roots
}

function readLevel(indent: string, line: number, indentChar: ' ' | '\t' | undefined): number {
  if (indent === '') {
    return 0
  }
  const hasTab = indent.includes('\t')
  if (hasTab && indent.includes(' ')) {
    throw new TreeSyntaxError(line, 'indentation mixes tabs and spaces')
  }
  const char = hasTab ? '\t' : ' '
  if (indentChar !== undefined && indentChar !== char) {
    throw new TreeSyntaxError(
      line,
      `a tree cannot mix tab and space indentation (earlier lines use ${indentChar === '\t' ? 'tabs' : 'spaces'})`,
    )
  }
  if (char === ' ' && indent.length % 2 !== 0) {
    throw new TreeSyntaxError(
      line,
      `indentation is ${indent.length} spaces, but one level is 2 spaces`,
    )
  }
  return char === '\t' ? indent.length : indent.length / 2
}

function parseEntry(text: string, line: number): TreeNode {
  let rest = text.trimEnd()
  let comment: string | undefined

  const commentMatch = COMMENT_START.exec(rest)
  if (commentMatch) {
    comment = rest.slice(commentMatch.index + commentMatch[0].length).trim()
    rest = rest.slice(0, commentMatch.index).trimEnd()
  }
  if (rest === '') {
    throw new TreeSyntaxError(line, 'a comment needs an entry name before the "#"')
  }
  if (comment === '') {
    comment = undefined
  }

  let collapsed = false
  if (COLLAPSED_SUFFIX.test(rest)) {
    collapsed = true
    rest = rest.replace(COLLAPSED_SUFFIX, '')
  }

  let highlight = false
  const marked = /^\*\*(.+)\*\*$/.exec(rest)
  if (marked) {
    highlight = true
    rest = marked[1]!.trim()
  }

  if (rest === '...') {
    if (collapsed || highlight) {
      throw new TreeSyntaxError(line, '"..." cannot be highlighted or collapsed')
    }
    return { kind: 'ellipsis', name: '...', comment, highlight, collapsed, children: [] }
  }

  const isDirectory = rest.endsWith('/')
  const name = isDirectory ? rest.replace(/\/+$/, '') : rest
  if (name === '') {
    throw new TreeSyntaxError(line, 'the entry has no name')
  }
  if (collapsed && !isDirectory) {
    throw new TreeSyntaxError(
      line,
      `"(collapsed)" only applies to directories, but ${JSON.stringify(name)} does not end with "/"`,
    )
  }
  return {
    kind: isDirectory ? 'directory' : 'file',
    name,
    comment,
    highlight,
    collapsed,
    children: [],
  }
}
