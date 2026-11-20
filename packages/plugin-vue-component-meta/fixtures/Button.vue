<script setup lang="ts">
import type { ButtonOptions, ButtonSize } from './types'

/** A button that can be clicked. */
interface Props {
  /** Visual size of the button. */
  size?: ButtonSize
  /** Whether the button is disabled. */
  disabled?: boolean
  /** How many times it was pressed. */
  count?: number
  /** Text shown when there is no slot. */
  label?: string
  /** Extra options. */
  options?: ButtonOptions
  /** Tags of the button. */
  tags?: string[]
  /**
   * Called before the click.
   * @deprecated Use the `click` event.
   * @since 0.2.0
   */
  beforeClick?: (event: MouseEvent) => void
  /** Required identifier. */
  id: string
  /**
   * Free-form color.
   * @control text
   */
  color?: string | number
  /** @ignore */
  internal?: boolean
  /** Number or string value. */
  value?: string | number
}

const props = withDefaults(defineProps<Props>(), {
  size: 'medium',
  disabled: false,
  count: 0,
  label: 'Click',
})

const emit = defineEmits<{
  /** Fired when the button is clicked. */
  click: [event: MouseEvent]
  /** Fired when the value changes. */
  change: [value: number, previous: number]
}>()

defineSlots<{
  /** Main content of the button. */
  default?: (props: { count: number }) => unknown
  /** Icon before the label. */
  icon?: () => unknown
}>()

function focus(): void {
  emit('click', new MouseEvent('click'))
}

defineExpose({
  /** Moves focus to the button. */
  focus,
  /** Number of presses. */
  pressed: props.count,
})
</script>

<template>
  <button :disabled="disabled" @click="focus">
    <slot :count="count" />
  </button>
</template>
