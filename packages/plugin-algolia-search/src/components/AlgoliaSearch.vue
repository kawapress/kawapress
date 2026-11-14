<script setup lang="ts">
import type { DocSearchInstance } from '@docsearch/js/docsearch'
import { useHead } from '@unhead/vue'
import { usePlatformAttribute, useRouter, useSite } from 'kawapress/client'
import { computed, onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue'
import { createDocSearchConfig } from '../docsearch-config'
import { toRouterLocation, toSiteHref } from '../hit-url'
import algoliaOptions from '../runtime-options'
import { resolveButtonText } from '../translations'

const site = useSite()
const router = useRouter()
const host = useTemplateRef<HTMLElement>('host')
const trigger = useTemplateRef<HTMLButtonElement>('trigger')

const config = computed(() => createDocSearchConfig(
  algoliaOptions,
  site.value.localeIndex,
  site.value.lang,
))
const buttonText = computed(() => resolveButtonText(config.value.translations, site.value.lang))
const shortcuts = algoliaOptions.keyboardShortcuts

usePlatformAttribute()
useHead({
  link: [{
    rel: 'preconnect',
    href: `https://${algoliaOptions.appId}-dsn.algolia.net`,
    crossorigin: '',
  }],
})

/** The DocSearch instance, created on the first open and rebuilt per locale. */
let instance: DocSearchInstance | undefined
let loading: Promise<DocSearchInstance> | undefined

onMounted(() => {
  window.addEventListener('keydown', handleShortcut)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleShortcut)
  dispose()
})

// The index and the language filter depend on the locale, so another locale
// gets a fresh instance on its next open.
watch(() => `${site.value.localeIndex}:${site.value.lang}`, dispose)

/**
 * Opens DocSearch, loading it first. The library is about a third of the
 * payload of a page, so nobody downloads it until they ask for search.
 */
async function open(): Promise<void> {
  const ready = instance ?? await (loading ??= load())
  ready.open()
}

async function load(): Promise<DocSearchInstance> {
  try {
    const [{ default: docsearch }] = await Promise.all([
      import('@docsearch/js/docsearch'),
      import('../docsearch-vendor.css'),
    ])
    instance = docsearch({
      ...config.value,
      container: host.value!,
      transformItems: items => items.map(item => ({
        ...item,
        url: toSiteHref(item.url, site.value.base),
      })),
      navigator: {
        navigate: ({ itemUrl }) => navigate(itemUrl),
      },
      // DocSearch would focus its own button, which stays hidden in the host.
      onClose: () => trigger.value?.focus(),
    })
    return instance
  }
  finally {
    loading = undefined
  }
}

/** Enter on a hit. A click on a hit is a plain link, which the router handles. */
function navigate(itemUrl: string): void {
  const location = toRouterLocation(itemUrl, site.value.base)
  if (location === undefined) {
    window.location.assign(itemUrl)
    return
  }
  void router.push(location).catch((error: unknown) => {
    console.error('[KawaPress Algolia search] Navigation failed:', error)
  })
}

/** Until DocSearch is loaded, the shortcuts are this button's to answer. */
function handleShortcut(event: KeyboardEvent): void {
  if (instance || event.defaultPrevented || event.isComposing) {
    return
  }
  const commandK = shortcuts['Ctrl/Cmd+K']
    && event.key.toLowerCase() === 'k'
    && (event.metaKey || event.ctrlKey)
    && !event.altKey
  const slash = shortcuts['/']
    && event.key === '/'
    && !event.metaKey
    && !event.ctrlKey
    && !event.altKey
    && !isEditing(event.target)

  if (commandK || slash) {
    event.preventDefault()
    void open()
  }
}

function isEditing(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && Boolean(target.closest(
    'input, textarea, select, [contenteditable]:not([contenteditable="false"])',
  ))
}

function dispose(): void {
  instance?.destroy()
  instance = undefined
}
</script>

<template>
  <button
    ref="trigger"
    type="button"
    class="kawa-algolia-search"
    :aria-label="buttonText"
    :aria-keyshortcuts="shortcuts['Ctrl/Cmd+K'] ? 'Control+K Meta+K' : undefined"
    @click="open"
  >
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
    <span class="kawa-algolia-search__text">{{ buttonText }}</span>
    <span v-if="shortcuts['Ctrl/Cmd+K']" class="kawa-algolia-search__keys" aria-hidden="true">
      <kbd>
        <span class="kawa-algolia-search__command">⌘</span>
        <span class="kawa-algolia-search__control">Ctrl</span>
      </kbd>
      <kbd>K</kbd>
    </span>
  </button>
  <div ref="host" class="kawa-algolia-search__host" hidden />
</template>
