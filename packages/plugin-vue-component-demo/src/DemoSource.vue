<script setup lang="ts">
defineProps<{
  id: string
  /** Highlighted `<pre>` block produced at build time. */
  html: string
  expanded: boolean
}>()
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div :id="id" class="kawa-component-demo__source" :hidden="!expanded" v-html="html" />
</template>
