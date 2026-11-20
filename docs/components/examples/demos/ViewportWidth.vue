<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'

// 读取 window：只能在浏览器里渲染，所以文档里加了 client-only。
const width = ref(window.innerWidth)
function update(): void {
  width.value = window.innerWidth
}
window.addEventListener('resize', update)
onBeforeUnmount(() => window.removeEventListener('resize', update))
</script>

<template>
  <p>当前窗口宽度：{{ width }}px</p>
</template>
