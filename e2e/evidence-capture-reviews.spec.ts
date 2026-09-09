import { test, type Page } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { firstPopulatedCategory, requireFixture } from './helpers/qa-fixtures'

/**
 * Evidence capture for DEV-REVIEWS-01 (TrustShop reviews integration).
 *
 * NOT a regression test — asserts nothing, writes only to docs/audits/.
 *
 * As of 2026-09-09, TRUSTSHOP_API_BASE_URL + TRUSTSHOP_INTEGRATION_KEY are
 * both live and reachable — every capture below is a REAL response, not a
 * simulated-unreachable one. Every product sampled in this store (~140
 * across 7 categories) still has zero seeded reviews, so these captures
 * document the genuine zero-review state, not a fallback path. Reviewed-
 * product states (distribution bars, filters, Verified Buyer, merchant
 * reply, media gallery, Load More) require seeded TrustShop review data and
 * cannot be captured until that exists — see the ticket's developer handoff
 * notes for exactly what's still needed. The TrustShop-failure-simulation
 * shot is captured separately (not in this file) by pointing
 * TRUSTSHOP_API_BASE_URL at an unreachable host for one run.
 *
 * Run explicitly against a production build:
 *   npm run build && npm run start
 *   CAPTURE_EVIDENCE=1 E2E_BASE_URL=http://localhost:3000 \
 *     npx playwright test e2e/evidence-capture-reviews.spec.ts --project=chromium --workers=1
 */
test.skip(!process.env.CAPTURE_EVIDENCE, 'evidence capture — run with CAPTURE_EVIDENCE=1')

const OUT = join(process.cwd(), 'docs', 'audits', '2026-09-07-dev-reviews-01', 'screenshots')
mkdirSync(OUT, { recursive: true })

const DESKTOP = { width: 1440, height: 900 }
const MOBILE = { width: 390, height: 844 }

async function shot(page: Page, name: string, fullPage = true) {
  await page.screenshot({ path: join(OUT, `${name}.png`), fullPage })
}

async function settle(page: Page) {
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
}

function productUrl() {
  const fixture = requireFixture(firstPopulatedCategory(), 'a populated L1 category with sample products')
  const sample = fixture.sampleProducts[0]
  test.skip(!sample, 'QA-data gap: category has no sample products')
  return `/product/${sample.handle}`
}

test('PDP zero-review state — desktop', async ({ page }) => {
  await page.setViewportSize(DESKTOP)
  await page.goto(productUrl(), { waitUntil: 'domcontentloaded' })
  await settle(page)
  await shot(page, '01-pdp-zero-review-desktop')
  const addToCart = page.getByRole('button', { name: /add to cart|out of stock|contact for pricing/i }).first()
  await addToCart.scrollIntoViewIfNeeded()
  await shot(page, '02-pdp-purchase-area-commerce-intact-desktop', false)
})

test('PDP zero-review state — mobile, no overflow', async ({ page }) => {
  await page.setViewportSize(MOBILE)
  await page.goto(productUrl(), { waitUntil: 'domcontentloaded' })
  await settle(page)
  await shot(page, '03-pdp-zero-review-mobile')
})

test('#reviews section — zero-review clean state + Write a Review CTA', async ({ page }) => {
  await page.setViewportSize(DESKTOP)
  await page.goto(productUrl(), { waitUntil: 'domcontentloaded' })
  await settle(page)
  await page.locator('#reviews').scrollIntoViewIfNeeded()
  await shot(page, '04-reviews-section-zero-state-desktop', false)
})

test('Write a Review form — empty state', async ({ page }) => {
  await page.setViewportSize(DESKTOP)
  await page.goto(productUrl(), { waitUntil: 'domcontentloaded' })
  await settle(page)
  const cta = page.getByRole('button', { name: /write a review/i }).first()
  if (await cta.count()) {
    await cta.click()
    await page.waitForTimeout(300)
  }
  await shot(page, '05-write-review-form-empty', false)
})

test('Write a Review form — invalid submission validation state', async ({ page }) => {
  await page.setViewportSize(DESKTOP)
  await page.goto(productUrl(), { waitUntil: 'domcontentloaded' })
  await settle(page)
  const cta = page.getByRole('button', { name: /write a review/i }).first()
  if (await cta.count()) {
    await cta.click()
    await page.waitForTimeout(300)
  }
  const submit = page.getByRole('button', { name: /submit/i }).first()
  if (await submit.count()) {
    await submit.click()
    await page.waitForTimeout(300)
  }
  await shot(page, '06-write-review-form-invalid-state', true)
})

test('Collection page — cards with no rating row (zero reviews everywhere)', async ({ page }) => {
  const fixture = requireFixture(firstPopulatedCategory(), 'a populated L1 category')
  await page.setViewportSize(DESKTOP)
  await page.goto(`/category/${fixture.slug}`, { waitUntil: 'domcontentloaded' })
  await settle(page)
  await shot(page, '07-collection-cards-no-rating-row-desktop')

  await page.setViewportSize(MOBILE)
  await page.goto(`/category/${fixture.slug}`, { waitUntil: 'domcontentloaded' })
  await settle(page)
  await shot(page, '08-collection-cards-no-rating-row-mobile')
})

test('/reviews store page — zero-state + write form', async ({ page }) => {
  await page.setViewportSize(DESKTOP)
  await page.goto('/reviews', { waitUntil: 'domcontentloaded' })
  await settle(page)
  await shot(page, '09-store-reviews-zero-state-desktop')

  await page.setViewportSize(MOBILE)
  await page.goto('/reviews', { waitUntil: 'domcontentloaded' })
  await settle(page)
  await shot(page, '10-store-reviews-zero-state-mobile')
})

test('page source contains no bearer/token material (paired with DevTools network proof)', async ({ page }) => {
  await page.goto(productUrl(), { waitUntil: 'domcontentloaded' })
  const html = await page.content()
  if (/TRUSTSHOP_INTEGRATION_KEY|Bearer [A-Za-z0-9._-]{10,}/.test(html)) {
    throw new Error('Bearer/token material found in page source — this must never happen')
  }
})

test('Product JSON-LD — aggregateRating omitted for zero-review product', async ({ page }) => {
  await page.goto(productUrl(), { waitUntil: 'domcontentloaded' })
  const jsonLdBlocks = await page.locator('script[type="application/ld+json"]').allTextContents()
  const productSchema = jsonLdBlocks
    .map((raw) => JSON.parse(raw))
    .find((obj) => obj['@type'] === 'Product')

  writeFileSync(
    join(OUT, '11-product-json-ld-zero-review.json'),
    JSON.stringify(productSchema ?? { error: 'no Product JSON-LD block found' }, null, 2),
  )

  if (!productSchema) throw new Error('No Product JSON-LD block found on the PDP')
  if ('aggregateRating' in productSchema) {
    throw new Error('aggregateRating present on a zero-review product — must be omitted, never a fabricated 0')
  }
})
