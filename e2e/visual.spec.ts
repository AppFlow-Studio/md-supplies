import { test, expect } from '@playwright/test'

const VISUAL_ROUTES: Array<{ path: string; name: string }> = [
  { path: '/', name: 'home' },
  { path: '/categories', name: 'categories-hub' },
  { path: '/category/gloves', name: 'category' },
  { path: '/category/gloves/exam-gloves', name: 'subcategory' },
  { path: '/product/exam-glove-nitrile-medium-blue-100-bx-10-bx-cs', name: 'pdp' },
  { path: '/solutions/occ', name: 'occ' },
  { path: '/industries/pharmacies', name: 'industry' },
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
