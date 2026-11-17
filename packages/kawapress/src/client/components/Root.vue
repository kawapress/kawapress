<script setup lang="ts">
import { useHead } from '@unhead/vue'
import { computed } from 'vue'
import { headConfigToUnheadInput } from '../../core/head'
import { resolveDocumentTitle } from '../../core/page-metadata'
import { usePageData, useSite } from '../composables'

const site = useSite()
const page = usePageData()
// A page description wins; pages without one use the locale or site description.
const description = computed(() => page.value?.description ?? site.value.description)

// Registered first so that user head tags can replace the generated description.
useHead(() => ({
  htmlAttrs: {
    lang: site.value.lang,
    dir: site.value.dir,
  },
  title: resolveDocumentTitle(
    page.value ?? { title: '' },
    site.value.title,
  ),
  meta: description.value
    ? [{
        key: 'description',
        name: 'description',
        content: description.value,
      }]
    : [],
}))

// Later entries win on duplicate tags, so the order is site, locale, then page.
useHead(() => headConfigToUnheadInput(site.value.head))
useHead(() => headConfigToUnheadInput(site.value.localeHead))
useHead(() => headConfigToUnheadInput(page.value?.head ?? []))
</script>

<template>
  <Layout />
</template>
