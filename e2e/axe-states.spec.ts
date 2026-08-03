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
 * Handles are QA-store fixtures (`qa-*`). Against a shop without them the
 * navigation 404s and the test fails loudly rather than silently passing on an
 * empty page — a skip here would hide exactly the regression this guards.
 */
const ROUTES = [
  { path: '/', name: 'home' },
  { path: '/product/qa-no-rate', name: 'pdp-zero-price' },
  { path: '/product/qa-out-of-stock', name: 'pdp-out-of-stock' },
  { path: '/product/qa-backorder', name: 'pdp-backorder' },
  { path: '/cart', name: 'cart' },
  { path: '/account', name: 'account' },
  { path: '/contact', name: 'contact' },
  { path: '/industries', name: 'industries' },
] as const

for (const { path, name } of ROUTES) {
  test(`${name} (${path}) has no serious or critical axe violations`, async ({ page }) => {
    const res = await page.goto(path, { waitUntil: 'domcontentloaded' })
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
