import type { GeneratorPluginAPI } from 'kawapress'

type Markdown = Parameters<Parameters<GeneratorPluginAPI['markdown']>[0]>[0]

/**
 * Wraps every Markdown table in a scroll area:
 * `<div class="nagi-table"><div class="nagi-table__viewport"><table>`.
 * The host carries the rounded border and receives the OverlayScrollbars
 * scrollbars, the viewport scrolls sideways when the table is wider than the
 * page, and the table itself stays a real table.
 */
export function installTableWrapper(markdown: Markdown): void {
  const { renderer } = markdown
  const renderToken = renderer.renderToken.bind(renderer)
  const tableOpen = renderer.rules.table_open
  const tableClose = renderer.rules.table_close
  renderer.rules.table_open = (tokens, index, options, env, self) =>
    `<div class="nagi-table"><div class="nagi-table__viewport">${tableOpen ? tableOpen(tokens, index, options, env, self) : renderToken(tokens, index, options)}`
  renderer.rules.table_close = (tokens, index, options, env, self) =>
    `${tableClose ? tableClose(tokens, index, options, env, self) : renderToken(tokens, index, options)}</div></div>\n`
}
