<script setup lang="ts">
import type { ComponentDemoLabels } from './labels'
import { onMounted, shallowRef, useId } from 'vue'
import DemoSource from './DemoSource.vue'
import DemoToolbar from './DemoToolbar.vue'

const props = defineProps<{
  /** Highlighted source and the code for the copy button. */
  source: { html: string, code: string }
  /** Whether the source starts expanded. */
  expandSource: boolean
  /** Render the demo in the browser only. */
  clientOnly: boolean
  labels: ComponentDemoLabels
}>()

const expanded = shallowRef(props.expandSource)
// The server and the first client render agree on the placeholder, and the
// demo takes its place once the page is interactive.
const mounted = shallowRef(false)
const sourceId = useId()

onMounted(() => {
  mounted.value = true
})
</script>

<template>
  <figure class="kawa-component-demo">
    <div class="kawa-component-demo__stage">
      <slot v-if="!clientOnly || mounted" />
      <p v-else class="kawa-component-demo__placeholder">
        {{ labels.loading }}
      </p>
    </div>

    <!-- A controls panel goes here: it is another piece between the stage and the caption. -->
    <slot name="controls" />

    <figcaption v-if="$slots.title || $slots.description" class="kawa-component-demo__caption">
      <!-- Not <p>: themes space paragraphs inside the content area. -->
      <div v-if="$slots.title" class="kawa-component-demo__title">
        <slot name="title" />
      </div>
      <div v-if="$slots.description" class="kawa-component-demo__description">
        <slot name="description" />
      </div>
    </figcaption>

    <DemoToolbar
      :labels="labels"
      :expanded="expanded"
      :controls="sourceId"
      :code="source.code"
      @toggle="expanded = !expanded"
    />
    <DemoSource :id="sourceId" :html="source.html" :expanded="expanded" />
  </figure>
</template>
