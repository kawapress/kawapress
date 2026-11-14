import { resolveHeadingTitle } from 'kawapress'
import { createMarkdownExit } from 'markdown-exit'
import { describe, expect, it } from 'vitest'
import { installEmoji } from './emoji'

function createMarkdown() {
  const markdown = createMarkdownExit({ html: true })
  installEmoji(markdown)
  return markdown
}

describe('emoji shortcodes', () => {
  it('renders shortcodes as emoji', () => {
    expect(createMarkdown().render('Ship :rocket: and :tada:!'))
      .toBe('<p>Ship 🚀 and 🎉!</p>\n')
  })

  it('keeps unknown names, emoticons, code and fences as written', () => {
    const markdown = createMarkdown()
    expect(markdown.render(':not-an-emoji: :) `:tada:`'))
      .toBe('<p>:not-an-emoji: :) <code>:tada:</code></p>\n')
    expect(markdown.render('```\n:tada:\n```\n')).toContain(':tada:')
  })

  it('keeps the shortcode in the plain-text heading title', () => {
    const [, inline] = createMarkdown().parse('# Ship :rocket: today\n', {})
    expect(resolveHeadingTitle(inline!)).toBe('Ship :rocket: today')
  })
})
