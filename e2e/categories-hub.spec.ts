import { test, expect } from '@playwright/test'

/**
 * DEV-LAUNCH-03 evidence: every "Browse All Categories" card must show its
 * approved, non-placeholder description text, and stay readable at every
 * mandated launch width.
 *
 * Run against an already-built server:
 *   E2E_BASE_URL=http://localhost:3000 npx playwright test e2e/categories-hub.spec.ts
 */

const SHOTS = 'docs/audits/2026-08-07-dev-launch-03/screenshots'

const VIEWPORTS = [
  { w: 390, h: 844, name: '390x844' },
  { w: 768, h: 1024, name: '768x1024' },
  { w: 1024, h: 768, name: '1024x768' },
  { w: 1440, h: 900, name: '1440x900' },
] as const

test.describe('categories hub — card descriptions', () => {
  test('every one of the 25 cards shows unique, nonempty description text', async ({ page }) => {
    await page.goto('/categories', { waitUntil: 'domcontentloaded' })
    const grid = page.locator('section', { has: page.getByRole('heading', { name: 'Browse All Categories' }) })
    const cards = grid.locator('a')
    await expect(cards).toHaveCount(25)

    const count = await cards.count()
    const descriptions: string[] = []
    for (let i = 0; i < count; i++) {
      const card = cards.nth(i)
      const paragraphs = card.locator('p')
      await expect(paragraphs).toHaveCount(2)
      await expect(paragraphs.nth(1)).toBeVisible()
      const title = (await paragraphs.nth(0).textContent())?.trim() ?? ''
      const description = (await paragraphs.nth(1).textContent())?.trim() ?? ''
      expect(title.length, `card ${i} has no title`).toBeGreaterThan(0)
      expect(description.length, `card ${i} ("${title}") has a blank description`).toBeGreaterThan(0)
      expect(description, `card ${i} ("${title}") description duplicates its title`).not.toBe(title)
      descriptions.push(description)
    }
    expect(new Set(descriptions).size, 'two or more cards show duplicated description text').toBe(descriptions.length)
  })

  for (const vp of VIEWPORTS) {
    test(`renders readably at ${vp.name}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: vp.w, height: vp.h })
      await page.goto('/categories', { waitUntil: 'domcontentloaded' })
      await page.waitForLoadState('networkidle').catch(() => {})
      await expect(page.getByRole('heading', { name: 'Browse All Categories' })).toBeVisible()
      await page.screenshot({ path: `${SHOTS}/categories-hub__${testInfo.project.name}__${vp.name}.png`, fullPage: true })
    })
  }
})
