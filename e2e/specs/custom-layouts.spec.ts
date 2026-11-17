import { expect, test } from '../support/fixtures'
import { sitePath } from '../support/site'

/**
 * The plugin fixture site registers a `showcase` component and has one page
 * per layout kind nagi does not draw itself.
 */
test('a custom layout name renders the registered component inside the page frame', async ({ page }) => {
  await page.goto(sitePath('/showcase'))

  const frame = page.locator('.nagi.nagi--showcase')
  await expect(frame.locator('.nagi-nav-bar')).toBeVisible()
  await expect(frame.locator('.showcase-layout h1')).toContainText('Showcase page')
  await expect(page.locator('.nagi-sidebar')).toHaveCount(0)
})

test('layout: false renders the page without any nagi frame', async ({ page }) => {
  await page.goto(sitePath('/frame'))

  await expect(page.locator('.nagi-bare.frame-page h1')).toContainText('Frame page')
  await expect(page.locator('.nagi')).toHaveCount(0)
  await expect(page.locator('.nagi-nav-bar')).toHaveCount(0)
})

test('layout: page leaves custom markup free of document typography', async ({ page }) => {
  await page.goto(sitePath('/blank'))

  await expect(page.locator('.nagi.nagi--page')).toBeVisible()
  await expect(page.locator('.nagi-doc')).toHaveCount(0)
  const heights = await page.evaluate(() => ({
    main: document.querySelector('.nagi-main--page')!.getBoundingClientRect().height,
    scroll: document.querySelector('.nagi-page-scroll')!.getBoundingClientRect().height,
  }))
  expect(heights.main).toBe(heights.scroll)
  const image = page.locator('.nagi-main--page img')
  await expect(image).toHaveCSS('margin-top', '0px')
  await expect(image).toHaveCSS('margin-bottom', '0px')
  await expect(page.locator('.nagi-main--page h2')).toHaveCSS('border-top-width', '0px')
  await expect(page.locator('.nagi-main--page hr')).toHaveCSS('border-top-width', '0px')
})

test('a site can leave out llms actions and the nagi footer', async ({ page }) => {
  await page.goto(sitePath('/opt-out'))
  await expect(page.locator('.kawa-llms-actions')).toHaveCount(0)
  await expect(page.locator('.nagi-footer')).toHaveCount(0)
})

test('pages with their own layout stay out of the automatic sidebar', async ({ page }) => {
  await page.goto(sitePath('/opt-out'))

  const links = page.locator('.nagi-sidebar--desktop .nagi-sidebar-item__link')
  await expect(links.filter({ hasText: /Showcase|Frame/ })).toHaveCount(0)
})
