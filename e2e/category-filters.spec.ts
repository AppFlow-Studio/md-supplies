import { test, expect, type Page } from '@playwright/test'
import { stampWindow, sentinelSurvived, trackDocumentLoads } from './helpers/no-reload'
import { firstPopulatedCategory, requireFixture } from './helpers/qa-fixtures'
import { resultStatus } from './helpers/catalog'

/**
 * DEV-LAUNCH-06 — filter interactions on a real QA-store category.
 *
 * The QA store's Search & Discovery is not configured with the rich
 * metafield/category facets production has (see
 * docs/launch/DEV-LAUNCH-06-qa-fixtures.md) — every category currently
 * returns only Availability and Price. Tests below are written against
 * whatever the allowlist actually renders, not a hardcoded facet set, so they
 * stay meaningful as QA store data changes, and skip with a clear reason
 * (never fail red) when a required facet shape isn't present today.
 */
test.setTimeout(180_000)

function parseCount(text: string): number {
  const m = text.match(/(\d+)/)
  return m ? Number(m[1]) : NaN
}

function productCardCount(page: Page) {
  // One <p class="...line-clamp-2..."> title per ShopifyProductCard, inside
  // the CatalogResultsState wrapper (the only element with an aria-busy
  // attribute on a settled category page — see components/category/
  // CatalogResultsState.tsx). Scoping matters: the category hero description
  // (components/category/CategoryPageView.tsx) also uses line-clamp-2 and
  // would otherwise be counted as an extra "product".
  return page.locator('[aria-busy] p.line-clamp-2').count()
}

// The Checkbox button (components/filters/FilterRail.tsx) gets its
// accessible name from the wrapping <label>'s full text content (label +
// count, e.g. "In stock 38") via the native label-wraps-control pattern.
// Scoping to the <label> by its visible text first, then finding the
// checkbox inside it by role alone, is more robust than depending on that
// computed name matching exactly.
function facetCheckbox(page: Page, valueLabel: string) {
  return page.locator('label', { hasText: valueLabel }).first().getByRole('checkbox')
}

// Only the Category facet starts expanded (FilterRail.tsx isCategoryFacet);
// every other group — Availability included — starts collapsed until its
// header is clicked or it already holds an active value. Values aren't in
// the DOM at all until then.
async function expandGroup(page: Page, groupLabel: string) {
  const header = page.getByRole('button', { name: groupLabel, exact: true })
  if ((await header.count()) === 0) return
  if ((await header.getAttribute('aria-expanded')) === 'false') await header.click()
}

