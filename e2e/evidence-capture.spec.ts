import { test, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Evidence capture for Bilal's manual visual audit (2026-08-20 repair pass).
 *
 * NOT a regression test and NOT part of the visual-regression baseline set —
 * it asserts nothing and writes to docs/audits/, never to
 * e2e/visual.spec.ts-snapshots. Baselines stay untouched until Bilal approves
 * the new appearance.
 *
 * Run explicitly:
 *   E2E_BASE_URL=http://localhost:3100 npx playwright test e2e/__evidence.spec.ts --project=chromium
 */

// Opt-in only. Without this guard the capture would run — and rewrite the
// evidence set — on every ordinary `npm run test:e2e`, including CI.
test.skip(
  !process.env.CAPTURE_EVIDENCE,
  'evidence capture — run with CAPTURE_EVIDENCE=1',
)

const OUT = join(process.cwd(), 'docs', 'audits', '2026-08-20-surgery-trocar-repair', 'screenshots')
mkdirSync(OUT, { recursive: true })

const DESKTOP = { width: 1440, height: 900 }
const MOBILE = { width: 390, height: 844 }

async function shot(page: Page, name: string, fullPage = true) {
  await page.screenshot({ path: join(OUT, `${name}.png`), fullPage })
}

async function settle(page: Page) {
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
}

/**
 * The mobile drawer's categories toggle is labelled from the LIVE Shopify menu
 * item title ("Catalog" on QA, "Categories" on production), so it is targeted
 * by the panel it controls instead of by name.
 */
async function openMobileCategories(page: Page) {
  await page.getByRole('button', { name: 'Toggle menu' }).click()
  await page.locator('button[aria-controls="mobile-panel-categories"]').click()
}

test('categories hub — desktop + mobile', async ({ page }) => {
  await page.setViewportSize(DESKTOP)
  await page.goto('/categories', { waitUntil: 'domcontentloaded' })
  await settle(page)
  await shot(page, '01-categories-hub-desktop')

  await page.setViewportSize(MOBILE)
  await page.goto('/categories', { waitUntil: 'domcontentloaded' })
  await settle(page)
  await shot(page, '02-categories-hub-mobile')
})

test('categories mega-menu — desktop + mobile drawer', async ({ page }) => {
  await page.setViewportSize(DESKTOP)
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await settle(page)
  await page.getByRole('button', { name: /submenu/i }).first().hover()
  await page.getByRole('link', { name: 'Trocars & Trocar Kits' }).first().waitFor({ state: 'visible' })
  await shot(page, '03-mega-menu-desktop-nested-trocars', false)

  await page.setViewportSize(MOBILE)
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await settle(page)
  await openMobileCategories(page)
  await page.getByRole('link', { name: 'Trocars & Trocar Kits' }).first().waitFor({ state: 'visible' })
  await shot(page, '04-mobile-drawer-nested-trocars', false)
})

test('Surgery & Procedure page — desktop + mobile', async ({ page }) => {
  await page.setViewportSize(DESKTOP)
  await page.goto('/category/surgery-procedure', { waitUntil: 'domcontentloaded' })
  await settle(page)
  await shot(page, '05-surgery-desktop')

  await page.setViewportSize(MOBILE)
  await page.goto('/category/surgery-procedure', { waitUntil: 'domcontentloaded' })
  await settle(page)
  await shot(page, '06-surgery-mobile')
})

test('Trocar page — desktop + mobile', async ({ page }) => {
  await page.setViewportSize(DESKTOP)
  await page.goto('/category/trocars-trocar-kits', { waitUntil: 'domcontentloaded' })
  await settle(page)
  await shot(page, '07-trocars-desktop')

  await page.setViewportSize(MOBILE)
  await page.goto('/category/trocars-trocar-kits', { waitUntil: 'domcontentloaded' })
  await settle(page)
  await shot(page, '08-trocars-mobile')
})

test('You May Also Need — desktop + mobile', async ({ page }) => {
  const PDP = '/product/aerowalk-ultra-lite-rollator-rolling-walker'
  for (const [vp, name] of [[DESKTOP, '09-you-may-also-need-desktop'], [MOBILE, '10-you-may-also-need-mobile']] as const) {
    await page.setViewportSize(vp)
    await page.goto(PDP, { waitUntil: 'domcontentloaded' })
    await settle(page)
    const row = page.getByRole('region', { name: 'You May Also Need — scrollable product list' })
    if (await row.count()) {
      await row.scrollIntoViewIfNeeded()
      await page.waitForTimeout(400)
      // Section-scoped crop: the card gutter is the thing under review.
      await row.locator('xpath=ancestor::section[1]').screenshot({ path: join(OUT, `${name}.png`) })
    }
  }
})

test('category search — before, after, and the single clear control', async ({ page }) => {
  await page.setViewportSize(DESKTOP)
  await page.goto('/category/trocars-trocar-kits', { waitUntil: 'domcontentloaded' })
  await settle(page)

  const field = page.getByRole('searchbox', { name: /Search within/i })
  await field.scrollIntoViewIfNeeded()
  await shot(page, '11-category-search-before-query', false)

  await field.fill('kit')
  await page.waitForURL(/[?&]q=kit/)
  await settle(page)
  await shot(page, '12-category-search-after-query', false)

  // Tight crop on the input: this is the "exactly one X" evidence.
  const box = await field.boundingBox()
  if (box) {
    await page.screenshot({
      path: join(OUT, '13-category-search-single-clear-control-CLOSEUP.png'),
      clip: { x: box.x - 8, y: box.y - 8, width: box.width + 16, height: box.height + 16 },
    })
  }
})

test('Trocar filters open — desktop rail + mobile drawer', async ({ page }) => {
  await page.setViewportSize(DESKTOP)
  await page.goto('/category/trocars-trocar-kits', { waitUntil: 'domcontentloaded' })
  await settle(page)
  const rail = page.locator('aside').first()
  await rail.scrollIntoViewIfNeeded()
  await shot(page, '14-trocar-filters-desktop', false)

  await page.setViewportSize(MOBILE)
  await page.goto('/category/trocars-trocar-kits', { waitUntil: 'domcontentloaded' })
  await settle(page)
  const drawerBtn = page.getByRole('button', { name: /^Filters/i }).first()
  if (await drawerBtn.count()) {
    await drawerBtn.click()
    await page.waitForTimeout(600)
    await shot(page, '15-trocar-filters-mobile-drawer', false)
  }
})

test('Surgery filters open — desktop rail + mobile drawer', async ({ page }) => {
  await page.setViewportSize(DESKTOP)
  await page.goto('/category/surgery-procedure', { waitUntil: 'domcontentloaded' })
  await settle(page)
  await page.locator('aside').first().scrollIntoViewIfNeeded()
  await shot(page, '16-surgery-filters-desktop', false)

  await page.setViewportSize(MOBILE)
  await page.goto('/category/surgery-procedure', { waitUntil: 'domcontentloaded' })
  await settle(page)
  const drawerBtn = page.getByRole('button', { name: /^Filters/i }).first()
  if (await drawerBtn.count()) {
    await drawerBtn.click()
    await page.waitForTimeout(600)
    await shot(page, '17-surgery-filters-mobile-drawer', false)
  }
})

test('Surgery subcategory strip — Trocars pinned first', async ({ page }) => {
  await page.setViewportSize(DESKTOP)
  await page.goto('/category/surgery-procedure', { waitUntil: 'domcontentloaded' })
  await settle(page)
  const rail = page.getByRole('navigation', { name: /Surgery & Procedure categories/i })
  await rail.scrollIntoViewIfNeeded()
  await rail.screenshot({ path: join(OUT, '18-surgery-subcategory-strip-desktop.png') })

  await page.setViewportSize(MOBILE)
  await page.goto('/category/surgery-procedure', { waitUntil: 'domcontentloaded' })
  await settle(page)
  const mrail = page.getByRole('navigation', { name: /Surgery & Procedure categories/i })
  await mrail.scrollIntoViewIfNeeded()
  await mrail.screenshot({ path: join(OUT, '19-surgery-subcategory-strip-mobile.png') })
})
