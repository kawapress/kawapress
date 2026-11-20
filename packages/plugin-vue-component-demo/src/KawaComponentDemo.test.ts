// @vitest-environment happy-dom

import type { App } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, createSSRApp, h, nextTick } from 'vue'
import { renderToString } from 'vue/server-renderer'
import KawaComponentDemo from './KawaComponentDemo.vue'
import { ENGLISH_COMPONENT_DEMO_LABELS } from './labels'

const SOURCE = { html: '<pre class="shiki"><code>&lt;template /&gt;</code></pre>', code: '<template />' }

let app: App<Element> | undefined

afterEach(() => {
  app?.unmount()
  app = undefined
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

function demo(props: { expandSource?: boolean, clientOnly?: boolean } = {}, withCaption = true) {
  return () => h(KawaComponentDemo, {
    source: SOURCE,
    expandSource: false,
    clientOnly: false,
    labels: ENGLISH_COMPONENT_DEMO_LABELS,
    ...props,
  }, {
    default: () => h('button', { class: 'the-demo' }, 'Demo'),
    ...(withCaption
      ? {
          title: () => 'Title',
          description: () => 'Description',
        }
      : {}),
  })
}

function mount(props: Parameters<typeof demo>[0] = {}, withCaption = true): HTMLElement {
  const host = document.createElement('div')
  document.body.append(host)
  app = createApp({ render: demo(props, withCaption) })
  app.mount(host)
  return host
}

describe('kawaComponentDemo', () => {
  it('renders the demo, the caption, the toolbar and a collapsed source on the server', async () => {
    const html = await renderToString(createSSRApp({ render: demo() }))

    expect(html).toContain('<figure class="kawa-component-demo">')
    expect(html).toContain('class="the-demo"')
    expect(html).toContain('<figcaption')
    expect(html).toContain('Title')
    expect(html).toContain('Description')
    expect(html).toContain('Show source')
    expect(html).toContain('Copy source')
    expect(html).toContain('<pre class="shiki">')
    expect(html).toMatch(/class="kawa-component-demo__source" hidden/)
  })

  it('leaves out the caption when there is neither title nor description', async () => {
    const html = await renderToString(createSSRApp({ render: demo({}, false) }))

    expect(html).not.toContain('figcaption')
  })

  it('starts expanded with expandSource', async () => {
    const html = await renderToString(createSSRApp({ render: demo({ expandSource: true }) }))

    expect(html).toContain('Hide source')
    expect(html).not.toMatch(/kawa-component-demo__source"? hidden/)
  })

  it('renders only a placeholder for a client-only demo on the server', async () => {
    const html = await renderToString(createSSRApp({ render: demo({ clientOnly: true }) }))

    expect(html).toContain('Loading demo…')
    expect(html).not.toContain('the-demo')
    // The source and the caption are static, so they are still there.
    expect(html).toContain('<pre class="shiki">')
    expect(html).toContain('Title')
  })

  it('renders a client-only demo after mounting', async () => {
    const host = mount({ clientOnly: true })
    await nextTick()

    expect(host.querySelector('.the-demo')).not.toBeNull()
    expect(host.textContent).not.toContain('Loading demo…')
  })

  it('shows and hides the source with a button that points at the panel', async () => {
    const host = mount()
    const [toggle] = host.querySelectorAll<HTMLButtonElement>('button.kawa-component-demo__button')
    const panel = host.querySelector<HTMLElement>('.kawa-component-demo__source')!

    expect(toggle.getAttribute('aria-controls')).toBe(panel.id)
    expect(panel.hidden).toBe(true)

    toggle.click()
    await nextTick()
    expect(panel.hidden).toBe(false)
    expect(toggle.textContent?.trim()).toBe('Hide source')

    toggle.click()
    await nextTick()
    expect(panel.hidden).toBe(true)
    expect(toggle.textContent?.trim()).toBe('Show source')
  })

  it('copies the source code and announces it', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const host = mount()
    const copy = host.querySelectorAll<HTMLButtonElement>('button.kawa-component-demo__button')[1]

    copy.click()
    await vi.waitFor(() => expect(copy.textContent?.trim()).toBe('Copied'))

    expect(writeText).toHaveBeenCalledWith('<template />')
    expect(host.querySelector('.kawa-component-demo__status')?.textContent).toBe('Copied')
    vi.unstubAllGlobals()
  })

  it('gives every button an accessible name and uses no ARIA roles', async () => {
    const host = mount()

    for (const button of host.querySelectorAll('button.kawa-component-demo__button')) {
      expect(button.textContent?.trim()).not.toBe('')
    }
    expect(host.querySelector('[role]')).toBeNull()
  })
})
