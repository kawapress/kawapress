import { defineRuntimePlugin } from 'kawapress'
import AppearanceProbe from './AppearanceProbe.vue'
import ShowcaseLayout from './ShowcaseLayout.vue'
import TeleportNote from './TeleportNote.vue'

export default defineRuntimePlugin({
  name: '@kawapress/e2e-plugins-site',
  setup(api) {
    api.vueApp((app) => {
      app.component('AppearanceProbe', AppearanceProbe)
      app.component('showcase', ShowcaseLayout)
      app.component('TeleportNote', TeleportNote)
    })
  },
})
