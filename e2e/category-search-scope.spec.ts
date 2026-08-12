import { test, expect } from '@playwright/test'
import { categoryFixture, requireFixture } from './helpers/qa-fixtures'
import { resultStatus } from './helpers/catalog'

/**
 * DEV-LAUNCH-06 — category-scoped search must not leak products from outside
 * the selected category, and an empty result set must offer a working
 * recovery path.
 *
 * "rollator" is verified (see docs/launch/DEV-LAUNCH-06-qa-fixtures.md) to
 * return real hits on the QA store's unscoped /search — it's a mobility
 * product term. If scoping were bypassed, searching it from an unrelated
 * category would surface those same mobility products; the architecture
 * (lib/category-results-source.ts) ANDs the search text with the category's
 * own tag scope server-side, so it must return zero instead.
 */
test.setTimeout(120_000)

test.describe('category-scoped search does not leak across categories (DEV-LAUNCH-06)', () => {
  test('a term that matches products in another category returns nothing here', async ({ page }) => {
    const gloves = requireFixture(categoryFixture('gloves'), 'the gloves category on the QA store')

    // Sanity check the term is real: unscoped /search must return results.
    // (app/search/page.tsx renders the count in a plain <p>, not role="status".)
    await page.goto('/search?q=rollator', { waitUntil: 'domcontentloaded' })
    const unscopedSummary = page.getByText(/for "rollator"/)
    await expect(unscopedSummary).toBeVisible()
    const unscopedText = await unscopedSummary.innerText()
    test.skip(/no results/i.test(unscopedText), 'QA-data changed: "rollator" no longer matches anything catalogue-wide')

    // Scoped to gloves, the same term must return zero — not the unscoped set.
    await page.goto(`/category/${gloves.routeSlug}?q=rollator`, { waitUntil: 'domcontentloaded' })
    const scopedStatus = resultStatus(page)
    await expect(scopedStatus).toBeVisible()
    await expect(scopedStatus).toContainText('0 results')

    // No rollator/mobility product card leaked into the gloves-scoped page
    // (the result count and "Search: rollator" chip legitimately echo the
    // term, so this is scoped to actual product-card titles inside the
    // results container, not page text or the hero description, which also
    // uses line-clamp-2 — see components/category/CategoryPageView.tsx).
    await expect(page.locator('[aria-busy] p.line-clamp-2', { hasText: /rollator/i })).toHaveCount(0)
  })

  test('empty search results offer a working clear-search recovery link', async ({ page }) => {
    const gloves = requireFixture(categoryFixture('gloves'), 'the gloves category on the QA store')
    await page.goto(`/category/${gloves.routeSlug}?q=zzzznonexistentqueryzzzz`, { waitUntil: 'domcontentloaded' })

    await expect(page.getByText('No products found.')).toBeVisible()
    const clearLink = page.getByRole('link', { name: 'Clear all filters' })
    await expect(clearLink).toBeVisible()

    await clearLink.click()
    await page.waitForLoadState('networkidle')

    await expect(page).not.toHaveURL(/[?&]q=/)
    const status = resultStatus(page)
    await expect(status).not.toContainText('0 results')
  })
})
