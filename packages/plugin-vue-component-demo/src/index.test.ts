import type { Plugin, UserConfig } from 'vite'
import type { VueComponentDemoPluginOptions } from './index'
import { fileURLToPath } from 'node:url'
import { setupGeneratorPlugins } from 'kawapress/generator'
import { createMarkdownExit } from 'markdown-exit'
import { describe, expect, it } from 'vitest'
import { vueComponentDemoPlugin } from './index'
import { createDemoQueryId } from './query'

const PACKAGE_ROOT = fileURLToPath(new URL('..', import.meta.url)).replace(/\/$/, '')
const FIXTURES = `${PACKAGE_ROOT}/test/fixtures`
const BUTTON = `${FIXTURES}/ButtonBasic.vue`
const LOCALES = {
  root: { label: '简体中文', lang: 'zh-CN' },
  en: { label: 'English', lang: 'en' },
}

interface PageEnv {
  path: string
  sourcePath: string
  ssgMarkdown?: boolean
  pageComponents?: { name: string, from: string }[]
}

/** A page that lives at `test/page.md`, next to the `fixtures` folder. */
function pageEnv(overrides: Partial<PageEnv> = {}): PageEnv {
  return { path: '/guide', sourcePath: '/test/page.md', ...overrides }
}

async function setup(
  options: VueComponentDemoPluginOptions = {},
  alias?: Record<string, string> | { find: string | RegExp, replacement: string }[],
  meta = false,
) {
  const host = await setupGeneratorPlugins(
    { locales: LOCALES, plugins: [vueComponentDemoPlugin(options)] },
    { root: PACKAGE_ROOT },
  )
  const markdown = createMarkdownExit({ html: true })
  markdown.options.highlight = code => `<pre class="shiki"><code>${code.replaceAll('<', '&lt;')}</code></pre>`
  await host.runMarkdown(markdown)
  // The meta plugin shows up as its Vite plugin, which is how the demo plugin finds it.
  const config: UserConfig = { resolve: { alias }, plugins: meta ? [{ name: 'kawapress:vue-component-meta' }] : [] }
  await host.runVite(config)
  return { markdown, config }
}

