<script setup lang="ts">
const configured = import.meta.env.VITE_SITE_CONFIG
</script>

<template>
  <span class="site-config-probe">{{ configured }}</span>
</template>
