import type { GeneratorPluginAPI } from 'kawapress'

type Markdown = Parameters<Parameters<GeneratorPluginAPI['markdown']>[0]>[0]

/**
 * Wraps every Markdown table in `<div class="nagi-table">`. The wrapper carries the
 * rounded border and the horizontal scroll, so the table itself stays a real table
 * that fills the width.
 */
export function installTableWrapper(markdown: Markdown): void {
  const { renderer } = markdown
  const renderToken = renderer.renderToken.bind(renderer)
  const tableOpen = renderer.rules.table_open
  const tableClose = renderer.rules.table_close
  renderer.rules.table_open = (tokens, index, options, env, self) =>
    `<div class="nagi-table">${tableOpen ? tableOpen(tokens, index, options, env, self) : renderToken(tokens, index, options)}`
  renderer.rules.table_close = (tokens, index, options, env, self) =>
    `${tableClose ? tableClose(tokens, index, options, env, self) : renderToken(tokens, index, options)}</div>\n`
}
