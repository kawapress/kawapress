import { setupGeneratorPlugins } from 'kawapress/generator'
import { createMarkdownExit } from 'markdown-exit'
import { describe, expect, it } from 'vitest'
import {
  githubAlertsPlugin,
  installGitHubAlerts,
} from './index'

describe('github alerts plugin', () => {
  it('renders all five GitHub alert types', () => {
    const markdown = createMarkdownExit({ html: true })
    installGitHubAlerts(markdown)

    const html = markdown.render(`> [!NOTE]
> Useful context.

> [!TIP]
> A practical suggestion.

> [!IMPORTANT]
> Required information.

> [!wArNiNg]
> A possible risk.

> [!CAUTION]
> A harmful consequence.
`)

    expect(html).toMatchInlineSnapshot(`
      "<div class="kawa-alert kawa-alert--note">
      <p class="kawa-alert__title">Note</p>
      <p>Useful context.</p>
      </div>
      <div class="kawa-alert kawa-alert--tip">
      <p class="kawa-alert__title">Tip</p>
      <p>A practical suggestion.</p>
      </div>
      <div class="kawa-alert kawa-alert--important">
      <p class="kawa-alert__title">Important</p>
      <p>Required information.</p>
      </div>
      <div class="kawa-alert kawa-alert--warning">
      <p class="kawa-alert__title">Warning</p>
      <p>A possible risk.</p>
      </div>
      <div class="kawa-alert kawa-alert--caution">
      <p class="kawa-alert__title">Caution</p>
      <p>A harmful consequence.</p>
      </div>
      "
    `)
  })

  it('keeps ordinary, escaped, and nested blockquotes unchanged', () => {
    const markdown = createMarkdownExit({ html: true })
    installGitHubAlerts(markdown)

    const html = markdown.render(`> Ordinary quote.

> \\[!NOTE]
> Escaped marker.

- > [!TIP]
  > Nested marker.
`)

    expect(html).toMatchInlineSnapshot(`
      "<blockquote>
      <p>Ordinary quote.</p>
      </blockquote>
      <blockquote>
      <p>[!NOTE]
      Escaped marker.</p>
      </blockquote>
      <ul>
      <li>
      <blockquote>
      <p>[!TIP]
      Nested marker.</p>
      </blockquote>
      </li>
      </ul>
      "
    `)
  })

  it('supports Markdown content inside an alert', () => {
    const markdown = createMarkdownExit({ html: true })
    installGitHubAlerts(markdown)

    const html = markdown.render(`> [!TIP]
> Use **strong text** and a list:
>
> - First
> - Second
`)

    expect(html).toMatchInlineSnapshot(`
      "<div class="kawa-alert kawa-alert--tip">
      <p class="kawa-alert__title">Tip</p>
      <p>Use <strong>strong text</strong> and a list:</p>
      <ul>
      <li>First</li>
      <li>Second</li>
      </ul>
      </div>
      "
    `)
  })

  it('localizes titles from the page locale and accepts overrides', async () => {
    const plugin = githubAlertsPlugin({
      labels: {
        caution: 'Risk',
      },
      localeLabels: {
        en: {
          note: 'Remember',
        },
      },
    })
    const host = await setupGeneratorPlugins({
      locales: {
        root: { label: '简体中文', lang: 'zh-CN' },
        en: { label: 'English', lang: 'en' },
      },
      plugins: [plugin],
    })
    const markdown = createMarkdownExit({ html: true })
    await host.runMarkdown(markdown)

    expect({
      chinese: markdown.render('> [!NOTE]\n> 内容', { path: '/guide' }),
      english: markdown.render('> [!NOTE]\n> Content', { path: '/en/guide' }),
      globalOverride: markdown.render(
        '> [!CAUTION]\n> Content',
        { path: '/en/guide' },
      ),
    }).toMatchInlineSnapshot(`
      {
        "chinese": "<div class="kawa-alert kawa-alert--note">
      <p class="kawa-alert__title">注意</p>
      <p>内容</p>
      </div>
      ",
        "english": "<div class="kawa-alert kawa-alert--note">
      <p class="kawa-alert__title">Remember</p>
      <p>Content</p>
      </div>
      ",
        "globalOverride": "<div class="kawa-alert kawa-alert--caution">
      <p class="kawa-alert__title">Risk</p>
      <p>Content</p>
      </div>
      ",
      }
    `)
  })
})
