import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

/**
 * Accessibility coverage for PRODUCT STATES, not just happy-path routes.
 *
 * e2e/axe.spec.ts checks the main routes against whatever the connected shop
 * returns. This file pins the states that actually carry the risky styling —
 * zero-price, out-of-stock, backorder — plus the contact form. Every serious
 * or critical violation it caught was a real WCAG AA contrast failure on text
 * an older shopper has to read.
 *
 * Product handles are QA-store fixtures and are overridable, because the shop
 * CI connects to is not the shop these fixtures live on:
 *   E2E_HANDLE_ZERO_PRICE / E2E_HANDLE_OOS / E2E_HANDLE_BACKORDER / E2E_HANDLE_RX
 *
 * When a handle is absent the test SKIPS WITH A REASON rather than passing. It
 * must never quietly succeed against a 404 — that would report green for a
 * state nobody actually checked, which is worse than an honest gap.
 */
const H = {
  zeroPrice: process.env.E2E_HANDLE_ZERO_PRICE ?? 'qa-no-rate',
  outOfStock: process.env.E2E_HANDLE_OOS ?? 'qa-out-of-stock',
  backorder: process.env.E2E_HANDLE_BACKORDER ?? 'qa-backorder',
  rx: process.env.E2E_HANDLE_RX ?? 'qa-rx-product',
}
const ROUTES = [
  { path: '/', name: 'home', fixture: false },
  { path: `/product/${H.zeroPrice}`, name: 'pdp-zero-price', fixture: true },
  { path: `/product/${H.outOfStock}`, name: 'pdp-out-of-stock', fixture: true },
  { path: `/product/${H.backorder}`, name: 'pdp-backorder', fixture: true },
  { path: `/product/${H.rx}`, name: 'pdp-rx', fixture: true },
  { path: '/cart', name: 'cart', fixture: false },
  { path: '/account', name: 'account', fixture: false },
  { path: '/contact', name: 'contact', fixture: false },
  { path: '/industries', name: 'industries', fixture: false },
] as const

for (const { path, name, fixture } of ROUTES) {
  test(`${name} (${path}) has no serious or critical axe violations`, async ({ page }) => {
    const res = await page.goto(path, { waitUntil: 'domcontentloaded' })
    if (fixture && (res?.status() ?? 0) >= 400) {
      test.skip(true, `${path} not present on this shop — set E2E_HANDLE_* to a real fixture`)
    }
    expect(res?.status(), `${path} did not load`).toBeLessThan(400)

    const results = await new AxeBuilder({ page }).analyze()
    const blocking = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    )
    // Report the rule AND the element, so a failure is actionable without a rerun.
    expect(
      blocking.map((v) => `${v.id} [${v.impact}] ${v.nodes[0]?.target?.join(' ')}`),
    ).toEqual([])
  })
}
