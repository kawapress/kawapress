import { defineComponent, onMounted, shallowRef } from 'vue'

/**
 * Renders its default slot only after the browser has mounted the app.
 * Server rendering and the first client render both produce an empty node,
 * which keeps browser-only components from causing a hydration mismatch.
 */
export default defineComponent({
  name: 'ClientOnly',
  setup(_, { slots }) {
    const mounted = shallowRef(false)
    onMounted(() => {
      mounted.value = true
    })
    return () => mounted.value ? slots.default?.() : null
  },
})
