import type { GeneratorPluginAPI } from 'kawapress'
import type { MarkdownExit } from 'markdown-exit'
import type { ShikiPluginOptions } from './index'
import { createMarkdownExit } from 'markdown-exit'
import { describe, expect, it } from 'vitest'
import { shikiPlugin } from './index'

describe('shiki code annotations', () => {
  it('renders meta highlights and language-aware notation classes', async () => {
    const markdown = await createMarkdown()

    const html = markdown.render(`\`\`\`ts {1}
const meta = 1
const focus = 2 // [!code focus]
const oldValue = 3 // [!code --]
const newValue = 4 // [!code ++]
const warning = 5 // [!code warning]
const error = 6 // [!code error]
const highlight = 7 // [!code highlight]
\`\`\`
`)

    expect(html).toMatchInlineSnapshot(`
      "<pre class="shiki github-light has-diff has-focused-lines has-highlighted" style="background-color:#fff;color:#24292e" tabindex="0" data-kawa-line-count="7" v-pre=""><code><mark class="line highlighted"><span style="color:#D73A49">const</span><span style="color:#005CC5"> meta</span><span style="color:#D73A49"> =</span><span style="color:#005CC5"> 1</span></mark>
      <mark class="line has-focus"><span style="color:#D73A49">const</span><span style="color:#005CC5"> focus</span><span style="color:#D73A49"> =</span><span style="color:#005CC5"> 2</span></mark>
      <del class="line diff remove"><span style="color:#D73A49">const</span><span style="color:#005CC5"> oldValue</span><span style="color:#D73A49"> =</span><span style="color:#005CC5"> 3</span></del>
      <ins class="line diff add"><span style="color:#D73A49">const</span><span style="color:#005CC5"> newValue</span><span style="color:#D73A49"> =</span><span style="color:#005CC5"> 4</span></ins>
      <mark class="line highlighted warning"><span style="color:#D73A49">const</span><span style="color:#005CC5"> warning</span><span style="color:#D73A49"> =</span><span style="color:#005CC5"> 5</span></mark>
      <mark class="line highlighted error"><span style="color:#D73A49">const</span><span style="color:#005CC5"> error</span><span style="color:#D73A49"> =</span><span style="color:#005CC5"> 6</span></mark>
      <mark class="line highlighted"><span style="color:#D73A49">const</span><span style="color:#005CC5"> highlight</span><span style="color:#D73A49"> =</span><span style="color:#005CC5"> 7</span></mark></code></pre>
      "
    `)
  })

  it('runs user transformers after the annotation transformers', async () => {
    const visitedClasses: string[][] = []
    const markdown = await createMarkdown({
      transformers: [{
        name: 'test:observe-annotations',
        code(node) {
          for (const child of node.children) {
            if (child.type !== 'element') {
              continue
            }
            const classes = child.properties.class
            visitedClasses.push(Array.isArray(classes)
              ? classes.map(String)
              : classes ? [String(classes)] : [])
          }
        },
      }],
    })

    markdown.render('```ts\nconst value = 1 // [!code warning]\n```')
    expect(visitedClasses).toEqual([['line', 'highlighted', 'warning']])
  })

  it('keeps v-pre on ordinary blocks after rendering Twoslash', async () => {
    const markdown = await createMarkdown({ twoslash: true })

    const twoslash = markdown.render(`\`\`\`ts twoslash
const answer = 42
\`\`\``)
    const ordinary = markdown.render(`\`\`\`vue
<p>{{ answer }}</p>
\`\`\``)

    expect(twoslash.slice(0, twoslash.indexOf('>'))).not.toContain('v-pre')
    expect(ordinary).toContain('v-pre=""')
    expect(ordinary).toContain('{{ answer }}')
  })

  it('declares the popup component only on pages that render one', async () => {
    const markdown = await createMarkdown({ twoslash: true })
    const twoslashEnv: Record<string, unknown> = { path: '/guide/typed' }

    markdown.render('```ts twoslash\nconst answer = 42\n```', twoslashEnv)

    expect(twoslashEnv.pageComponents).toEqual([{
      name: 'KawaTwoslashMenu',
      from: expect.stringContaining('twoslash-menu'),
    }])

    const plainEnv: Record<string, unknown> = { path: '/guide/plain' }
    markdown.render('```ts\nconst answer = 42\n```', plainEnv)
    expect(plainEnv.pageComponents).toBeUndefined()
  })

  it('declares nothing when the plugin has no Twoslash transformer', async () => {
    const markdown = await createMarkdown()
    const env: Record<string, unknown> = { path: '/guide/plain' }

    markdown.render('```ts twoslash\nconst answer = 42\n```', env)

    expect(env.pageComponents).toBeUndefined()
  })

  it('renders the light and dark GitHub themes unless one theme is set', async () => {
    const dual = (await createMarkdown({})).render('```js\nready\n```')
    const single = (await createMarkdown({ theme: 'github-dark' })).render('```js\nready\n```')

    expect(dual).toContain('class="shiki shiki-themes github-light github-dark')
    expect(single).toContain('class="shiki github-dark')
  })

  it('loads extra grammar registrations after the default languages', async () => {
    // Replaces the preloaded `yaml` grammar with one that marks every word as a keyword.
    const yaml = {
      name: 'yaml',
      scopeName: 'source.yaml',
      patterns: [{ match: '\\w+', name: 'keyword.control' }],
      repository: {},
    }
    const html = (await createMarkdown({ theme: 'github-light', languages: [yaml] })).render('```yaml\nready\n```')
    const plain = (await createMarkdown()).render('```yaml\nready\n```')

    expect(html).toContain('<span style="color:#D73A49">ready</span>')
    expect(plain).not.toContain('color:#D73A49')
  })

  it('recognizes notation through each language grammar', async () => {
    const markdown = await createMarkdown()

    expect(markdown.render(`\`\`\`bash
echo "ready" # [!code warning]
\`\`\`

\`\`\`html
<p>Ready</p> <!-- [!code focus] -->
\`\`\`
`)).toMatchInlineSnapshot(`
  "<pre class="shiki github-light has-highlighted" style="background-color:#fff;color:#24292e" tabindex="0" data-kawa-line-count="1" v-pre=""><code><mark class="line highlighted warning"><span style="color:#005CC5">echo</span><span style="color:#032F62"> "ready"</span></mark></code></pre>
  <pre class="shiki github-light has-focused-lines" style="background-color:#fff;color:#24292e" tabindex="0" data-kawa-line-count="1" v-pre=""><code><mark class="line has-focus"><span style="color:#24292E">&#x3C;</span><span style="color:#22863A">p</span><span style="color:#24292E">>Ready&#x3C;/</span><span style="color:#22863A">p</span><span style="color:#24292E">> </span></mark></code></pre>
  "
`)
  })
})

/** A single theme keeps the expected HTML short; the theme defaults have their own test. */
async function createMarkdown(
  options: ShikiPluginOptions = { theme: 'github-light' },
): Promise<MarkdownExit> {
  let markdownHandler: Parameters<GeneratorPluginAPI['markdown']>[0] | undefined
  await shikiPlugin(options).setup({
    config() {},
    markdown(handler) {
      markdownHandler = handler
    },
    pageData() {},
    pageArtifact() {},
    vite() {},
    buildArtifacts() {},
  })
  if (!markdownHandler) {
    throw new Error('Expected Shiki to register a Markdown handler.')
  }

  const markdown = createMarkdownExit({ html: true })
  await markdownHandler(markdown)
  return markdown
}
