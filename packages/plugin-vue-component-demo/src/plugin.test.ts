import { Buffer } from 'node:buffer'
import { copyFile, mkdir, mkdtemp, readdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { get } from 'node:http'
import { join, resolve } from 'node:path'
import process from 'node:process'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildSite } from '../../kawapress/src/server/build'
import { createDevServer } from '../../kawapress/src/server/dev'

const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(directory => (
    rm(directory, { force: true, recursive: true })
  )))
})

const PLUGIN_ENTRY = '../../packages/plugin-vue-component-demo/src/index'
const META_ENTRY = '../../packages/plugin-vue-component-meta/src/index'

const BUTTON = `<script setup lang="ts">
import { ref } from 'vue'

const count = ref(0)
</script>

<template>
  <button type="button" class="demo-button" @click="count++">
    Clicked {{ count }} times
  </button>
</template>
`

const WINDOW_SIZE = `<script setup lang="ts">
const width = window.innerWidth
</script>

<template>
  <p class="window-size">{{ width }}px wide</p>
</template>
`

describe('component demo plugin on a site', () => {
  it('prerenders the demo and its source, and keeps client-only demos off the server', async () => {
    const root = await createSite(`
export default nagi({
  title: 'Demo Docs',
  vite: { resolve: { alias: { '@demos': join(import.meta.dirname, 'demos') } } },
  plugins: [demo()],
})
`)
    await mkdir(join(root, 'demos'))
    await writeFile(join(root, 'demos/ButtonBasic.vue'), BUTTON)
    await writeFile(join(root, 'demos/WindowSize.vue'), WINDOW_SIZE)
    await writeFile(join(root, 'index.md'), `---
title: Demos
---

# Demos

<ComponentDemo
  src="./demos/ButtonBasic.vue"
  title="Basic **usage**"
  description="A counter button."
/>

<ComponentDemo src="@demos/WindowSize.vue" title="Client only" client-only />
`)

    await buildSite(root)

    const html = await readFile(join(root, 'dist/index.html'), 'utf8')
    // The static demo is in the server HTML, next to its caption and toolbar.
    expect(html).toContain('class="demo-button"')
    expect(html).toContain('Clicked 0 times')
    expect(html).toContain('<strong>usage</strong>')
    expect(html).toContain('A counter button.')
    expect(html).toContain('Show source')
    expect(html).toContain('Copy source')
    // The source is highlighted by the site's Shiki, with both themes, and collapsed.
    expect(html).toMatch(/<pre[^>]*class="shiki[^"]*"[^>]*>/)
    expect(html).toContain('light-dark(')
    expect(html).toMatch(/class="kawa-component-demo__source"[^>]* hidden/)
    // The runtime plugin's styles are part of the build.
    const css = (await Promise.all((await readdir(join(root, 'dist/assets'))).filter(name => name.endsWith('.css')).map(name => readFile(join(root, 'dist/assets', name), 'utf8')))).join('')
    expect(css).toContain('.kawa-component-demo__toolbar')
    // The demo file is not compiled into the page: only the demo block's source text is there.
    expect(html.match(/kawa-component-demo__source/g)).toHaveLength(2)
    // The client-only demo is a placeholder on the server, and its module never runs there.
    expect(html).toContain('Loading demo…')
    expect(html).not.toContain('class="window-size"')

    // The page .md output has the source, no rendered demo.
    const markdown = await readFile(join(root, 'dist/index.md'), 'utf8')
    expect(markdown).toContain('**Basic usage**')
    expect(markdown).toContain('A counter button.')
    expect(markdown).toContain('```vue')
    expect(markdown).toContain('const count = ref(0)')
    expect(markdown).toContain('Clicked {{ count }} times')
    expect(markdown).not.toContain('Show source')

    // The demo files are split from the page: the client-only one into an async chunk.
    const assets = await readdir(join(root, 'dist/assets'))
    expect(assets.some(name => name.endsWith('.js'))).toBe(true)
  }, 120_000)

  it('prerenders a controls playground for a component, with its props table in the page .md', async () => {
    const root = await createSite(`
export default nagi({ title: 'Demo Docs', plugins: [meta(), demo()] })
`)
    await copyFile(join(import.meta.dirname, '../test/fixtures/Chip.vue'), join(root, 'Chip.vue'))
    await writeFile(join(root, 'index.md'), `---
title: Playground
---

# Playground

<ComponentDemo component="./Chip.vue" props='{"label":"Pick me"}' title="Chip" description="Tune the **chip**." />
`)

    await buildSite(root)

    const html = await readFile(join(root, 'dist/index.html'), 'utf8')
    // The stage renders the component with the initial args.
    expect(html).toContain('class="chip"')
    expect(html).toContain('Pick me')
    // The panel: text, radio group, switch, number; the event log; the live snippet.
    expect(html).toContain('role="switch"')
    expect(html).toContain('role="radiogroup"')
    expect(html).toContain('type="number"')
    expect(html).toContain('Text of the chip.')
    expect(html).toContain('Reset')
    expect(html).toContain('aria-live="polite"')
    expect(html).toContain('No events yet')
    expect(html).toContain('class="language-vue"')
    expect(html).toContain('<strong>chip</strong>')
    // Server and client agree on the first render, so the page carries no mismatch marker.
    expect(html).not.toContain('hydration')

    const markdown = await readFile(join(root, 'dist/index.md'), 'utf8')
    expect(markdown).toContain('**Chip**')
    expect(markdown).toMatch(/\| Prop\s+\| Type\s+\| Default \| Description\s+\|/)
    expect(markdown).toContain('label')
    expect(markdown).toContain('Text of the chip.')
    expect(markdown).not.toContain('Reset')
  }, 180_000)

  it('fails the build when a component playground is used without the meta plugin', async () => {
    const root = await createSite(`
export default nagi({ title: 'Demo Docs', plugins: [demo()] })
`)
    await copyFile(join(import.meta.dirname, '../test/fixtures/Chip.vue'), join(root, 'Chip.vue'))
    await writeFile(join(root, 'index.md'), '# Broken\n\n<ComponentDemo component="./Chip.vue" />\n')

    await expect(buildSite(root)).rejects.toThrow(/index\.md line 3: the component attribute needs @kawapress\/plugin-vue-component-meta/)
  }, 120_000)

  it('fails the build with the page and the line of a missing demo file', async () => {
    const root = await createSite(`
export default nagi({ title: 'Demo Docs', plugins: [demo()] })
`)
    await writeFile(join(root, 'index.md'), `---
title: Broken
---

Text

<ComponentDemo src="./demos/Nope.vue" />
`)

    await expect(buildSite(root)).rejects.toThrow(/index\.md line 7: cannot find the demo file/)
  }, 120_000)
})

