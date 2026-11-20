<script setup lang="ts">
import type { ComponentDemoLabels } from './labels'
import type { PlaygroundDoc } from './playground-types'

/**
 * The props of a playground as a plain table. Only the page `.md` output uses
 * it: the rendered page shows the controls instead.
 */
defineProps<{
  doc: PlaygroundDoc
  labels: ComponentDemoLabels
}>()
</script>

<template>
  <table v-if="doc.props.length > 0">
    <thead>
      <tr>
        <th>{{ labels.propName }}</th>
        <th>{{ labels.propType }}</th>
        <th>{{ labels.propDefault }}</th>
        <th>{{ labels.propDescription }}</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="prop in doc.props" :key="prop.name">
        <td><code>{{ prop.name }}</code>{{ prop.required ? ' *' : '' }}</td>
        <td><code>{{ prop.type }}</code></td>
        <td><code v-if="prop.default !== undefined">{{ prop.default }}</code></td>
        <td>{{ prop.description }}</td>
      </tr>
    </tbody>
  </table>
</template>