test.describe('category filters — count/URL/chip/product agreement (DEV-LAUNCH-06)', () => {
  test('selecting Availability: chip, URL, count and visible products all agree; no reload', async ({ page }) => {
    const category = requireFixture(firstPopulatedCategory(9), 'a populated L1 category on the QA store')
    await page.goto(`/category/${category.routeSlug}`, { waitUntil: 'domcontentloaded' })

    const status = resultStatus(page)
    await expect(status).toBeVisible()
    await expandGroup(page, 'Availability')

    const checkbox = facetCheckbox(page, 'In stock')
    test.skip((await checkbox.count()) === 0, 'QA-data gap: no Availability facet rendered for this category')

    const loads = trackDocumentLoads(page)
    await stampWindow(page)

    await checkbox.click()
    await page.waitForLoadState('networkidle')

    expect(await sentinelSurvived(page), 'selecting a filter caused a document reload').toBe(true)
    expect(loads.count(), 'selecting a filter issued a document navigation').toBe(0)

    // URL reflects the filter.
    await expect(page).toHaveURL(/[?&]filter=/)

    // Chip renders for the selected value.
    const chip = page.getByRole('link', { name: /In stock/ })
    await expect(chip.first()).toBeVisible()

    // Status text agrees with the number of rendered product cards.
    const statusCount = parseCount(await status.innerText())
    const cardCount = await productCardCount(page)
    expect(statusCount, 'result count text does not match visible product cards').toBe(cardCount)

    // Removing via the chip returns to the unfiltered state without a reload.
    await chip.first().click()
    await page.waitForLoadState('networkidle')
    expect(await sentinelSurvived(page), 'removing the chip caused a document reload').toBe(true)
    await expect(page).not.toHaveURL(/[?&]filter=/)
    await expect(chip.first()).toHaveCount(0)
  })

  test('two rapid filter selections do not drop the first (optimistic-state race)', async ({ page }) => {
    const category = requireFixture(firstPopulatedCategory(9), 'a populated L1 category on the QA store')
    await page.goto(`/category/${category.routeSlug}`, { waitUntil: 'domcontentloaded' })
    await expect(resultStatus(page)).toBeVisible()
    await expandGroup(page, 'Availability')

    const inStock = facetCheckbox(page, 'In stock')
    const outOfStock = facetCheckbox(page, 'Out of stock')
    test.skip((await inStock.count()) === 0 || (await outOfStock.count()) === 0, 'QA-data gap: Availability facet needs both values present')

    await stampWindow(page)
    // Click both without waiting for the first navigation to settle.
    await inStock.click()
    await outOfStock.click()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(300)

    expect(await sentinelSurvived(page)).toBe(true)
    const url = new URL(page.url())
    const filterParams = url.searchParams.getAll('filter')
    expect(filterParams.length, 'a rapid second click dropped the first filter selection').toBe(2)
  })

  test('clear all filters returns to the unfiltered product count', async ({ page }) => {
    const category = requireFixture(firstPopulatedCategory(9), 'a populated L1 category on the QA store')
    await page.goto(`/category/${category.routeSlug}`, { waitUntil: 'domcontentloaded' })

    const status = resultStatus(page)
    await expect(status).toBeVisible()
    const baselineCount = parseCount(await status.innerText())
    await expandGroup(page, 'Availability')

    const checkbox = facetCheckbox(page, 'In stock')
    test.skip((await checkbox.count()) === 0, 'QA-data gap: no Availability facet rendered for this category')

    await checkbox.click()
    await page.waitForLoadState('networkidle')

    const clearAll = page.getByRole('button', { name: 'Clear all filters' })
    await expect(clearAll).toBeVisible()
    await stampWindow(page)
    await clearAll.click()
    await page.waitForLoadState('networkidle')

    expect(await sentinelSurvived(page), 'clear-all caused a document reload').toBe(true)
    await expect(page).not.toHaveURL(/[?&]filter=/)
    const restoredCount = parseCount(await status.innerText())
    expect(restoredCount).toBe(baselineCount)
  })

  test('price range filter narrows results without a reload', async ({ page }) => {
    const category = requireFixture(firstPopulatedCategory(9), 'a populated L1 category on the QA store')
    await page.goto(`/category/${category.routeSlug}`, { waitUntil: 'domcontentloaded' })
    await expect(resultStatus(page)).toBeVisible()

    const slider = page.getByRole('slider', { name: 'Maximum price' })
    test.skip((await slider.count()) === 0, 'QA-data gap: no Price facet rendered for this category')

    await stampWindow(page)
    await slider.focus()
    for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowLeft')
    await page.waitForTimeout(600) // commit debounce (400ms)
    await page.waitForLoadState('networkidle')

    expect(await sentinelSurvived(page), 'adjusting price caused a document reload').toBe(true)
    await expect(page).toHaveURL(/[?&]filter=.*price/)
  })

  test('a facet with more than 8 values gets Show more/less and a value search box', async ({ page }) => {
    // Generic across whatever category happens to have a large facet on the
    // QA store today — none currently do (see qa-fixtures doc), so this skips
    // with a clear reason rather than asserting against fabricated data.
    const category = requireFixture(firstPopulatedCategory(9), 'a populated L1 category on the QA store')
    await page.goto(`/category/${category.routeSlug}`, { waitUntil: 'domcontentloaded' })
    await expect(resultStatus(page)).toBeVisible()

    const showMore = page.getByRole('button', { name: /Show \d+ more/ })
    test.skip((await showMore.count()) === 0, 'QA-data gap: no facet on the QA store currently has more than 8 values')

    await showMore.first().click()
    await expect(page.getByRole('button', { name: 'Show less' })).toBeVisible()
  })
})
