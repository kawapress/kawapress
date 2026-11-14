<script setup lang="ts">
import { computed } from 'vue'
import { useNagiThemeConfig } from '../composables/useNagiThemeConfig'
import { socialIcons } from '../social-icons'
import { socialLinkLabel, socialLinkSvg } from '../social-links'

const theme = useNagiThemeConfig()
const links = computed(() => (theme.value.socialLinks ?? []).map(link => ({
  link: link.link,
  label: socialLinkLabel(link),
  // Rendered with v-html: the markup comes from the site config or from
  // Simple Icons at build time, never from readers.
  svg: socialLinkSvg(link, socialIcons) ?? '',
})))
</script>

<template>
  <a
    v-for="item in links"
    :key="item.link"
    :href="item.link"
    class="nagi-social-link"
    :aria-label="item.label"
    :title="item.label"
    target="_blank"
    rel="noreferrer"
    v-html="item.svg"
  />
</template>
