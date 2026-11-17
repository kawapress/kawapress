import type { MarkdownExit, MarkdownExitOptions } from 'markdown-exit'
import { createMarkdownExit } from 'markdown-exit'

export interface MarkdownRendererOptions {
  /** Whether raw HTML in Markdown is rendered. Defaults to `true`. */
  html?: boolean
  /** Optional code-fence highlighter, for example from `@kawapress/plugin-shiki`. */
  highlight?: MarkdownExitOptions['highlight']
}

/**
 * Creates a standalone Markdown renderer for build-time tools such as demo
 * source loaders. It has the same asynchronous rendering shape as the site
 * compiler, without creating a page or running site plugins.
 */
export async function createMarkdownRenderer(
  options: MarkdownRendererOptions = {},
): Promise<MarkdownExit> {
  const markdown = createMarkdownExit({ html: options.html ?? true })
  markdown.options.highlight = options.highlight ?? null
  return markdown
}
