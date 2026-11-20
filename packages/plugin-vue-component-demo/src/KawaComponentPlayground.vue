<script setup lang="ts">
import type { Component } from 'vue'
import type { ComponentDemoLabels } from './labels'
import type { EventLogEntry, PlaygroundArgs, PlaygroundDoc } from './playground-types'
import { computed, shallowRef } from 'vue'
import KawaComponentDemo from './KawaComponentDemo.vue'
import {
  appendLog,
  buildSnippet,
  formatPayload,
  resolveInitialArgs,
  toHandlerKey,
} from './playground'
import PlaygroundControl from './PlaygroundControl.vue'

const props = defineProps<{
  /** The component that is shown and tuned. */
  component: Component
  /** Description of the component from the meta plugin. */
  doc: PlaygroundDoc
  /** Name used in the snippet when the doc has none, normally the file name. */
  fallbackName: string
  /** Args from the `props` attribute of the tag. */
  initialProps: PlaygroundArgs
  labels: ComponentDemoLabels
}>()

const initial = computed(() => resolveInitialArgs(props.doc, props.initialProps))
const args = shallowRef<PlaygroundArgs>(initial.value)
const log = shallowRef<EventLogEntry[]>([])
let nextLogId = 0

const name = computed(() => props.doc.name || props.fallbackName)
const controls = computed(() => props.doc.props.filter(prop => prop.control.kind !== 'none'))
const snippet = computed(() => {
  const { code, html } = buildSnippet(name.value, props.doc, args.value)
  return { code, html }
})

function setArg(key: string, value: unknown): void {
  const next = { ...args.value }
  if (value === undefined) {
    delete next[key]
  }
  else {
    next[key] = value
  }
  args.value = next
}

/**
 * A listener for every event of the component. `update:foo` of a prop `foo`
 * also feeds the new value back, so `v-model` (and `v-model:foo`) works.
 */
const listeners = computed(() => {
  const propNames = new Set(props.doc.props.map(prop => prop.name))
  const handlers: Record<string, (...payload: unknown[]) => void> = {}
  for (const event of props.doc.events) {
    const target = event.name.startsWith('update:') ? event.name.slice('update:'.length) : undefined
    handlers[toHandlerKey(event.name)] = (...payload) => {
      log.value = appendLog(log.value, {
        id: nextLogId++,
        name: event.name,
        payload: formatPayload(payload),
      })
      if (target && propNames.has(target)) {
        setArg(target, payload[0])
      }
    }
  }
  return handlers
})

function reset(): void {
  args.value = initial.value
}
</script>

<template>
  <KawaComponentDemo
    :source="snippet"
    expand-source
    :client-only="false"
    :labels="labels"
  >
    <div class="kawa-playground">
      <div class="kawa-playground__stage">
        <component :is="component" v-bind="{ ...args, ...listeners }" />
      </div>

      <div class="kawa-playground__side">
        <section class="kawa-playground__panel" :aria-label="labels.controls">
          <header class="kawa-playground__panel-header">
            <h4 class="kawa-playground__heading">
              {{ labels.controls }}
            </h4>
            <button type="button" class="kawa-component-demo__button" @click="reset">
              {{ labels.reset }}
            </button>
          </header>
          <PlaygroundControl
            v-for="prop in controls"
            :key="prop.name"
            :prop="prop"
            :value="args[prop.name]"
            :labels="labels"
            @change="setArg(prop.name, $event)"
          />
        </section>

        <section v-if="doc.events.length > 0" class="kawa-playground__panel kawa-playground__events">
          <header class="kawa-playground__panel-header">
            <h4 class="kawa-playground__heading">
              {{ labels.events }}
            </h4>
            <button type="button" class="kawa-component-demo__button" :disabled="log.length === 0" @click="log = []">
              {{ labels.clearEvents }}
            </button>
          </header>
          <ol class="kawa-playground__log" role="log" aria-live="polite" :aria-label="labels.events">
            <li v-for="entry in log" :key="entry.id" class="kawa-playground__log-line">
              <code class="kawa-playground__log-name">{{ entry.name }}</code>
              <code v-if="entry.payload" class="kawa-playground__log-payload">{{ entry.payload }}</code>
            </li>
          </ol>
          <p v-if="log.length === 0" class="kawa-playground__empty">
            {{ labels.noEvents }}
          </p>
        </section>
      </div>
    </div>

    <template v-if="$slots.title" #title>
      <slot name="title" />
    </template>
    <template v-if="$slots.description" #description>
      <slot name="description" />
    </template>
  </KawaComponentDemo>
</template>
