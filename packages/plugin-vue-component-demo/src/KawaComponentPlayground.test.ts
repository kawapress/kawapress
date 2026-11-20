// @vitest-environment happy-dom

import type { App } from 'vue'
import type { PlaygroundDoc } from './playground-types'
import { afterEach, describe, expect, it } from 'vitest'
import { createApp, createSSRApp, defineComponent, h, nextTick } from 'vue'
import { renderToString } from 'vue/server-renderer'
import KawaComponentPlayground from './KawaComponentPlayground.vue'
import { ENGLISH_COMPONENT_DEMO_LABELS } from './labels'

const WIDGET = defineComponent({
  name: 'Widget',
  props: {
    label: String,
    size: String,
    kind: String,
    disabled: Boolean,
    count: Number,
    items: Array,
    modelValue: Number,
  },
  emits: ['press', 'update:modelValue'],
  setup(props, { emit }) {
    return () => h('button', {
      'class': 'widget',
      'data-label': props.label,
      'data-size': props.size,
      'data-model': props.modelValue,
      'onClick': () => {
        emit('press', 1)
        emit('update:modelValue', (props.modelValue ?? 0) + 1)
      },
    }, props.label)
  },
})

const DOC: PlaygroundDoc = {
  name: 'Widget',
  props: [
    { name: 'label', type: 'string', required: true, description: 'Visible text.', control: { kind: 'text' } },
    { name: 'size', type: '\'s\' | \'m\'', required: false, default: '\'m\'', description: '', control: { kind: 'select', options: ['s', 'm'] } },
    { name: 'kind', type: 'string', required: false, description: '', control: { kind: 'select', options: ['a', 'b', 'c', 'd', 'e', 'f'] } },
    { name: 'disabled', type: 'boolean', required: false, default: 'false', description: '', control: { kind: 'boolean' } },
    { name: 'count', type: 'number', required: false, description: '', control: { kind: 'number' } },
    { name: 'items', type: 'string[]', required: false, description: '', control: { kind: 'json' } },
    { name: 'modelValue', type: 'number', required: false, description: '', control: { kind: 'number' } },
    { name: 'onPress', type: '() => void', required: false, description: '', control: { kind: 'none' } },
  ],
  events: [
    { name: 'press', description: '', type: '[times: number]' },
    { name: 'update:modelValue', description: '', type: '[value: number]' },
  ],
}

let app: App<Element> | undefined

afterEach(() => {
  app?.unmount()
  app = undefined
  document.body.innerHTML = ''
})

function playground(initialProps: Record<string, unknown> = { label: 'Submit' }) {
  return () => h(KawaComponentPlayground, {
    component: WIDGET,
    doc: DOC,
    fallbackName: 'Widget',
    initialProps,
    labels: ENGLISH_COMPONENT_DEMO_LABELS,
  })
}

function mount(initialProps?: Record<string, unknown>): HTMLElement {
  const host = document.createElement('div')
  document.body.append(host)
  app = createApp({ render: playground(initialProps) })
  app.mount(host)
  return host
}

async function type(input: Element, value: string): Promise<void> {
  ;(input as HTMLInputElement).value = value
  input.dispatchEvent(new Event('input'))
  await nextTick()
}

