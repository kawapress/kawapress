import type { ComponentDoc } from './types'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { buildApiModel, renderApiMarkdown } from './api-table'
import ComponentApi from './ComponentApi.vue'
import { CHINESE_COMPONENT_API_LABELS, ENGLISH_COMPONENT_API_LABELS } from './labels'

const DOC: ComponentDoc = {
  name: 'Button',
  description: '',
  props: [
    {
      name: 'size',
      type: '"small" | "large"',
      required: false,
      default: '"small"',
      description: 'Visual size.',
      tags: {},
      control: { kind: 'select', options: ['small', 'large'] },
    },
    {
      name: 'old',
      type: 'string',
      required: true,
      description: 'Line one.\nLine two with a | pipe.',
      tags: { deprecated: 'Use size.', since: '0.2.0' },
      control: { kind: 'text' },
    },
  ],
  events: [{ name: 'change', description: 'Changed.', type: '[value: number]', tags: {} }],
  slots: [{ name: 'default', description: '', type: 'any', tags: {} }],
  exposed: [{ name: 'focus', description: 'Focus it.', type: '() => void', tags: {} }],
}

describe('api tables', () => {
  it('renders Markdown tables for every non-empty section', () => {
    const markdown = renderApiMarkdown(buildApiModel(DOC, ENGLISH_COMPONENT_API_LABELS))

    expect(markdown).toMatchInlineSnapshot(`
      "### Props

      | Name | Type | Default | Required | Description |
      | --- | --- | --- | --- | --- |
      | \`size\` | \`"small" \\| "large"\` | \`"small"\` | — | Visual size. |
      | ~~\`old\`~~ | \`string\` | — | Yes | Line one.<br>Line two with a \\| pipe.<br>**Deprecated: Use size.**<br>*Since 0.2.0* |

      ### Events

      | Name | Payload | Description |
      | --- | --- | --- |
      | \`change\` | \`[value: number]\` | Changed. |

      ### Slots

      | Name | Bindings | Description |
      | --- | --- | --- |
      | \`default\` | — |  |

      ### Exposed

      | Name | Type | Description |
      | --- | --- | --- |
      | \`focus\` | \`() => void\` | Focus it. |
      "
    `)
  })

  it('renders one section and omits empty ones', () => {
    const only = renderApiMarkdown(buildApiModel(DOC, ENGLISH_COMPONENT_API_LABELS, 'events'))
    expect(only).toContain('### Events')
    expect(only).not.toContain('### Props')

    const none = renderApiMarkdown(buildApiModel({ ...DOC, events: [] }, ENGLISH_COMPONENT_API_LABELS, 'events'))
    expect(none).toBe(`${ENGLISH_COMPONENT_API_LABELS.empty}\n`)
  })

  it('uses Chinese labels', () => {
    const markdown = renderApiMarkdown(buildApiModel(DOC, CHINESE_COMPONENT_API_LABELS))

    expect(markdown).toContain('| 名称 | 类型 | 默认值 | 必填 | 说明 |')
    expect(markdown).toContain('### 事件')
    expect(markdown).toContain('**已弃用: Use size.**')
  })

  it('shows a notice for a generic component', () => {
    const markdown = renderApiMarkdown(buildApiModel(
      { ...DOC, props: [], events: [], slots: [], exposed: [], unsupported: 'generic' },
      CHINESE_COMPONENT_API_LABELS,
    ))

    expect(markdown).toBe('泛型组件暂不支持自动提取。\n')
  })
})

describe('component api component', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  async function render(props: InstanceType<typeof ComponentApi>['$props']): Promise<string> {
    return renderToString(createSSRApp({ render: () => h(ComponentApi, props) }))
  }

  it('renders HTML tables with the same content', async () => {
    const html = await render({ doc: DOC, labels: ENGLISH_COMPONENT_API_LABELS })

    expect(html).toContain('<table class="kawa-component-api__table" data-section="props">')
    expect(html).toContain('<th scope="col">Name</th>')
    expect(html).toContain('<del class="kawa-component-api__code"><code>old</code></del>')
    expect(html).toContain('kawa-component-api__note--deprecated')
    expect(html).toContain('Deprecated: Use size.')
    expect(html).toContain('Since 0.2.0')
    expect(html).toContain('data-section="exposed"')
  })

  it('hands Markdown tables to the llms build', async () => {
    vi.stubEnv('SSG_MD', 'true')
    const html = await render({ doc: DOC, labels: ENGLISH_COMPONENT_API_LABELS, only: 'events' })

    expect(html).toContain('data-kawa-ssg-md-raw')
    expect(html).not.toContain('<table')
    expect(html).toContain('| Name | Payload | Description |')
  })

  it('renders a single section', async () => {
    const html = await render({ doc: DOC, labels: ENGLISH_COMPONENT_API_LABELS, only: 'slots' })

    expect(html).toContain('data-section="slots"')
    expect(html).not.toContain('data-section="props"')
  })

  it('renders the notice of a generic component', async () => {
    const html = await render({
      doc: { ...DOC, props: [], unsupported: 'generic' },
      labels: ENGLISH_COMPONENT_API_LABELS,
    })

    expect(html).toContain('kawa-component-api__notice')
    expect(html).not.toContain('<table')
  })
})
