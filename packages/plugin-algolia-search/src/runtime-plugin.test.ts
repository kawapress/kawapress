import type { OutletItemInput, OutletName, RuntimePlugin } from 'kawapress'
import { describe, expect, it, vi } from 'vitest'
import AlgoliaSearch from './components/AlgoliaSearch.vue'
import runtimePlugin from './runtime-plugin'

// The component reads site data from the client entry; this test only checks
// where the plugin places it.
vi.mock('kawapress/client', () => ({}))
vi.mock('./runtime-options', () => ({ default: { appId: 'APP' } }))

describe('algolia search runtime plugin', () => {
  it('places the search button before the header controls', async () => {
    const items: { side: string, outlet: OutletName, item: OutletItemInput }[] = []
    await (runtimePlugin as RuntimePlugin).setup({
      prependToOutlet: (outlet, item) => items.push({ side: 'prepend', outlet, item }),
      appendToOutlet: (outlet, item) => items.push({ side: 'append', outlet, item }),
      router: () => {},
      vueApp: () => {},
    })

    expect(items).toEqual([{
      side: 'prepend',
      outlet: 'layout.header.end',
      item: { id: 'trigger', component: AlgoliaSearch },
    }])
  })
})
