/** Colors a badge can take; `tip` is the default, as in VitePress. */
export const BADGE_TYPES = ['info', 'tip', 'warning', 'danger'] as const

export type BadgeType = typeof BADGE_TYPES[number]
