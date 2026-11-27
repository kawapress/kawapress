import { Buffer } from 'node:buffer'
import { access, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { get } from 'node:http'
import { join } from 'node:path'
import process from 'node:process'
import { consola } from 'consola'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildSite } from '../../kawapress/src/server/build'
import { createDevServer } from '../../kawapress/src/server/dev'

const temporaryDirectories: string[] = []

afterEach(async () => {
  vi.restoreAllMocks()
  await Promise.all(temporaryDirectories.splice(0).map(directory => (
    rm(directory, { force: true, recursive: true })
  )))
})

const PLUGIN_ENTRY = '../../packages/plugin-og-image/src/index'

describe('og-image plugin', () => {
  it('renders cards, writes head tags, and honours every opt-out', async () => {
    const root = await createSite({
      pluginOptions: `{ hostname: 'https://example.com', exclude: ['/private/**'], remoteFonts: false }`,
      config: `
  base: '/docs/',
  locales: {
    root: { label: 'Root', lang: 'en' },
    zh: {
      label: '中文',
      lang: 'zh-CN',
      head: [['meta', { property: 'og:image', content: 'https://example.com/zh.png' }]],
    },
  },
`,
    })
    await mkdir(join(root, 'private'))
    await mkdir(join(root, 'zh'))
    await Promise.all([
      writeFile(join(root, 'index.md'), '# Home\n'),
      writeFile(join(root, 'guide.md'), '---\ndescription: A & B <guide>\n---\n# Guide\n'),
      writeFile(join(root, 'private/secret.md'), '# Secret\n'),
      writeFile(join(root, 'skipped.md'), '---\nogImage: false\n---\n# Skipped\n'),
      writeFile(join(root, 'own.md'), '---\nhead:\n  - - meta\n    - property: og:image\n      content: https://example.com/own.png\n---\n# Own\n'),
      writeFile(join(root, 'zh/index.md'), '# 中文首页\n'),
    ])

    await buildSite(root)

    const cards = await listFiles(join(root, 'dist/og'))
    expect(cards).toEqual(['guide.png', 'index.png'])
    const png = await readFile(join(root, 'dist/og/guide.png'))
    expect(png.readUInt32BE(16)).toBe(1200)
    expect(png.readUInt32BE(20)).toBe(630)

    const guide = await readFile(join(root, 'dist/guide.html'), 'utf8')
    expect(guide).toContain('<meta property="og:image" content="https://example.com/docs/og/guide.png">')
    expect(guide).toContain('<meta property="og:image:width" content="1200">')
    expect(guide).toContain('<meta property="og:image:height" content="630">')
    expect(guide).toContain('<meta name="twitter:card" content="summary_large_image">')
    expect(guide).toContain('<meta name="twitter:image" content="https://example.com/docs/og/guide.png">')

    for (const page of ['private/secret', 'skipped']) {
      expect(await readFile(join(root, `dist/${page}.html`), 'utf8')).not.toContain('og:image')
    }
    const own = await readFile(join(root, 'dist/own.html'), 'utf8')
    expect(own.match(/property="og:image"/g)).toHaveLength(1)
    expect(own).toContain('https://example.com/own.png')
    const zh = await readFile(join(root, 'dist/zh.html'), 'utf8')
    expect(zh).toContain('https://example.com/zh.png')
    expect(zh).not.toContain('/docs/og/')
    await expect(access(join(root, 'dist/.kawapress'))).rejects.toThrow()
  }, 120_000)

  it('renders cards for plugin pages and matches exclude against their sourcePath', async () => {
    const root = await createSite({
      pluginOptions: `{ hostname: 'https://example.com', exclude: ['plugin-pages/api/hidden.md'], remoteFonts: false }`,
      withPluginPages: true,
    })
    await writeFile(join(root, 'index.md'), '# Home\n')

    await buildSite(root)

    expect(await listFiles(join(root, 'dist/og'))).toEqual(['api/core.png', 'index.png'])
    expect(await readFile(join(root, 'dist/api/core.html'), 'utf8'))
      .toContain('<meta property="og:image" content="https://example.com/og/api/core.png">')
    expect(await readFile(join(root, 'dist/api/hidden.html'), 'utf8')).not.toContain('og:image')
  }, 120_000)

  it('renders a custom Vue template with local images and warns about missing glyphs', async () => {
    const warn = vi.spyOn(consola, 'warn').mockImplementation(() => {})
    const root = await createSite({
      pluginOptions: `{ hostname: 'https://example.com', template: 'card.vue', remoteFonts: false }`,
    })
    await Promise.all([
      writeFile(join(root, 'card.vue'), `
<script setup lang="ts">
defineProps<{ title: string, siteTitle: string, lang: string }>()
</script>

<template>
  <div :style="{ display: 'flex', width: '100%', height: '100%', backgroundColor: '#ff0000', fontFamily: 'Figtree' }">
    <img src="/mark.svg" width="64" height="64">
    <div :style="{ display: 'block', fontSize: '48px', color: '#ffffff' }">{{ siteTitle }} {{ title }} {{ lang }}</div>
  </div>
</template>
`),
      mkdir(join(root, 'public')).then(() => writeFile(join(root, 'public/mark.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#00ff00"/></svg>')),
      writeFile(join(root, 'index.md'), '# 你好\n'),
    ])

    await buildSite(root)

    const png = await readFile(join(root, 'dist/og/index.png'))
    expect(png.readUInt32BE(16)).toBe(1200)
    const message = warn.mock.calls.map(call => String(call[0])).find(text => text.includes('OG Image'))
    expect(message).toContain('/  你好')
    expect(message).toContain('"fonts" option')

    // A second build reuses the card: its file is the one cached on the first build.
    const cacheDirectory = join(root, 'node_modules/.cache/kawapress-og-image')
    const cached = await readdir(cacheDirectory)
    expect(cached).toHaveLength(1)
    await rm(join(root, 'dist'), { force: true, recursive: true })
    const log = vi.spyOn(consola, 'success')
    await buildSite(root)
    expect(log.mock.calls.map(call => String(call[0])).some(text => text.includes('(1 from cache)'))).toBe(true)
    expect(await readdir(cacheDirectory)).toEqual(cached)
  }, 120_000)

  it('fails on a missing template and on a missing hostname', async () => {
    const { ogImagePlugin } = await import('./plugin')
    expect(() => ogImagePlugin({} as never)).toThrow('"hostname" option is required')

    const root = await createSite({
      pluginOptions: `{ hostname: 'https://example.com', template: 'nope.vue' }`,
    })
    await writeFile(join(root, 'index.md'), '# Home\n')
    await expect(buildSite(root)).rejects.toThrow('template "nope.vue" does not exist')
  }, 120_000)

  it('previews cards in dev without writing head tags', async () => {
    const root = await createSite({ pluginOptions: `{ hostname: 'https://example.com', remoteFonts: false }` })
    await writeFile(join(root, 'index.md'), '# Home\n')
    await writeFile(join(root, 'guide.md'), '# Guide\n')
    const server = await createDevServer(root, { hmr: false, port: 0 })

    try {
      const before = await request(server.port, '/__og-image/guide.png')
      expect(before.status).toBe(404)

      const page = await request(server.port, '/guide')
      expect(page.status).toBe(200)
      // The page module compiles on demand; loading it records the page data.
      await request(server.port, '/guide.md', { 'sec-fetch-dest': 'script' })

      const card = await request(server.port, '/__og-image/guide.png')
      expect(card.status, card.body.toString('utf8')).toBe(200)
      expect(card.contentType).toBe('image/png')
      expect(card.body.readUInt32BE(16)).toBe(1200)
      expect(page.body.toString('utf8')).not.toContain('og:image')
    }
    finally {
      await server.close()
    }
  }, 120_000)
})

function configSource(pluginOptions: string, extra = '', withPluginPages = false): string {
  return `
import { definePlugin } from 'kawapress'
import { nagi } from 'kawapress/nagi'
import ogImage from '${PLUGIN_ENTRY}'

const pluginPages = definePlugin({
  name: 'plugin-pages',
  setup(api) {
    api.pages('/api/[name]', () => [
      { name: 'core', markdown: '# Core API\\n' },
      { name: 'hidden', markdown: '# Hidden API\\n' },
    ])
  },
})

export default nagi({
  title: 'Kawa Docs',
${extra}
  plugins: [ogImage(${pluginOptions})${withPluginPages ? ', pluginPages' : ''}],
})
`
}

async function createSite(options: { pluginOptions: string, config?: string, withPluginPages?: boolean }): Promise<string> {
  const root = await mkdtemp(join(process.cwd(), 'docs/kawapress-og-image-'))
  temporaryDirectories.push(root)
  await writeFile(join(root, 'kawapress.config.ts'), configSource(options.pluginOptions, options.config, options.withPluginPages))
  return root
}

async function listFiles(directory: string): Promise<string[]> {
  return (await readdir(directory, { recursive: true })).filter(name => name.endsWith('.png')).sort()
}

interface TestResponse {
  body: Buffer
  contentType: string
  status: number
}

function request(
  port: number,
  path: string,
  headers: Record<string, string> = {},
): Promise<TestResponse> {
  return new Promise((resolve, reject) => {
    get({ host: 'localhost', port, path, headers: { connection: 'close', ...headers } }, (response) => {
      const chunks: Buffer[] = []
      response.on('data', chunk => chunks.push(chunk))
      response.on('end', () => resolve({
        body: Buffer.concat(chunks),
        contentType: String(response.headers['content-type'] ?? ''),
        status: response.statusCode ?? 0,
      }))
    }).on('error', reject)
  })
}
