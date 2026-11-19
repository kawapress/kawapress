import { defineRuntimePlugin } from 'kawapress'
import './file-tree.css'

/** The tree is plain HTML from the build, so the runtime side only adds styles. */
export default defineRuntimePlugin({
  name: '@kawapress/plugin-file-tree',
  setup() {},
})
