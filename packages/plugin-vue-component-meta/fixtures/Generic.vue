<script setup lang="ts" generic="T extends { id: string }">
interface Props<Item> {
  items: Item[]
  selected?: Item
}

defineProps<Props<T>>()
defineEmits<{ select: [item: T] }>()
</script>

<template>
  <ul>
    <li v-for="item in items" :key="item.id">
      {{ item.id }}
    </li>
  </ul>
</template>
