// @vitest-environment happy-dom

import type { App, ShallowRef } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, nextTick, shallowRef } from 'vue'
import AlgoliaSearch from './AlgoliaSearch.vue'

interface TestSite {
  base: string
  lang: string
  localeIndex: string
}

interface DocSearchProps {
  container: HTMLElement
  indices: { name: string, searchParameters: Record<string, unknown> }[]
  navigator: { navigate: (params: { itemUrl: string }) => void }
  transformItems: (items: { url: string }[]) => { url: string }[]
  onClose: () => void
}

const state = vi.hoisted(() => ({
  site: undefined as unknown as ShallowRef<TestSite>,
  push: vi.fn(() => Promise.resolve()),
  docsearch: vi.fn(),
  instance: { open: vi.fn(), destroy: vi.fn() },
}))

vi.mock('kawapress/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('kawapress/client')>()
  return {
    ...actual,
    useSite: () => state.site,
    useRouter: () => ({ push: state.push }),
  }
})
vi.mock('@unhead/vue', () => ({ useHead: () => {} }))
vi.mock('../runtime-options', () => ({
  default: {
    appId: 'APP',
    apiKey: 'key',
    indices: ['docs'],
    keyboardShortcuts: { 'Ctrl/Cmd+K': true, '/': true },
    locales: {},
  },
}))
vi.mock('../docsearch-vendor.css', () => ({}))
vi.mock('@docsearch/js/docsearch', () => ({
  default: (props: DocSearchProps) => {
    state.docsearch(props)
    return state.instance
  },
}))

let app: App<Element> | undefined

beforeEach(() => {
  state.site = shallowRef({ base: '/docs/', lang: 'en', localeIndex: 'root' })
  const host = document.createElement('div')
  document.body.append(host)
  app = createApp(AlgoliaSearch)
  app.mount(host)
})

afterEach(() => {
  app?.unmount()
  app = undefined
  document.body.innerHTML = ''
  vi.clearAllMocks()
})

describe('algolia search button', () => {
  it('loads DocSearch only when the reader opens the search', async () => {
    expect(state.docsearch).not.toHaveBeenCalled()

    document.querySelector<HTMLButtonElement>('.kawa-algolia-search')!.click()

    await vi.waitFor(() => expect(state.instance.open).toHaveBeenCalledOnce())
    const props = lastProps()
    expect(props.indices).toEqual([
      { name: 'docs', searchParameters: { facetFilters: ['lang:en'] } },
    ])
  })

  it('opens on Ctrl+K and on the slash key', async () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))
    await vi.waitFor(() => expect(state.instance.open).toHaveBeenCalledOnce())
    expect(state.docsearch).toHaveBeenCalledOnce()
  })

  it('keeps the slash key for text fields', async () => {
    const input = document.createElement('input')
    document.body.append(input)
    input.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true }))
    await nextTick()
    expect(state.docsearch).not.toHaveBeenCalled()
  })

  it('sends Enter on a hit through the router and keeps hits on this site', async () => {
    document.querySelector<HTMLButtonElement>('.kawa-algolia-search')!.click()
    await vi.waitFor(() => expect(state.docsearch).toHaveBeenCalledOnce())
    const props = lastProps()

    expect(props.transformItems([{ url: 'https://example.com/docs/guide/start.html#install' }]))
      .toEqual([{ url: '/docs/guide/start#install' }])

    props.navigator.navigate({ itemUrl: '/docs/guide/start#install' })
    expect(state.push).toHaveBeenCalledWith('/guide/start#install')
  })

  it('returns the focus to the button when DocSearch closes', async () => {
    const button = document.querySelector<HTMLButtonElement>('.kawa-algolia-search')!
    button.click()
    await vi.waitFor(() => expect(state.docsearch).toHaveBeenCalledOnce())

    button.blur()
    lastProps().onClose()
    expect(document.activeElement).toBe(button)
  })

  it('rebuilds DocSearch after the locale changes', async () => {
    document.querySelector<HTMLButtonElement>('.kawa-algolia-search')!.click()
    await vi.waitFor(() => expect(state.docsearch).toHaveBeenCalledOnce())

    state.site.value = { base: '/docs/', lang: 'zh-CN', localeIndex: 'zh' }
    await nextTick()
    expect(state.instance.destroy).toHaveBeenCalledOnce()

    document.querySelector<HTMLButtonElement>('.kawa-algolia-search')!.click()
    await vi.waitFor(() => expect(state.docsearch).toHaveBeenCalledTimes(2))
    expect(lastProps().indices[0].searchParameters).toEqual({ facetFilters: ['lang:zh-CN'] })
  })
})

function lastProps(): DocSearchProps {
  return state.docsearch.mock.lastCall![0] as DocSearchProps
}
