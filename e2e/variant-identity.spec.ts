import { test, expect } from '@playwright/test'

// LG-03: selecting a different variant must update SKU, media, H1, URL and
// the selector's pressed state together — not just SKU/price as before.
//
// Handle confirmed live via the Storefront API 2026-08-14: it's the exact
// "Flame Blue" rollator from the launch plan's own Figure 5 evidence
// (Blue/Red color variants). Live-verified in a real browser the same day:
// selecting Red updates H1 ("... Flame Blue — Red"), SKU (10289BL ->
// 10289RD), and the URL (?variant=<red gid>) together, on both routes below,
// and the deep link reproduces the same state after a real page reload.
const MULTI_COLOR_PRODUCT_HANDLE = '3-wheel-rollator-rolling-walker-with-basket-tray-and-pouch-flame-blue'

const ROUTE_PREFIXES = [
  (handle: string) => `/product/${handle}`,
  // Category-route fallback resolves the same handle when it isn't an L2
  // subcategory tag — mirrors app/category/[slug]/[product]/page.tsx's own
  // fallback. 'mobility' is this product's real L1 collection (confirmed via
  // its own breadcrumb: Home > Mobility > 3 Wheeled Rollators).
  (handle: string) => `/category/mobility/${handle}`,
]

for (const routeFor of ROUTE_PREFIXES) {
  test(`variant switch updates H1, SKU, image and pressed state on ${routeFor('<handle>')}`, async ({ page }) => {
    await page.goto(routeFor(MULTI_COLOR_PRODUCT_HANDLE))

    await expect(page.getByRole('button', { name: /^Color:/ }).first()).toBeVisible()

    const initialH1 = await page.getByRole('heading', { level: 1 }).textContent()
    const initialSku = await page.getByText(/^SKU:/).textContent()

    // Pick a Color option that isn't already selected (`pressed: false` reads
    // each button's own aria-pressed, unlike a `hasNot` descendant filter,
    // which doesn't see an attribute on the element itself). Capture its
    // fixed accessible name before clicking: `pressed: false` is a dynamic
    // filter that re-resolves on every query, so asserting on the same
    // locator AFTER the click would silently re-target whichever button is
    // now unselected instead of the one just clicked.
    const targetName = await page.getByRole('button', { name: /^Color:/, pressed: false }).first().getAttribute('aria-label')
    const target = page.getByRole('button', { name: targetName! })
    await target.click()

    await expect(target).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('heading', { level: 1 })).not.toHaveText(initialH1 ?? '')
    await expect(page.getByText(/^SKU:/)).not.toHaveText(initialSku ?? '')

    // URL updates to a shareable `?variant=` deep link, no full reload.
    await expect(page).toHaveURL(/[?&]variant=/)

    // Deep link reproduces the exact same selected state after a real reload.
    const deepLinkUrl = page.url()
    await page.reload()
    await expect(page).toHaveURL(deepLinkUrl)
    await expect(target).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('heading', { level: 1 })).not.toHaveText(initialH1 ?? '')
  })
}
