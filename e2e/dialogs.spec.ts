import { test, expect } from '@playwright/test'

test.describe('cart popup — focus lifecycle', () => {
  test('Escape closes the cart and returns focus to the header cart trigger', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const cartTrigger = page.getByRole('button', { name: /cart/i }).first()
    await cartTrigger.click()
    const dialog = page.getByRole('dialog', { name: /shopping cart/i })
    await expect(dialog).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(cartTrigger, 'focus did not return to the cart trigger after closing the popup').toBeFocused()
  })
})

const DIALOG_VIEWPORTS = [
  { w: 375, h: 812, name: '375x812' },
  { w: 768, h: 1024, name: '768x1024' },
  { w: 1280, h: 800, name: '1280x800' },
  { w: 1920, h: 1080, name: '1920x1080' },
] as const

test.describe('quick-add modal — focus lifecycle', () => {
  for (const vp of DIALOG_VIEWPORTS) {
    test(`traps focus, closes on Escape, and returns focus to the trigger @ ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.w, height: vp.h })
      await page.goto('/category/gloves', { waitUntil: 'domcontentloaded' })
      await page.waitForLoadState('networkidle').catch(() => {})

      const trigger = page.getByRole('button', { name: /quick add/i }).first()
      await trigger.click()

      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()

      // Tab trap: cycling forward from the last focusable element must land back on the first.
      const focusableCount = await dialog.locator('button:not([disabled]), [href], input:not([disabled]), select, textarea').count()
      for (let i = 0; i < focusableCount; i++) await page.keyboard.press('Tab')
      const closeButton = dialog.getByLabel('Close quick add')
      await expect(closeButton).toBeFocused()

      await page.keyboard.press('Escape')
      await expect(dialog).toBeHidden()
      await expect(trigger, `focus did not return to the quick-add trigger @ ${vp.name}`).toBeFocused()
    })
  }
})
