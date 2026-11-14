import type { KawaPressPlugin } from 'kawapress'
import { definePlugin } from 'kawapress'
import { installEmoji } from './emoji'

/** Emoji shortcodes such as `:tada:`, the same syntax as VitePress. */
export function emojiPlugin(): KawaPressPlugin {
  return definePlugin({
    name: '@kawapress/plugin-emoji',
    setup(api) {
      api.markdown((markdown) => {
        installEmoji(markdown)
      })
    },
  })
}

export default emojiPlugin

export { installEmoji } from './emoji'
