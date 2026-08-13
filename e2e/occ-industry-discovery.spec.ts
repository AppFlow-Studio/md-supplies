import { test, expect } from '@playwright/test'
import { occFixture, industryFixture, firstPopulatedIndustry, requireFixture } from './helpers/qa-fixtures'
import { resultStatus } from './helpers/catalog'

/**
 * DEV-LAUNCH-06 — OCC and industry discovery: canonical-collection/tag
 * membership, no Vendor leak, and the hand-crafted productVendor filter
 * regression (lib/filter-registry.ts) verified at the e2e level, not just
 * the unit-test level (lib/__tests__/filter-registry.test.ts already covers
 * the pure-function gate).
 */
test.setTimeout(120_000)

test.describe('OCC canonical collection (DEV-LAUNCH-06)', () => {
  test('OCC page fails safe when the canonical collection does not resolve on this store', async ({ page }) => {
    const occ = occFixture()
    await page.goto('/solutions/occ', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    if (occ.exists) {
      // Canonical collection resolves on this store: results must come from it,
      // not a tag scan — every product card link should route through the OCC page.
      await expect(resultStatus(page)).toBeVisible()
    } else {
      // Documented fail-safe (lib/occ-collection.ts, app/solutions/occ/page.tsx):
      // never falls back to tag-scanning or a curated list when the handle
      // can't be resolved.
      await expect(page.getByText('The OCC catalog is temporarily unavailable.')).toBeVisible()
    }
  })

  test('OCC page never renders a Vendor facet, chip, or label', async ({ page }) => {
    await page.goto('/solutions/occ', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('label', { hasText: /vendor/i })).toHaveCount(0)
    await expect(page.getByText(/^Vendor$/)).toHaveCount(0)
  })

  test('a hand-crafted productVendor filter param is silently dropped, not applied', async ({ page }) => {
    const occ = occFixture()
    await page.goto('/solutions/occ', { waitUntil: 'domcontentloaded' })
    const baselineText = occ.exists ? await resultStatus(page).innerText() : null

    await page.goto(`/solutions/occ?filter=${encodeURIComponent(JSON.stringify({ productVendor: 'MedPlus' }))}`, { waitUntil: 'domcontentloaded' })

    // No vendor chip, and the page renders identically to the unfiltered state
    // (lib/filter-registry.ts INPUT_VALIDATORS has no productVendor key, so
    // parseFilterParam's isAllowedFilterInput gate drops it before it ever
    // reaches chips, the Storefront API, or activeFilterStrings).
    await expect(page.getByRole('link', { name: /MedPlus/ })).toHaveCount(0)
    await expect(page).not.toHaveURL(/&page=/)
    if (baselineText !== null) {
      await expect(resultStatus(page)).toHaveText(baselineText)
    }
  })
})

test.describe('Industry discovery (DEV-LAUNCH-06)', () => {
  test('a tag-backed industry page never renders a Vendor facet or chip', async ({ page }) => {
    const industry = requireFixture(firstPopulatedIndustry(), 'a tag-backed industry with live products on the QA store')
    await page.goto(`/industries/${industry.slug}`, { waitUntil: 'domcontentloaded' })

    await expect(page.locator('label', { hasText: /vendor/i })).toHaveCount(0)
    await expect(page.getByText(/^Vendor$/)).toHaveCount(0)
  })

  test('a hand-crafted productVendor filter param is silently dropped on an industry page', async ({ page }) => {
    const industry = requireFixture(industryFixture('urgent-care') ?? firstPopulatedIndustry(), 'a tag-backed industry with live products on the QA store')
    await page.goto(`/industries/${industry.slug}`, { waitUntil: 'domcontentloaded' })
    const status = resultStatus(page)
    await expect(status).toBeVisible()
    const baselineText = await status.innerText()

    await page.goto(
      `/industries/${industry.slug}?filter=${encodeURIComponent(JSON.stringify({ productVendor: 'MedPlus' }))}`,
      { waitUntil: 'domcontentloaded' },
    )

    await expect(page.getByRole('link', { name: /MedPlus/ })).toHaveCount(0)
    await expect(resultStatus(page)).toHaveText(baselineText)
  })
})
