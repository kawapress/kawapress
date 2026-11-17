import type { Ref } from 'vue'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useSite } from './composables'

export interface Appearance {
  /** Whether the current page uses the dark appearance. */
  isDark: Ref<boolean>
}

/**
 * Follows the `dark`/`light` class on `<html>`, falling back to the operating
 * system preference when neither class is present. Themes only need to toggle
 * that class; components do not depend on a particular theme implementation.
 */
export function useAppearance(): Appearance {
  const site = useSite()
  const configured = (site.value.themeConfig as { appearance?: unknown }).appearance
  const isDark = ref(configured === 'dark')

  let stop: (() => void) | undefined
  onMounted(() => {
    const root = document.documentElement
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const update = (): void => {
      isDark.value = root.classList.contains('dark')
        || (!root.classList.contains('light') && media.matches)
    }
    const observer = new MutationObserver(update)
    update()
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    media.addEventListener('change', update)
    stop = () => {
      observer.disconnect()
      media.removeEventListener('change', update)
    }
  })
  onBeforeUnmount(() => stop?.())

  return { isDark }
}
