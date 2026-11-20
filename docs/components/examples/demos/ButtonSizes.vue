<script setup lang="ts">
import KButton from '../KButton.vue'
</script>

<template>
  <div class="row">
    <KButton label="小" size="small" />
    <KButton label="中" />
    <KButton label="大" size="large" />
  </div>
</template>

<style scoped>
.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}
</style>
