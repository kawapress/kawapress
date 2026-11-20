import { defineRuntimePlugin } from 'kawapress'
import './component-api.css'

/**
 * The API tables are a page component that the Markdown plugin imports into
 * pages that use `<ComponentApi>`, so this runtime plugin only contributes the
 * styles that the server-rendered tables need from the first paint.
 */
export default defineRuntimePlugin({
  name: '@kawapress/plugin-vue-component-meta',
  setup() {},
})
