import type { EventLogEntry, PlaygroundDoc } from './playground-types'
import { describe, expect, it } from 'vitest'
import {
  appendLog,
  buildSnippet,
  EVENT_LOG_LIMIT,
  formatPayload,
  parseDefault,
  resolveInitialArgs,
  safeStringify,
  toHandlerKey,
} from './playground'

function prop(name: string, extra: Partial<PlaygroundDoc['props'][number]> = {}): PlaygroundDoc['props'][number] {
  return { name, type: 'string', required: false, description: '', control: { kind: 'text' }, ...extra }
}

const DOC: PlaygroundDoc = {
  name: 'Button',
  props: [
    prop('label', { required: true }),
    prop('size', { default: '\'medium\'', control: { kind: 'select', options: ['small', 'medium'] } }),
    prop('disabled', { default: 'false', control: { kind: 'boolean' } }),
    prop('count', { default: '0', control: { kind: 'number' } }),
    prop('items', { default: '() => []', control: { kind: 'json' } }),
    prop('loading', { default: 'true', control: { kind: 'boolean' } }),
  ],
  events: [],
}

describe('parseDefault', () => {
  it('reads literals and skips everything else', () => {
    expect(parseDefault('\'medium\'')).toEqual({ value: 'medium' })
    expect(parseDefault('"a \\"b\\""')).toEqual({ value: 'a "b"' })
    expect(parseDefault('42')).toEqual({ value: 42 })
    expect(parseDefault('-1.5')).toEqual({ value: -1.5 })
    expect(parseDefault('true')).toEqual({ value: true })
    expect(parseDefault('false')).toEqual({ value: false })
    expect(parseDefault('null')).toEqual({ value: null })
    expect(parseDefault('`plain`')).toEqual({ value: 'plain' })
    // eslint-disable-next-line no-template-curly-in-string
    expect(parseDefault('`a${b}`')).toBeUndefined()
    expect(parseDefault('() => []')).toBeUndefined()
    expect(parseDefault('{ a: 1 }')).toBeUndefined()
    expect(parseDefault('undefined')).toBeUndefined()
    expect(parseDefault(undefined)).toBeUndefined()
  })
})

describe('resolveInitialArgs', () => {
  it('prefers the props attribute over defaults and leaves other props unset', () => {
    const args = resolveInitialArgs(DOC, { label: 'Submit', size: 'small' })

    expect(args).toEqual({
      label: 'Submit',
      size: 'small',
      disabled: false,
      count: 0,
      loading: true,
    })
    expect('items' in args).toBe(false)
  })

  it('is the same on every call', () => {
    expect(resolveInitialArgs(DOC, { label: 'a' })).toEqual(resolveInitialArgs(DOC, { label: 'a' }))
  })
})

describe('buildSnippet', () => {
  it('writes only args that differ from the defaults', () => {
    const snippet = buildSnippet('Button', DOC, {
      label: 'Submit',
      size: 'small',
      disabled: true,
      count: 0,
      loading: true,
    })

    expect(snippet.code).toBe('<Button label="Submit" size="small" disabled />')
  })

  it('binds numbers, objects and false-over-true defaults', () => {
    const snippet = buildSnippet('Button', DOC, {
      label: 'A "q" & <b>',
      count: 3,
      items: [{ id: 1 }],
      loading: false,
    })

    expect(snippet.code).toBe('<Button\n  label="A &quot;q&quot; &amp; <b>"\n  :count="3"\n  :items=\'[{"id":1}]\'\n  :loading="false"\n/>')
  })

  it('writes args that no prop declares, in kebab-case', () => {
    expect(buildSnippet('Button', DOC, { dataId: 'x' }).code).toBe('<Button data-id="x" />')
    expect(buildSnippet('Button', DOC, {}).code).toBe('<Button />')
  })

  it('breaks a long tag into one attribute per line', () => {
    const snippet = buildSnippet('Button', DOC, { label: 'x'.repeat(60), size: 'small', disabled: true })

    expect(snippet.code).toBe(`<Button\n  label="${'x'.repeat(60)}"\n  size="small"\n  disabled\n/>`)
  })

  it('highlights with plain token spans and escapes the text', () => {
    const { html } = buildSnippet('Button', DOC, { label: 'a<b' })

    expect(html).toMatch(/^<pre class="kawa-playground-code"><code class="language-vue">/)
    expect(html).toContain('<span class="kawa-playground-token kawa-playground-token--tag">Button</span>')
    expect(html).toContain('<span class="kawa-playground-token kawa-playground-token--attr">label</span>')
    expect(html).toContain('"a&lt;b"')
    expect(html).not.toContain('a<b')
  })
})

describe('event log', () => {
  it('keeps the latest entries only', () => {
    let log: EventLogEntry[] = []
    for (let id = 0; id < EVENT_LOG_LIMIT + 5; id++) {
      log = appendLog(log, { id, name: 'press', payload: String(id) })
    }

    expect(log).toHaveLength(EVENT_LOG_LIMIT)
    expect(log[0].id).toBe(5)
    expect(log.at(-1)?.id).toBe(EVENT_LOG_LIMIT + 4)
  })

  it('formats payloads safely', () => {
    const circular: Record<string, unknown> = { name: 'loop' }
    circular.self = circular

    expect(formatPayload([])).toBe('')
    expect(formatPayload([3])).toBe('3')
    expect(formatPayload([1, 'a'])).toBe('[1,"a"]')
    expect(safeStringify(circular)).toBe('{"name":"loop","self":"[Circular]"}')
    expect(safeStringify(undefined)).toBe('undefined')
    expect(safeStringify(10n)).toBe('"10n"')
    expect(safeStringify({ press: () => {} }.press)).toBe('"[Function press]"')
    expect(safeStringify('x'.repeat(500))).toHaveLength(160)
    expect(safeStringify('x'.repeat(500)).endsWith('…')).toBe(true)
  })

  it('maps event names to listener keys', () => {
    expect(toHandlerKey('press')).toBe('onPress')
    expect(toHandlerKey('update:modelValue')).toBe('onUpdate:modelValue')
    expect(toHandlerKey('item-click')).toBe('onItemClick')
  })
})
