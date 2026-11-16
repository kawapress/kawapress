import { describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import { resolveCustomLayout } from './custom-layout'
import { resolveNagiPageOptions } from './frontmatter'

const ComponentDocs = defineComponent({ name: 'ComponentDocs', render: () => null })

describe('custom layouts', () => {
  it('keeps any layout name and false from frontmatter', () => {
    expect(resolveNagiPageOptions({ layout: 'component-docs' }).layout).toBe('component-docs')
    expect(resolveNagiPageOptions({ layout: false }).layout).toBe(false)
    expect(resolveNagiPageOptions({ layout: '' }).layout).toBe('doc')
    expect(resolveNagiPageOptions({ layout: 3 as never }).layout).toBe('doc')
  })

  it('finds a registered component by the name as written, camelCase or PascalCase', () => {
    expect(resolveCustomLayout('component-docs', { 'component-docs': ComponentDocs })).toBe(ComponentDocs)
    expect(resolveCustomLayout('component-docs', { componentDocs: ComponentDocs })).toBe(ComponentDocs)
    expect(resolveCustomLayout('component-docs', { ComponentDocs })).toBe(ComponentDocs)
  })

  it('leaves built-in layouts, false and unknown names to nagi', () => {
    const components = { doc: ComponentDocs, page: ComponentDocs }

    expect(resolveCustomLayout('doc', components)).toBeUndefined()
    expect(resolveCustomLayout('page', components)).toBeUndefined()
    expect(resolveCustomLayout(false, components)).toBeUndefined()
    expect(resolveCustomLayout('missing', components)).toBeUndefined()
  })
})
