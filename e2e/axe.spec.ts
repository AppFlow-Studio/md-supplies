import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const ROUTES: Array<{ path: string; name: string }> = [
  { path: '/', name: 'home' },
  { path: '/category/gloves', name: 'category' },
  { path: '/product/nitrile-exam-gloves-powder-free', name: 'pdp' },
  { path: '/solutions/occ', name: 'occ' },
  { path: '/industries/pharmacy', name: 'industry' },
  { path: '/blog/types-of-needles', name: 'blog' },
  { path: '/cart', name: 'cart' },
  { path: '/account', name: 'account' },
]

for (const { path, name } of ROUTES) {
  test(`${name} (${path}) has no serious or critical axe violations`, async ({ page }) => {
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
  await page.goto('/')
  await page.getByRole('button', { name: /cart/i }).click()
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  const blocking = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  )
  expect(blocking).toEqual([])
})
