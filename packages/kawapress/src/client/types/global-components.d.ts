export {}

declare module 'vue' {
  interface GlobalComponents {
    Layout: import('vue').Component
    ClientOnly: typeof import('../components/ClientOnly')['default']
    KawaOutlet: typeof import('../components/KawaOutlet.vue')['default']
    NotFound: import('vue').Component
  }
}
