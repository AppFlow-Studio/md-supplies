import { test, expect } from '@playwright/test'

// The global `prefers-reduced-motion: reduce` rule (app/globals.css:127-137)
// sets durations to 0.01ms (not 0ms) so transitionend/animationend still
// fire — browsers report that as "1e-05s", i.e. parseFloat ~0.00001, not
// exactly 0. Assert "near zero" (< 1ms) rather than exact-zero so this
// suite matches that deliberate epsilon instead of flagging correct CSS.
const NEAR_ZERO = 0.001

test.describe('prefers-reduced-motion', () => {
  test('cart popup panel and backdrop have zero transition duration', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: /cart/i }).first().click()
    const dialog = page.getByRole('dialog', { name: /shopping cart/i })
    await expect(dialog).toBeVisible()

    const duration = await dialog.evaluate((el) => getComputedStyle(el).transitionDuration)
    expect(duration.split(',').every((d) => parseFloat(d) < NEAR_ZERO), `cart popup transition-duration is "${duration}", expected near-zero under reduced motion`).toBe(true)
  })

  test('quick-add modal has zero transition/animation duration', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/category/gloves', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: /quick add/i }).first().click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    const { transition, animation } = await dialog.evaluate((el) => {
      const s = getComputedStyle(el)
      return { transition: s.transitionDuration, animation: s.animationDuration }
    })
    expect(transition.split(',').every((d) => parseFloat(d) < NEAR_ZERO), `quick-add modal transition-duration is "${transition}", expected near-zero under reduced motion`).toBe(true)
    expect(animation.split(',').every((d) => parseFloat(d) < NEAR_ZERO), `quick-add modal animation-duration is "${animation}", expected near-zero under reduced motion`).toBe(true)
  })

  test('homepage hero has no animation duration under reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const hero = page.locator('main#main-content').first()
    const animation = await hero.evaluate((el) => getComputedStyle(el).animationDuration)
    expect(animation.split(',').every((d) => parseFloat(d) < NEAR_ZERO), `homepage hero animation-duration is "${animation}", expected near-zero under reduced motion`).toBe(true)
  })
})
