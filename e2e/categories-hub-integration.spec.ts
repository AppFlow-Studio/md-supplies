import { test, expect } from '@playwright/test'

/**
 * DEV-LAUNCH-05 evidence: the hub and category pages must read as one
 * integrated surface — every card links to a route that actually renders
 * (not a redirect-into-a-dead-end), and the Popular strip never contradicts
 * the full grid.
 *
 * Pins the regression this ticket's QA pass found: the Face Masks card
 * (registry collectionHandle `face-coverings`) links through a 301 to the
 * canonical `/category/face-masks` alias, but the category page fetched
 * Shopify by the URL slug directly — there is no Shopify collection named
 * `face-masks` (only `face-coverings`), so the page rendered the app's
 * not-found UI while still returning HTTP 200 (a Next.js streaming quirk:
 * notFound() thrown after the shell has already flushed can't rewrite the
 * status code). A plain `response.status() < 400` check does not catch this
 * — the fix in components/category/CategoryPageView.tsx resolves the public
 * slug to the real Shopify handle via lib/category-nav.ts getShopifyHandle()
 * before every Shopify-facing lookup.
 *
 * Run against an already-built server:
 *   E2E_BASE_URL=http://localhost:3000 npx playwright test e2e/categories-hub-integration.spec.ts
 */

const NOT_FOUND_H1 = 'Page Not Found'

const SHOTS = 'docs/audits/2026-08-08-dev-launch-05/screenshots'

const VIEWPORTS = [
  { w: 390, h: 844, name: '390x844' },
  { w: 768, h: 1024, name: '768x1024' },
  { w: 1024, h: 768, name: '1024x768' },
  { w: 1440, h: 900, name: '1440x900' },
] as const

test.describe('categories hub — route integrity (DEV-LAUNCH-05)', () => {
  test('every "Browse All Categories" card links to a route that actually renders (no dead-end alias)', async ({ page }) => {
    await page.goto('/categories', { waitUntil: 'domcontentloaded' })
    const grid = page.locator('section', { has: page.getByRole('heading', { name: 'Browse All Categories' }) })
    const cards = grid.locator('a')
    await expect(cards).toHaveCount(25)

    const hrefs: string[] = []
    const count = await cards.count()
    for (let i = 0; i < count; i++) {
      const href = await cards.nth(i).getAttribute('href')
      expect(href, `card ${i} has no href`).toBeTruthy()
      hrefs.push(href!)
    }
    // No duplicate/contradictory destinations across the 25 approved cards.
    expect(new Set(hrefs).size).toBe(hrefs.length)

    for (const href of hrefs) {
      const response = await page.goto(href, { waitUntil: 'domcontentloaded' })
      expect(response?.status(), `${href} returned an error status`).toBeLessThan(400)
      const h1 = page.locator('h1').first()
      await expect(h1, `${href} rendered no h1`).toBeVisible()
      await expect(h1, `${href} resolved to the not-found page (dead link)`).not.toHaveText(NOT_FOUND_H1)
    }
  })

  test('Popular Categories strip never contradicts the full grid', async ({ page }) => {
    await page.goto('/categories', { waitUntil: 'domcontentloaded' })

    const popularSection = page.locator('section', { has: page.getByRole('heading', { name: 'Popular Categories' }) })
    const hasPopular = await popularSection.count()
    test.skip(hasPopular === 0, 'Popular Categories strip did not render (degrades gracefully when collections fetch fails)')

    const popularNames = await popularSection.locator('span').allTextContents()
    const gridSection = page.locator('section', { has: page.getByRole('heading', { name: 'Browse All Categories' }) })
    const gridNames = await gridSection.locator('a p').allTextContents()

    for (const name of popularNames) {
      expect(gridNames, `Popular tile "${name}" has no matching card in the full grid`).toContain(name.trim())
    }
  })

  test('the Face Masks card resolves through its canonical alias without dead-ending', async ({ page }) => {
    await page.goto('/category/face-masks', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('h1').first()).not.toHaveText(NOT_FOUND_H1)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })
})

// Launch-gate evidence: desktop/tablet/mobile screenshots of the hub and of
// the regression-pin category detail page (the aliased Face Masks route).
test.describe('DEV-LAUNCH-05 evidence screenshots', () => {
  for (const vp of VIEWPORTS) {
    test(`hub renders readably at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.w, height: vp.h })
      await page.goto('/categories', { waitUntil: 'domcontentloaded' })
      await page.waitForLoadState('networkidle').catch(() => {})
      await expect(page.getByRole('heading', { name: 'Browse All Categories' })).toBeVisible()
      await page.screenshot({ path: `${SHOTS}/categories-hub__${vp.name}.png`, fullPage: true })
    })

    test(`category detail (face-masks alias) renders readably at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.w, height: vp.h })
      await page.goto('/category/face-masks', { waitUntil: 'domcontentloaded' })
      await page.waitForLoadState('networkidle').catch(() => {})
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await page.screenshot({ path: `${SHOTS}/category-face-masks__${vp.name}.png`, fullPage: true })
    })
  }
})
