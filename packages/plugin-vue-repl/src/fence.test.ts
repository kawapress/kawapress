import { createMarkdownExit } from 'markdown-exit'
import { describe, expect, it } from 'vitest'
import { installVueRepl, parseReplInfo } from './fence'
import { ENGLISH_VUE_REPL_LABELS } from './labels'

const SFC = '<script setup>\nconst a = 1\n</script>\n\n<template>{{ a }}</template>\n'

function createMarkdown(onRepl?: () => void) {
  const markdown = createMarkdownExit({ html: true })
  installVueRepl(markdown, {
    config: { editor: 'codemirror', eager: false },
    resolveLabels: () => ENGLISH_VUE_REPL_LABELS,
    onRepl,
  })
  return markdown
}

/** Reads back the `:files` prop of the first block. */
function filesOf(html: string): { name: string, code: string }[] {
  const raw = html.match(/:files='([^']*)'/)?.[1] ?? '[]'
  return JSON.parse(raw.replaceAll('&gt;', '>').replaceAll('&lt;', '<').replaceAll('&amp;', '&'))
}

describe('parseReplInfo', () => {
  it('recognizes only fences with the repl word', () => {
    expect(parseReplInfo('vue')).toBeUndefined()
    expect(parseReplInfo('repl')).toBeUndefined()
    expect(parseReplInfo('vue replx')).toBeUndefined()
    expect(parseReplInfo('text repl')).toBeUndefined()
    expect(parseReplInfo('vue repl')).toEqual({ lang: 'vue', ext: 'vue', name: undefined, height: undefined })
  })

  it('reads the file name and the height and ignores other meta', () => {
    expect(parseReplInfo('ts repl [util.ts] {height=320}')).toEqual({
      lang: 'ts',
      ext: 'ts',
      name: 'util.ts',
      height: 320,
    })
    expect(parseReplInfo('Vue repl {1,3}')).toMatchObject({ lang: 'Vue', ext: 'vue', height: undefined })
  })
})

describe('vue repl fence', () => {
  it('wraps a single block with its source, name and a playground link', () => {
    const html = createMarkdown().render(`\`\`\`vue repl\n${SFC}\`\`\`\n`)

    expect(html).toContain('<KawaVueRepl ')
    expect(html).toContain('main="App.vue"')
    expect(html).toContain(':height="480"')
    expect(html).toContain('playground="https://play.vuejs.org/#')
    expect(html).toContain('<template #file-0>')
    expect(html).toContain('</KawaVueRepl>')
    expect(filesOf(html)).toEqual([{ name: 'App.vue', code: SFC }])
  })

  it('leaves ordinary vue blocks alone', () => {
    const html = createMarkdown().render(`\`\`\`vue\n${SFC}\`\`\`\n`)
    expect(html).not.toContain('KawaVueRepl')
    expect(html).toContain('language-vue')
  })

  it('takes the file name and the height from the fence', () => {
    const html = createMarkdown().render(`\`\`\`vue repl [Counter] {height=300}\n${SFC}\`\`\`\n`)

    expect(html).toContain('main="Counter.vue"')
    expect(html).toContain(':height="300"')
    // Shiki only sees the language, so `repl` and the braces never reach it.
    expect(html).toContain('language-vue')
    expect(html).not.toContain('height=300')
  })

  it('declares the page component once per block', () => {
    let count = 0
    const markdown = createMarkdown(() => count++)
    markdown.render(`\`\`\`vue repl\n${SFC}\`\`\`\n\n\`\`\`vue repl\n${SFC}\`\`\`\n`)
    expect(count).toBe(2)
  })

  it('keeps an asynchronous fence renderer working', async () => {
    const markdown = createMarkdownExit({ html: true })
    markdown.renderer.rules.fence = async () => '<pre class="async">code</pre>'
    installVueRepl(markdown, {
      config: { editor: 'codemirror', eager: false },
      resolveLabels: () => ENGLISH_VUE_REPL_LABELS,
    })

    const html = await markdown.renderAsync(`\`\`\`vue repl\n${SFC}\`\`\`\n`)
    expect(html).toContain('<template #file-0>\n<pre class="async">code</pre></template>')
  })
})

describe('repl container', () => {
  const container = (body: string, params = 'repl') => `::: ${params}\n${body}\n:::\n`

  it('collects consecutive fences as the files of one REPL', () => {
    const html = createMarkdown().render(container(
      '```vue repl\n<template>App</template>\n```\n\n'
      + '```ts repl [store.ts]\nexport const n = 1\n```\n\n'
      + '```css repl [style.css]\na { color: red }\n```',
    ))

    expect(filesOf(html).map(file => file.name)).toEqual(['App.vue', 'store.ts', 'style.css'])
    expect(html.match(/<KawaVueRepl /g)).toHaveLength(1)
    expect(html).toContain('<template #file-0>')
    expect(html).toContain('<template #file-1>')
    expect(html).toContain('<template #file-2>')
    expect(html).toContain('main="App.vue"')
  })

  it('uses the first .vue file as the entry', () => {
    const html = createMarkdown().render(container(
      '```ts repl [store.ts]\nexport const n = 1\n```\n\n'
      + '```vue repl [Main.vue]\n<template>Main</template>\n```\n\n'
      + '```vue repl [Other.vue]\n<template>Other</template>\n```',
    ))
    expect(html).toContain('main="Main.vue"')
  })

  it('reads the height from the container', () => {
    const html = createMarkdown().render(container('```vue repl\n<template>A</template>\n```', 'repl {height=600}'))
    expect(html).toContain(':height="600"')
  })

  it('does not require the repl word on fences inside the container', () => {
    const html = createMarkdown().render(container('```vue\n<template>A</template>\n```'))
    expect(filesOf(html)).toEqual([{ name: 'App.vue', code: '<template>A</template>\n' }])
  })

  it('rejects prose, duplicate names and a missing entry', () => {
    const markdown = createMarkdown()
    expect(() => markdown.render(container('Not a code block.')))
      .toThrow('KawaPress repl only accepts fenced code blocks')
    expect(() => markdown.render(container(
      '```vue [A.vue]\na\n```\n\n```vue [A.vue]\nb\n```',
    ))).toThrow('two files named "A.vue"')
    expect(() => markdown.render(container('```ts [a.ts]\nexport {}\n```')))
      .toThrow('needs at least one .vue file')
    expect(() => markdown.render(container('```sh\nls\n```')))
      .toThrow('cannot use a "sh" code block')
  })
})
