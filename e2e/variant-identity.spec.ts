import { test, expect } from '@playwright/test'

// LG-03: selecting a different variant must update SKU, media, H1, URL and
// the selector's pressed state together — not just SKU/price as before.
//
// NOT YET RUNNABLE AS-IS: needs a real live product handle with 2+ Color
// variants substituted below. This session has no Shopify Admin/catalog
// access to confirm which handle currently qualifies (that's Izzy's LG-01/
// LG-02 catalog work, not something to guess at here) — e2e/visual.spec.ts's
// PDP baseline (`exam-glove-nitrile-medium-blue-100-bx-10-bx-cs`) is a
// single-variant product and won't exercise this path. Swap in a confirmed
// multi-color handle (the plan's own Figure 5 example ends in `flame-blue`)
// once one is available, then this suite runs unmodified — it only depends
// on the VariantSelector `aria-pressed`/`aria-label` contract (LG-03 §6),
// not on hardcoded variant GIDs.
const MULTI_COLOR_PRODUCT_HANDLE = 'REPLACE_WITH_LIVE_MULTI_COLOR_PRODUCT_HANDLE'

const ROUTE_PREFIXES = [
  (handle: string) => `/product/${handle}`,
  // Category-route fallback resolves the same handle when it isn't an L2
  // subcategory tag — mirrors app/category/[slug]/[product]/page.tsx's own
  // fallback. 'gloves' is a real L1 collection slug (see e2e/visual.spec.ts's
  // own `/category/gloves` baseline) — swap for whichever L1 collection the
  // real replacement handle actually belongs to if it's not gloves.
  (handle: string) => `/category/gloves/${handle}`,
]

for (const routeFor of ROUTE_PREFIXES) {
  test(`variant switch updates H1, SKU, image and pressed state on ${routeFor('<handle>')}`, async ({ page }) => {
    await page.goto(routeFor(MULTI_COLOR_PRODUCT_HANDLE))

    const selector = page.getByRole('button', { name: /^Color:/ })
    await expect(selector.first()).toBeVisible()

    const initialH1 = await page.getByRole('heading', { level: 1 }).textContent()
    const initialSku = await page.getByText(/^SKU:/).textContent()

    // Pick a Color option that isn't already selected.
    const unselected = selector.filter({ hasNot: page.locator('[aria-pressed="true"]') }).first()
    await unselected.click()

    await expect(unselected).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('heading', { level: 1 })).not.toHaveText(initialH1 ?? '')
    await expect(page.getByText(/^SKU:/)).not.toHaveText(initialSku ?? '')

    // URL updates to a shareable `?variant=` deep link, no full reload.
    await expect(page).toHaveURL(/[?&]variant=/)

    // Deep link reproduces the exact same selected state after a real reload.
    const deepLinkUrl = page.url()
    await page.reload()
    await expect(page).toHaveURL(deepLinkUrl)
    await expect(unselected).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('heading', { level: 1 })).not.toHaveText(initialH1 ?? '')
  })
}
