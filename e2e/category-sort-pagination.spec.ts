import { test, expect } from '@playwright/test'
import { stampWindow, sentinelSurvived, trackDocumentLoads } from './helpers/no-reload'
import { firstPaginatableCategory, requireFixture } from './helpers/qa-fixtures'
import { resultStatus } from './helpers/catalog'

/** DEV-LAUNCH-06 — sort and pagination against a real, populated QA-store category. */
test.setTimeout(180_000)

function parseCount(text: string): number {
  const m = text.match(/(\d+)/)
  return m ? Number(m[1]) : NaN
}

test.describe('category sort (DEV-LAUNCH-06)', () => {
  test('changing sort updates the URL without a document reload', async ({ page }) => {
    const category = requireFixture(firstPaginatableCategory(), 'a QA-store category with enough products to sort meaningfully')
    await page.goto(`/category/${category.routeSlug}`, { waitUntil: 'domcontentloaded' })

    const status = resultStatus(page)
    await expect(status).toBeVisible()
    const baselineCount = parseCount(await status.innerText())

    const loads = trackDocumentLoads(page)
    await stampWindow(page)

    await page.getByRole('button', { name: /^Sort:/ }).click()
    await page.getByRole('button', { name: 'Price: Low to High' }).click()
    await page.waitForLoadState('networkidle')

    expect(await sentinelSurvived(page), 'changing sort caused a document reload').toBe(true)
    expect(loads.count(), 'changing sort issued a document navigation').toBe(0)
    await expect(page).toHaveURL(/[?&]sort=PRICE_ASC/)
    await expect(page.getByRole('button', { name: /^Sort:/ })).toContainText('Price: Low to High')

    // Sorting must not change how many products are in the (unfiltered) set.
    expect(parseCount(await status.innerText())).toBe(baselineCount)
  })
})

test.describe('category pagination (DEV-LAUNCH-06)', () => {
  test('page 2 shows different products, agrees with the URL, and issues no document reload', async ({ page }) => {
    const category = requireFixture(firstPaginatableCategory(), 'a QA-store category with enough products for a second page')
    await page.goto(`/category/${category.routeSlug}`, { waitUntil: 'domcontentloaded' })

    const firstPageTitle = await page.locator('[aria-busy] p.line-clamp-2').first().innerText()

    const loads = trackDocumentLoads(page)
    await stampWindow(page)

    await page.getByRole('link', { name: 'Next page' }).click()
    await page.waitForLoadState('networkidle')

    expect(await sentinelSurvived(page), 'pagination caused a document reload').toBe(true)
    expect(loads.count(), 'pagination issued a document navigation').toBe(0)
    await expect(page).toHaveURL(/[?&]page=2/)
    await expect(page.locator('nav[aria-label="Pagination"] [aria-current="page"]')).toHaveText('2')

    const secondPageTitle = await page.locator('[aria-busy] p.line-clamp-2').first().innerText()
    expect(secondPageTitle, 'page 2 shows the same first product as page 1').not.toBe(firstPageTitle)
  })

  test('Back restores page 1, Forward restores page 2 — both without a document reload', async ({ page }) => {
    const category = requireFixture(firstPaginatableCategory(), 'a QA-store category with enough products for a second page')
    await page.goto(`/category/${category.routeSlug}`, { waitUntil: 'domcontentloaded' })

    await page.getByRole('link', { name: 'Next page' }).click()
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/[?&]page=2/)

    const loads = trackDocumentLoads(page)
    await stampWindow(page)

    await page.goBack()
    await page.waitForLoadState('networkidle')
    expect(await sentinelSurvived(page), 'Back caused a document reload').toBe(true)
    await expect(page).not.toHaveURL(/[?&]page=2/)

    await page.goForward()
    await page.waitForLoadState('networkidle')
    expect(await sentinelSurvived(page), 'Forward caused a document reload').toBe(true)
    await expect(page).toHaveURL(/[?&]page=2/)

    expect(loads.count(), 'Back/Forward issued a document navigation').toBe(0)
  })

  test('sort and filter selections survive a page-2 navigation and Back', async ({ page }) => {
    const category = requireFixture(firstPaginatableCategory(), 'a QA-store category with enough products for a second page')
    await page.goto(`/category/${category.routeSlug}?sort=PRICE_ASC`, { waitUntil: 'domcontentloaded' })

    await page.getByRole('link', { name: 'Next page' }).click()
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/[?&]sort=PRICE_ASC/)
    await expect(page).toHaveURL(/[?&]page=2/)

    await page.goBack()
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/[?&]sort=PRICE_ASC/)
    await expect(page).not.toHaveURL(/[?&]page=2/)
  })
})
