import { expect, test } from '../support/fixtures'
import { sitePath } from '../support/site'

/**
 * The plugin fixture site writes one Simple Icons name and one inline SVG in
 * `themeConfig.socialLinks`. The page without comments keeps giscus out.
 */
test('social links render their icons in the navigation bar', async ({ page }) => {
  await page.goto(sitePath('/opt-out'))

  const controls = page.locator('.nagi-nav__controls--desktop')
  const github = controls.getByRole('link', { name: 'github' })
  await expect(github).toHaveAttribute('href', 'https://github.com/kawapress/kawapress')
  await expect(github).toHaveAttribute('target', '_blank')
  // The named icon is the Simple Icons markup, resolved at build time.
  await expect(github.locator('svg path')).toHaveCount(1)

  const status = controls.getByRole('link', { name: 'Status' })
  await expect(status).toHaveAttribute('href', 'https://status.example.com')
  await expect(status.locator('svg circle')).toHaveCount(1)
  await expect(status.locator('svg')).toHaveCSS('width', '18px')
})
