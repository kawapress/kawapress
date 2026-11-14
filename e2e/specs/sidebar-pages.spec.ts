import { expect, test } from '../support/fixtures'
import { sitePath } from '../support/site'

/**
 * The plugin fixture site declares no `themeConfig.sidebar`, so nagi builds the
 * sidebar from the pages on disk. Every title below comes from the frontmatter
 * of the page source, not from a hand-written list.
 *
 * The spec opens the page that turns the comment section off: the pages that
 * keep it would load giscus, which this suite never stubs outside its own spec.
 */
test('the automatic sidebar lists the pages of the site', async ({ page }) => {
  await page.goto(sitePath('/opt-out'))

  const links = page.locator('.nagi-sidebar--desktop .nagi-sidebar-item__link')
  await expect(links).toHaveText([
    'First page',
    'Folded start',
    'Page without comments',
    'Second page',
    'Styled page',
  ])
  await expect(links.nth(2)).toHaveAttribute('aria-current', 'page')
  await expect(links.nth(2)).toHaveAttribute('href', sitePath('/opt-out'))
})

test('a collapsed group starts closed, folds open, and opens for its own page', async ({ page }) => {
  await page.goto(sitePath('/opt-out'))

  const sidebar = page.locator('.nagi-sidebar--desktop')
  const toggle = sidebar.getByRole('button', { name: 'Folded guide' })
  const child = sidebar.getByRole('link', { name: 'Folded start' })
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(child).toBeHidden()

  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await child.click()
  await expect(page).toHaveURL(new RegExp(`${sitePath('/guide/start')}$`))

  // A fresh load of a page inside the group renders the group open.
  await page.reload()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await expect(child).toHaveAttribute('aria-current', 'page')
})
