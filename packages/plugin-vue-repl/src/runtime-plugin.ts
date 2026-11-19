import { defineRuntimePlugin } from 'kawapress'
import './vue-repl.css'

/**
 * The REPL block is a page component that the Markdown plugin imports into pages
 * that have one, so this runtime plugin only contributes the styles that the
 * server-rendered block needs from the first paint.
 */
export default defineRuntimePlugin({
  name: '@kawapress/plugin-vue-repl',
  setup() {},
})
