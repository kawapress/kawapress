// @vitest-environment happy-dom

import { renderToString } from '@vue/server-renderer'
import { describe, expect, it } from 'vitest'
import { createApp, createSSRApp, defineComponent, h, nextTick } from 'vue'
import ClientOnly from './ClientOnly'

const example = defineComponent({
  setup: () => () => h(ClientOnly, () => h('span', { class: 'browser' }, 'Browser')),
})

describe('clientOnly', () => {
  it('renders nothing on the server', async () => {
    const html = await renderToString(createSSRApp(example))
    expect(html).not.toContain('Browser')
  })

  it('renders its slot after mounting in the browser', async () => {
    document.body.innerHTML = '<div id="app"></div>'
    const app = createApp(example)
    app.mount('#app')
    expect(document.querySelector('.browser')).toBeNull()
    await nextTick()
    expect(document.querySelector('.browser')?.textContent).toBe('Browser')
    app.unmount()
  })
})
