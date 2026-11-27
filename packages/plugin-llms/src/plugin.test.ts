import type { IncomingHttpHeaders } from 'node:http'
import { access, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { get } from 'node:http'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { afterEach, describe, expect, it } from 'vitest'
import { buildSite } from '../../kawapress/src/server/build'
import { createDevServer } from '../../kawapress/src/server/dev'
import { llmsPlugin } from './plugin'

const require = createRequire(import.meta.url)
const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(directory => (
    rm(directory, { force: true, recursive: true })
  )))
})

describe('llms plugin', () => {
  it('builds faithful Markdown, locale indexes, exclusions, and SSR actions', async () => {
    const root = await createTemporaryDirectory()
    await mkdir(join(root, 'en'))
    await Promise.all([
      writeFile(join(root, 'kawapress.config.ts'), `
import { nagi } from 'kawapress/nagi'

export default nagi({
  title: 'Kawa Docs',
  description: 'KawaPress 中文文档。',
  locales: {
    root: { label: '简体中文', lang: 'zh-CN' },
    en: { label: 'English', lang: 'en', description: 'KawaPress English documentation.' },
  },
  llms: {
    llmsTxt({ defaultContent, locale }) {
      return defaultContent + '\\n<!-- locale: ' + locale + ' -->'
    },
  },
})
`),
      writeFile(join(root, 'Greeting.vue'), `
<script setup lang="ts">
defineProps<{ name: string }>()
</script>

<template>
  <strong>Hello {{ name }}</strong>
</template>
`),
      writeFile(join(root, 'index.md'), `---
layout: home
---
# Kawa Docs
`),
      writeFile(join(root, 'guide.md'), `---
description: Vue-powered guide.
---
<script setup lang="ts">
import Greeting from './Greeting.vue'
import { SsgMarkdown } from '../../packages/plugin-llms/src/client'

const doubled = 2 + 2
</script>

# 使用指南

Static **Markdown** stays source-shaped.

\`\`\`text
first


third
\`\`\`

<Greeting name="KawaPress" />

Result: {{ doubled }}.

<SsgMarkdown :content="'## Adapted component\\n\\nPreserved *exactly*.'" />

<style scoped>
.unused { color: red; }
</style>
`),
      writeFile(join(root, 'private.md'), `---
llms: false
---
# Private
`),
      writeFile(join(root, 'en/index.md'), '# English Home\n'),
    ])

    await buildSite(root)

    const guideMarkdown = await readFile(join(root, 'dist/guide.md'), 'utf8')
    const rootIndex = await readFile(join(root, 'dist/llms.txt'), 'utf8')
    const englishIndex = await readFile(join(root, 'dist/en/llms.txt'), 'utf8')
    const full = await readFile(join(root, 'dist/llms-full.txt'), 'utf8')
    const guideHtml = await readFile(join(root, 'dist/guide.html'), 'utf8')

    expect(guideMarkdown).toMatchInlineSnapshot(`
      "# 使用指南

      > 本页是 使用指南 的 Markdown 正文。站点索引见 [llms.txt](/llms.txt)，完整文档见 [llms-full.txt](/llms-full.txt)。

      Static **Markdown** stays source-shaped.

      \`\`\`text
      first


      third
      \`\`\`

      **Hello KawaPress**

      Result: 4.

      ## Adapted component

      Preserved *exactly*.
      "
    `)

    expect(rootIndex).toContain('> KawaPress 中文文档。')
    expect(rootIndex).toContain('[使用指南](/guide.md): Vue-powered guide.')
    expect(rootIndex).toContain('<!-- locale: root -->')
    expect(rootIndex).not.toContain('Private')
    expect(englishIndex).toContain('> KawaPress English documentation.')
    expect(englishIndex).toContain('[English Home](/en/index.md)')
    expect(englishIndex).toContain('<!-- locale: en -->')
    expect(full).toContain('<!-- Source: /guide.md -->')
    await expect(access(join(root, 'dist/private.md'))).rejects.toThrow()

    expect(guideMarkdown).not.toContain('kawa-llms-actions')
    expect(guideHtml).toContain('class="kawa-llms-actions"')
    expect(guideHtml).toContain('aria-expanded="false"')
    expect(guideHtml).toContain('复制页面 Markdown')
    expect(guideHtml.match(/class="kawa-llms-actions"/g)).toHaveLength(1)
    await expect(access(join(root, 'dist/.kawapress'))).rejects.toThrow()
  })

  it('points a removed description option to the site and locale config', () => {
    expect(() => llmsPlugin({ description: 'Docs' } as never))
      .toThrow('`llms.description` was removed. Set `description` on the site config')
  })

  it('renders the theme when the site can resolve @vue/server-renderer itself', async () => {
    // A pnpm workspace often lists `@vue/server-renderer` beside `vue`. The
    // Markdown renderer must still bundle Vue like the SSR build does, or it
    // renders with a second copy of Vue and the theme comes out empty.
    const root = await createTemporaryDirectory()
    await mkdir(join(root, 'node_modules/@vue'), { recursive: true })
    await symlink(
      dirname(require.resolve('@vue/server-renderer/package.json', {
        paths: [join(process.cwd(), 'packages/kawapress')],
      })),
      join(root, 'node_modules/@vue/server-renderer'),
      'dir',
    )
    await Promise.all([
      writeFile(join(root, 'kawapress.config.ts'), `
import { nagi } from 'kawapress/nagi'

export default nagi({ title: 'Kawa Docs' })
`),
      writeFile(join(root, 'index.md'), '# Kawa Docs\n\nBody text.\n'),
    ])

    await buildSite(root)

    await expect(readFile(join(root, 'dist/index.md'), 'utf8'))
      .resolves
      .toContain('Body text.')
  }, 120_000)

  it('serves page Markdown without intercepting Vite module requests', async () => {
    const root = await createTemporaryDirectory()
    await Promise.all([
      writeFile(join(root, 'kawapress.config.ts'), `
import { nagi } from 'kawapress/nagi'
export default nagi({ title: 'Dev Docs' })
`),
      writeFile(join(root, 'index.md'), '# Home\n'),
      writeFile(join(root, 'guide.md'), '# Guide\n\nValue: {{ 2 + 2 }}.\n\nRoot-level `<script setup>` is supported.\n'),
    ])
    const server = await createDevServer(root, { hmr: false, port: 0 })

    try {
      const markdown = await request(server.port, '/guide.md')
      expect(markdown.status, markdown.body).toBe(200)
      expect(markdown.contentType).toContain('text/markdown')
      expect(markdown.body).toContain('Value: 4.')

      const module = await request(server.port, '/guide.md', {
        'sec-fetch-dest': 'script',
      })
      expect(module.status).toBe(200)
      expect(module.contentType).toContain('text/javascript')
      expect(module.body).toContain('__pageData')
    }
    finally {
      await server.close()
    }
  })

  it('writes plugin pages into the Markdown files and indexes of a build', async () => {
    const root = await createTemporaryDirectory()
    await mkdir(join(root, 'en'))
    await Promise.all([
      writeFile(join(root, 'kawapress.config.ts'), `
import { definePlugin } from 'kawapress'
import { nagi } from 'kawapress/nagi'

const typedocLike = definePlugin({
  name: 'typedoc-like',
  setup(api) {
    api.pages('/api/core', () => '---\\ndescription: Core API.\\n---\\n# Core API\\n\\nPlugin page text: {{ 1 + 1 }}.\\n')
    api.pages('/en/api/core', () => '# English Core API\\n\\nEnglish plugin text.\\n')
  },
})

export default nagi({
  title: 'Dev Docs',
  locales: { root: { label: 'Root', lang: 'en' }, en: { label: 'English', lang: 'en' } },
  plugins: [typedocLike],
})
`),
      writeFile(join(root, 'index.md'), '# Home\n'),
      writeFile(join(root, 'en/index.md'), '# English Home\n'),
    ])

    await buildSite(root)

    expect(await readFile(join(root, 'dist/api/core.md'), 'utf8')).toContain('Plugin page text: 2.')
    expect(await readFile(join(root, 'dist/en/api/core.md'), 'utf8')).toContain('English plugin text.')
    expect(await readFile(join(root, 'dist/llms.txt'), 'utf8')).toContain('[Core API](/api/core.md): Core API.')
    expect(await readFile(join(root, 'dist/en/llms.txt'), 'utf8')).toContain('[English Core API](/en/api/core.md)')
    expect(await readFile(join(root, 'dist/llms-full.txt'), 'utf8')).toContain('<!-- Source: /api/core.md -->')
  }, 120_000)

  it('serves the Markdown of plugin pages in dev', async () => {
    const root = await createTemporaryDirectory()
    await mkdir(join(root, 'en'))
    await Promise.all([
      writeFile(join(root, 'kawapress.config.ts'), `
import { definePlugin } from 'kawapress'
import { nagi } from 'kawapress/nagi'

const typedocLike = definePlugin({
  name: 'typedoc-like',
  setup(api) {
    api.pages('/api/core', () => '---\\ndescription: Core API.\\n---\\n# Core API\\n\\nPlugin page text: {{ 1 + 1 }}.\\n')
    api.pages('/en/api/core', () => '# English Core API\\n\\nEnglish plugin text.\\n')
  },
})

export default nagi({
  title: 'Dev Docs',
  locales: { root: { label: 'Root', lang: 'en' }, en: { label: 'English', lang: 'en' } },
  plugins: [typedocLike],
})
`),
      writeFile(join(root, 'index.md'), '# Home\n'),
      writeFile(join(root, 'en/index.md'), '# English Home\n'),
    ])
    const server = await createDevServer(root, { hmr: false, port: 0 })

    try {
      const markdown = await request(server.port, '/api/core.md')
      expect(markdown.status, markdown.body).toBe(200)
      expect(markdown.body).toContain('Plugin page text: 2.')
    }
    finally {
      await server.close()
    }
  }, 120_000)
})

interface TestResponse {
  body: string
  contentType: string
  status: number
}

function request(
  port: number,
  path: string,
  headers: IncomingHttpHeaders = {},
): Promise<TestResponse> {
  return new Promise((resolve, reject) => {
    const request = get({
      host: 'localhost',
      port,
      path,
      headers: {
        connection: 'close',
        ...headers,
      },
    }, (response) => {
      response.setEncoding('utf8')
      let body = ''
      response.on('data', chunk => body += chunk)
      response.on('end', () => resolve({
        body,
        contentType: String(response.headers['content-type'] ?? ''),
        status: response.statusCode ?? 0,
      }))
    })
    request.on('error', reject)
  })
}

async function createTemporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(process.cwd(), 'docs/kawapress-llms-'))
  temporaryDirectories.push(directory)
  return directory
}
