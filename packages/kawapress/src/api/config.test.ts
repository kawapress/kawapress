import type { KawaPressPlugin } from './plugin'
import { describe, expect, it } from 'vitest'
import { definePreset } from './config'

function plugin(name: string, tag = name): KawaPressPlugin {
  return { name, setup: () => {}, tag } as KawaPressPlugin & { tag: string }
}

function tags(plugins: KawaPressPlugin[] | undefined): string[] {
  return (plugins ?? []).map(item => (item as KawaPressPlugin & { tag: string }).tag)
}

describe('definePreset', () => {
  const preset = definePreset({
    title: 'Preset',
    plugins: [plugin('theme'), plugin('highlight'), plugin('search')],
  })

  it('adds user plugins after the preset plugins', () => {
    expect(tags(preset({ plugins: [plugin('math')] }).plugins))
      .toEqual(['theme', 'highlight', 'search', 'math'])
  })

  it('replaces a preset plugin of the same name in its place', () => {
    expect(tags(preset({ plugins: [plugin('math'), plugin('highlight', 'custom highlight')] }).plugins))
      .toEqual(['theme', 'custom highlight', 'search', 'math'])
  })

  it('keeps a second plugin of a replaced name so the duplicate is reported', () => {
    expect(tags(preset({ plugins: [plugin('highlight', 'first'), plugin('highlight', 'second')] }).plugins))
      .toEqual(['theme', 'first', 'search', 'second'])
  })

  it('lets user config override preset config', () => {
    expect(preset({ title: 'Site' }).title).toBe('Site')
    expect(tags(preset().plugins)).toEqual(['theme', 'highlight', 'search'])
  })
})
