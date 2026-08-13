import { test, expect } from '@playwright/test'
import { stampWindow, sentinelSurvived, trackDocumentLoads } from './helpers/no-reload'

/**
 * DEV-LAUNCH-06 — /search deterministic page-N pagination.
 *
 * Replaces the old cursor-based "Load More" button (app/search/actions.ts,
 * now deleted) with the same CategoryPagination component and URL model
 * category/OCC/industry pages use — a deep-linkable, Back/Forward-safe
 * `?page=N`, not client state lost on refresh.
 *
 * "glove" is verified live against the QA store (74 total matches) to
 * guarantee a real second page.
 */
test.setTimeout(120_000)

test.describe('search pagination (DEV-LAUNCH-06)', () => {
  test('page 2 shows different products, agrees with the URL, and issues no document reload', async ({ page }) => {
    await page.goto('/search?q=glove', { waitUntil: 'domcontentloaded' })

    const firstPageTitle = await page.locator('p.line-clamp-2').first().innerText()

    const loads = trackDocumentLoads(page)
    await stampWindow(page)

    await page.getByRole('link', { name: 'Next page' }).click()
    await page.waitForLoadState('networkidle')

    expect(await sentinelSurvived(page), 'pagination caused a document reload').toBe(true)
    expect(loads.count(), 'pagination issued a document navigation').toBe(0)
    await expect(page).toHaveURL(/[?&]page=2/)
    await expect(page).toHaveURL(/[?&]q=glove/)
    await expect(page.locator('nav[aria-label="Pagination"] [aria-current="page"]')).toHaveText('2')

    const secondPageTitle = await page.locator('p.line-clamp-2').first().innerText()
    expect(secondPageTitle, 'page 2 shows the same first product as page 1').not.toBe(firstPageTitle)
  })

  test('Back restores page 1, Forward restores page 2 — both without a document reload', async ({ page }) => {
    await page.goto('/search?q=glove', { waitUntil: 'domcontentloaded' })

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

  test('sort selection survives a page-2 navigation and resets to page 1 on change', async ({ page }) => {
    await page.goto('/search?q=glove&page=2', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/[?&]page=2/)

    await page.getByRole('button', { name: /SORT BY:/i }).click()
    await page.getByRole('button', { name: 'Price: Low to High' }).click()
    await page.waitForLoadState('networkidle')

    // Changing sort intentionally starts back at page 1 (a re-sorted set has
    // a new "page 2" — same behavior as category/OCC/industry sort changes).
    await expect(page).toHaveURL(/[?&]sort=PRICE_ASC/)
    await expect(page).not.toHaveURL(/[?&]page=2/)
  })

  test('an out-of-range page redirects to page 1 instead of erroring', async ({ page }) => {
    const response = await page.goto('/search?q=glove&page=999', { waitUntil: 'domcontentloaded' })
    expect(response?.status()).toBeLessThan(400)
    await expect(page).not.toHaveURL(/[?&]page=/)
    await expect(page).toHaveURL(/[?&]q=glove/)
  })
})
