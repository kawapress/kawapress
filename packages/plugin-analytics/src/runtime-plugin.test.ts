import type { Router, RuntimePlugin } from 'kawapress'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const runtimeOptions = vi.hoisted(() => ({ google: true }))
vi.mock('./runtime-options', () => ({ default: runtimeOptions }))

type AfterEachHook = (to: { path: string }) => void

const gtag = vi.fn()
const titleObservers: (() => void)[] = []

beforeEach(() => {
  vi.useFakeTimers()
  runtimeOptions.google = true
  vi.stubGlobal('window', { gtag, location: { href: 'https://example.com/a' } })
  vi.stubGlobal('document', { title: 'Page A', head: {} })
  titleObservers.length = 0
  vi.stubGlobal('MutationObserver', class {
    constructor(private readonly callback: () => void) {}
    observe(): void {
      titleObservers.push(this.callback)
    }

    disconnect(): void {}
  })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  gtag.mockReset()
})

describe('analytics runtime plugin', () => {
  it('registers no route hook without Google', async () => {
    runtimeOptions.google = false
    const router = vi.fn()
    await setup(router)
    expect(router).not.toHaveBeenCalled()
  })

  it('sends one page_view per path, the first page included', async () => {
    const afterEach = await collectAfterEach()

    afterEach({ path: '/a' })
    afterEach({ path: '/a' }) // hash or query change, or the adopting enter()
    vi.advanceTimersByTime(1)
    expect(gtag).toHaveBeenCalledTimes(1)
    expect(gtag).toHaveBeenLastCalledWith('event', 'page_view', {
      page_location: 'https://example.com/a',
      page_title: 'Page A',
    })

    ;(window as unknown as { location: { href: string } }).location.href = 'https://example.com/b'
    afterEach({ path: '/b' })
    // The title of the new page arrives after the route commits.
    vi.advanceTimersByTime(1)
    expect(gtag).toHaveBeenCalledTimes(1)
    document.title = 'Page B'
    titleObservers[0]()
    vi.advanceTimersByTime(1)
    expect(gtag).toHaveBeenCalledTimes(2)
    expect(gtag).toHaveBeenLastCalledWith('event', 'page_view', {
      page_location: 'https://example.com/b',
      page_title: 'Page B',
    })
  })

  it('sends without a title change after a short wait', async () => {
    const afterEach = await collectAfterEach()

    afterEach({ path: '/a' })
    afterEach({ path: '/b' })
    vi.advanceTimersByTime(1000)
    expect(gtag).toHaveBeenCalledTimes(2)
  })

  it('does nothing when the gtag snippet is not on the page', async () => {
    const afterEach = await collectAfterEach()
    ;(window as unknown as { gtag?: unknown }).gtag = undefined

    afterEach({ path: '/a' })
    vi.advanceTimersByTime(1)
    expect(gtag).not.toHaveBeenCalled()
  })
})

async function collectAfterEach(): Promise<AfterEachHook> {
  let hook: AfterEachHook | undefined
  await setup((handler) => {
    const register = (value: AfterEachHook): void => {
      hook = value
    }
    handler({ afterEach: register } as unknown as Router)
  })
  if (!hook) {
    throw new Error('Expected an afterEach hook.')
  }
  return hook
}

async function setup(router: (handler: (router: Router) => void) => void): Promise<void> {
  const { default: plugin } = await import('./runtime-plugin')
  await (plugin as RuntimePlugin).setup({
    prependToOutlet: () => {},
    appendToOutlet: () => {},
    router,
    vueApp: () => {},
  })
}
