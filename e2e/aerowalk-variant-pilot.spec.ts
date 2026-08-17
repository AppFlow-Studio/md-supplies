import { test, expect } from '@playwright/test'

// LG-03/LG-04 AeroWalk pilot: the first product with real per-variant
// manufacturer number, order unit, description and native variant media.
//
// Handle, product ID and the three variant IDs confirmed live on the QA
// store 2026-08-15 by Izzy (mirrored from her production recovery) and
// cross-checked directly against the Storefront API via
// scripts/verify-aerowalk-pilot.ts (product 9365094531305; Blue
// 51633171923177 / White 51633171955945 / Grey 51633171988713; collections:
// mobility, 4-wheeled-rollators, rollators).
//
// Unlike the Flame Blue product in variant-identity.spec.ts, AeroWalk's
// title is deliberately color-neutral ("AeroWalk Ultra-Lite Rollator Rolling
// Walker" — no color in it), per the launch plan's rule that only the
// *selected* variant's identity may vary, never the parent product's
// title/handle. So this spec checks SKU + Mfr# instead of H1.
const AEROWALK_HANDLE = 'aerowalk-ultra-lite-rollator-rolling-walker-blue'

const COLORS = [
  { name: 'White', mfr: '10277WT' },
  { name: 'Grey', mfr: '10277GY' },
]

const ROUTE_PREFIXES = [
  (handle: string) => `/product/${handle}`,
  (handle: string) => `/category/mobility/${handle}`,
]

for (const routeFor of ROUTE_PREFIXES) {
  test.describe(`AeroWalk variant pilot on ${routeFor('<handle>')}`, () => {
    test('default load shows Blue SKU/Mfr#, and the Order Unit block', async ({ page }) => {
      await page.goto(routeFor(AEROWALK_HANDLE))

      await expect(page.getByText('SKU: 10277BL')).toBeVisible()
      await expect(page.getByText('Mfr #: 10277BL')).toBeVisible()
      await expect(page.getByText('UNIT')).toBeVisible()
    })

    for (const { name, mfr } of COLORS) {
      test(`selecting ${name} updates SKU, Mfr#, image and structured data together`, async ({ page }) => {
        await page.goto(routeFor(AEROWALK_HANDLE))

        const initialImageSrc = await page.locator('main img').first().getAttribute('src')

        const target = page.getByRole('button', { name: `Color: ${name}` })
        await target.click()
        await expect(target).toHaveAttribute('aria-pressed', 'true')

        await expect(page.getByText(`Mfr #: ${mfr}`)).toBeVisible()
        await expect(page).toHaveURL(/[?&]variant=/)

        // Gallery follows the selected variant's own native image — never a
        // sibling color's (the exact defect this pilot's data proves fixed).
        const updatedImageSrc = await page.locator('main img').first().getAttribute('src')
        expect(updatedImageSrc).not.toBe(initialImageSrc)

        // Deep link reproduces the same selected state after a real reload.
        const deepLinkUrl = page.url()
        await page.reload()
        await expect(page).toHaveURL(deepLinkUrl)
        await expect(page.getByText(`Mfr #: ${mfr}`)).toBeVisible()

        // Structured data (sku/mpn) follows the selected variant, not Blue.
        // The page also emits Organization/WebSite/Breadcrumb ld+json blocks
        // (app/layout.tsx, BreadcrumbSchema), so find the Product one by type
        // rather than assuming it's first in document order.
        const ldJsonBlocks = await page.locator('script[type="application/ld+json"]').allTextContents()
        const productSchema = ldJsonBlocks.map((t) => JSON.parse(t)).find((s) => s['@type'] === 'Product')
        expect(productSchema?.mpn).toBe(mfr)
      })
    }

    test('Variant Details renders the flattened per-color description, not raw rich-text JSON', async ({ page }) => {
      await page.goto(routeFor(AEROWALK_HANDLE))
      await page.getByRole('button', { name: 'Color: White' }).click()

      await expect(page.getByText('Variant Details')).toBeVisible()
      await expect(page.getByText(/white frame/i)).toBeVisible()
      await expect(page.getByText(/"type":\s*"root"/)).toHaveCount(0)
    })
  })
}
