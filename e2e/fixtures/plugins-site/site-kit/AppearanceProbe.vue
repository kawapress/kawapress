<script setup lang="ts">
import { useAppearance } from 'kawapress/client'

const { isDark } = useAppearance()
</script>

<template>
  <span class="appearance-probe" :data-dark="isDark">
    {{ isDark ? 'dark' : 'light' }}
  </span>
</template>
