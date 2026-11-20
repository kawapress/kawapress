<script setup lang="ts">
import type { PluginCategory } from '../plugins/plugin-catalog'
import type { MarketPlugin } from '../plugins/plugins.data'
import { RouterLink } from 'kawapress/client'
import { computed, ref } from 'vue'
import { categoryLabels } from '../plugins/plugin-catalog'

const props = defineProps<{
  plugins: MarketPlugin[]
  locale: 'zhCN' | 'en'
}>()

const TEXT = {
  zhCN: {
    all: '全部',
    filters: '按类别筛选',
    installOnly: '只看需要安装的',
    inNagi: 'nagi 已内置',
    docs: '文档',
    copy: '复制安装命令',
    copied: '已复制',
    empty: '这个类别下没有需要安装的插件。',
  },
  en: {
    all: 'All',
    filters: 'Filter by category',
    installOnly: 'Only plugins to install',
    inNagi: 'Included in nagi',
    docs: 'Docs',
    copy: 'Copy install command',
    copied: 'Copied',
    empty: 'No plugin in this category needs installing.',
  },
} as const

const text = computed(() => TEXT[props.locale])
const docsPrefix = computed(() => props.locale === 'en' ? '/en' : '')

const categories = computed(() => {
  const used = new Set(props.plugins.map(plugin => plugin.category))
  return (Object.keys(categoryLabels) as PluginCategory[]).filter(category => used.has(category))
})

const activeCategory = ref<PluginCategory | 'all'>('all')
const installOnly = ref(false)

const visiblePlugins = computed(() => props.plugins.filter(plugin =>
  (activeCategory.value === 'all' || plugin.category === activeCategory.value)
  && (!installOnly.value || !plugin.inNagi),
))

/** Splits `code` spans out of a description so they render as `<code>`. */
function segments(description: string): Array<{ code: boolean, text: string }> {
  return description.split('`').map((part, index) => ({ code: index % 2 === 1, text: part }))
}

function shortName(name: string): string {
  return name.replace('@kawapress/', '')
}

const copiedName = ref<string>()
let copiedTimer: ReturnType<typeof setTimeout> | undefined

async function copyInstall(name: string): Promise<void> {
  await navigator.clipboard.writeText(`npm install --save-dev ${name}`)
  copiedName.value = name
  clearTimeout(copiedTimer)
  copiedTimer = setTimeout(() => {
    copiedName.value = undefined
  }, 1500)
}
</script>

<template>
  <div class="plugin-market">
    <div class="plugin-market__toolbar">
      <div class="plugin-market__filters" role="group" :aria-label="text.filters">
        <button
          type="button"
          class="plugin-market__filter"
          :aria-pressed="activeCategory === 'all'"
          @click="activeCategory = 'all'"
        >
          {{ text.all }}
        </button>
        <button
          v-for="category in categories"
          :key="category"
          type="button"
          class="plugin-market__filter"
          :aria-pressed="activeCategory === category"
          @click="activeCategory = category"
        >
          {{ categoryLabels[category][locale] }}
        </button>
      </div>
      <label class="plugin-market__toggle">
        <input v-model="installOnly" type="checkbox">
        {{ text.installOnly }}
      </label>
    </div>

    <ul class="plugin-market__grid">
      <li v-for="plugin in visiblePlugins" :key="plugin.name" class="plugin-market__card">
        <div class="plugin-market__head">
          <h3 class="plugin-market__name">
            {{ shortName(plugin.name) }}
          </h3>
          <span class="plugin-market__version">v{{ plugin.version }}</span>
        </div>
        <p class="plugin-market__description">
          <template v-for="(segment, index) in segments(plugin.description[locale])" :key="index">
            <code v-if="segment.code">{{ segment.text }}</code>
            <template v-else>
              {{ segment.text }}
            </template>
          </template>
        </p>
        <div class="plugin-market__meta">
          <span class="plugin-market__category">{{ categoryLabels[plugin.category][locale] }}</span>
          <span v-if="plugin.inNagi" class="plugin-market__nagi">{{ text.inNagi }}</span>
        </div>
        <div class="plugin-market__actions">
          <button
            v-if="!plugin.inNagi"
            type="button"
            class="plugin-market__copy"
            :aria-label="`${text.copy}: ${plugin.name}`"
            @click="copyInstall(plugin.name)"
          >
            {{ copiedName === plugin.name ? text.copied : text.copy }}
          </button>
          <RouterLink v-if="plugin.docs" class="plugin-market__link" :to="`${docsPrefix}${plugin.docs}`">
            {{ text.docs }}
          </RouterLink>
          <a
            class="plugin-market__link"
            :href="`https://www.npmjs.com/package/${plugin.name}`"
            target="_blank"
            rel="noreferrer"
          >npm</a>
        </div>
      </li>
    </ul>
    <p v-if="visiblePlugins.length === 0" class="plugin-market__empty">
      {{ text.empty }}
    </p>
  </div>
