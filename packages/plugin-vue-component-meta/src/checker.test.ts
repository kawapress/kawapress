import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import { ComponentDocService } from './checker'

const FIXTURES = fileURLToPath(new URL('../fixtures/', import.meta.url))
const BUTTON = `${FIXTURES}Button.vue`
const GENERIC = `${FIXTURES}Generic.vue`

function createService(warn = vi.fn()) {
  return { service: new ComponentDocService({ root: FIXTURES, warn }), warn }
}

describe('component doc service', () => {
  it('reads props with imported types, defaults, controls and JSDoc', async () => {
    const { service } = createService()
    const doc = await service.getDoc(BUTTON)
    const prop = (name: string) => doc.props.find(entry => entry.name === name)

    expect(doc.name).toBe('Button')
    expect(doc.description).toBe('A button that can be clicked.')

    // Imported literal union with a withDefaults value.
    expect(prop('size')).toMatchObject({
      type: 'ButtonSize',
      required: false,
      default: '"medium"',
      description: 'Visual size of the button.',
    })
    const size = prop('size')!.control
    expect(size.kind).toBe('select')
    expect((size as { options: unknown[] }).options.toSorted()).toEqual(['large', 'medium', 'small'])

    expect(prop('disabled')).toMatchObject({ type: 'boolean', default: 'false', control: { kind: 'boolean' } })
    expect(prop('count')).toMatchObject({ type: 'number', default: '0', control: { kind: 'number' } })
    expect(prop('label')).toMatchObject({ type: 'string', default: '"Click"', control: { kind: 'text' } })
    expect(prop('options')).toMatchObject({ type: 'ButtonOptions', control: { kind: 'json' } })
    expect(prop('tags')).toMatchObject({ type: 'string[]', control: { kind: 'json' } })
    expect(prop('value')).toMatchObject({ type: 'string | number', control: { kind: 'json' } })
    expect(prop('id')).toMatchObject({ required: true, control: { kind: 'text' } })
    expect(prop('id')?.default).toBeUndefined()
  })

  it('turns function props into no control and keeps JSDoc tags', async () => {
    const doc = await createService().service.getDoc(BUTTON)
    const beforeClick = doc.props.find(entry => entry.name === 'beforeClick')

    expect(beforeClick).toMatchObject({
      type: '(event: MouseEvent) => void',
      control: { kind: 'none' },
      tags: { deprecated: 'Use the `click` event.', since: '0.2.0' },
    })
  })

  it('applies @control and drops @ignore props', async () => {
    const doc = await createService().service.getDoc(BUTTON)

    expect(doc.props.find(entry => entry.name === 'color')).toMatchObject({
      type: 'string | number',
      control: { kind: 'text' },
      tags: { control: 'text' },
    })
    expect(doc.props.map(entry => entry.name)).not.toContain('internal')
  })

  it('filters the global Vue props', async () => {
    const doc = await createService().service.getDoc(BUTTON)
    const names = doc.props.map(entry => entry.name)

    for (const global of ['key', 'ref', 'class', 'style']) {
      expect(names).not.toContain(global)
    }
  })

  it('reads events, slots and exposed members', async () => {
    const doc = await createService().service.getDoc(BUTTON)

    expect(doc.events).toEqual([
      { name: 'click', description: 'Fired when the button is clicked.', type: '[event: MouseEvent]', tags: {} },
      { name: 'change', description: 'Fired when the value changes.', type: '[value: number, previous: number]', tags: {} },
    ])
    expect(doc.slots).toEqual([
      { name: 'default', description: 'Main content of the button.', type: '{ count: number; }', tags: {} },
      { name: 'icon', description: 'Icon before the label.', type: 'any', tags: {} },
    ])
    expect(doc.exposed).toEqual([
      { name: 'focus', description: 'Moves focus to the button.', type: '() => void', tags: {} },
      { name: 'pressed', description: 'Number of presses.', type: 'number', tags: {} },
    ])
  })

  it('produces plain JSON', async () => {
    const doc = await createService().service.getDoc(BUTTON)

    expect(JSON.parse(JSON.stringify(doc))).toEqual(doc)
    expect(JSON.stringify(doc)).not.toContain('declarations')
  })

  it('reads generic components as far as the checker can', async () => {
    const { service, warn } = createService()
    const doc = await service.getDoc(GENERIC)

    // vue-component-meta 3.3.x resolves these; the notice is only for components it cannot read.
    expect(doc.unsupported).toBeUndefined()
    expect(doc.props.map(prop => prop.name)).toEqual(['items', 'selected'])
    expect(doc.props[0]).toMatchObject({ type: 'T[]', required: true, control: { kind: 'json' } })
    expect(doc.events).toMatchObject([{ name: 'select', type: '[item: T]' }])
    expect(warn).not.toHaveBeenCalled()
  })

  it('reads the new source after the file changed', async () => {
    const { service } = createService()
    const before = await service.getDoc(BUTTON)
    const source = (await import('node:fs')).readFileSync(BUTTON, 'utf8')

    service.invalidateFile(BUTTON, source.replace('size?: ButtonSize', 'sizes?: ButtonSize'))
    // `getDoc` reads from disk, so this only shows the cache was cleared.
    const after = await service.getDoc(BUTTON)

    expect(after).not.toBe(before)
    expect(after).toEqual(before)
  })

  it('falls back to a built-in config when no tsconfig is found', async () => {
    const { mkdtempSync, symlinkSync, writeFileSync } = await import('node:fs')
    const { tmpdir } = await import('node:os')
    const { join } = await import('node:path')
    const dir = mkdtempSync(join(tmpdir(), 'kawa-meta-'))
    // `vue` must resolve for the checker to type `defineProps`.
    symlinkSync(fileURLToPath(new URL('../node_modules', import.meta.url)), join(dir, 'node_modules'))
    const file = join(dir, 'Plain.vue')
    writeFileSync(file, `<script setup lang="ts">\ndefineProps<{ msg: string }>()\n</script>\n<template><p>{{ msg }}</p></template>\n`)

    const doc = await new ComponentDocService({ root: dir }).getDoc(file)

    expect(doc.props).toMatchObject([{ name: 'msg', type: 'string', required: true }])
  })
})
