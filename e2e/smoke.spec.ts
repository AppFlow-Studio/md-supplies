// e2e/smoke.spec.ts
import { test, expect } from '@playwright/test'

test('homepage responds and renders an H1', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('h1')).toHaveCount(1)
})