</template>

<style scoped>
.plugin-market {
  margin-top: 1.5rem;
}

.plugin-market__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1.5rem;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
}

.plugin-market__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.plugin-market__filter {
  padding: 0.25rem 0.75rem;
  border: 1px solid var(--kawa-c-border);
  border-radius: 999px;
  background: transparent;
  color: var(--kawa-c-text-2);
  font: inherit;
  font-size: 0.875rem;
  cursor: pointer;
}

.plugin-market__filter:hover {
  color: var(--kawa-c-text-1);
}

.plugin-market__filter[aria-pressed='true'] {
  border-color: var(--kawa-c-brand);
  color: var(--kawa-c-brand);
}

.plugin-market__toggle {
  display: inline-flex;
  gap: 0.4rem;
  align-items: center;
  color: var(--kawa-c-text-2);
  font-size: 0.875rem;
  cursor: pointer;
}

.plugin-market__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr));
  gap: 1rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.plugin-market__card {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin: 0;
  padding: 1rem 1.1rem;
  border: 1px solid var(--kawa-c-border);
  border-radius: var(--kawa-radius);
  background: var(--kawa-c-bg-soft);
}

.plugin-market__head {
  display: flex;
  gap: 0.5rem;
  align-items: baseline;
  justify-content: space-between;
}

.plugin-market__name {
  margin: 0;
  border: 0;
  padding: 0;
  font-family: var(--kawa-font-mono);
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--kawa-c-text-1);
}

.plugin-market__version {
  color: var(--kawa-c-text-3);
  font-family: var(--kawa-font-mono);
  font-size: 0.8rem;
}

.plugin-market__description {
  flex: 1;
  margin: 0;
  color: var(--kawa-c-text-2);
  font-size: 0.875rem;
  line-height: 1.6;
}

.plugin-market__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  font-size: 0.75rem;
}

.plugin-market__category,
.plugin-market__nagi {
  padding: 0.05rem 0.5rem;
  border-radius: 999px;
  border: 1px solid var(--kawa-c-divider);
  color: var(--kawa-c-text-2);
}

.plugin-market__nagi {
  border-color: var(--kawa-c-brand);
  color: var(--kawa-c-brand);
}

.plugin-market__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  font-size: 0.85rem;
}

.plugin-market__copy {
  padding: 0.2rem 0.6rem;
  border: 1px solid var(--kawa-c-border);
  border-radius: var(--kawa-radius);
  background: var(--kawa-c-bg);
  color: var(--kawa-c-text-1);
  font: inherit;
  cursor: pointer;
}

.plugin-market__copy:hover {
  border-color: var(--kawa-c-brand);
}

.plugin-market__link {
  color: var(--kawa-c-brand);
  text-decoration: none;
}

.plugin-market__link:hover {
  text-decoration: underline;
}

.plugin-market__empty {
  color: var(--kawa-c-text-3);
}
</style>