describe('kawaComponentPlayground', () => {
  it('renders the stage, one control per editable prop and the live snippet on the server', async () => {
    const html = await renderToString(createSSRApp({ render: playground() }))

    expect(html).toContain('class="widget"')
    expect(html).toContain('data-label="Submit"')
    expect(html).toContain('data-size="m"')
    // switch, number, text, radios (<= 5), select (> 5), json; `none` is left out.
    expect(html).toContain('role="switch"')
    expect(html).toContain('type="number"')
    expect(html).toContain('type="text"')
    expect(html).toContain('role="radiogroup"')
    expect(html).toContain('<select')
    expect(html).toContain('<textarea')
    expect(html).not.toContain('onPress')
    // Hint and required mark.
    expect(html).toContain('Visible text.')
    expect(html).toContain('kawa-playground-control__required')
    // The snippet is a plain highlighted block with the args that differ from defaults.
    expect(html).toContain('class="language-vue"')
    expect(html).toContain('&lt;')
    expect(html).toContain('aria-live="polite"')
  })

  it('matches between the server and the first client render', async () => {
    const html = await renderToString(createSSRApp({ render: playground() }))
    const host = document.createElement('div')
    host.innerHTML = html
    document.body.append(host)
    const warnings: unknown[] = []
    const original = console.warn
    console.warn = (...parts: unknown[]) => warnings.push(parts)
    try {
      app = createSSRApp({ render: playground() })
      app.mount(host)
      await nextTick()
    }
    finally {
      console.warn = original
    }

    expect(warnings).toEqual([])
  })

  it('applies a control change to the stage and the snippet', async () => {
    const host = mount()

    await type(host.querySelector('input[type="text"]')!, 'Go')
    const radio = host.querySelectorAll<HTMLInputElement>('input[type="radio"]')[0]
    radio.checked = true
    radio.dispatchEvent(new Event('change'))
    const toggle = host.querySelector<HTMLInputElement>('input[role="switch"]')!
    toggle.checked = true
    toggle.dispatchEvent(new Event('change'))
    await type(host.querySelector('input[type="number"]')!, '3')
    await nextTick()

    expect(host.querySelector('.widget')?.getAttribute('data-label')).toBe('Go')
    expect(host.querySelector('.widget')?.getAttribute('data-size')).toBe('s')
    expect(host.querySelector('code.language-vue')?.textContent).toBe('<Widget label="Go" size="s" disabled :count="3" />')
  })

  it('applies json only while it parses and marks invalid text', async () => {
    const host = mount()
    const area = host.querySelector('textarea')!

    await type(area, '[1, 2')
    expect(area.getAttribute('aria-invalid')).toBe('true')
    expect(host.textContent).toContain(ENGLISH_COMPONENT_DEMO_LABELS.invalidJson)
    expect(host.querySelector('code.language-vue')?.textContent).not.toContain(':items')

    await type(area, '["a"]')
    expect(area.getAttribute('aria-invalid')).toBeNull()
    expect(host.querySelector('code.language-vue')?.textContent).toContain(':items=\'["a"]\'')
  })

  it('logs events with their payload, keeps the latest 20 and clears', async () => {
    const host = mount()
    const widget = host.querySelector<HTMLElement>('.widget')!

    for (let index = 0; index < 12; index++) {
      widget.click()
      await nextTick()
    }
    const lines = host.querySelectorAll('.kawa-playground__log-line')
    expect(lines).toHaveLength(20)
    expect(lines[0].textContent).toContain('press')
    expect(lines[0].textContent).toContain('1')
    expect(host.querySelector('[role="log"]')?.getAttribute('aria-live')).toBe('polite')

    const clear = [...host.querySelectorAll('button')].find(button => button.textContent?.trim() === 'Clear')!
    clear.click()
    await nextTick()
    expect(host.querySelectorAll('.kawa-playground__log-line')).toHaveLength(0)
    expect(host.textContent).toContain(ENGLISH_COMPONENT_DEMO_LABELS.noEvents)
  })

  it('feeds update:modelValue back into the args', async () => {
    const host = mount()
    const widget = host.querySelector<HTMLElement>('.widget')!

    widget.click()
    await nextTick()
    widget.click()
    await nextTick()

    expect(host.querySelector('.widget')?.getAttribute('data-model')).toBe('2')
    expect(host.querySelector<HTMLInputElement>('input[type="number"]:last-of-type')?.value).toBeDefined()
    expect(host.querySelector('code.language-vue')?.textContent).toContain(':model-value="2"')
  })

  it('restores the initial args on reset, including the json text', async () => {
    const host = mount()
    await type(host.querySelector('input[type="text"]')!, 'Changed')
    await type(host.querySelector('textarea')!, '[1]')
    host.querySelector<HTMLElement>('.widget')!.click()
    await nextTick()

    const reset = [...host.querySelectorAll('button')].find(button => button.textContent?.trim() === 'Reset')!
    reset.click()
    await nextTick()

    expect(host.querySelector('code.language-vue')?.textContent).toBe('<Widget label="Submit" />')
    expect(host.querySelector('textarea')?.value).toBe('')
    expect(host.querySelector<HTMLInputElement>('input[type="text"]')?.value).toBe('Submit')
  })

  it('copies the snippet through the toolbar', async () => {
    const host = mount()
    let copied = ''
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async (text: string) => { copied = text } },
    })

    const copy = [...host.querySelectorAll('button')].find(button => button.textContent?.trim() === 'Copy source')!
    copy.click()
    await nextTick()

    expect(copied).toBe('<Widget label="Submit" />')
  })
})
