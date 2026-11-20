<script setup lang="ts">
import { ref } from 'vue'
import KButton from '../KButton.vue'

const presses = ref(0)
</script>

<template>
  <KButton label="点我" variant="outline" :count="presses" @press="presses = $event" />
</template>
