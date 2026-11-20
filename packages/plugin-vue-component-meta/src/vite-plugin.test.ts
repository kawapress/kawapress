import type { Plugin } from 'vite'
import type { ComponentDoc } from './types'
import { cpSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { build, createServer } from 'vite'
import { describe, expect, it } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { ComponentDocService } from './checker'
import { ENGLISH_COMPONENT_API_LABELS } from './labels'
import { createComponentDocVitePlugin } from './vite-plugin'

const PACKAGE = fileURLToPath(new URL('..', import.meta.url))
const API_COMPONENT = join(PACKAGE, 'src/ComponentApi.vue')

function createPlugins(root: string): Plugin[] {
  const service = new ComponentDocService({ root })
  return [
    createComponentDocVitePlugin({ service, apiComponent: API_COMPONENT }),
    vue(),
  ]
}

async function startServer(root: string) {
  return createServer({
    root,
    configFile: false,
    logLevel: 'silent',
    appType: 'custom',
    server: { middlewareMode: true, ws: false },
    optimizeDeps: { noDiscovery: true },
    plugins: createPlugins(root),
  })
}

describe('component doc vite plugin', () => {
  it('serves the doc and a table component in the dev server', async () => {
    const root = join(PACKAGE, 'fixtures')
    const server = await startServer(root)
    try {
      const entry = await server.ssrLoadModule('/entry.ts') as { doc: ComponentDoc, Api: object }

      expect(entry.doc.name).toBe('Button')
      expect(entry.doc.props.map(prop => prop.name)).toContain('size')

      const html = await renderToString(createSSRApp({
        render: () => h(entry.Api, { labels: ENGLISH_COMPONENT_API_LABELS }),
      }))
      // `only=props` from the import query.
      expect(html).toContain('data-section="props"')
      expect(html).not.toContain('data-section="events"')
    }
    finally {
      await server.close()
    }
  })

  it('reads the new source after a hot update', async () => {
    const root = mkdtempSync(join(tmpdir(), 'kawa-meta-hmr-'))
    cpSync(join(PACKAGE, 'fixtures'), root, { recursive: true })
    symlinkSync(join(PACKAGE, 'node_modules'), join(root, 'node_modules'))
    const plugins = createPlugins(root)
    const server = await createServer({
      root,
      configFile: false,
      logLevel: 'silent',
      appType: 'custom',
      server: { middlewareMode: true, ws: false },
      optimizeDeps: { noDiscovery: true },
      plugins,
    })
    try {
      const names = async () => (
        (await server.ssrLoadModule('/entry.ts') as { doc: ComponentDoc }).doc.props.map(prop => prop.name)
      )
      expect(await names()).toContain('size')

      const file = join(root, 'Button.vue')
      writeFileSync(file, readFileSync(file, 'utf8').replace('size?: ButtonSize', 'sizeRenamed?: ButtonSize'))
      const hook = (plugins[0] as { hotUpdate: { handler: (this: unknown, options: unknown) => unknown } }).hotUpdate.handler
      const updated = hook.call({ environment: server.environments.ssr }, { type: 'update', file, modules: [] }) as unknown[]

      // The doc module is part of the update, so the page refreshes the table.
      expect(updated.length).toBeGreaterThan(0)
      const after = await names()
      expect(after).toContain('sizeRenamed')
      expect(after).not.toContain('size')
    }
    finally {
      await server.close()
    }
  })

  it('bundles the doc as JSON without the checker', async () => {
    const root = join(PACKAGE, 'fixtures')
    const result = await build({
      root,
      configFile: false,
      logLevel: 'silent',
      plugins: createPlugins(root),
      build: {
        write: false,
        minify: false,
        lib: { entry: join(root, 'entry.ts'), formats: ['es'], fileName: 'entry' },
        rollupOptions: { external: ['vue'] },
      },
    })
    const output = (Array.isArray(result) ? result : [result as never]).flatMap(
      (item: { output: { type: string, code?: string }[] }) => item.output,
    )
    const code = output.map(chunk => chunk.code ?? '').join('\n')

    expect(code).toMatch(/"name": "Button"/)
    // Region comments name this package's own folder, so look at what is imported and called.
    expect(code).not.toMatch(/from "(?:typescript|vue-component-meta|@volar|@vue\/language-core)/)
    expect(code).not.toMatch(/createChecker|getComponentMeta|ts\.createLanguageService/)
  })
})
