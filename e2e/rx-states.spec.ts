import { test, expect } from '@playwright/test'

/**
 * RX states (P0 RX-gate ticket, DEV-LAUNCH-11 route list item "RX states").
 * Needs a QA-store product tagged `compliance:rx-only` or `rx-required`
 * (lib/rx-gate.ts RX_TAG/RX_LEGACY_TAG) with vendor != Dynarex (exempt).
 * Defaults to `qa-rx-both` (compliance:rx-only + rx-required, vendor
 * MDSupplies, live on the QA store as of DEV-LAUNCH-13 — the prior default,
 * `qa-rx-product`, no longer resolves). Override with E2E_HANDLE_RX for a
 * different shop; skips with a reason when the resolved handle 404s rather
 * than silently passing against a missing fixture, matching
 * e2e/axe-states.spec.ts.
 */
const RX_HANDLE = process.env.E2E_HANDLE_RX ?? 'qa-rx-both'

test.describe('RX states', () => {
  test('PDP shows the "RX Only" badge', async ({ page }) => {
    test.skip(!RX_HANDLE, 'set E2E_HANDLE_RX to a QA-store product tagged compliance:rx-only')
    const res = await page.goto(`/product/${RX_HANDLE}`, { waitUntil: 'domcontentloaded' })
    if ((res?.status() ?? 0) >= 400) test.skip(true, `${RX_HANDLE} not present on this shop`)
    await expect(page.getByText('RX Only')).toBeVisible()
  })

  test('guest with an RX item in cart sees the sign-in gate, not a bare checkout link', async ({ page }) => {
    test.skip(!RX_HANDLE, 'set E2E_HANDLE_RX to a QA-store product tagged compliance:rx-only')
    const res = await page.goto(`/product/${RX_HANDLE}`, { waitUntil: 'domcontentloaded' })
    if ((res?.status() ?? 0) >= 400) test.skip(true, `${RX_HANDLE} not present on this shop`)

    await page.getByRole('button', { name: /add to cart/i }).click()
    const cartDialog = page.getByRole('dialog', { name: /shopping cart/i })
    await expect(cartDialog).toBeVisible({ timeout: 5000 })
    // lib/rx-gate.ts isRxEnforcementEnabled() defaults ON (opt-out via "false" only,
    // per DEV-LAUNCH-02's corrected docs/env-feature-flag-register.md).
    await expect(cartDialog.getByText(/prescription required/i)).toBeVisible()
    await expect(cartDialog.getByRole('link', { name: /sign in.*create account/i })).toBeVisible()
  })
})
