<script setup lang="ts">
import type { SidebarItem } from '../sidebar'
import { useSite, withBase } from 'kawapress/client'
import { computed, shallowRef, useId, watch } from 'vue'
import { hasActiveSidebarLink, isSidebarLinkActive } from '../sidebar'

const props = defineProps<{
  item: SidebarItem
  /** Current route path; the sidebar computes it once for every link. */
  activePath: string
}>()

const emit = defineEmits<{
  navigate: []
}>()

const site = useSite()
const itemsId = useId()
const href = computed(() => (
  props.item.link === undefined
    ? undefined
    : withBase(props.item.link, site.value.base)
))
const isActive = computed(() => (
  props.item.link !== undefined
  && isSidebarLinkActive(props.item.link, props.activePath)
))
const hasItems = computed(() => Boolean(props.item.items?.length))
const isCollapsible = computed(() => hasItems.value && props.item.collapsed !== undefined)
const holdsActivePage = computed(() => hasItems.value && hasActiveSidebarLink(props.item, props.activePath))
const isOpen = shallowRef(props.item.collapsed !== true || holdsActivePage.value)

// Navigating into a closed group opens it, so the current page stays visible.
watch(holdsActivePage, (active) => {
  if (active) {
    isOpen.value = true
  }
})

function toggle(): void {
  isOpen.value = !isOpen.value
}
</script>

<template>
  <li
    class="nagi-sidebar-item"
    :class="{
      'nagi-sidebar-item--group': hasItems,
      'nagi-sidebar-item--collapsible': isCollapsible,
      'is-open': isCollapsible && isOpen,
    }"
  >
    <div class="nagi-sidebar-item__header">
      <!-- A plain anchor: the core link interceptor turns same-origin clicks into
      router navigations, and resolving every link against the route table here
      would cost O(pages) per page. -->
      <a
        v-if="item.link"
        :href="href"
        class="nagi-sidebar-item__link"
        :class="{ 'is-active': isActive }"
        :aria-current="isActive ? 'page' : undefined"
        @click="emit('navigate')"
      >
        {{ item.text }}
      </a>
      <p v-else-if="!isCollapsible" class="nagi-sidebar-item__text">
        {{ item.text }}
      </p>
      <!-- A group without a link folds from its title; a linked group keeps the
      link and folds from the caret alone. -->
      <button
        v-if="isCollapsible"
        type="button"
        class="nagi-sidebar-item__toggle"
        :class="{ 'nagi-sidebar-item__toggle--text': !item.link }"
        :aria-label="item.link ? item.text : undefined"
        :aria-expanded="isOpen"
        :aria-controls="itemsId"
        @click="toggle"
      >
        <span v-if="!item.link" class="nagi-sidebar-item__text">{{ item.text }}</span>
        <svg class="nagi-sidebar-item__caret" aria-hidden="true" viewBox="0 0 24 24">
          <path d="m9 6 6 6-6 6" />
        </svg>
      </button>
    </div>

    <!-- Closed groups stay in the HTML, so their links are still crawlable. -->
    <ul v-if="hasItems" v-show="!isCollapsible || isOpen" :id="itemsId" class="nagi-sidebar-item__items">
      <SidebarItem
        v-for="(child, index) in item.items"
        :key="child.link ?? `${child.text}-${index}`"
        :item="child"
        :active-path="activePath"
        @navigate="emit('navigate')"
      />
    </ul>
  </li>
</template>
