import type { KawaPressPlugin } from 'kawapress'
import type { TocOptions } from './toc'
import { definePlugin } from 'kawapress'
import { installToc } from './toc'

export type TocPluginOptions = TocOptions

/**
 * Turns a line that only holds `[[toc]]` into a table of contents of the page,
 * the same syntax as VitePress.
 */
export function tocPlugin(options: TocPluginOptions = {}): KawaPressPlugin {
  return definePlugin({
    name: '@kawapress/plugin-toc',
    setup(api) {
      api.markdown((markdown) => {
        installToc(markdown, options)
      })
    },
  })
}

export default tocPlugin

export { installToc, TOC_MARKER_RE } from './toc'
export type { TocOptions } from './toc'
