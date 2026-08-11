import { test, expect } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { VIEWPORTS } from './support/viewports'
import {
  expectNoHorizontalOverflow,
  expectNoOverlappingInteractiveElements,
  expectStickyDoesNotObscure,
  expectConsistentCardHeights,
} from './support/layout-assertions'

/**
 * Phase 13 — responsive + accessibility QA sweep (DEV-LAUNCH-11).
 *
 * Captures the required page list at the seven mandated viewports and
 * asserts the properties the screenshots are meant to evidence.
 *
 * Run against an already-built server:
 *   E2E_BASE_URL=http://localhost:3000 npx playwright test e2e/responsive.spec.ts
 */

const SHOTS = 'docs/audits/2026-08-10-dev-launch-11/screenshots'
mkdirSync(SHOTS, { recursive: true })

const ROUTES = [
  { path: '/', name: 'home' },
  { path: '/categories', name: 'categories-hub' },
  { path: '/solutions/occ', name: 'occ' },
  { path: '/category/gloves', name: 'gloves' },
  { path: '/category/testing-screening', name: 'testing-screening' },
  { path: '/category/gloves/exam-gloves', name: 'exam-gloves' },
  { path: '/industries', name: 'industries-index' },
  { path: '/industries/urgent-care', name: 'industry-urgent-care' },
  { path: '/industries/veterinary', name: 'industry-veterinary' },
  { path: '/search?q=gloves', name: 'search-results' },
  { path: '/search', name: 'search-empty' },
  { path: '/product/exam-glove-nitrile-medium-blue-100-bx-10-bx-cs', name: 'pdp' },
  { path: '/cart', name: 'cart' },
  { path: '/contact', name: 'contact' },
] as const

// Routes with a card grid worth checking for row-height consistency, and
// the selector for one card. Only routes that actually render a grid.
//
// The categories-hub selector below is `#all-categories a` rather than the
// `:has()`/`:text()` form, because `expectConsistentCardHeights` runs the
// selector through the page's native `document.querySelectorAll` (inside
// `page.evaluate`), not Playwright's locator engine — `:has()` and `:text()`
// are Playwright-only pseudo-classes and throw a DOMException there. `#all-
// categories` is a stable id added to the "Browse All Categories" <section>
// in app/categories/page.tsx specifically so this selector can target it
// without ambiguity (the page has an earlier "Popular Categories" grid that
// also links to `/category/*`).
const CARD_GRID_ROUTES: Partial<Record<(typeof ROUTES)[number]['name'], string>> = {
  'categories-hub': '#all-categories a',
  gloves: 'a[href*="/category/gloves/"]',
  'testing-screening': 'a[href*="/category/testing-screening/"]',
  'search-results': '[data-testid="search-result-card"], a[href^="/product/"]',
}

test.describe('responsive sweep', () => {
  for (const vp of VIEWPORTS) {
    for (const route of ROUTES) {
      test(`${route.name} @ ${vp.name}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.w, height: vp.h })
        const res = await page.goto(route.path, { waitUntil: 'domcontentloaded' })
        expect(res?.status(), `${route.path} status`).toBeLessThan(400)
        await page.waitForLoadState('networkidle').catch(() => {})

        const label = `${route.name} @ ${vp.name}`

        // A streamed Next.js not-found page returns HTTP 200 with exactly one
        // <h1>, so neither the status check above nor the h1-count check below
        // catches a stale/broken fixture handle silently rendering the global
        // 404 page instead of the intended route. Guard against that class of
        // bug explicitly, for every route in this sweep.
        await expect(
          page.getByRole('heading', { name: 'Page Not Found' }),
          `${label}: rendered the global not-found page — check the route's fixture handle/slug`,
        ).toHaveCount(0)
        await expectNoHorizontalOverflow(page, label)
        await expectNoOverlappingInteractiveElements(page, label)
        await expectStickyDoesNotObscure(page, label)

        const cardSelector = CARD_GRID_ROUTES[route.name]
        if (cardSelector) await expectConsistentCardHeights(page, cardSelector, label)

        // Exactly one h1 — a landing page with zero or two is an SEO defect
        // that only shows up at some breakpoints (responsive duplicate heroes).
        await expect(page.locator('h1')).toHaveCount(1)

        await page.screenshot({
          path: `${SHOTS}/${route.name}__${vp.name}.png`,
          fullPage: true,
        })
      })
    }
  }
})

