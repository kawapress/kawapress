const FRONTMATTER_RE = /^---\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/
const LINE_SPLIT_RE = /\r?\n/
const FENCE_RE = /^\s*(?:```|~~~)/
const SKIPPED_BLOCK_START_RE = /^(?:#{1,6}\s|:::|[<|>]|[-*+]\s|\d+[.)]\s|---|\*\*\*)/
const IMAGE_RE = /!\[[^\]]*\]\([^)]*\)/g
const LINK_RE = /\[([^\]]*)\]\([^)]*\)/g
const REFERENCE_LINK_RE = /\[([^\]]*)\]\[[^\]]*\]/g
const HTML_TAG_RE = /<\/?[a-z][^>]*>/gi
const INLINE_CODE_RE = /`+([^`]*)`+/g
const EMPHASIS_RE = /(\*\*|__|\*|~~)(.+?)\1/g
const ATTRS_RE = /\{[#.][^}]*\}/g
const WHITESPACE_RE = /\s+/g

export const MAX_EXCERPT_LENGTH = 300

/**
 * Plain text of the first paragraph of a Markdown source, at most
 * `MAX_EXCERPT_LENGTH` characters. Headings, code, containers, tables, quotes
 * and lists are not paragraphs and are skipped.
 */
export function extractExcerpt(source: string): string | undefined {
  const blocks: string[] = []
  let current: string[] = []
  let inFence = false
  // Fences may contain blank lines, so they are removed before blocks are split.
  for (const line of source.replace(FRONTMATTER_RE, '').split(LINE_SPLIT_RE)) {
    if (FENCE_RE.test(line)) {
      inFence = !inFence
      continue
    }
    if (inFence) {
      continue
    }
    if (line.trim() === '') {
      if (current.length > 0) {
        blocks.push(current.join('\n'))
        current = []
      }
      continue
    }
    current.push(line)
  }
  if (current.length > 0) {
    blocks.push(current.join('\n'))
  }

  for (const block of blocks) {
    if (SKIPPED_BLOCK_START_RE.test(block.trimStart())) {
      continue
    }
    const text = stripMarkdown(block)
    if (text) {
      return truncate(text)
    }
  }
  return undefined
}

function stripMarkdown(block: string): string {
  return block
    .replace(IMAGE_RE, '')
    .replace(LINK_RE, '$1')
    .replace(REFERENCE_LINK_RE, '$1')
    .replace(HTML_TAG_RE, '')
    .replace(INLINE_CODE_RE, '$1')
    .replace(EMPHASIS_RE, '$2')
    .replace(ATTRS_RE, '')
    .replace(WHITESPACE_RE, ' ')
    .trim()
}

function truncate(text: string): string {
  const characters = [...text]
  return characters.length <= MAX_EXCERPT_LENGTH
    ? text
    : `${characters.slice(0, MAX_EXCERPT_LENGTH - 1).join('').trimEnd()}…`
}
