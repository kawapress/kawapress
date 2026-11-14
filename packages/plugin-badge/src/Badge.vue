<script setup lang="ts">
import type { BadgeType } from './badge-type'

withDefaults(defineProps<{
  text?: string
  type?: BadgeType
}>(), {
  type: 'tip',
})
</script>

<template>
  <span class="kawa-badge" :class="`kawa-badge--${type}`">
    <slot>{{ text }}</slot>
  </span>
</template>