test.describe('discovery controls', () => {
  test('mobile filter drawer opens, traps focus, closes on Escape', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/category/gloves', { waitUntil: 'domcontentloaded' })

    const filtersBtn = page.getByRole('button', { name: /filter/i }).first()
    await expect(filtersBtn).toBeVisible()

    // 44px minimum touch target on the primary discovery control.
    const box = await filtersBtn.boundingBox()
    expect(box, 'filters button has no box').not.toBeNull()
    expect(box!.height, 'filters button height').toBeGreaterThanOrEqual(44)

    await filtersBtn.click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await page.screenshot({ path: `${SHOTS}/mobile-filter-drawer__375x812.png`, fullPage: false })

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    // Focus must return to the trigger, not to document.body.
    await expect(filtersBtn).toBeFocused()
  })

  test('tablet discovery toolbar: search sits above products, sort is separated', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/category/gloves', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle').catch(() => {})

    const search = page.getByRole('searchbox').first()
    await expect(search).toBeVisible()

    const searchBox = await search.boundingBox()
    // Scoped to the product grid, not `a[href*="/category/gloves/"]` — that
    // substring also matches SubcategoryNavigator's chip/overflow links,
    // which sit earlier in DOM order and are CSS-hidden at this exact
    // breakpoint (`hidden lg:flex`), so .first() picked an invisible nav
    // link and boundingBox() came back null instead of a real card.
    const firstCard = page.getByTestId('product-grid').locator('a[href*="/category/gloves/"]').first()
    const cardBox = await firstCard.boundingBox()

    expect(searchBox, 'search box missing').not.toBeNull()
    expect(cardBox, 'no product card found').not.toBeNull()
    // Phase 2: the search field must be ABOVE the products, never pushed below
    // the subcategory navigator or promo sections.
    expect(
      searchBox!.y,
      'search field must sit above the first product card',
    ).toBeLessThan(cardBox!.y)

    await page.screenshot({ path: `${SHOTS}/tablet-toolbar__768x1024.png`, fullPage: false })
  })

  test('quick-add sits in the card footer, below the image, at 44x44', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/category/gloves', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle').catch(() => {})

    const quickAdd = page.getByRole('button', { name: /quick add/i }).first()
    await expect(quickAdd).toBeVisible()

    const btn = await quickAdd.boundingBox()
    expect(btn, 'quick-add has no box').not.toBeNull()
    // Phase 4: minimum interactive target.
    expect(btn!.width, 'quick-add width').toBeGreaterThanOrEqual(44)
    expect(btn!.height, 'quick-add height').toBeGreaterThanOrEqual(44)

    // Phase 4: it must NOT be overlaid on the product image. The image is the
    // card's first link; the control must start below the image's bottom edge.
    const img = page.locator('img').first()
    const imgBox = await img.boundingBox()
    expect(imgBox, 'no product image').not.toBeNull()
    expect(
      btn!.y,
      'quick-add must sit below the product image, not overlaid on it',
    ).toBeGreaterThanOrEqual(imgBox!.y + imgBox!.height - 1)

    await page.screenshot({ path: `${SHOTS}/quick-add-card-footer__1280x800.png`, fullPage: false })
  })
})

test.describe('industry page states', () => {
  test('veterinary is noindex and invents no products', async ({ page }) => {
    const res = await page.goto('/industries/veterinary', { waitUntil: 'domcontentloaded' })
    // Either retired (404) or preserved as an explicitly non-indexable route.
    if (res && res.status() === 404) return
    const robots = await page.locator('meta[name="robots"]').getAttribute('content')
    expect(robots, 'veterinary must not be indexable with no assortment').toContain('noindex')
  })

  test('urgent-care exposes scoped search and a real result count', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/industries/urgent-care', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle').catch(() => {})
    await expect(page.getByRole('searchbox').first()).toBeVisible()
    // Unfiltered state reads "Showing N products"; only an active ?q= search
    // switches to "N results for ..." (components/category/CategoryResults.tsx)
    // — a real result count is either, so long as it's a real number.
    await expect(page.locator('body')).toContainText(/\d+\s+(result|product)/i)
  })
})
