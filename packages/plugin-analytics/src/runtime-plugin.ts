import { defineRuntimePlugin } from 'kawapress'
import options from './runtime-options'

interface GtagWindow {
  gtag?: (command: 'event', name: string, params: Record<string, string>) => void
}

export default defineRuntimePlugin({
  name: '@kawapress/plugin-analytics',
  setup(api) {
    // Only Google needs a route hook: Plausible and Umami watch the History
    // API themselves and Cloudflare is told `spa: true`.
    if (!options.google) {
      return
    }

    api.router((router) => {
      // Per app. The router also runs the hook for a query or hash change and
      // for the second `enter()` that adopts the requested URL; the path is
      // what makes a page view.
      let lastPath: string | undefined
      let first = true

      router.afterEach((to) => {
        if (typeof window === 'undefined' || to.path === lastPath) {
          return
        }
        lastPath = to.path
        // Without the gtag snippet (`kawapress dev` unless `dev: true`) there is
        // nothing to report to.
        const gtag = (window as GtagWindow).gtag
        if (typeof gtag !== 'function') {
          return
        }
        const pageLocation = window.location.href
        const send = (): void => {
          gtag('event', 'page_view', {
            page_location: pageLocation,
            page_title: document.title,
          })
        }
        if (first) {
          // The document title is already the title of this page.
          first = false
          setTimeout(send, 0)
        }
        else {
          sendWhenTitleChanges(send)
        }
      })
    })
  },
})

/** The head manager rewrites `document.title` a moment after the route commits. */
const TITLE_WAIT_MS = 300

function sendWhenTitleChanges(send: () => void): void {
  let done = false
  const observer = new MutationObserver(() => finish())
  const timer = setTimeout(finish, TITLE_WAIT_MS)

  function finish(): void {
    if (done) {
      return
    }
    done = true
    observer.disconnect()
    clearTimeout(timer)
    // One more tick: the title and the other head tags settle together.
    setTimeout(send, 0)
  }

  observer.observe(document.head, { childList: true, subtree: true, characterData: true })
}