describe('component demo plugin in the dev server', () => {
  it('serves the demo and its source, and the source follows edits to the demo file', async () => {
    const root = await createSite(`
export default nagi({ title: 'Demo Docs', plugins: [demo()] })
`)
    await mkdir(join(root, 'demos'))
    await writeFile(join(root, 'demos/ButtonBasic.vue'), BUTTON)
    await writeFile(join(root, 'index.md'), '# Demos\n\n<ComponentDemo src="./demos/ButtonBasic.vue" />\n')
    const server = await createDevServer(root, { port: 0 })

    try {
      const page = await request(server.port, '/')
      expect(page).toContain('class="demo-button"')
      expect(page).toContain('Clicked 0 times')

      const query = '/demos/ButtonBasic.vue?component-demo-source&raw'
      const before = await request(server.port, query, { 'sec-fetch-dest': 'script' })
      expect(before).toContain('const count = ref(0)')

      await writeFile(join(root, 'demos/ButtonBasic.vue'), BUTTON.replace('Clicked', 'Pressed'))
      await vi.waitFor(async () => {
        const after = await request(server.port, query, { 'sec-fetch-dest': 'script' })
        expect(after).toContain('Pressed')
      }, { timeout: 10_000 })
    }
    finally {
      await server.close()
    }
  }, 120_000)
})

function request(port: number, path: string, headers: Record<string, string> = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    get({ host: 'localhost', port, path, headers: { connection: 'close', ...headers } }, (response) => {
      const chunks: Buffer[] = []
      response.on('data', chunk => chunks.push(chunk))
      response.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    }).on('error', reject)
  })
}

async function createSite(config: string): Promise<string> {
  const root = await mkdtemp(join(process.cwd(), 'docs/kawapress-component-demo-'))
  temporaryDirectories.push(root)
  // The site finds the plugin's runtime styles through its own node_modules.
  await mkdir(join(root, 'node_modules/@kawapress'), { recursive: true })
  await symlink(resolve(import.meta.dirname, '..'), join(root, 'node_modules/@kawapress/plugin-vue-component-demo'))
  await writeFile(join(root, 'kawapress.config.ts'), `
import { get } from 'node:http'
import { join, resolve } from 'node:path'
import { nagi } from 'kawapress/nagi'
import demo from '${PLUGIN_ENTRY}'
import meta from '${META_ENTRY}'
${config}`)
  return root
}
