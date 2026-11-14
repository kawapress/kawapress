import { expect, test } from '../support/fixtures'
import { sitePath } from '../support/site'

/**
 * nagi turns the Badge, `[[toc]]` and emoji syntax on without any plugin in
 * the site config. The page without comments keeps giscus out.
 */
test('nagi renders badges, [[toc]] and emoji shortcodes by default', async ({ page }) => {
  await page.goto(sitePath('/opt-out'))
  const doc = page.locator('article')

  const badge = doc.locator('h2 .kawa-badge--warning')
  await expect(badge).toHaveText('beta')
  await expect(doc.locator('h2')).toHaveAttribute('id', 'defaults-of-nagi')
  // nagi maps the token, so the badge takes the theme warning color.
  const [color, warning] = await badge.evaluate((element) => {
    const probe = document.createElement('span')
    probe.style.color = 'var(--kawa-c-warning)'
    document.body.append(probe)
    const resolved = getComputedStyle(probe).color
    probe.remove()
    return [getComputedStyle(element).color, resolved]
  })
  expect(color).toBe(warning)
  await expect(badge).toHaveCSS('border-top-width', '1px')

  await expect(doc.locator('nav.kawa-toc a')).toHaveAttribute('href', '#defaults-of-nagi')
  await expect(doc.locator('p', { hasText: 'emoji shortcodes' })).toContainText('🎉')
})
