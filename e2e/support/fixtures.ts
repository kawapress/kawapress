import type { ConsoleMessage } from '@playwright/test'
import { test as base, expect } from '@playwright/test'

const HYDRATION_RE = /hydration/i
const RESOURCE_STATUS_RE = /Failed to load resource.*status of (\d{3})/

/**
 * The real giscus script renders a cross-origin iframe, which no test can
 * inspect, and that iframe asks the giscus service for the discussion. This
 * stub does the same DOM work with the same class name, so a spec can assert
 * when the script is requested and which attributes it carries.
 */
const GISCUS_STUB_SCRIPT = `
(() => {
  const host = document.querySelector('.kawa-comments__thread')
  if (!host) {
    return
  }
  const frame = document.createElement('iframe')
  frame.className = 'giscus-frame'
  frame.title = 'Comments'
  host.append(frame)
})()
`

/**
 * Every spec inherits a console guard: any `console.error`, any uncaught page
 * error and any Vue hydration mismatch warning fails the test after it ran, so
 * a page can be asserted for content and for a clean client start at once.
 *
 * A document that the test navigates to on purpose may legitimately answer with
 * a 4xx status (the not-found page), and Chromium reports that as a console
 * error. Those messages are skipped, everything else still fails the test.
 */
export const test = base.extend<{ consoleGuard: void, giscusRequests: string[] }>({
  /**
   * Installed for every test, so the suite never depends on the real giscus
   * service: any page with a comment section loads this stand-in instead.
   * The value lists every request that reached giscus, in order.
   */
  giscusRequests: [async ({ page }, use) => {
    const requests: string[] = []
    await page.route('https://giscus.app/**', async (route) => {
      requests.push(route.request().url())
      await route.fulfill({
        body: GISCUS_STUB_SCRIPT,
        contentType: 'text/javascript',
      })
    })
    await use(requests)
  }, { auto: true }],

  consoleGuard: [async ({ page }, use) => {
    const problems: string[] = []
    const failedDocuments = new Set<string>()

    page.on('response', (response) => {
      if (response.request().isNavigationRequest() && response.status() >= 400) {
        failedDocuments.add(response.url())
      }
    })
    page.on('console', (message: ConsoleMessage) => {
      const text = message.text()
      if (message.type() === 'error') {
        if (isExpectedDocumentStatus(message, text, failedDocuments)) {
          return
        }
        problems.push(`console.error: ${text}`)
      }
      else if (message.type() === 'warning' && HYDRATION_RE.test(text)) {
        problems.push(`hydration warning: ${text}`)
      }
    })
    page.on('pageerror', error => problems.push(`page error: ${error.message}`))

    await use()

    expect(
      problems,
      `The page at ${page.url()} reported problems in the browser console`,
    ).toEqual([])
  }, { auto: true }],
})

function isExpectedDocumentStatus(
  message: ConsoleMessage,
  text: string,
  failedDocuments: Set<string>,
): boolean {
  const status = RESOURCE_STATUS_RE.exec(text)?.[1]
  if (!status || Number(status) < 400) {
    return false
  }
  return failedDocuments.has(message.location().url)
}

export { expect }
