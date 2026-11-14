import { describe, expect, it } from 'vitest'
import { nagi } from './index'

function pluginNames(config: ReturnType<typeof nagi>): string[] {
  return (config.plugins ?? []).map(plugin => plugin.name)
}

describe('nagi preset', () => {
  it('composes the local search by default', () => {
    expect(pluginNames(nagi())).toContain('@kawapress/plugin-search')
  })

  it('leaves the local search out with search: false and keeps the option out of the site config', () => {
    const config = nagi({ search: false, title: 'Docs' })

    expect(pluginNames(config)).not.toContain('@kawapress/plugin-search')
    expect(pluginNames(config)).toContain('@kawapress/preset-nagi')
    expect(config).not.toHaveProperty('search')
    expect(config.title).toBe('Docs')
  })

  it('keeps the plugins of the site after its own', () => {
    const site = { name: 'site-plugin', setup() {} }
    expect(pluginNames(nagi({ search: false, plugins: [site] })).at(-1)).toBe('site-plugin')
  })
})
