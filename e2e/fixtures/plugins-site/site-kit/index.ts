import type { KawaPressPlugin } from 'kawapress'
import { definePlugin } from 'kawapress'

/**
 * Plugin of the fixture site itself. KawaPress finds its `./runtime-plugin`
 * entry through the site package, which is named after the plugin.
 */
export function siteKit(): KawaPressPlugin {
  return definePlugin({
    name: '@kawapress/e2e-plugins-site',
    setup() {},
  })
}
