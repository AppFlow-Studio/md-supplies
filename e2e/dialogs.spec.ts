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
