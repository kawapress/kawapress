import type { App, Component } from 'vue'
import { readFile } from 'node:fs/promises'
import { describe, expect, it, vi } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import runtimePlugin from './runtime-plugin'

async function registeredBadge(): Promise<Component> {
  const components = new Map<string, Component>()
  const app = { component: (name: string, component: Component) => components.set(name, component) }
  const vueApp = vi.fn((handler: (app: App) => void) => handler(app as unknown as App))

  await runtimePlugin.setup({
    prependToOutlet: vi.fn(),
    appendToOutlet: vi.fn(),
    router: vi.fn(),
    vueApp,
  })
  return components.get('Badge')!
}

async function render(props: Record<string, unknown>, slot?: string): Promise<string> {
  const Badge = await registeredBadge()
  const html = await renderToString(createSSRApp({
    render: () => h(Badge, props, slot ? () => slot : undefined),
  }))
  // Drops the fragment markers SSR writes around slot content.
  return html.replaceAll(/<!--[[\]]-->/g, '')
}

describe('badge runtime plugin', () => {
  it('is discoverable through the package exports', async () => {
    const packageJson = JSON.parse(
      await readFile(new URL('../package.json', import.meta.url), 'utf8'),
    ) as { name: string, exports: Record<string, { import: string }> }

    expect(packageJson.name).toBe(runtimePlugin.name)
    expect(packageJson.exports['./runtime-plugin'].import)
      .toBe('./src/runtime-plugin.ts')
  })

  it('registers <Badge> with the VitePress props, tip by default', async () => {
    expect(await render({ text: 'New' }))
      .toBe('<span class="kawa-badge kawa-badge--tip">New</span>')
    expect(await render({ type: 'danger', text: 'Removed' }))
      .toBe('<span class="kawa-badge kawa-badge--danger">Removed</span>')
  })

  it('shows the slot content instead of the text', async () => {
    expect(await render({ type: 'info' }, 'Custom'))
      .toBe('<span class="kawa-badge kawa-badge--info">Custom</span>')
  })
})
