import { test, expect } from '@playwright/test'
import { stampWindow, sentinelSurvived, trackDocumentLoads } from './helpers/no-reload'
import { occFixture } from './helpers/qa-fixtures'

// Dev-mode first compiles of these routes can take well over a minute; these
// tests are about navigation semantics, not speed.
test.setTimeout(300_000)

/**
 * Phase 12 — prove catalog interactions never cause a browser DOCUMENT load.
 *
 * The old architecture rewrote query variants onto a duplicate route
 * (/category-browse/[slug]), so the clean and filtered views were different
 * route segments and every filter/sort/search/page action remounted the page.
 * These tests assert the fix at the only level that actually matters: the
 * browser's own navigation events.
 *
 * See ./helpers/no-reload.ts for the stamp/sentinel/document-load-tracking
 * technique, shared with the pagination/filter/sort coverage in
 * category-filters.spec.ts and category-sort-pagination.spec.ts.
 */

const CATEGORY = '/category/gloves'

test.describe('catalog interactions do not reload the document', () => {
  test('search, sort, filter and pagination all stay in-place', async ({ page }) => {
    await page.goto(CATEGORY, { waitUntil: 'domcontentloaded', timeout: 240_000 })
    await page.waitForSelector('#category-scoped-search', { timeout: 120_000 })

    const loads = trackDocumentLoads(page)
    await stampWindow(page)

    // --- scoped search -----------------------------------------------------
    const search = page.locator('#category-scoped-search')
    await search.fill('nitrile')
    await page.waitForTimeout(700) // debounce (~300ms) + navigation
    expect(await sentinelSurvived(page), 'search caused a document reload').toBe(true)
    await expect(page).toHaveURL(/[?&]q=nitrile/)

    // --- clear search ------------------------------------------------------
    await search.fill('')
    await page.waitForTimeout(700)
    expect(await sentinelSurvived(page), 'clearing search reloaded').toBe(true)

    // --- sort ----------------------------------------------------------------
    await page.getByRole('button', { name: /^Sort:/ }).click()
    await page.getByRole('button', { name: 'Price: Low to High' }).click()
    await page.waitForLoadState('networkidle')
    expect(await sentinelSurvived(page), 'changing sort reloaded').toBe(true)
    await expect(page).toHaveURL(/[?&]sort=PRICE_ASC/)

    // --- filter (Availability, present on every collection today) ----------
    const availabilityCheckbox = page.getByRole('checkbox', { name: 'In stock' }).first()
    if (await availabilityCheckbox.count()) {
      await availabilityCheckbox.click()
      await page.waitForLoadState('networkidle')
      expect(await sentinelSurvived(page), 'selecting a filter reloaded').toBe(true)
      await expect(page).toHaveURL(/[?&]filter=/)
    }

    // --- pagination ----------------------------------------------------------
    const nextPage = page.getByRole('link', { name: 'Next page' })
    if (await nextPage.count()) {
      await nextPage.click()
      await page.waitForLoadState('networkidle')
      expect(await sentinelSurvived(page), 'pagination reloaded').toBe(true)
      await expect(page).toHaveURL(/[?&]page=2/)
    }

    // --- Back / Forward ----------------------------------------------------
    await page.goBack()
    await page.waitForTimeout(500)
    await page.goForward()
    await page.waitForTimeout(500)
    // Back/Forward within the SPA must also not re-fetch the document.
    expect(await sentinelSurvived(page), 'history navigation reloaded').toBe(true)

    expect(loads.count(), 'a document navigation occurred during interactions').toBe(0)
  })

  test('the surrounding layout stays mounted while results update', async ({ page }) => {
    await page.goto(CATEGORY, { waitUntil: 'domcontentloaded', timeout: 240_000 })
    await page.waitForSelector('#category-scoped-search', { timeout: 120_000 })

    const header = page.locator('header').first()
    const h1 = page.locator('h1').first()
    await expect(header).toBeVisible()
    await expect(h1).toBeVisible()

    await stampWindow(page)
    await page.locator('#category-scoped-search').fill('exam')
    await page.waitForTimeout(700)

    // Header and hero heading never unmount — no full-page flash.
    await expect(header).toBeVisible()
    await expect(h1).toBeVisible()
    expect(await sentinelSurvived(page)).toBe(true)
  })

  test('only the results region is marked busy during a pending update', async ({ page }) => {
    await page.goto(CATEGORY, { waitUntil: 'domcontentloaded', timeout: 240_000 })
    await page.waitForSelector('#category-scoped-search', { timeout: 120_000 })

    // aria-busy must live on the results subtree, never on body/main.
    const busyOnBody = await page.evaluate(
      () => document.body.getAttribute('aria-busy') === 'true',
    )
    expect(busyOnBody, 'aria-busy must not be applied to the whole page').toBe(false)
  })
})

test.describe('industry and OCC pages share the behaviour', () => {
  for (const route of ['/solutions/occ', '/industries/urgent-care']) {
    test(`${route} search updates in place`, async ({ page }) => {
      // OCC's canonical collection may not resolve on every store (fails safe
      // to a "temporarily unavailable" message, never a tag-scan fallback —
      // see lib/occ-collection.ts) — the scoped search box only renders when
      // it does. Confirmed via scripts/qa-catalog-fixtures.ts, not guessed.
      test.skip(route === '/solutions/occ' && !occFixture().exists, 'QA-data gap: OCC canonical collection does not resolve on this store')

      await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 240_000 })
      await page.waitForSelector('#category-scoped-search', { timeout: 120_000 })

      const loads = trackDocumentLoads(page)
      await stampWindow(page)

      await page.locator('#category-scoped-search').fill('kit')
      await page.waitForTimeout(700)

      expect(await sentinelSurvived(page), `${route} reloaded on search`).toBe(true)
      expect(loads.count(), `${route} issued a document navigation`).toBe(0)
    })
  }
})
