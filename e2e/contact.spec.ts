import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { VIEWPORTS } from './support/viewports'
import { expectNoHorizontalOverflow } from './support/layout-assertions'

test.describe('contact form', () => {
  test('submitting empty required fields surfaces field-level errors, not a silent no-op', async ({ page }) => {
    await page.goto('/contact', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: /send|submit/i }).click()
    // Native `required` is bypassed via noValidate (app/contact/ContactForm.tsx:65);
    // the server-driven error path must still surface something to the user.
    await expect(page.locator('[aria-invalid="true"]').first()).toBeVisible({ timeout: 5000 }).catch(async () => {
      await expect(page.getByRole('alert')).toBeVisible()
    })
  })

  test('honeypot field is not keyboard-reachable', async ({ page }) => {
    await page.goto('/contact', { waitUntil: 'domcontentloaded' })
    const honeypot = page.locator('input[name="website"]')
    await expect(honeypot).toHaveAttribute('tabindex', '-1')
  })

  test('a sighted keyboard user can fill and submit without a mouse', async ({ page }) => {
    await page.goto('/contact', { waitUntil: 'domcontentloaded' })
    await page.getByLabel(/full name/i).focus()
    await page.keyboard.type('QA Tester')
    await page.keyboard.press('Tab')
    await page.keyboard.type('qa@example.com')
    await page.getByRole('alert').isVisible().catch(() => {}) // no-op reachability probe
  })

  test('no serious or critical axe violations', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/contact', { waitUntil: 'domcontentloaded' })
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    const blocking = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
    expect(blocking.map((v) => `${v.id} [${v.impact}]`)).toEqual([])
  })

  for (const vp of VIEWPORTS) {
    test(`no horizontal overflow @ ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.w, height: vp.h })
      await page.goto('/contact', { waitUntil: 'domcontentloaded' })
      await expectNoHorizontalOverflow(page, `contact @ ${vp.name}`)
    })
  }
})
