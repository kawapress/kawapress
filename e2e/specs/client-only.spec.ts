import { expect, test } from '../support/fixtures'
import { sitePath } from '../support/site'

test('ClientOnly leaves browser-only markup out of the server HTML', async ({ page, request }) => {
  const html = await (await request.get(sitePath('/client-only'))).text()
  expect(html).not.toContain('Rendered in the browser')

  await page.goto(sitePath('/client-only'))
  await expect(page.locator('.client-only-content')).toHaveText('Rendered in the browser')
  await expect(page.locator('.site-config-probe')).toHaveText('site-vite-config')
})

test('useAppearance follows the root class and the operating system preference', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto(sitePath('/client-only'))
  const probe = page.locator('.appearance-probe')
  await expect(probe).toHaveAttribute('data-dark', 'true')

  await page.evaluate(() => {
    document.documentElement.classList.remove('dark')
    document.documentElement.classList.add('light')
  })
  await expect(probe).toHaveAttribute('data-dark', 'false')

  await page.evaluate(() => document.documentElement.classList.remove('light'))
  await expect(probe).toHaveAttribute('data-dark', 'true')
})
