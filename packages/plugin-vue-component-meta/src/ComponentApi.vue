<script setup lang="ts">
import type { ApiSection } from './api-table'
import type { ComponentApiLabels } from './labels'
import type { ComponentDoc } from './types'
import { computed } from 'vue'
import { buildApiModel, renderApiMarkdown } from './api-table'

const props = defineProps<{
  doc: ComponentDoc
  labels: ComponentApiLabels
  /** Render one section only. */
  only?: ApiSection
}>()

// The llms build compiles pages with this flag on. The tables are plain HTML
// there too, but handing over Markdown directly keeps the cells exact.
const isSsgMarkdown = import.meta.env.SSG_MD
const model = computed(() => buildApiModel(props.doc, props.labels, props.only))
const markdown = computed(() => renderApiMarkdown(model.value))
</script>

<template>
  <div v-if="isSsgMarkdown" data-kawa-ssg-md-raw>
    {{ markdown }}
  </div>
  <section v-else class="kawa-component-api" :aria-label="labels.region">
    <p v-if="model.notice" class="kawa-component-api__notice">
      {{ model.notice }}
    </p>
    <template v-for="table in model.tables" :key="table.section">
      <h3 class="kawa-component-api__title">
        {{ table.title }}
      </h3>
      <div class="kawa-component-api__scroll">
        <table class="kawa-component-api__table" :data-section="table.section">
          <thead>
            <tr>
              <th v-for="column in table.columns" :key="column" scope="col">
                {{ column }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, rowIndex) in table.rows" :key="rowIndex">
              <td v-for="(cell, cellIndex) in row" :key="cellIndex">
                <component
                  :is="cell.strike ? 'del' : 'span'"
                  v-if="cell.text"
                  :class="{ 'kawa-component-api__code': cell.code }"
                >
                  <code v-if="cell.code">{{ cell.text }}</code>
                  <template v-else>
                    {{ cell.text }}
                  </template>
                </component>
                <span
                  v-for="note in cell.notes"
                  :key="note.kind"
                  class="kawa-component-api__note"
                  :class="`kawa-component-api__note--${note.kind}`"
                >
                  {{ note.text }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </section>
</template>
