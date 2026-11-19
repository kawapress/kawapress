import type { MarkdownExit } from 'markdown-exit'
import type { TreeNode } from './parse'
import { renderIcon, resolveFileIconName, resolveFolderIconName } from './icons'
import { parseTree, TreeSyntaxError } from './parse'

interface TreeRenderEnv {
  path?: string
}

/** True for a fence whose language is exactly `tree`; other words are ignored. */
export function isTreeFence(info: string): boolean {
  return info.trim().split(/\s+/, 1)[0]?.toLowerCase() === 'tree'
}

/**
 * Renders the nested list for the source of a `tree` fence. The result is
 * plain HTML with no script: folding is a native `<details>`.
 */
export function renderTree(source: string): string {
  const nodes = parseTree(source)
  return `<div class="kawa-file-tree" v-pre>\n<ul class="kawa-file-tree__list" role="tree">\n${renderNodes(nodes)}</ul>\n</div>\n`
}

function renderNodes(nodes: readonly TreeNode[]): string {
  return nodes.map(renderNode).join('')
}

function renderNode(node: TreeNode): string {
  if (node.kind === 'ellipsis') {
    return `<li class="kawa-file-tree__item kawa-file-tree__item--ellipsis" role="treeitem">${renderRow(node, '<span class="kawa-file-tree__name">…</span>', false)}</li>\n`
  }

  const name = `<span class="${nameClass(node)}">${escapeHtml(node.name)}${node.kind === 'directory' ? '/' : ''}</span>`

  if (node.kind === 'file') {
    return `<li class="kawa-file-tree__item kawa-file-tree__item--file" role="treeitem">${renderRow(node, name, true)}</li>\n`
  }

  const open = !node.collapsed
  if (node.children.length === 0) {
    // Nothing to fold, so no toggle either.
    const icon = renderIcon(resolveFolderIconName(node.name, false))
    return `<li class="kawa-file-tree__item kawa-file-tree__item--directory" role="treeitem"><span class="kawa-file-tree__row">${icon}${name}${renderComment(node)}</span></li>\n`
  }
  const openIcon = renderIcon(resolveFolderIconName(node.name, true))
  const closedIcon = renderIcon(resolveFolderIconName(node.name, false))
  return `<li class="kawa-file-tree__item kawa-file-tree__item--directory" role="treeitem"><details${open ? ' open' : ''}><summary class="kawa-file-tree__row"><span class="kawa-file-tree__icons"><span class="kawa-file-tree__icon-open">${openIcon}</span><span class="kawa-file-tree__icon-closed">${closedIcon}</span></span>${name}${renderComment(node)}</summary>\n<ul class="kawa-file-tree__list" role="group">\n${renderNodes(node.children)}</ul>\n</details></li>\n`
}

function renderRow(node: TreeNode, name: string, withIcon: boolean): string {
  const icon = withIcon ? renderIcon(resolveFileIconName(node.name)) : ''
  return `<span class="kawa-file-tree__row">${icon}${name}${renderComment(node)}</span>`
}

function renderComment(node: TreeNode): string {
  return node.comment === undefined
    ? ''
    : `<span class="kawa-file-tree__comment">${escapeHtml(node.comment)}</span>`
}

function nameClass(node: TreeNode): string {
  return node.highlight
    ? 'kawa-file-tree__name kawa-file-tree__name--highlight'
    : 'kawa-file-tree__name'
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

/**
 * Turns every ```tree fence into the file tree list. A syntax error stops the
 * build and names the page and the line inside the page's Markdown.
 */
export function installFileTree(markdown: MarkdownExit): void {
  const renderFence = markdown.renderer.rules.fence

  markdown.renderer.rules.fence = (tokens, index, renderOptions, env, renderer) => {
    const token = tokens[index]!
    if (!isTreeFence(token.info)) {
      return renderFence
        ? renderFence(tokens, index, renderOptions, env, renderer)
        : renderer.renderToken(tokens, index, renderOptions)
    }

    try {
      return renderTree(token.content)
    }
    catch (error) {
      if (error instanceof TreeSyntaxError) {
        const page = (env as TreeRenderEnv | undefined)?.path
        // `map[0]` is the opening fence line (0-based), so the tree starts one line later.
        const pageLine = token.map ? ` (page line ${token.map[0] + 1 + error.line})` : ''
        throw new Error(
          `KawaPress file tree${page ? ` in ${page}` : ''}: tree line ${error.line}${pageLine}: ${error.detail}`,
          { cause: error },
        )
      }
      throw error
    }
  }
}
