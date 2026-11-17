import { describe, expect, it } from 'vitest'
import { createMarkdownRenderer } from './markdown-renderer'

describe('createMarkdownRenderer', () => {
  it('renders Markdown asynchronously without creating a page', async () => {
    const markdown = await createMarkdownRenderer()
    const html = await markdown.renderAsync('# Hello\n\nWorld')
    expect(html).toContain('<h1>Hello</h1>')
    expect(html).toContain('<p>World</p>')
  })

  it('uses the supplied code highlighter', async () => {
    const markdown = await createMarkdownRenderer({
      highlight: code => `<pre class="highlighted">${code.replaceAll('<', '&lt;')}</pre>`,
    })
    const html = await markdown.renderAsync('```vue\n<Button />\n```')
    expect(html).toContain('class="highlighted"')
    expect(html).toContain('&lt;Button />')
  })
})
