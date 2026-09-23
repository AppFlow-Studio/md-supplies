import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { VIEWPORTS } from './support/viewports'
import { expectNoHorizontalOverflow } from './support/layout-assertions'

/**
 * TrustShop store reviews (DEV-REVIEWS-01 Plan B) — "How was your
 * experience with MD Supplies?", the dedicated /reviews page. Like
 * e2e/product-reviews.spec.ts, this environment has no
 * TRUSTSHOP_INTEGRATION_KEY configured, so every scenario here exercises
 * the "TrustShop unreachable" path by construction — which is also the
 * required "provider failure does not break the page" evidence.
 */

test.describe('/reviews — store reviews page', () => {
  test('loads without a TrustShop key configured, showing a clean zero-review state', async ({ page }) => {
    await page.goto('/reviews', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Customer Reviews', level: 1 })).toBeVisible()
    await expect(page.getByText('No customer reviews yet.')).toBeVisible()
  })

  test('no request from the browser ever reaches a TrustShop host', async ({ page }) => {
    const outboundHosts: string[] = []
    page.on('request', (req) => {
      const host = new URL(req.url()).host
      if (/trustshop/i.test(host)) outboundHosts.push(host)
    })
    await page.goto('/reviews', { waitUntil: 'networkidle' })
    expect(outboundHosts, 'the browser must never call TrustShop directly — every call is server-proxied').toEqual([])
  })

  test('the bearer-auth mechanics never appear in page source', async ({ page }) => {
    await page.goto('/reviews', { waitUntil: 'domcontentloaded' })
    const html = await page.content()
    expect(html).not.toMatch(/TRUSTSHOP_INTEGRATION_KEY/i)
    expect(html).not.toMatch(/Bearer [A-Za-z0-9._-]{10,}/)
  })

  test('the write form is present, labeled, and its honeypot is not keyboard-reachable', async ({ page }) => {
    await page.goto('/reviews', { waitUntil: 'domcontentloaded' })
    await page.locator('#write-a-store-review').scrollIntoViewIfNeeded()
    await expect(page.getByRole('heading', { name: 'Share Your Experience' })).toBeVisible()
    await expect(page.getByLabel(/your experience/i)).toBeVisible()
    await expect(page.getByLabel(/your name/i)).toBeVisible()
    await expect(page.getByLabel(/your email/i)).toBeVisible()

    const honeypot = page.locator('input[name="website"]')
    await expect(honeypot).toHaveAttribute('tabindex', '-1')
  })

  test('submitting the write form without a rating surfaces a field error, not a silent no-op', async ({ page }) => {
    await page.goto('/reviews', { waitUntil: 'domcontentloaded' })
    await page.locator('#write-a-store-review').scrollIntoViewIfNeeded()
    await page.getByRole('button', { name: /submit review/i }).click()
    await expect(page.getByText(/choose a rating/i)).toBeVisible()
  })

  test('is reachable from the footer', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.getByRole('link', { name: 'Customer Reviews' }).click()
    await expect(page).toHaveURL(/\/reviews$/)
  })

  test('no serious or critical axe violations', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/reviews', { waitUntil: 'domcontentloaded' })
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    const blocking = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
    expect(blocking.map((v) => `${v.id} [${v.impact}]`)).toEqual([])
  })

  for (const vp of VIEWPORTS) {
    test(`no horizontal overflow @ ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.w, height: vp.h })
      await page.goto('/reviews', { waitUntil: 'domcontentloaded' })
      await expectNoHorizontalOverflow(page, `/reviews @ ${vp.name}`)
    })
  }
})
