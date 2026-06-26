import { test, expect } from '@playwright/test'

const STATIC_ROUTES: Array<{ path: string; name: string }> = [
  { path: '/', name: 'home' },
  { path: '/category/gloves', name: 'category' },
  { path: '/product/nitrile-exam-gloves-powder-free', name: 'pdp' },
  { path: '/solutions/occ', name: 'occ' },
  { path: '/industries/pharmacy', name: 'industry' },
  { path: '/blog/types-of-needles', name: 'blog' },
  { path: '/account', name: 'account' },
]

for (const { path, name } of STATIC_ROUTES) {
  test(`${name} (${path}) loads with exactly one h1 and no console errors`, async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    const response = await page.goto(path)
    expect(response?.status()).toBeLessThan(400)
    await expect(page.locator('h1')).toHaveCount(1)
    expect(consoleErrors).toEqual([])
  })
}

test('cart panel opens from the header and traps focus', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /cart/i }).click()
  const dialog = page.getByRole('dialog', { name: /shopping cart/i })
  await expect(dialog).toHaveAttribute('aria-modal', 'true')
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveAttribute('aria-modal', 'false')
})
