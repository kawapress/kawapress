<script setup lang="ts">
export interface ChipProps {
  /** Text of the chip. */
  label: string
  /** Visual size. */
  size?: 'small' | 'large'
  /** Blocks clicks. */
  disabled?: boolean
  /** How many times it was picked. */
  count?: number
}

const props = withDefaults(defineProps<ChipProps>(), { size: 'small', disabled: false })

const emit = defineEmits<{
  /** Fired on click. */
  pick: [label: string]
}>()
</script>

<template>
  <button type="button" class="chip" :data-size="props.size" :disabled="props.disabled" @click="emit('pick', props.label)">
    {{ props.label }}<template v-if="props.count">
      ({{ props.count }})
    </template>
  </button>
</template>
