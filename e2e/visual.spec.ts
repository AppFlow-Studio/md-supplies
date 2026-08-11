import { test, expect } from '@playwright/test'

const VISUAL_ROUTES: Array<{ path: string; name: string }> = [
  { path: '/', name: 'home' },
  { path: '/categories', name: 'categories-hub' },
  { path: '/category/gloves', name: 'category' },
  { path: '/category/gloves/exam-gloves', name: 'subcategory' },
  { path: '/product/exam-glove-nitrile-medium-blue-100-bx-10-bx-cs', name: 'pdp' },
  { path: '/solutions/occ', name: 'occ' },
  // 'industry' route intentionally excluded from visual-regression baselines:
  // /industries/pharmacies uses the Storefront Search API's RELEVANCE sort
  // (no deterministic tie-break — lib/category-results-source.ts:36-46),
  // which shifts both product order AND the returned set between requests,
  // producing real page-height deltas (not screenshot-tooling flake).
  // Reproduced independently on 2 platforms: 100% failure rate, 3-8% diffs
  // vs the 2% gate. Still covered by e2e/axe.spec.ts, e2e/responsive.spec.ts,
  // and e2e/contrast.spec.ts — just not pixel-diff visual regression.
  // Re-include if/when the query gains a deterministic secondary sort.
  { path: '/search?q=gloves', name: 'search' },
  { path: '/cart', name: 'cart' },
  { path: '/contact', name: 'contact' },
  { path: '/blog/types-of-needles', name: 'blog' },
]

for (const { path, name } of VISUAL_ROUTES) {
  test(`${name} visual baseline`, async ({ page }) => {
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot(`${name}.png`, {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    })
  })
}
