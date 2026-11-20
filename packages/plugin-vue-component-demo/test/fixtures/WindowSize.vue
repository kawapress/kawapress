<script setup lang="ts">
// Reads the browser at setup time, so it only works as a client-only demo.
const width = window.innerWidth
</script>

<template>
  <p class="window-size">
    {{ width }}px wide
  </p>
</template>
