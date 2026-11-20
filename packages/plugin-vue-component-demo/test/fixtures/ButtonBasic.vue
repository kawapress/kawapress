<script setup lang="ts">
import { ref } from 'vue'

const count = ref(0)
</script>

<template>
  <button type="button" class="demo-button" @click="count++">
    Clicked {{ count }} times
  </button>
</template>
