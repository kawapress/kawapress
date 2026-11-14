import type { KawaPressPlugin } from 'kawapress'
import { definePlugin } from 'kawapress'

/**
 * Inline badges, written as `<Badge type="tip" text="New" />` anywhere in
 * Markdown, the same way as in VitePress. The component itself is registered
 * by the runtime plugin, so this side has nothing to set up.
 */
export function badgePlugin(): KawaPressPlugin {
  return definePlugin({
    name: '@kawapress/plugin-badge',
    setup() {},
  })
}

export default badgePlugin

export type { BadgeType } from './badge-type'
export { BADGE_TYPES } from './badge-type'
