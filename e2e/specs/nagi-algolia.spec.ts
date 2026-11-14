import { stubAlgolia } from '../support/algolia'
import { expect, test } from '../support/fixtures'
import { stubGiscus } from '../support/giscus'
import { sitePath } from '../support/site'

/**
 * The plugin fixture site turns the nagi local search off with `search: false`
 * and installs Algolia instead. The hit opens a page with comments, so giscus
 * is stubbed as well.
 */
test('Algolia replaces the nagi local search and Control+K opens it', async ({ page }) => {
  await stubGiscus(page)
  await stubAlgolia(page, [
    { title: 'Second page', url: `https://docs.example.com${sitePath('/second.html')}` },
  ])
  await page.goto(sitePath('/opt-out'))

  const controls = page.locator('.nagi-nav__controls--desktop')
  await expect(controls.locator('.kawa-algolia-search')).toBeVisible()
  await expect(page.locator('.kawa-search-button')).toHaveCount(0)

  await page.keyboard.press('Control+K')
  const input = page.locator('.DocSearch-Input')
  await expect(input).toBeFocused()
  await input.fill('second')
  await expect(page.locator('.DocSearch-Hit').first()).toContainText('Second page')

  await page.locator('.DocSearch-Hit a').first().click()
  await expect(page).toHaveURL(new RegExp(`${sitePath('/second')}$`))
  await expect(page.locator('article h1')).toContainText('Second page')
})
