import type { KawaPressPlugin } from 'kawapress'
import { definePlugin } from 'kawapress'
import { installFileTree } from './render'

export { resolveFileIconName, resolveFolderIconName } from './icons'
export type { TreeNode, TreeNodeKind } from './parse'
export { parseTree, TreeSyntaxError } from './parse'
export { installFileTree, isTreeFence, renderTree } from './render'

/**
 * Renders ```` ```tree ```` fences as a folding file tree with file icons.
 * Everything happens at build time; the page ships plain HTML and styles.
 */
export function fileTreePlugin(): KawaPressPlugin {
  return definePlugin({
    name: '@kawapress/plugin-file-tree',
    setup(api) {
      api.markdown((markdown) => {
        installFileTree(markdown)
      })
    },
  })
}

export default fileTreePlugin
