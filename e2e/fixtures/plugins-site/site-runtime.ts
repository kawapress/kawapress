import { defineRuntimePlugin } from 'kawapress'
import SiteConfigProbe from './site-kit/SiteConfigProbe.vue'

export default defineRuntimePlugin({
  name: 'plugins-site-local-runtime',
  setup(api) {
    api.vueApp((app) => {
      app.component('SiteConfigProbe', SiteConfigProbe)
    })
  },
})
