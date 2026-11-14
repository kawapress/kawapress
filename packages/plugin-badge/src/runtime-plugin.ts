import { defineRuntimePlugin } from 'kawapress'
import Badge from './Badge.vue'
import './badge.css'

export default defineRuntimePlugin({
  name: '@kawapress/plugin-badge',
  setup(api) {
    api.vueApp((app) => {
      app.component('Badge', Badge)
    })
  },
})
