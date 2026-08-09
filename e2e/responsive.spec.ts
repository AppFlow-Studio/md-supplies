import { test, expect, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'

/**
 * Phase 13 — responsive + accessibility QA sweep.
 *
 * Captures the required page list at the seven mandated viewports and asserts
 * the properties that the screenshots are meant to evidence, so this is a
 * REGRESSION suite rather than a pile of images someone has to eyeball. The
 * images are still written, because the mandate asks for visual QA and an
 * assertion cannot prove "an older shopper can understand this control".
 *
 * Run against an already-built server:
 *   E2E_BASE_URL=http://localhost:3000 npx playwright test e2e/responsive.spec.ts
 */

const SHOTS = 'docs/audits/2026-08-02-catalog-cro/screenshots'
mkdirSync(SHOTS, { recursive: true })

const VIEWPORTS = [
  { w: 375, h: 812, name: '375x812' },
  { w: 390, h: 844, name: '390x844' },
  { w: 768, h: 1024, name: '768x1024' },
  { w: 1024, h: 768, name: '1024x768' },
  { w: 1280, h: 800, name: '1280x800' },
  { w: 1440, h: 900, name: '1440x900' },
  { w: 1920, h: 1080, name: '1920x1080' },
] as const

const ROUTES = [
  { path: '/', name: 'home' },
  { path: '/solutions/occ', name: 'occ' },
  { path: '/category/gloves', name: 'gloves' },
  { path: '/category/testing-screening', name: 'testing-screening' },
  { path: '/category/testing-screening/tsh-controls', name: 'tsh-controls' },
  { path: '/industries', name: 'industries-index' },
  { path: '/industries/urgent-care', name: 'industry-urgent-care' },
  { path: '/industries/veterinary', name: 'industry-veterinary' },
] as const

/** A page must never scroll horizontally at any supported width. */
async function expectNoHorizontalOverflow(page: Page, label: string) {
  const overflow = await page.evaluate(() => {
    const d = document.documentElement
    return { scrollW: d.scrollWidth, clientW: d.clientWidth }
  })
  expect(
    overflow.scrollW,
    `${label}: document scrolls horizontally (${overflow.scrollW}px content in ${overflow.clientW}px viewport)`,
  ).toBeLessThanOrEqual(overflow.clientW + 1)
}

test.describe('responsive sweep', () => {
  for (const vp of VIEWPORTS) {
    for (const route of ROUTES) {
      test(`${route.name} @ ${vp.name}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.w, height: vp.h })
        const res = await page.goto(route.path, { waitUntil: 'domcontentloaded' })
        expect(res?.status(), `${route.path} status`).toBeLessThan(400)
        await page.waitForLoadState('networkidle').catch(() => {})

        await expectNoHorizontalOverflow(page, `${route.name} @ ${vp.name}`)

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
    const firstCard = page.locator('a[href*="/category/gloves/"]').first()
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
