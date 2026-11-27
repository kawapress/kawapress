import { expect, test } from '../../support/fixtures'
import { sitePath } from '../../support/site'

/**
 * The content plugins write plain HTML with stable `.kawa-*` classes and need
 * no browser runtime to look right, so these specs cover what a reader sees on
 * a page of the reference theme.
 */
test.beforeEach(async ({ page }) => {
  await page.goto(sitePath('/'))
})

test('a custom container keeps its structure and title', async ({ page }) => {
  const tip = page.locator('.ref-doc .kawa-container--tip')
  await expect(tip).toHaveCount(1)
  await expect(tip.locator('.kawa-container__title')).toHaveText('Tip')
  await expect(tip).toContainText('paints itself from the plugin stylesheet')

  const info = page.locator('.ref-doc .kawa-container--info')
  await expect(info.locator('.kawa-container__title')).toHaveText('Info')
})

test('a GitHub alert keeps its structure and title', async ({ page }) => {
  const alert = page.locator('.ref-doc .kawa-alert--note')
  await expect(alert).toHaveCount(1)
  await expect(alert.locator('.kawa-alert__title')).toHaveText('Note')
  await expect(alert).toContainText('keeps its own title')
})

test('a badge renders in a heading and in text, and stays out of the heading id', async ({ page }) => {
  const heading = page.locator('.ref-doc h2#badges')
  await expect(heading.locator('.kawa-badge--warning')).toHaveText('beta')
  await expect(page.locator('.ref-doc p .kawa-badge--tip')).toHaveText('new')
})

test('[[toc]] lists the headings of the page with links to their anchors', async ({ page }) => {
  const links = page.locator('.ref-doc .kawa-toc a')
  await expect(links).toHaveText(['Badges', 'Filler'])

  for (const link of await links.all()) {
    const id = (await link.getAttribute('href'))!.slice(1)
    await expect(page.locator(`.ref-doc [id="${id}"]`)).toHaveCount(1)
  }
  await expect(page.locator('.ref-doc')).not.toContainText('[[toc]]')
})

test('an emoji shortcode becomes the emoji outside of code', async ({ page }) => {
  const paragraph = page.locator('.ref-doc p', { hasText: 'Shortcodes turn into emoji' })
  await expect(paragraph).toContainText('emoji 🎉, while')
  await expect(paragraph.locator('code')).toHaveText(':tada:')
})

test('a code block gets the plugin shell with a language label and a copy button', async ({ page }) => {
  const block = page.locator('.ref-doc .kawa-code-block').first()
  await expect(block.locator('.kawa-code-block__language')).toHaveText('Bash')
  await expect(block.locator('.kawa-code-block__copy')).toHaveAttribute('aria-label', 'Copy code')
  await expect(block.locator('pre code')).toContainText('pnpm install')
})

test('a code group renders tabs that switch the visible panel', async ({ page }) => {
  const group = page.locator('.ref-doc .kawa-code-group')
  const tabs = group.getByRole('tab')
  await expect(tabs).toHaveText(['npm', 'pnpm'])
  await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true')

  await tabs.nth(1).click()

  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true')
  await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'false')
  const panel = group.locator('[role="tabpanel"]:not([hidden])')
  await expect(panel).toContainText('pnpm add kawapress')
})

test('the inline and the block formula are rendered to SVG', async ({ page }) => {
  const inline = page.locator('mjx-container[data-kawa-math="inline"]')
  await expect(inline).toHaveCount(1)
  await expect(inline.locator('svg')).toHaveCount(1)

  const block = page.locator('mjx-container[data-kawa-math="block"]')
  await expect(block).toHaveCount(1)
  await expect(block).toHaveAttribute('tabindex', '0')
  await expect(block.locator('svg')).toHaveCount(1)
})

test('the image carries the zoom button semantics', async ({ page }) => {
  const image = page.locator('.ref-doc img[data-kawa-zoom]')
  await expect(image).toHaveCount(1)
  await expect(image).toHaveAttribute('role', 'button')
  await expect(image).toHaveAttribute('aria-label', 'Zoom image: KawaPress logo')
})

test('the Markdown artifact of the page is generated as well', async ({ request }) => {
  const response = await request.get(sitePath('/index.md'))
  expect(response.status()).toBe(200)
  expect(await response.text()).toContain('# Reference site')
})
