<script setup lang="ts">
// Built-in card template. Copy it as the starting point of your own: satori only
// understands a subset of CSS, so every element that holds more than one child
// needs `display: flex`, and styles go in `style` attributes.
import { computed } from 'vue'

const props = defineProps<{
  title: string
  description: string
  siteTitle: string
  lang: string
  routePath: string
  url: string
  frontmatter: Record<string, unknown>
}>()

const ACCENT = '#4f46e5'
const WIDE_CHARACTER_RE = /[\u1100-\u115F\u2E80-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFF60\uFFE0-\uFFE6]/u

/** Width of the title in Latin characters: a CJK character is as wide as two. */
const titleWidth = computed(() => [...props.title].reduce((width, char) => width + (WIDE_CHARACTER_RE.test(char) ? 2 : 1), 0))
const titleSize = computed(() => titleWidth.value > 48 ? '58px' : titleWidth.value > 28 ? '68px' : '80px')
const address = computed(() => props.url.replace(/^https?:\/\//, '').replace(/\/$/, ''))
</script>

<template>
  <div
    :style="{
      width: '100%',
      height: '100%',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      paddingTop: '72px',
      paddingRight: '88px',
      paddingBottom: '64px',
      paddingLeft: '88px',
      backgroundColor: '#fafaf9',
      backgroundImage: 'radial-gradient(circle at 100% 0%, rgba(79, 70, 229, 0.16) 0%, rgba(79, 70, 229, 0) 60%)',
      color: '#18181b',
      fontFamily: 'Figtree',
    }"
  >
    <div :style="{ display: 'flex', alignItems: 'center', fontSize: '30px', fontWeight: 600, color: '#3f3f46' }">
      <div :style="{ width: '14px', height: '14px', borderRadius: '4px', backgroundColor: ACCENT, marginRight: '18px' }" />
      {{ siteTitle }}
    </div>

    <div :style="{ display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'center' }">
      <div
        :style="{
          display: 'block',
          fontSize: titleSize,
          fontWeight: 700,
          lineHeight: 1.12,
          letterSpacing: '-0.025em',
          lineClamp: 2,
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
          lineHeight: 1.45,
          color: '#52525b',
          lineClamp: 2,
        }"
      >
        {{ description }}
      </div>
    </div>

    <div
      :style="{
        display: 'flex',
        alignItems: 'center',
        paddingTop: '28px',
        borderTop: '2px solid #e4e4e7',
        fontSize: '24px',
        fontWeight: 500,
        color: '#71717a',
      }"
    >
      <div :style="{ width: '32px', height: '4px', borderRadius: '2px', backgroundColor: ACCENT, marginRight: '18px' }" />
      {{ address }}
    </div>
  </div>
</template>
