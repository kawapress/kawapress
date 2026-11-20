import { createMarkdownExit } from 'markdown-exit'
import { describe, expect, it } from 'vitest'
import { installTableWrapper } from './tables'

describe('installTableWrapper', () => {
  it('wraps each Markdown table and keeps its markup', () => {
    const markdown = createMarkdownExit()
    installTableWrapper(markdown)

    const html = markdown.render('| a | b |\n| - | - |\n| 1 | 2 |\n\ntext\n\n| c |\n| - |\n| 3 |\n')
    expect(html.match(/<div class="nagi-table"><table>/g)).toHaveLength(2)
    expect(html.match(/<\/table>\n?<\/div>/g)).toHaveLength(2)
    expect(html).toContain('<td>1</td>')
  })
})
