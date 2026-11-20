<script setup lang="ts">
import type { ComponentDemoLabels } from './labels'
import { computed, onBeforeUnmount, shallowRef } from 'vue'

const props = defineProps<{
  labels: ComponentDemoLabels
  expanded: boolean
  /** ID of the source panel the expand button controls. */
  controls: string
  /** Text the copy button puts on the clipboard. */
  code: string
}>()

defineEmits<{ toggle: [] }>()

const COPIED_MS = 2000

const copied = shallowRef(false)
const announcement = computed(() => (copied.value ? props.labels.copied : ''))
let timer: ReturnType<typeof setTimeout> | undefined

onBeforeUnmount(() => {
  clearTimeout(timer)
})

async function copy(): Promise<void> {
  try {
    await navigator.clipboard.writeText(props.code)
  }
  catch {
    return
  }
  copied.value = true
  clearTimeout(timer)
  timer = setTimeout(() => {
    copied.value = false
  }, COPIED_MS)
}
</script>

<template>
  <div class="kawa-component-demo__toolbar">
    <button
      type="button"
      class="kawa-component-demo__button"
      :aria-controls="controls"
      :aria-expanded="expanded"
      @click="$emit('toggle')"
    >
      {{ expanded ? labels.collapse : labels.expand }}
    </button>
    <button
      type="button"
      class="kawa-component-demo__button"
      :data-copied="copied || undefined"
      @click="copy"
    >
      {{ copied ? labels.copied : labels.copy }}
    </button>
    <span class="kawa-component-demo__status" aria-live="polite">{{ announcement }}</span>
  </div>
</template>
