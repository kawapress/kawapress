import type { RawMeta, RawSchema } from './normalize'
import { describe, expect, it } from 'vitest'
import { inferControl, normalizeComponentMeta, stripUndefined } from './normalize'

function enumOf(type: string, ...schema: unknown[]): RawSchema {
  return { kind: 'enum', type, schema }
}

describe('control inference', () => {
  it('maps a literal union to select, ignoring undefined', () => {
    expect(inferControl({
      type: '"a" | "b" | undefined',
      schema: enumOf('"a" | "b" | undefined', 'undefined', '"a"', '"b"'),
    })).toEqual({ kind: 'select', options: ['a', 'b'] })
  })

  it('maps number literals to select with numbers', () => {
    expect(inferControl({
      type: '1 | 2',
      schema: enumOf('1 | 2', '1', '2'),
    })).toEqual({ kind: 'select', options: [1, 2] })
  })

  it('maps boolean, number and text', () => {
    expect(inferControl({ type: 'boolean', schema: 'boolean' })).toEqual({ kind: 'boolean' })
    expect(inferControl({ type: 'boolean | undefined', schema: enumOf('', 'undefined', 'false', 'true') })).toEqual({ kind: 'boolean' })
    expect(inferControl({ type: 'number | undefined', schema: enumOf('', 'undefined', 'number') })).toEqual({ kind: 'number' })
    expect(inferControl({ type: 'string', schema: 'string' })).toEqual({ kind: 'text' })
  })

  it('maps objects, arrays and mixed unions to json', () => {
    expect(inferControl({ type: 'Foo', schema: { kind: 'object', type: 'Foo', schema: {} } })).toEqual({ kind: 'json' })
    expect(inferControl({ type: 'string[]', schema: { kind: 'array', type: 'string[]', schema: ['string'] } })).toEqual({ kind: 'json' })
    expect(inferControl({ type: 'string | number', schema: enumOf('', 'string', 'number') })).toEqual({ kind: 'json' })
    expect(inferControl({ type: 'any', schema: 'any' })).toEqual({ kind: 'json' })
  })

  it('maps functions and framework types to none', () => {
    expect(inferControl({
      type: '(() => void) | undefined',
      schema: enumOf('', 'undefined', { kind: 'event', type: '(): void', schema: [] }),
    })).toEqual({ kind: 'none' })
    expect(inferControl({ type: 'VNode', schema: { kind: 'object', type: 'VNode', schema: {} } })).toEqual({ kind: 'none' })
    expect(inferControl({ type: 'undefined', schema: 'undefined' })).toEqual({ kind: 'none' })
  })

  it('falls back to the type text without a schema', () => {
    expect(inferControl({ type: 'boolean | undefined' })).toEqual({ kind: 'boolean' })
    expect(inferControl({ type: 'number' })).toEqual({ kind: 'number' })
  })
})

describe('type text', () => {
  it('strips undefined and wrapping parentheses', () => {
    expect(stripUndefined('string | undefined')).toBe('string')
    expect(stripUndefined('string | number | undefined')).toBe('string | number')
    expect(stripUndefined('((event: Event) => void) | undefined')).toBe('(event: Event) => void')
    expect(stripUndefined('(a: string) => (b: number)')).toBe('(a: string) => (b: number)')
  })
})

describe('normalizing a component', () => {
  const empty: RawMeta = { props: [], events: [], slots: [], exposed: [] }

  it('marks a generic component without readable props as unsupported', () => {
    expect(normalizeComponentMeta(empty, { fallbackName: 'List', generic: true }).unsupported).toBe('generic')
    expect(normalizeComponentMeta(empty, { fallbackName: 'List' }).unsupported).toBeUndefined()
  })

  it('does not treat global props as readable props of a generic component', () => {
    const doc = normalizeComponentMeta({
      ...empty,
      props: [{ name: 'key', global: true, type: 'string', schema: 'string' }],
    }, { fallbackName: 'List', generic: true })

    expect(doc.unsupported).toBe('generic')
    expect(doc.props).toEqual([])
  })

  it('ignores an unknown @control value and keeps the inferred one', () => {
    const doc = normalizeComponentMeta({
      ...empty,
      props: [{ name: 'a', type: 'string', schema: 'string', tags: [{ name: 'control', text: 'knob' }] }],
    }, { fallbackName: 'X' })

    expect(doc.props[0].control).toEqual({ kind: 'text' })
  })
})
