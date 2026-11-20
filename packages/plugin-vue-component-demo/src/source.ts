import type { MarkdownExit } from 'markdown-exit'

/** What the source query of a demo file exports. */
export interface DemoSource {
  /** Highlighted `<pre>` block, or an escaped one when the site has no highlighter. */
  html: string
  /** The file as written, for the copy button. */
  code: string
}

/**
 * Highlights a demo file with the site's own Markdown pipeline, so the source
 * has the same Shiki themes, languages and transformers as the code blocks of
 * the pages. Only the `<pre>` is kept, in a bare `kawa-code-block` wrapper: the language
 * label and copy button of a page's code block belong to the demo toolbar here.
 */
export async function renderDemoSource(markdown: MarkdownExit, code: string): Promise<DemoSource> {
  const longestRun = Math.max(2, ...[...code.matchAll(/`+/g)].map(match => match[0].length))
  const fence = '`'.repeat(longestRun + 1)
  const rendered = await markdown.renderAsync(`${fence}vue\n${code.replace(/\n$/, '')}\n${fence}\n`, {
    path: '/',
    sourcePath: '/index.md',
  })
  const pre = /<pre[\s\S]*?<\/pre>/.exec(rendered)?.[0]
  const block = pre ?? `<pre><code>${escapeHtml(code)}</code></pre>`
  return { html: `<div class="kawa-code-block language-vue">${block}</div>`, code }
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}
