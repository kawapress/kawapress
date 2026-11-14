import type { MarkdownExit, RenderRule, Token } from 'markdown-exit'
import { useMarkdownItPlugin } from 'kawapress'
import { full as emojiPlugin } from 'markdown-it-emoji'

interface EmojiTokenMeta {
  emoji: string
}

const renderEmoji: RenderRule = (tokens, index) => (
  (tokens[index].meta as EmojiTokenMeta).emoji
)

/**
 * Replaces `:name:` shortcodes, such as `:tada:`, with their emoji, using the
 * GitHub names of `markdown-it-emoji` like VitePress does. Emoticons such as
 * `:)` stay text: in technical writing they are more often punctuation than a
 * request for an emoji.
 *
 * The emoji token keeps the shortcode it was written with, as a `:` markup
 * around the name, so the plain-text title of a heading keeps `:tada:` exactly
 * like a page reader that never loads this plugin.
 */
export function installEmoji(markdown: MarkdownExit): void {
  useMarkdownItPlugin(markdown, emojiPlugin, { shortcuts: {} })

  markdown.core.ruler.after('emoji', 'kawapress:emoji-source', (state) => {
    for (const block of state.tokens) {
      for (const token of block.children ?? []) {
        if (token.type === 'emoji') {
          keepShortcode(token)
        }
      }
    }
  })
  markdown.renderer.rules.emoji = renderEmoji
}

function keepShortcode(token: Token): void {
  const meta: EmojiTokenMeta = { emoji: token.content }
  token.meta = { ...token.meta, ...meta }
  token.content = token.markup
  token.markup = ':'
}
