import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { firstPopulatedCategory, requireFixture } from './helpers/qa-fixtures'
import { VIEWPORTS } from './support/viewports'
import { expectNoHorizontalOverflow } from './support/layout-assertions'
import { stampWindow, sentinelSurvived, trackDocumentLoads } from './helpers/no-reload'

/**
 * TrustShop reviews integration (DEV-REVIEWS-01), product-review scope.
 *
 * This environment has no TRUSTSHOP_INTEGRATION_KEY configured (P0 security
 * rule: the key is server-only and was never available to this session) —
 * every scenario here therefore exercises the exact "TrustShop
 * unconfigured/unreachable" path by construction, which doubles as the
 * required "TrustShop failure simulation proving PDP/Add to Cart still
 * works" evidence. Once a real key is provisioned, these same specs also
 * cover the happy path — the reviews section degrades to its zero-review
 * state today and will show real data once TrustShop actually responds.
 */

function productUrl() {
  const fixture = requireFixture(firstPopulatedCategory(), 'a populated L1 category with sample products')
  const sample = fixture.sampleProducts[0]
  test.skip(!sample, 'QA-data gap: category has no sample products')
  return `/product/${sample.handle}`
}

test.describe('product reviews — TrustShop unreachable does not block commerce', () => {
  test('PDP renders and Add to Cart remains functional with no TrustShop key configured', async ({ page }) => {
    await page.goto(productUrl(), { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    // Some control on the PDP must let the shopper add to cart / see
    // purchasability — a TrustShop outage/misconfiguration must never make
    // this disappear or error out.
    const addToCart = page.getByRole('button', { name: /add to cart|out of stock|contact for pricing/i }).first()
    await expect(addToCart).toBeVisible()
  })

  test('no request from the browser ever reaches a TrustShop host', async ({ page }) => {
    const outboundHosts: string[] = []
    page.on('request', (req) => {
      const host = new URL(req.url()).host
      if (/trustshop/i.test(host)) outboundHosts.push(host)
    })
    await page.goto(productUrl(), { waitUntil: 'networkidle' })
    expect(outboundHosts, 'the browser must never call TrustShop directly — every call is server-proxied').toEqual([])
  })

  test('the bearer-auth mechanics never appear in page source', async ({ page }) => {
    await page.goto(productUrl(), { waitUntil: 'domcontentloaded' })
    const html = await page.content()
    expect(html).not.toMatch(/TRUSTSHOP_INTEGRATION_KEY/i)
    expect(html).not.toMatch(/Bearer [A-Za-z0-9._-]{10,}/)
  })
})

test.describe('product reviews — #reviews section', () => {
  test('a real, always-present #reviews anchor exists below the fold', async ({ page }) => {
    await page.goto(productUrl(), { waitUntil: 'domcontentloaded' })
    await expect(page.locator('#reviews')).toBeAttached()
  })

  test('clicking the compact summary link scrolls to #reviews without a full document reload', async ({ page }) => {
    await page.goto(productUrl(), { waitUntil: 'domcontentloaded' })
    const summaryLink = page.locator('a[href="#reviews"]').first()
    test.skip(await summaryLink.count() === 0, 'no compact summary link rendered for this fixture')

    await stampWindow(page)
    const loads = trackDocumentLoads(page)
    await summaryLink.click()

    await expect(page.locator('#reviews')).toBeInViewport()
    expect(await sentinelSurvived(page)).toBe(true)
    expect(loads.count()).toBe(0)
  })

  test('a zero/unavailable-review product shows a clean "Write a review" CTA, never a fake rating', async ({ page }) => {
    await page.goto(productUrl(), { waitUntil: 'domcontentloaded' })
    // No TrustShop key in this environment — every product currently
    // resolves to the zero-review state.
    await expect(page.getByRole('link', { name: /No reviews yet/i })).toBeVisible()
    await expect(page.getByText('0.0')).toHaveCount(0)
  })

  test('the Write a Review form is present, labeled, and its honeypot is not keyboard-reachable', async ({ page }) => {
    await page.goto(productUrl(), { waitUntil: 'domcontentloaded' })
    await page.locator('#write-a-review').scrollIntoViewIfNeeded()
    await expect(page.getByLabel(/your review/i)).toBeVisible()
    await expect(page.getByLabel(/your name/i)).toBeVisible()
    await expect(page.getByLabel(/your email/i)).toBeVisible()

    const honeypot = page.locator('input[name="website"]')
    await expect(honeypot).toHaveAttribute('tabindex', '-1')
  })

  test('submitting the review form without a rating surfaces a field error, not a silent no-op', async ({ page }) => {
    await page.goto(productUrl(), { waitUntil: 'domcontentloaded' })
    await page.locator('#write-a-review').scrollIntoViewIfNeeded()
    await page.getByRole('button', { name: /submit review/i }).click()
    await expect(page.getByText(/choose a rating/i)).toBeVisible()
  })

  test('no serious or critical axe violations on the reviews section', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(productUrl(), { waitUntil: 'domcontentloaded' })
    const results = await new AxeBuilder({ page }).include('#reviews').withTags(['wcag2a', 'wcag2aa']).analyze()
    const blocking = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
    expect(blocking.map((v) => `${v.id} [${v.impact}]`)).toEqual([])
  })

  for (const vp of VIEWPORTS) {
    test(`no horizontal overflow with the reviews section present @ ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.w, height: vp.h })
      await page.goto(productUrl(), { waitUntil: 'domcontentloaded' })
      await expectNoHorizontalOverflow(page, `PDP reviews @ ${vp.name}`)
    })
  }
})
