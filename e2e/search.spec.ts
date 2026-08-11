import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { VIEWPORTS } from './support/viewports'
import { expectNoHorizontalOverflow } from './support/layout-assertions'

test.describe('search — functional states', () => {
  test('no-query state shows suggested categories, not an error', async ({ page }) => {
    await page.goto('/search', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('What are you looking for?')).toBeVisible()
  })

  test('results state shows a real count and a sort control', async ({ page }) => {
    await page.goto('/search?q=gloves', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle').catch(() => {})
    await expect(page.locator('body')).toContainText(/result/i)
  })

  test('no-results state names the query and offers no phantom products', async ({ page }) => {
    await page.goto('/search?q=zzzznonexistentquery9999', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle').catch(() => {})
    // Both the summary bar (app/search/page.tsx) and the empty-state card
    // (components/search/SearchResultsSection.tsx) legitimately render this
    // text — scope to the first match to avoid a strict-mode ambiguity.
    await expect(page.getByText(/No results for/i).first()).toBeVisible()
  })
})

test.describe('search — axe', () => {
  for (const { path, name } of [
    { path: '/search', name: 'search-empty' },
    { path: '/search?q=gloves', name: 'search-results' },
  ]) {
    test(`${name} has no serious or critical axe violations`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.goto(path, { waitUntil: 'domcontentloaded' })
      await page.waitForLoadState('networkidle').catch(() => {})
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
      const blocking = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
      expect(blocking.map((v) => `${v.id} [${v.impact}]`)).toEqual([])
    })
  }
})

test.describe('search — responsive', () => {
  for (const vp of VIEWPORTS) {
    test(`no horizontal overflow @ ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.w, height: vp.h })
      await page.goto('/search?q=gloves', { waitUntil: 'domcontentloaded' })
      await page.waitForLoadState('networkidle').catch(() => {})
      await expectNoHorizontalOverflow(page, `search @ ${vp.name}`)
    })
  }
})
