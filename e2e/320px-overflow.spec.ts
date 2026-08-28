import { test } from '@playwright/test'
import { expectNoHorizontalOverflow } from './support/layout-assertions'

/**
 * Bilal's pre-launch report: the homepage and search results page scroll
 * horizontally at a 320px viewport (the narrowest width in our supported
 * device matrix — iPhone SE and similar). The existing responsive sweep
 * (e2e/responsive.spec.ts) only checks down to 375px (see
 * e2e/support/viewports.ts), so a 320px-only overflow slipped through.
 *
 * Root causes:
 *  - Homepage: the "Browse all categories" link in components/home/
 *    PopularCategories.tsx forced `whitespace-nowrap`, so as a flex item
 *    next to the "Popular Categories" heading it could not shrink below its
 *    one-line content width and pushed the row past the viewport.
 *  - Search: the search box wrapper and `<input>` in components/search/
 *    SearchBarForm.tsx were flex items without `min-width: 0`. A text
 *    input's automatic flex-basis minimum is its default intrinsic width
 *    (not 0), so it refused to shrink alongside the fixed-width "Search"
 *    submit button and pushed the button off-screen.
 */
const PAGES = [
  { path: '/', name: 'homepage' },
  { path: '/search?q=gloves', name: 'search results' },
] as const

test.describe('320px viewport — no horizontal overflow', () => {
  for (const { path, name } of PAGES) {
    test(`${name} does not scroll horizontally at 320px`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 720 })
      await page.goto(path, { waitUntil: 'domcontentloaded' })
      await page.waitForLoadState('networkidle').catch(() => {})

      await expectNoHorizontalOverflow(page, `${name} @ 320x720`)
    })
  }
})
