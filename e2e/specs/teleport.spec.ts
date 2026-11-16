import { expect, test } from '../support/fixtures'
import { sitePath } from '../support/site'

/**
 * `teleport.md` renders a component that teleports into `<body>`. The shared
 * fixture fails the test on any hydration warning or page error, which is how a
 * teleport the server left out shows up.
 */
test('content teleported to body is prerendered and hydrates', async ({ page, request }) => {
  const response = await request.get(sitePath('/teleport'))
  const html = await response.text()
  const body = html.slice(html.indexOf('<body>'))
  expect(body.indexOf('Teleported 0'), 'the teleport must be in the served HTML').toBeGreaterThan(-1)
  expect(body.indexOf('Teleported 0')).toBeLessThan(body.indexOf('<div id="app">'))

  await page.goto(sitePath('/teleport'))
  await page.getByRole('button', { name: 'Bump 0' }).click()

  await expect(page.locator('body > .teleport-note')).toHaveText('Teleported 1')
})
