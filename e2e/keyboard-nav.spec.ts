// e2e/keyboard-nav.spec.ts
import { test, expect } from '@playwright/test'

const ROUTES_WITH_SKIP_LINK = [
  '/', '/about', '/search', '/faq', '/contact', '/categories',
  '/category/gloves', '/solutions/occ', '/industries/pharmacy',
  '/product/nitrile-exam-gloves-powder-free', '/cart',
]

test.describe('skip link', () => {
  for (const path of ROUTES_WITH_SKIP_LINK) {
    test(`Tab reveals "Skip to main content" and it focuses a real target on ${path}`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'domcontentloaded' })
      await page.keyboard.press('Tab')
      const skipLink = page.getByRole('link', { name: 'Skip to main content' })
      await expect(skipLink).toBeFocused()
      await skipLink.press('Enter')
      const target = page.locator('#main-content')
      await expect(target, `${path}: #main-content is missing — the skip link has nothing to jump to`).toHaveCount(1)
    })
  }
})
