import { defineRuntimePlugin } from 'kawapress'
import ShowcaseLayout from './ShowcaseLayout.vue'

export default defineRuntimePlugin({
  name: '@kawapress/e2e-plugins-site',
  setup(api) {
    api.vueApp((app) => {
      app.component('showcase', ShowcaseLayout)
    })
  },
})
