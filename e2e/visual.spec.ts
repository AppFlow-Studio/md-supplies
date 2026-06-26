import { test, expect } from '@playwright/test'

const VISUAL_ROUTES: Array<{ path: string; name: string }> = [
  { path: '/', name: 'home' },
  { path: '/category/gloves', name: 'category' },
  { path: '/product/nitrile-exam-gloves-powder-free', name: 'pdp' },
  { path: '/solutions/occ', name: 'occ' },
  { path: '/industries/pharmacy', name: 'industry' },
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
