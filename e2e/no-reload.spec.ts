import { test, expect, type Page } from '@playwright/test'

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
 * Technique: stamp a value on `window` after first load. A real document
 * navigation wipes it. If it survives every interaction, the App Router
 * updated in place.
 */

const CATEGORY = '/category/gloves'

async function stampWindow(page: Page) {
  await page.evaluate(() => {
    ;(window as unknown as Record<string, unknown>).__noReloadSentinel = 'alive'
  })
}

async function sentinelSurvived(page: Page): Promise<boolean> {
  return page.evaluate(
    () => (window as unknown as Record<string, unknown>).__noReloadSentinel === 'alive',
  )
}

/** Counts real document requests (not RSC/fetch/XHR) after instrumentation. */
function trackDocumentLoads(page: Page): { count: () => number } {
  let documentLoads = 0
  page.on('request', (req) => {
    if (req.resourceType() === 'document' && req.isNavigationRequest()) documentLoads++
  })
  return { count: () => documentLoads }
}

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
