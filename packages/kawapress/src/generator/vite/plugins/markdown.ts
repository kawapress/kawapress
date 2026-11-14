import type { Plugin } from 'vite'
import type { MarkdownPageLoader } from '../../../compiler/page-loader'
import { readFile } from 'node:fs/promises'
import { assembleVueSfc } from '../../../compiler/markdown'

export function markdownPlugin(pageLoader: MarkdownPageLoader): Plugin {
  return {
    name: 'kawapress:markdown',
    async load(id) {
      const [file, query] = id.split('?', 2)
      if (query || !file.endsWith('.md')) {
        return null
      }

      const source = await readFile(file, 'utf8')
      const { html, env, pageData, dependencies } = await pageLoader.load(source, file)
      // An edit to an included file or a code snippet then updates the page.
      for (const dependency of dependencies) {
        this.addWatchFile(dependency)
      }
      return assembleVueSfc(html, env, pageData)
    },
  }
}
