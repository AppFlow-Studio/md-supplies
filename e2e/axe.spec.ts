import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const ROUTES: Array<{ path: string; name: string }> = [
  { path: '/', name: 'home' },
  { path: '/categories', name: 'categories-hub' },
  { path: '/category/gloves', name: 'category' },
  { path: '/category/gloves/exam-gloves', name: 'subcategory' },
  { path: '/product/exam-glove-nitrile-medium-blue-100-bx-10-bx-cs', name: 'pdp' },
  { path: '/solutions/occ', name: 'occ' },
  { path: '/industries/pharmacies', name: 'industry' },
  { path: '/blog/types-of-needles', name: 'blog' },
  { path: '/cart', name: 'cart' },
  { path: '/account', name: 'account' },
]

for (const { path, name } of ROUTES) {
  test(`${name} (${path}) has no serious or critical axe violations`, async ({ page }) => {
    // Scan the reduced-motion rendering (globals.css honors it, WCAG 2.3.3):
    // otherwise axe can sample the announcement-bar text mid-fade and flag a
    // phantom contrast failure from the blended semi-transparent color.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(path)
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()

    const blocking = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    )

    if (blocking.length > 0) {
      console.log(`axe violations on ${name}:`, JSON.stringify(blocking, null, 2))
    }
    expect(blocking).toEqual([])
  })
}

test('cart panel (opened) has no serious or critical axe violations', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.getByRole('button', { name: /cart/i }).click()
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  const blocking = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  )
  expect(blocking).toEqual([])
})
