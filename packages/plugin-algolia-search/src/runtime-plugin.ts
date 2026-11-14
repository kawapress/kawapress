import { defineRuntimePlugin } from 'kawapress'
import AlgoliaSearch from './components/AlgoliaSearch.vue'
import './algolia-search.css'

export default defineRuntimePlugin({
  name: '@kawapress/plugin-algolia-search',
  setup(api) {
    api.prependToOutlet('layout.header.end', { id: 'trigger', component: AlgoliaSearch })
    api.vueApp((app) => {
      app.component('KawaAlgoliaSearch', AlgoliaSearch)
    })
  },
})
