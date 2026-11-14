import { useHead } from '@unhead/vue'

/**
 * Inline script that marks `<html data-kawa-platform>` as `apple` or `control`
 * before the first paint. Its content never changes, so every page can carry
 * the same tag.
 */
export const PLATFORM_DETECTION_SCRIPT = `(() => {
  const platform = navigator.userAgentData?.platform || navigator.platform || navigator.userAgent
  document.documentElement.dataset.kawaPlatform = /Mac|iPhone|iPad|iPod/i.test(platform) ? 'apple' : 'control'
})()`

/**
 * Puts the platform detection script into the page head, so CSS can show `⌘`
 * or `Ctrl` from the first frame: static HTML cannot know the visitor's
 * platform, and swapping the text after hydration makes the layout jump.
 *
 * Components render both labels and hide one with
 * `:root[data-kawa-platform='apple']`. Calling this from several components
 * still emits a single tag.
 */
export function usePlatformAttribute(): void {
  useHead({
    script: [{
      key: 'kawa-platform',
      id: 'kawa-platform',
      textContent: PLATFORM_DETECTION_SCRIPT,
    }],
  })
}
