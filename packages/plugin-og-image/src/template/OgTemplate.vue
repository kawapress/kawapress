<script setup lang="ts">
// Built-in card template. Copy it as the starting point of your own: satori only
// understands a subset of CSS, so every element that holds more than one child
// needs `display: flex`, and styles go in `style` attributes.
defineProps<{
  title: string
  description: string
  siteTitle: string
  lang: string
  routePath: string
  frontmatter: Record<string, unknown>
}>()
</script>

<template>
  <div
    :style="{
      width: '100%',
      height: '100%',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '72px 80px',
      color: '#f8fafc',
      backgroundColor: '#0f172a',
      backgroundImage: 'linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #134e4a 100%)',
      fontFamily: 'Inter',
    }"
  >
    <div :style="{ display: 'flex', alignItems: 'center', fontSize: '34px', fontWeight: 700, color: '#5eead4' }">
      {{ siteTitle }}
    </div>
    <div :style="{ display: 'flex', flexDirection: 'column' }">
      <div
        :style="{
          display: 'block',
          fontSize: title.length > 40 ? '56px' : '72px',
          fontWeight: 700,
          lineHeight: 1.15,
          letterSpacing: '-0.02em',
        }"
      >
        {{ title }}
      </div>
      <div
        v-if="description"
        :style="{
          display: 'block',
          marginTop: '28px',
          fontSize: '32px',
          lineHeight: 1.4,
          color: '#cbd5e1',
          lineClamp: 3,
        }"
      >
        {{ description }}
      </div>
    </div>
    <div :style="{ display: 'flex', fontSize: '26px', color: '#94a3b8' }">
      {{ routePath }}
    </div>
  </div>
</template>
