<script setup lang="ts">
import type { ComponentDemoLabels } from './labels'
import type { PlaygroundProp } from './playground-types'
import { computed, shallowRef, useId, watch } from 'vue'

const props = defineProps<{
  prop: PlaygroundProp
  /** Current value; `undefined` when the prop is not passed. */
  value: unknown
  labels: ComponentDemoLabels
}>()

const emit = defineEmits<{
  /** `undefined` removes the arg. */
  change: [value: unknown]
}>()

/** Up to this many options a select control is a radio group. */
const RADIO_LIMIT = 5

const id = useId()
const hintId = `${id}-hint`
const kind = computed(() => props.prop.control.kind)
const options = computed(() => (props.prop.control.kind === 'select' ? props.prop.control.options : []))
const asRadios = computed(() => options.value.length <= RADIO_LIMIT)

// A JSON control keeps its own text: it is only applied while it parses.
const jsonText = shallowRef(formatJson(props.value))
const jsonInvalid = shallowRef(false)

// A change from outside (reset, v-model) replaces the text unless it already says the same.
watch(() => props.value, (value) => {
  const current = jsonText.value.trim() === '' ? { ok: true as const, value: undefined } : parseJson(jsonText.value)
  if (!current.ok || JSON.stringify(current.value) !== JSON.stringify(value)) {
    jsonText.value = formatJson(value)
    jsonInvalid.value = false
  }
})

const selectedIndex = computed(() => options.value.findIndex(option => option === props.value))

function formatJson(value: unknown): string {
  return value === undefined ? '' : JSON.stringify(value, null, 2)
}

function parseJson(text: string): { ok: true, value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(text) }
  }
  catch {
    return { ok: false }
  }
}

function onNumber(event: Event): void {
  const text = (event.target as HTMLInputElement).value
  const number = Number(text)
  emit('change', text === '' || Number.isNaN(number) ? undefined : number)
}

function onSelect(event: Event): void {
  const index = Number((event.target as HTMLSelectElement).value)
  emit('change', options.value[index])
}

function onJson(event: Event): void {
  const text = (event.target as HTMLTextAreaElement).value
  jsonText.value = text
  if (text.trim() === '') {
    jsonInvalid.value = false
    emit('change', undefined)
    return
  }
  const parsed = parseJson(text)
  jsonInvalid.value = !parsed.ok
  if (parsed.ok) {
    emit('change', parsed.value)
  }
}
</script>

<template>
  <div class="kawa-playground-control" :data-kind="kind">
    <component :is="kind === 'select' && asRadios ? 'span' : 'label'" v-if="kind !== 'boolean'" :id="`${id}-label`" :for="kind === 'select' && asRadios ? undefined : id" class="kawa-playground-control__label">
      <span class="kawa-playground-control__name">{{ prop.name }}</span>
      <span v-if="prop.required" class="kawa-playground-control__required" :title="labels.required" aria-hidden="true">*</span>
      <span v-if="prop.required" class="kawa-component-demo__sr-only">({{ labels.required }})</span>
    </component>

    <label v-if="kind === 'boolean'" class="kawa-playground-control__switch">
      <input
        :id="id"
        type="checkbox"
        role="switch"
        :checked="value === true"
        :aria-describedby="prop.description ? hintId : undefined"
        @change="emit('change', ($event.target as HTMLInputElement).checked)"
      >
      <span class="kawa-playground-control__track" aria-hidden="true" />
      <span class="kawa-playground-control__label">
        <span class="kawa-playground-control__name">{{ prop.name }}</span>
        <span v-if="prop.required" class="kawa-playground-control__required" :title="labels.required" aria-hidden="true">*</span>
        <span v-if="prop.required" class="kawa-component-demo__sr-only">({{ labels.required }})</span>
      </span>
    </label>

    <input
      v-else-if="kind === 'number'"
      :id="id"
      class="kawa-playground-control__input"
      type="number"
      :value="typeof value === 'number' ? value : ''"
      :aria-describedby="prop.description ? hintId : undefined"
      @input="onNumber"
    >

    <input
      v-else-if="kind === 'text'"
      :id="id"
      class="kawa-playground-control__input"
      type="text"
      :value="typeof value === 'string' ? value : ''"
      :aria-describedby="prop.description ? hintId : undefined"
      @input="emit('change', ($event.target as HTMLInputElement).value)"
    >

    <div
      v-else-if="kind === 'select' && asRadios"
      class="kawa-playground-control__radios"
      role="radiogroup"
      :aria-labelledby="`${id}-label`"
      :aria-describedby="prop.description ? hintId : undefined"
    >
      <label v-for="(option, index) in options" :key="index" class="kawa-playground-control__radio">
        <input
          class="kawa-component-demo__sr-only"
          type="radio"
          :name="id"
          :checked="index === selectedIndex"
          @change="emit('change', option)"
        >
        <span class="kawa-playground-control__segment">{{ option }}</span>
      </label>
    </div>

    <select
      v-else-if="kind === 'select'"
      :id="id"
      class="kawa-playground-control__input"
      :aria-describedby="prop.description ? hintId : undefined"
      @change="onSelect"
    >
      <option v-if="selectedIndex < 0" value="" disabled selected />
      <option v-for="(option, index) in options" :key="index" :value="index" :selected="index === selectedIndex">
        {{ option }}
      </option>
    </select>

    <template v-else-if="kind === 'json'">
      <textarea
        :id="id"
        class="kawa-playground-control__input kawa-playground-control__json"
        rows="3"
        spellcheck="false"
        :value="jsonText"
        :aria-invalid="jsonInvalid || undefined"
        :aria-describedby="[prop.description ? hintId : '', jsonInvalid ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined"
        @input="onJson"
      />
      <div v-if="jsonInvalid" :id="`${id}-error`" class="kawa-playground-control__error" role="alert">
        {{ labels.invalidJson }}
      </div>
    </template>

    <div v-if="prop.description" :id="hintId" class="kawa-playground-control__hint" :title="prop.description">
      {{ prop.description }}
    </div>
  </div>
</template>
