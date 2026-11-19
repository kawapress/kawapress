<script setup lang="ts">
import type { Component } from 'vue'
import type { LoadedRepl } from './runtime'
import { useAppearance } from 'kawapress/client'
import { computed, markRaw, onBeforeUnmount, onMounted, shallowRef, useTemplateRef } from 'vue'

interface Props {
  files: { name: string, code: string }[]
  /** Name of the entry file. */
  main: string
  /** Height of the REPL in pixels. */
  height: number
  /** Link to play.vuejs.org, built at build time so it needs no REPL. */
  playground: string
  config: {
    editor: 'codemirror' | 'monaco'
    eager: boolean
    importMap?: { imports?: Record<string, string>, scopes?: Record<string, Record<string, string>> }
    previewStyles?: string[]
  }
  labels: {
    region: string
    run: string
    loading: string
    playground: string
    failed: string
  }
}

const props = defineProps<Props>()

type Status = 'idle' | 'loading' | 'failed' | 'ready'

const { isDark } = useAppearance()
const status = shallowRef<Status>('idle')
const loaded = shallowRef<{ Repl: Component, editor: Component, store: LoadedRepl['store'] }>()
const root = useTemplateRef<HTMLElement>('root')

let observer: IntersectionObserver | undefined
let disposed = false

const previewOptions = computed(() => ({
  headHTML: (props.config.previewStyles ?? [])
    .map(href => `<link rel="stylesheet" href="${escapeAttribute(href)}">`)
    .join('\n'),
}))

onMounted(() => {
  if (!props.config.eager) {
    return
  }
  if (typeof IntersectionObserver === 'undefined') {
    void run()
    return
  }
  observer = new IntersectionObserver((entries) => {
    if (entries.some(entry => entry.isIntersecting)) {
      observer?.disconnect()
      void run()
    }
  }, { rootMargin: '200px' })
  if (root.value) {
    observer.observe(root.value)
  }
})

onBeforeUnmount(() => {
  disposed = true
  observer?.disconnect()
})

async function run(): Promise<void> {
  // Only the browser runs the REPL. Naming it here keeps the server and the
  // llms.txt builds from bundling an editor they never start.
  if (import.meta.env.SSR || status.value === 'loading' || status.value === 'ready') {
    return
  }
  status.value = 'loading'
  try {
    // The only road to `@vue/repl`: nothing imports it before this runs.
    const { loadRepl } = await import('./runtime')
    const repl = await loadRepl({
      files: props.files,
      main: props.main,
      editor: props.config.editor,
      importMap: props.config.importMap,
    })
    if (disposed) {
      return
    }
    loaded.value = { Repl: markRaw(repl.Repl), editor: markRaw(repl.editor), store: repl.store }
    status.value = 'ready'
  }
  catch (error) {
    console.error('[kawapress] Could not load @vue/repl.', error)
    if (!disposed) {
      status.value = 'failed'
    }
  }
}

function escapeAttribute(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')
}
</script>

<template>
  <figure ref="root" class="kawa-vue-repl" :data-status="status" :aria-label="labels.region">
    <div v-if="status !== 'ready'" class="kawa-vue-repl__source">
      <div
        v-for="(file, index) in files"
        :key="file.name"
        class="kawa-vue-repl__file"
      >
        <p v-if="files.length > 1" class="kawa-vue-repl__name">
          {{ file.name }}
        </p>
        <slot :name="`file-${index}`" />
      </div>
    </div>

    <div
      v-if="loaded"
      class="kawa-vue-repl__stage"
      :style="{ height: `${height}px` }"
    >
      <component
        :is="loaded.Repl"
        :store="loaded.store"
        :editor="loaded.editor"
        :theme="isDark ? 'dark' : 'light'"
        :preview-theme="true"
        :show-compile-output="false"
        :show-import-map="false"
        :show-ts-config="false"
        :clear-console="false"
        :editor-options="{ showErrorText: false, autoSaveText: false }"
        :preview-options="previewOptions"
      />
    </div>

    <div class="kawa-vue-repl__bar">
      <button
        v-if="status !== 'ready'"
        type="button"
        class="kawa-vue-repl__run"
        :disabled="status === 'loading'"
        @click="run"
      >
        {{ status === 'loading' ? labels.loading : labels.run }}
      </button>
      <a
        class="kawa-vue-repl__playground"
        :href="playground"
        target="_blank"
        rel="noopener"
      >{{ labels.playground }}</a>
      <p v-if="status === 'failed'" class="kawa-vue-repl__error" role="alert">
        {{ labels.failed }}
      </p>
    </div>
  </figure>
</template>