describe('component demo markdown', () => {
  it('rewrites the tag to the demo block and imports the demo file for the page', async () => {
    const { markdown } = await setup()
    const env = pageEnv()

    const html = await markdown.renderAsync(
      '<ComponentDemo src="./fixtures/ButtonBasic.vue" title="**Basic** usage" description="Three `sizes`." />\n',
      env,
    )

    expect(html).toContain('<KawaComponentDemo')
    expect(html).toContain('<template #title><strong>Basic</strong> usage</template>')
    expect(html).toContain('<template #description>Three <code>sizes</code>.</template>')
    expect(html).toMatch(/<template #default><KawaDemo_\w+ \/><\/template>/)
    expect(html).toContain(':expand-source="false"')
    expect(html).toContain(':client-only="false"')

    const imports = Object.fromEntries(env.pageComponents!.map(entry => [entry.name.replace(/_\w+$/, ''), entry.from]))
    expect(imports.KawaDemo).toBe(BUTTON)
    expect(imports.KawaDemoSource).toBe(createDemoQueryId(BUTTON, 'source'))
    expect(imports.KawaComponentDemo).toMatch(/KawaComponentDemo\.vue$/)
    expect(env.pageComponents).toHaveLength(3)
  })

  it('accepts a Vite alias, an absolute path and a path from the site root', async () => {
    const { markdown } = await setup({}, { '@demos': FIXTURES })

    for (const src of ['@demos/ButtonBasic.vue', BUTTON, '/test/fixtures/ButtonBasic.vue']) {
      const env = pageEnv()
      await markdown.renderAsync(`<ComponentDemo src="${src}" />\n`, env)
      expect(env.pageComponents?.some(entry => entry.from === BUTTON), src).toBe(true)
    }
  })

  it('accepts an alias list with regular expressions', async () => {
    const { markdown } = await setup({}, [{ find: /^~demo\//, replacement: `${FIXTURES}/` }])
    const env = pageEnv()

    await markdown.renderAsync('<ComponentDemo src="~demo/ButtonBasic.vue" />\n', env)

    expect(env.pageComponents?.some(entry => entry.from === BUTTON)).toBe(true)
  })

  it('names the page and the line when the demo file is missing', async () => {
    const { markdown } = await setup()

    await expect(markdown.renderAsync(
      'Intro\n\n<ComponentDemo src="./fixtures/Missing.vue" />\n',
      pageEnv(),
    )).rejects.toThrow(/\/test\/page\.md line 3: cannot find the demo file "\.\/fixtures\/Missing\.vue"/)
  })

  it('fails a playground with a message that names the meta plugin when it is not installed', async () => {
    const { markdown } = await setup()

    await expect(markdown.renderAsync('Intro\n\n<ComponentDemo component="./fixtures/ButtonBasic.vue" />\n', pageEnv()))
      .rejects
      .toThrow(/\/test\/page\.md line 3: the component attribute needs @kawapress\/plugin-vue-component-meta/)
  })

  it('rewrites component= to the playground and imports the component and its doc', async () => {
    const { markdown } = await setup({}, undefined, true)
    const env = pageEnv()

    const html = await markdown.renderAsync(
      '<ComponentDemo component="./fixtures/ButtonBasic.vue" props=\'{"label":"It&#39;s"}\' title="**T**" description="D" />\n',
      env,
    )

    expect(html).toMatch(/^<KawaComponentPlayground :component="KawaPlayground_(\w+)" :doc="KawaPlaygroundDoc_\1" fallback-name="ButtonBasic"/)
    expect(html).toContain(':initial-props=\'{"label":"It&#39;s"}\'')
    expect(html).toContain('<template #title><strong>T</strong></template>')
    expect(html).toContain('<template #description>D</template>')
    const imports = Object.fromEntries(env.pageComponents!.map(entry => [entry.name.replace(/_\w+$/, ''), entry.from]))
    expect(imports.KawaPlayground).toBe(BUTTON)
    expect(imports.KawaPlaygroundDoc).toBe(`${BUTTON}?component-doc`)
    expect(imports.KawaComponentPlayground).toMatch(/KawaComponentPlayground\.vue$/)
    expect(imports.KawaDemoPropsTable).toMatch(/DemoPropsTable\.vue$/)
    expect(env.pageComponents).toHaveLength(4)
  })

  it('refuses src together with component, and neither of them', async () => {
    const { markdown } = await setup({}, undefined, true)
    const render = (source: string) => markdown.renderAsync(source, pageEnv())

    await expect(render('<ComponentDemo src="./a.vue" component="./b.vue" />\n'))
      .rejects
      .toThrow(/line 1: src and component cannot be used together/)
    await expect(render('<ComponentDemo title="x" />\n'))
      .rejects
      .toThrow(/line 1: <ComponentDemo> needs a src attribute .* or a component attribute/)
  })

  it('refuses props that are not a JSON object', async () => {
    const { markdown } = await setup({}, undefined, true)
    const render = (props: string) => markdown.renderAsync(
      `<ComponentDemo component="./fixtures/ButtonBasic.vue" props='${props}' />\n`,
      pageEnv(),
    )

    await expect(render('{label: 1}')).rejects.toThrow(/line 1: the props attribute is not valid JSON/)
    await expect(render('[1]')).rejects.toThrow(/the props attribute must be a JSON object/)
    await expect(markdown.renderAsync('<ComponentDemo src="./fixtures/ButtonBasic.vue" props="{}" />\n', pageEnv()))
      .rejects
      .toThrow(/props attribute only works together with the component attribute/)
  })

  it('writes the props table component for the page .md output of a playground', async () => {
    const { markdown } = await setup({}, undefined, true)
    const env = pageEnv({ ssgMarkdown: true })

    const html = await markdown.renderAsync(
      '<ComponentDemo component="./fixtures/ButtonBasic.vue" title="Basic" description="A button." />\n',
      env,
    )

    expect(html).toContain('<p><strong>Basic</strong></p>')
    expect(html).toContain('<p>A button.</p>')
    expect(html).toMatch(/<KawaDemoPropsTable :doc="KawaPlaygroundDoc_\w+" :labels=/)
    // The page imported the table and the doc already; the page .md render adds nothing.
    expect(env.pageComponents).toBeUndefined()
  })

  it('rejects unusable tags with a message that names the problem', async () => {
    const { markdown } = await setup()
    const render = (source: string) => markdown.renderAsync(source, pageEnv())

    await expect(render('<ComponentDemo />\n')).rejects.toThrow(/needs a src attribute/)
    await expect(render('<ComponentDemo src="./fixtures/ButtonBasic.vue" color="red" />\n'))
      .rejects
      .toThrow(/unknown attribute "color"/)
    await expect(render('<ComponentDemo src="./a.vue" src="./b.vue" />\n'))
      .rejects
      .toThrow(/written twice/)
    await expect(render('<ComponentDemo src="nowhere/Demo.vue" />\n'))
      .rejects
      .toThrow(/cannot resolve src "nowhere\/Demo\.vue"/)
  })

  it('refuses a tag in the middle of a paragraph', async () => {
    const { markdown } = await setup()

    await expect(markdown.renderAsync('Some <ComponentDemo src="./fixtures/ButtonBasic.vue" /> text\n', pageEnv()))
      .rejects
      .toThrow(/line 1: <ComponentDemo> must stand alone in a block/)
  })

  it('leaves other HTML and other tags alone', async () => {
    const { markdown } = await setup()
    const env = pageEnv()

    const html = await markdown.renderAsync('<ComponentOther src="x" />\n\n<div>hi</div>\n', env)

    expect(html).toContain('<ComponentOther src="x" />')
    expect(html).toContain('<div>hi</div>')
    expect(env.pageComponents).toBeUndefined()
  })

  it('follows the tag and expandSource options', async () => {
    const { markdown } = await setup({ tag: 'Demo', expandSource: true })

    const html = await markdown.renderAsync('<Demo src="./fixtures/ButtonBasic.vue" />\n', pageEnv())
    const ignored = await markdown.renderAsync('<ComponentDemo src="./nope.vue" />\n', pageEnv())

    expect(html).toContain(':expand-source="true"')
    expect(ignored).toContain('<ComponentDemo')
  })

  it('refuses a tag name that is not a name', () => {
    expect(() => vueComponentDemoPlugin({ tag: 'bad tag' })).toThrow(/not a valid tag name/)
  })

  it('loads a client-only demo through the browser-only module', async () => {
    const { markdown } = await setup()
    const env = pageEnv()

    const html = await markdown.renderAsync(
      '<ComponentDemo src="./fixtures/WindowSize.vue" client-only />\n',
      env,
    )
    const file = `${FIXTURES}/WindowSize.vue`

    expect(html).toContain(':client-only="true"')
    expect(html).toMatch(/<template #default><KawaDemoClient_\w+ \/><\/template>/)
    expect(env.pageComponents?.some(entry => entry.from === createDemoQueryId(file, 'client'))).toBe(true)
    // The server never imports the demo file itself.
    expect(env.pageComponents?.some(entry => entry.from === file)).toBe(false)
  })

  it('writes the title, the description and the whole source for the page .md output', async () => {
    const { markdown } = await setup()
    const env = pageEnv({ ssgMarkdown: true })

    const html = await markdown.renderAsync(
      '<ComponentDemo src="./fixtures/ButtonBasic.vue" title="Basic" description="A button." />\n',
      env,
    )

    expect(html).toContain('<p><strong>Basic</strong></p>')
    expect(html).toContain('<p>A button.</p>')
    expect(html).toContain('<pre v-pre><code class="language-vue">&lt;script setup lang="ts"&gt;')
    expect(html).toContain('Clicked {{ count }} times')
    expect(html).not.toContain('KawaComponentDemo')
    expect(env.pageComponents).toBeUndefined()
  })

  it('resolves labels per locale and accepts overrides', async () => {
    const { markdown } = await setup({
      labels: { copy: 'Copy it' },
      localeLabels: { en: { expand: 'Open source' } },
    })
    const labelsOf = async (path: string) => {
      const html = await markdown.renderAsync(
        '<ComponentDemo src="./fixtures/ButtonBasic.vue" />\n',
        pageEnv({ path }),
      )
      const raw = html.match(/:labels='([^']*)'/)?.[1] ?? '{}'
      return JSON.parse(raw.replaceAll('&gt;', '>').replaceAll('&lt;', '<').replaceAll('&amp;', '&'))
    }

    expect(await labelsOf('/guide')).toMatchObject({ copy: 'Copy it', expand: '展开源码' })
    expect(await labelsOf('/en/guide')).toMatchObject({ copy: 'Copy it', expand: 'Open source', collapse: 'Hide source' })
  })
})

describe('component demo vite plugin', () => {
  async function loadModule(id: string, plugin: Plugin, markdown?: ReturnType<typeof createMarkdownExit>) {
    const watched: string[] = []
    const context = { addWatchFile: (file: string) => watched.push(file) }
    const load = plugin.load as unknown as (this: typeof context, id: string) => Promise<string | undefined>
    return { code: await load.call(context, id), watched, markdown }
  }

  async function pluginOf(options: VueComponentDemoPluginOptions = {}) {
    const { config } = await setup(options)
    return (config.plugins as Plugin[]).find(plugin => plugin.name === 'kawapress:vue-component-demo')!
  }

  it('turns the source query into highlighted HTML and the raw code', async () => {
    const plugin = await pluginOf()

    const { code, watched } = await loadModule(createDemoQueryId(BUTTON, 'source'), plugin)
    const exported = JSON.parse(/const next = (.*)\n/.exec(code!)![1])

    expect(exported.html).toMatch(/^<div class="kawa-code-block language-vue"><pre class="shiki"><code>/)
    expect(exported.html).toContain('Clicked {{ count }} times')
    expect(exported.code).toContain('const count = ref(0)')
    expect(watched).toEqual([BUTTON])
  })

  it('serves the client query as a browser-only async component', async () => {
    const plugin = await pluginOf()

    const { code } = await loadModule(createDemoQueryId(BUTTON, 'client'), plugin)

    expect(code).toContain('import.meta.env.SSR')
    expect(code).toContain(`import(${JSON.stringify(BUTTON)})`)
  })

  it('claims only its own ids', async () => {
    const plugin = await pluginOf()
    const resolveId = plugin.resolveId as (id: string) => string | undefined

    expect(resolveId(createDemoQueryId(BUTTON, 'source'))).toBe(createDemoQueryId(BUTTON, 'source'))
    expect(resolveId(BUTTON)).toBeUndefined()
    expect(plugin.enforce).toBe('pre')
    expect((await loadModule(BUTTON, plugin)).code).toBeUndefined()
  })
})
