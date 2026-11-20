import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { setupGeneratorPlugins } from 'kawapress/generator'
import { createMarkdownExit } from 'markdown-exit'
import { describe, expect, it } from 'vitest'
import { vueComponentMetaPlugin } from './index'

const FIXTURES = fileURLToPath(new URL('../fixtures/', import.meta.url))
const LOCALES = {
  root: { label: '简体中文', lang: 'zh-CN' },
  en: { label: 'English', lang: 'en' },
}

async function createMarkdown(options: Parameters<typeof vueComponentMetaPlugin>[0] = {}) {
  const host = await setupGeneratorPlugins({ locales: LOCALES, plugins: [vueComponentMetaPlugin(options)] })
  const markdown = createMarkdownExit({ html: true })
  await host.runMarkdown(markdown)
  return markdown
}

function labelsOf(html: string): Record<string, string> {
  const raw = html.match(/:labels='([^']*)'/)?.[1] ?? '{}'
  return JSON.parse(raw.replaceAll('&gt;', '>').replaceAll('&lt;', '<').replaceAll('&amp;', '&'))
}

interface PageEnv {
  path: string
  sourcePath?: string
  pageComponents?: { name: string, from: string }[]
}

describe('component api tag', () => {
  it('rewrites the tag into a page component and imports it for the page', async () => {
    const markdown = await createMarkdown()
    const env: PageEnv = { path: '/guide/button', sourcePath: '/guide/button.md' }
    const html = markdown.render('# Button\n\n<ComponentApi src="../fixtures/Button.vue" />\n', env)

    expect(html).toMatch(/<KawaComponentApi_[0-9a-f]{8} :labels='/)
    expect(html).not.toContain('<ComponentApi')
    expect(env.pageComponents).toHaveLength(1)
    expect(html).toContain(`<${env.pageComponents![0].name} `)
  })

  it('resolves a relative src against the Markdown file', async () => {
    const markdown = await createMarkdown()
    const env: PageEnv = { path: '/guide/button', sourcePath: '/guide/button.md' }
    markdown.render('<ComponentApi src="./Button.vue" />\n', env)

    // The default source folder is the current directory.
    expect(env.pageComponents![0].from).toBe(`${join(process.cwd(), 'guide', 'Button.vue')}?component-api`)
  })

  it('keeps an alias src for Vite and carries the section', async () => {
    const markdown = await createMarkdown()
    const env: PageEnv = { path: '/a', sourcePath: '/a.md' }
    markdown.render('<ComponentApi src="@/components/Button.vue" only="events" />\n', env)

    expect(env.pageComponents![0].from).toBe('@/components/Button.vue?component-api&only=events')
  })

  it('gives different sections of one component their own import', async () => {
    const markdown = await createMarkdown()
    const env: PageEnv = { path: '/a', sourcePath: '/a.md' }
    markdown.render([
      '<ComponentApi src="@/B.vue" only="props" />',
      '',
      '<ComponentApi src="@/B.vue" only="slots" />',
      '',
      '<ComponentApi src="@/B.vue" only="props" />',
      '',
    ].join('\n'), env)

    expect(env.pageComponents).toHaveLength(2)
  })

  it('works inline and with a closing tag', async () => {
    const markdown = await createMarkdown()
    const env: PageEnv = { path: '/a', sourcePath: '/a.md' }
    const html = markdown.render('See <ComponentApi src="@/B.vue"></ComponentApi> here.\n\n<ComponentApi src=\'@/C.vue\'></ComponentApi>\n', env)

    expect(html.match(/<KawaComponentApi_/g)).toHaveLength(2)
    expect(html).not.toContain('ComponentApi src')
  })

  it('picks labels by the page language and accepts overrides', async () => {
    const markdown = await createMarkdown({
      labels: { props: 'Properties' },
      localeLabels: { en: { events: 'Emits' } },
    })
    const tag = '<ComponentApi src="@/B.vue" />\n'

    expect(labelsOf(markdown.render(tag, { path: '/guide/a' })))
      .toMatchObject({ props: 'Properties', events: '事件' })
    expect(labelsOf(markdown.render(tag, { path: '/en/guide/a' })))
      .toMatchObject({ props: 'Properties', events: 'Emits', slots: 'Slots' })
  })

  it('uses a custom tag name', async () => {
    const markdown = await createMarkdown({ tag: 'Api' })
    const env: PageEnv = { path: '/a', sourcePath: '/a.md' }
    const html = markdown.render('<Api src="@/B.vue" />\n\n<ComponentApi src="@/B.vue" />\n', env)

    expect(env.pageComponents).toHaveLength(1)
    expect(html).toContain('<ComponentApi src="@/B.vue" />')
  })

  it('leaves pages without the tag alone', async () => {
    const markdown = await createMarkdown()
    const env: PageEnv = { path: '/a', sourcePath: '/a.md' }
    markdown.render('<div>hi</div>\n', env)

    expect(env.pageComponents).toBeUndefined()
  })

  it('explains a missing src or an unknown section', async () => {
    const markdown = await createMarkdown()

    expect(() => markdown.render('<ComponentApi />\n', { path: '/a', sourcePath: '/guide/a.md' }))
      .toThrow(/\/guide\/a\.md.*needs a src/)
    expect(() => markdown.render('<ComponentApi src="@/B.vue" only="x" />\n', { path: '/a' }))
      .toThrow(/must be one of props, events, slots, exposed/)
  })

  it('does not rewrite code blocks', async () => {
    const markdown = await createMarkdown()
    const env: PageEnv = { path: '/a', sourcePath: '/a.md' }
    markdown.render('```md\n<ComponentApi src="@/B.vue" />\n```\n', env)

    expect(env.pageComponents).toBeUndefined()
    expect(FIXTURES).toBeTruthy()
  })
})
