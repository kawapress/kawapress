import type { LanguageRegistration } from 'shiki'
import { describe, expect, it } from 'vitest'
import { createMarkdownRenderer } from './index'

const testLanguage: LanguageRegistration = {
  name: 'testlang',
  scopeName: 'source.testlang',
  patterns: [],
  repository: {},
}

describe('createMarkdownRenderer', () => {
  it('renders code fences with dual-theme Shiki output and custom languages', async () => {
    const markdown = await createMarkdownRenderer({ languages: [testLanguage] })
    const html = await markdown.renderAsync('```testlang\n<Button />\n```')
    expect(html).toContain('shiki-themes')
    expect(html).toContain('github-light')
    expect(html).toContain('github-dark')
    expect(html).toContain('Button')
  })
})
