import { setupGeneratorPlugins } from 'kawapress/generator'
import { createMarkdownExit } from 'markdown-exit'
import { describe, expect, it } from 'vitest'
import { vueReplPlugin } from './index'

const LOCALES = {
  root: { label: '简体中文', lang: 'zh-CN' },
  en: { label: 'English', lang: 'en' },
}

const FENCE = '```vue repl\n<template>Hi</template>\n```\n'

async function createMarkdown(options: Parameters<typeof vueReplPlugin>[0] = {}) {
  const host = await setupGeneratorPlugins({ locales: LOCALES, plugins: [vueReplPlugin(options)] })
  const markdown = createMarkdownExit({ html: true })
  await host.runMarkdown(markdown)
  return markdown
}

function propOf(html: string, name: string): Record<string, unknown> {
  const raw = html.match(new RegExp(`:${name}='([^']*)'`))?.[1] ?? '{}'
  return JSON.parse(raw.replaceAll('&gt;', '>').replaceAll('&lt;', '<').replaceAll('&amp;', '&'))
}

describe('vue repl plugin', () => {
  it('resolves labels per locale and accepts overrides', async () => {
    const markdown = await createMarkdown({
      labels: { run: 'Go' },
      localeLabels: { en: { playground: 'Playground' } },
    })

    expect(propOf(markdown.render(FENCE, { path: '/guide/a' }), 'labels'))
      .toMatchObject({ run: 'Go', playground: '在 Vue Playground 中打开' })
    expect(propOf(markdown.render(FENCE, { path: '/en/guide/a' }), 'labels'))
      .toMatchObject({ run: 'Go', playground: 'Playground' })
  })

  it('imports the page component only into pages that have a REPL', async () => {
    const markdown = await createMarkdown()
    const withRepl: { pageComponents?: { name: string }[] } = {}
    const without: { pageComponents?: { name: string }[] } = {}
    markdown.render(FENCE, withRepl)
    markdown.render('```vue\n<template />\n```\n', without)

    expect(withRepl.pageComponents?.map(component => component.name)).toEqual(['KawaVueRepl'])
    expect(without.pageComponents).toBeUndefined()
  })

  it('passes the site options to every block', async () => {
    const importMap = { imports: { 'my-ui': 'https://cdn.example.com/my-ui.js' } }
    const markdown = await createMarkdown({
      importMap,
      previewStyles: ['https://cdn.example.com/my-ui.css'],
      editor: 'monaco',
      eager: true,
    })

    expect(propOf(markdown.render(FENCE, { path: '/' }), 'config')).toEqual({
      editor: 'monaco',
      eager: true,
      importMap,
      previewStyles: ['https://cdn.example.com/my-ui.css'],
    })
  })

  it('defaults to CodeMirror and click-to-run', async () => {
    const markdown = await createMarkdown()
    expect(propOf(markdown.render(FENCE, { path: '/' }), 'config'))
      .toEqual({ editor: 'codemirror', eager: false })
  })
})
