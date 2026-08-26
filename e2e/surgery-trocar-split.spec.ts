import { test, expect, type Page } from '@playwright/test'
import { expectNoHorizontalOverflow } from './support/layout-assertions'

/**
 * Repair pass 2026-08-20 — P0.1 through P0.7.
 *
 * The single defect underneath most of these: one registry row carried
 * `tag: 'surgery-procedure'` with `collectionHandle: 'trocars-trocar-kits'`.
 * Because that field is simultaneously the route slug, the hero artwork key
 * and the product source, /category/surgery-procedure did not exist and
 * /category/trocars-trocar-kits announced itself as "Surgery & Procedure".
 *
 * Product totals are asserted against the live Storefront response, never
 * hardcoded: the tests read the rendered denominator and check the two routes
 * DISAGREE by a wide margin, which is the property that fails if either route
 * silently falls back to the other's product set. The absolute figures
 * observed on 2026-08-20 (323 broad / 41 Trocar) are recorded in comments as
 * reference points, not as assertions.
 */

const SURGERY = '/category/surgery-procedure'
const TROCARS = '/category/trocars-trocar-kits'

/** Every width in the brief's device matrix, including 320px. */
const VIEWPORTS = [
  { w: 320, h: 568, name: '320x568' },
  { w: 375, h: 812, name: '375x812' },
  { w: 390, h: 844, name: '390x844' },
  { w: 768, h: 1024, name: '768x1024' },
  { w: 1024, h: 768, name: '1024x768' },
  { w: 1440, h: 900, name: '1440x900' },
] as const

/**
 * The rendered denominator from "Showing N products of TOTAL".
 *
 * Polled rather than read once: the count line is aria-live and is rewritten
 * by every filter/search navigation, so a bare innerText() can land on the
 * empty string between renders.
 */
async function resultTotal(page: Page): Promise<number> {
  const status = page.getByRole('status').first()
  await expect(status).toContainText(/of\s+[\d,]+/, { timeout: 15_000 })
  const text = await status.innerText()
  const m = text.match(/of\s+([\d,]+)/)
  expect(m, `could not read a result total from "${text}"`).not.toBeNull()
  return Number(m![1].replace(/,/g, ''))
}

/** Facet groups other than Category start collapsed — open one by its heading. */
async function openFilterGroup(page: Page, name: string) {
  const toggle = page
    .locator('aside')
    .first()
    .getByRole('button', { name: new RegExp(name, 'i') })
    .first()
  if ((await toggle.getAttribute('aria-expanded')) === 'false') await toggle.click()
}

test.describe('P0.5/P0.6 — Surgery & Procedure and Trocars are two distinct pages', () => {
  test('the broad parent renders its own identity and product set', async ({ page }) => {
    await page.goto(SURGERY, { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Surgery & Procedure')
    // Home › Surgery & Procedure — one level, no Trocar segment.
    const crumbs = page.getByRole('navigation', { name: /breadcrumb/i }).first()
    await expect(crumbs).toContainText('Surgery & Procedure')
    await expect(crumbs).not.toContainText('Trocars')

    // Reference: 323 active products on 2026-08-20.
    expect(await resultTotal(page)).toBeGreaterThan(100)
  })

  test('the Trocar page renders Trocar identity, never the parent name', async ({ page }) => {
    await page.goto(TROCARS, { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Trocars & Trocar Kits')
    // Home › Surgery & Procedure › Trocars & Trocar Kits
    const crumbs = page.getByRole('navigation', { name: /breadcrumb/i }).first()
    await expect(crumbs).toContainText('Surgery & Procedure')
    await expect(crumbs).toContainText('Trocars & Trocar Kits')

    // Reference: 41 active products on 2026-08-20.
    expect(await resultTotal(page)).toBeLessThan(100)
  })

  test('neither route falls back to the other product set', async ({ page }) => {
    await page.goto(SURGERY, { waitUntil: 'domcontentloaded' })
    const broad = await resultTotal(page)
    await page.goto(TROCARS, { waitUntil: 'domcontentloaded' })
    const narrow = await resultTotal(page)

    expect(narrow).toBeLessThan(broad)
    // The Trocar collection is a small fraction of Surgery; if either route
    // regressed onto the other's source these would converge.
    expect(narrow / broad).toBeLessThan(0.5)
  })

  test('the Trocar hero image is Trocar-specific in its alt text', async ({ page }) => {
    await page.goto(TROCARS, { waitUntil: 'domcontentloaded' })
    // Reuses the Surgery artwork file by design; the ALT must still describe
    // this page.
    await expect(page.getByAltText('Trocars and trocar kits').first()).toBeAttached()
    await expect(page.getByAltText('Surgery and procedure instruments')).toHaveCount(0)
  })

  test('makes no FDA/regulatory claim in the Trocar page copy', async ({ page }) => {
    await page.goto(TROCARS, { waitUntil: 'domcontentloaded' })
    const main = await page.locator('#main-content').innerText()
    expect(main).not.toMatch(/FDA/i)
  })

  test('each route canonicalises to itself', async ({ page }) => {
    for (const path of [SURGERY, TROCARS]) {
      await page.goto(path, { waitUntil: 'domcontentloaded' })
      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
      expect(canonical, path).toContain(path)
    }
  })
})

test.describe('P0.5 — Trocars is the first Surgery subcategory', () => {
  test('sits immediately after the All control, above the fold, without opening More', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(SURGERY, { waitUntil: 'domcontentloaded' })

    const rail = page.getByRole('navigation', { name: /Surgery & Procedure categories/i })
    const pills = rail.getByRole('link')

    await expect(pills.nth(0)).toHaveText(/All Surgery & Procedure/)
    await expect(pills.nth(1)).toHaveText(/Trocars & Trocar Kits/)
    await expect(pills.nth(1)).toHaveAttribute('href', TROCARS)

    // Visible in the rail itself, not tucked inside the overflow panel.
    await expect(pills.nth(1)).toBeVisible()
  })

  test('keeps the full Surgery category strip — not replaced by the 7 Trocar sizes', async ({ page }) => {
    await page.goto(SURGERY, { waitUntil: 'domcontentloaded' })
    const rail = page.getByRole('navigation', { name: /Surgery & Procedure categories/i })
    // All + Trocars + the parent's own many Category values.
    expect(await rail.getByRole('link').count()).toBeGreaterThan(20)
    await expect(rail).toContainText('Scalpels')
  })

  test('navigating the pill lands on the Trocar page', async ({ page }) => {
    await page.goto(SURGERY, { waitUntil: 'domcontentloaded' })
    await page.getByRole('navigation', { name: /Surgery & Procedure categories/i })
      .getByRole('link', { name: /Trocars & Trocar Kits/ })
      .click()
    await page.waitForURL(`**${TROCARS}`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Trocars & Trocar Kits')
  })

  test('remains discoverable on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto(SURGERY, { waitUntil: 'domcontentloaded' })
    const link = page.getByRole('navigation', { name: /Surgery & Procedure categories/i })
      .getByRole('link', { name: /Trocars & Trocar Kits/ })
    await expect(link).toBeAttached()
    await link.scrollIntoViewIfNeeded()
    await expect(link).toBeVisible()
  })
})

test.describe('P0.6 — Trocar filters are the approved set only', () => {
  // 'Price Range' is the rail's heading for the PRICE_RANGE slider group —
  // the approved "Price" facet, rendered as a range control rather than a
  // checkbox list (components/filters/FilterRail.tsx).
  const APPROVED = ['Category', 'Material', 'Glove Size', 'Size', 'Features', 'Other Features', 'Use', 'Order Size', 'Brand Name', 'Price Range']
  const FORBIDDEN = ['Needle Gauge', 'Sterility', 'Color', 'Type', 'Thickness']

  test('desktop rail shows every approved group and no irrelevant one', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(TROCARS, { waitUntil: 'domcontentloaded' })
    const rail = page.locator('aside').first()

    for (const group of APPROVED) {
      await expect(rail.getByText(group, { exact: true }).first(), `${group} missing`).toBeAttached()
    }
    for (const group of FORBIDDEN) {
      await expect(rail.getByText(group, { exact: true }), `${group} must not render`).toHaveCount(0)
    }
  })

  test('exposes exactly the 7 approved Category values', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(TROCARS, { waitUntil: 'domcontentloaded' })
    for (const value of [
      'Disposable 3.2mm', 'Disposable 3.5mm', 'Disposable 4.5mm',
      'Kit without Trocar',
      'Reusable 3.2mm', 'Reusable 3.5mm', 'Reusable 4.5mm',
    ]) {
      await expect(page.getByText(value, { exact: true }).first(), value).toBeAttached()
    }
  })

  test('Brand Name separates Trocar Supplies from Kadara Medical', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(TROCARS, { waitUntil: 'domcontentloaded' })
    // Only Category is expanded by default; the values live behind the toggle.
    await openFilterGroup(page, 'Brand Name')
    const rail = page.locator('aside').first()
    await expect(rail.getByText('Trocar Supplies', { exact: true }).first()).toBeVisible()
    await expect(rail.getByText('Kadara Medical', { exact: true }).first()).toBeVisible()
  })

  test('the Surgery parent exposes the broader set the Trocar page does not', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(SURGERY, { waitUntil: 'domcontentloaded' })
    const rail = page.locator('aside').first()
    for (const group of ['Type', 'Sterility', 'Color']) {
      await expect(rail.getByText(group, { exact: true }).first(), `${group} missing on parent`).toBeAttached()
    }
  })

  test('applying and clearing a filter composes with the page and restores the total', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(TROCARS, { waitUntil: 'domcontentloaded' })
    const before = await resultTotal(page)

    await page.getByRole('checkbox', { name: /Disposable 3\.2mm/ }).first().check()
    await page.waitForURL(/filter=/)
    const filtered = await resultTotal(page)
    expect(filtered).toBeLessThan(before)
    // Still the Trocar page, not a navigation away.
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Trocars & Trocar Kits')

    await page.getByRole('link', { name: 'Clear all' }).click()
    await expect.poll(async () => resultTotal(page)).toBe(before)
  })
})

test.describe('P0.4 — exactly one clear-search control', () => {
  for (const path of [SURGERY, TROCARS]) {
    test(`one visible clear control after searching on ${path}`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 })
      await page.goto(path, { waitUntil: 'domcontentloaded' })

      const input = page.getByRole('searchbox', { name: /Search within/i })
      await input.fill('kit')
      await page.waitForURL(/[?&]q=kit/)

      // The custom button is the ONE control.
      await expect(page.getByRole('button', { name: /clear search/i })).toHaveCount(1)
      // No second chip offering the same action.
      await expect(page.getByRole('link', { name: /^Search:/ })).toHaveCount(0)

      // The native ::-webkit-search-cancel-button is suppressed in
      // app/globals.css. It is deliberately NOT asserted through
      // getComputedStyle(el, '::-webkit-search-cancel-button'): measured on
      // 2026-08-20, Chromium reports identical values ({appearance:"auto"})
      // for a suppressed input and for a control input with the suppression
      // explicitly reverted, so that reading cannot distinguish the two and
      // would be a test that passes either way.
      //
      // Asserted against the STYLESHEET THE BROWSER ACTUALLY LOADED, and on
      // `display:none` specifically.
      //
      // This is the check that was missing when the duplicate X survived the
      // first fix. Lightning CSS drops `-webkit-appearance` as redundant beside
      // the standard `appearance`, and this legacy shadow pseudo-element
      // honours the prefixed property only — so the shipped rule was
      // `{appearance:none}`, a no-op, while the SOURCE looked correct. Matching
      // loosely on /appearance:\s*none/ passed against exactly that broken
      // output. `display:none` is the declaration that actually suppresses the
      // control and that minification cannot collapse.
      const cssHref = await page.locator('link[rel="stylesheet"]').first().getAttribute('href')
      const css = await (await page.request.get(cssHref!)).text()
      expect(css).toMatch(/::-webkit-search-cancel-button[^{]*\{[^}]*display:\s*none/)
      expect(css).toMatch(/::-ms-clear\s*\{[^}]*display:\s*none/)
    })
  }

  test('clearing restores the unfiltered count and drops ?q=', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(TROCARS, { waitUntil: 'domcontentloaded' })
    const before = await resultTotal(page)

    await page.getByRole('searchbox', { name: /Search within/i }).fill('kit')
    await page.waitForURL(/[?&]q=kit/)
    expect(await resultTotal(page)).toBeLessThan(before)

    await page.getByRole('button', { name: /clear search/i }).click()
    await page.waitForURL((u) => !u.searchParams.has('q'))
    await expect.poll(async () => resultTotal(page)).toBe(before)
    // No error page, no stale results.
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Trocars & Trocar Kits')
  })

  test('the clear control is keyboard reachable and shows focus', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(TROCARS, { waitUntil: 'domcontentloaded' })
    const input = page.getByRole('searchbox', { name: /Search within/i })
    await input.fill('kit')
    await page.waitForURL(/[?&]q=kit/)

    const clear = page.getByRole('button', { name: /clear search/i })
    await clear.focus()
    await expect(clear).toBeFocused()
    const box = await clear.boundingBox()
    expect(box!.width).toBeGreaterThan(20)
    expect(box!.height).toBeGreaterThan(20)
  })
})

test.describe('P0.2/P0.3 — nav hierarchy and categories hub', () => {
  test('the mega-menu binds Trocars to Surgery & Procedure with distinct hrefs', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const surgery = page.locator('a[href="/category/surgery-procedure"]').first()
    const trocars = page.locator('a[href="/category/trocars-trocar-kits"]').first()
    await expect(surgery).toBeAttached()
    await expect(trocars).toBeAttached()

    // Two-stage disclosure (2026-08-26): the child no longer sits inside the
    // parent's own <li>. The parent is a rail item and the child lives in the
    // detail panel that rail item controls, so the relationship is carried by
    // ARIA rather than DOM containment — still structural, still real for a
    // screen reader, just expressed the way a disclosure has to express it.
    const panel = page.locator('#nav-panel-categories')
    const railLink = panel.locator('a[data-tag="surgery-procedure"]')
    await expect(railLink).toBeAttached()
    const railId = await railLink.getAttribute('id')

    const detail = panel.locator(`[aria-labelledby="${railId}"]`)
    await expect(detail).toBeAttached()
    await expect(detail.locator('a[href="/category/trocars-trocar-kits"]')).toHaveCount(1)

    // And the chevron beside the department points at that same panel.
    await expect(
      panel.getByRole('button', { name: 'Show Surgery & Procedure subcategories', includeHidden: true }),
    ).toHaveAttribute('aria-controls', (await detail.getAttribute('id'))!)
  })

  // Bilal, 2026-08-20: the first nesting attempt gave the parent `col-span-2`,
  // which pushed Surgery & Procedure onto its own full-width row and left the
  // cell beside Patient Therapy & Rehab empty — a conspicuous blank block
  // between Mobility and Hygiene.
  test('the categories grid has no mid-list gap and no truncated label', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'desktop mega-panel only renders at xl and above')

    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: /submenu/i }).first().hover()
    await page.getByRole('link', { name: 'Trocars & Trocar Kits' }).first().waitFor({ state: 'visible' })

    const panel = page.locator('#nav-panel-categories')

    // No grid item spans the full row: a spanning cell was the first cause of
    // the hole (it stranded the cell beside it).
    const spanning = await panel.evaluate((p) =>
      Array.from(p.querySelectorAll('li')).filter((li) => li.className.includes('col-span-2')).length,
    )
    expect(spanning, 'a full-width cell re-creates the Mobility/Hygiene gap').toBe(0)

    // 2026-08-25 nav remediation, fix round (see task-5-report.md): this used
    // to assert the single nested-children group ("Surgery & Procedure", the
    // only category with children at the time) sat LAST in the list, on the
    // theory that only a trailing tall cell could avoid stranding a neighbour.
    // That assumption no longer holds — the nav remediation intentionally
    // gives nearly every primary category its own nested children now (13/13
    // in the current catalog), so "last" is no longer a meaningful position:
    // at most one nested group can structurally be last, and which one is
    // arbitrary. The real invariant "no vertical hole opens up" is what
    // mattered, and that is guarded directly and more robustly by the two
    // checks that bracket this one: no `col-span-2` spanning cell (above) and
    // no >8px gap between consecutive column-1 cells (below). Under plain
    // grid auto-flow with zero manual spans/placement — which is what the
    // "no col-span-2" check confirms is in effect — CSS Grid cannot leave a
    // literal hole in a row-major 2-column layout; cells just pack tightly
    // with uneven heights, which is what was verified live in Chrome for this
    // fix (see task-5-report.md screenshots). So this position assertion is
    // dropped rather than replaced: assertions #1 and #3 already fully cover
    // the "Mobility/Hygiene gap" class of bug for the new multi-child design.

    // No vertical hole: every column-1 cell should butt up against the next.
    const maxGap = await panel.evaluate((p) => {
      const list = p.querySelector('ul')!
      const items = Array.from(list.children).map((li) => li.getBoundingClientRect())
      const left = Math.min(...items.map((r) => Math.round(r.left)))
      const col1 = items.filter((r) => Math.round(r.left) === left).sort((a, b) => a.top - b.top)
      let worst = 0
      for (let i = 1; i < col1.length; i++) worst = Math.max(worst, col1[i].top - col1[i - 1].bottom)
      return Math.round(worst)
    })
    expect(maxGap, 'a vertical hole opened in the first column').toBeLessThanOrEqual(8)

    // Every label fits on one line — no clipped "Housekeeping & Jani…".
    const clipped = await panel.evaluate((p) =>
      Array.from(p.querySelectorAll('a'))
        .filter((a) => a.scrollWidth > a.clientWidth + 1)
        .map((a) => (a.textContent ?? '').trim()),
    )
    expect(clipped, 'nav labels are being truncated').toEqual([])
  })

  // The desktop panel only exists from the xl breakpoint (1280px) up — below
  // that the header swaps to the hamburger drawer — so this is a chromium-only
  // check. The Pixel 7 project never renders the panel to measure.
  test('the dropdown stays fully on screen at every desktop width', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'desktop mega-panel only renders at xl and above')

    // Starts at 1300, not 1280: at exactly the xl breakpoint the scrollbar is
    // counted in the width calc, so the layout viewport lands just below 1280
    // and the header swaps to the hamburger — the panel under test does not
    // render at all. Same pitfall already documented in e2e/contrast.spec.ts.
    for (const width of [1300, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/', { waitUntil: 'domcontentloaded' })
      // Two nav items expose a "… submenu" button (Categories and Home Care),
      // so `.first()` is ambiguous — target the one that controls THIS panel.
      // The mouse is parked first because this loop reuses a single page: after
      // the reload the pointer is still on the trigger, so hover() would move it
      // nowhere and fire no mouseenter.
      await page.mouse.move(0, 0)
      await page.locator('button[aria-controls="nav-panel-categories"]').hover()
      await page.getByRole('link', { name: 'Trocars & Trocar Kits' }).first().waitFor({ state: 'visible' })

      const box = await page.locator('#nav-panel-categories').boundingBox()
      expect(box!.x, `panel clipped left at ${width}`).toBeGreaterThanOrEqual(0)
      expect(box!.x + box!.width, `panel clipped right at ${width}`).toBeLessThanOrEqual(width)
      await expectNoHorizontalOverflow(page, `open categories panel @ ${width}`)
    }
  })

  test('no detached "Trocar Supplies" badge survives in the header nav', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    // Scoped to the header on purpose. "Trocar Supplies" is also a real BRAND
    // (lib/brands.ts) with a logo in the homepage brand marquee and a partner
    // page — that is a different thing and must survive. What must not survive
    // is the nav badge that pointed at the Surgery & Procedure URL under a
    // second name.
    await expect(
      page.getByRole('banner').getByRole('link', { name: 'Trocar Supplies' }),
    ).toHaveCount(0)
  })

  test('the hub lists BOTH Surgery & Procedure and Trocars, each to its own route', async ({ page }) => {
    await page.goto('/categories', { waitUntil: 'domcontentloaded' })
    const surgery = page.getByRole('link', { name: 'Shop Surgery & Procedure' })
    const trocars = page.getByRole('link', { name: 'Shop Trocars & Trocar Kits' })

    await expect(surgery).toHaveCount(1)
    await expect(trocars).toHaveCount(1)
    await expect(surgery).toHaveAttribute('href', SURGERY)
    await expect(trocars).toHaveAttribute('href', TROCARS)
  })

  test('the Trocar hub card reuses the Surgery artwork with its own alt text', async ({ page }) => {
    await page.goto('/categories', { waitUntil: 'domcontentloaded' })
    const srcOf = async (name: string) =>
      page.getByRole('link', { name }).locator('img').first().getAttribute('src')

    const surgerySrc = await srcOf('Shop Surgery & Procedure')
    const trocarSrc = await srcOf('Shop Trocars & Trocar Kits')
    expect(decodeURIComponent(trocarSrc!)).toContain('surgery-procedure-placeholder')
    expect(decodeURIComponent(trocarSrc!)).toBe(decodeURIComponent(surgerySrc!))

    await expect(
      page.getByRole('link', { name: 'Shop Trocars & Trocar Kits' }).getByAltText('Trocars and trocar kits'),
    ).toHaveCount(1)
  })
})

test.describe('P0.1 — You May Also Need renders as spaced cards', () => {
  // Chosen because it reliably carries more than four recommendations.
  const PDP = '/product/aerowalk-ultra-lite-rollator-rolling-walker'

  test('cards do not touch and are real links', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(PDP, { waitUntil: 'domcontentloaded' })

    const row = page.getByRole('region', { name: 'You May Also Need — scrollable product list' })
    if ((await row.count()) === 0) test.skip(true, 'this PDP has 4 or fewer recommendations today')

    const gap = await row.evaluate((el) => getComputedStyle(el).columnGap)
    expect(parseFloat(gap)).toBeGreaterThan(8)

    const cards = row.locator('> div')
    const n = await cards.count()
    expect(n).toBeGreaterThan(0)

    // Adjacent cards must have a real horizontal gap between their boxes.
    if (n > 1) {
      const boxes = await cards.evaluateAll((els) =>
        els.map((e) => e.getBoundingClientRect()).map((r) => ({ left: r.left, right: r.right })),
      )
      for (let i = 1; i < boxes.length; i++) {
        expect(boxes[i].left - boxes[i - 1].right).toBeGreaterThan(4)
      }
    }

    await expect(row.locator('a').first()).toHaveAttribute('href', /^\/product\//)
  })

  test('each card is one link with no nested interactive element', async ({ page }) => {
    await page.goto(PDP, { waitUntil: 'domcontentloaded' })
    const row = page.getByRole('region', { name: 'You May Also Need — scrollable product list' })
    if ((await row.count()) === 0) test.skip(true, 'no overflow row on this PDP today')

    const invalid = await row.evaluate((el) =>
      Array.from(el.querySelectorAll('a')).filter((a) => a.querySelector('a, button')).length,
    )
    expect(invalid).toBe(0)
  })

  test('a card click-through reaches the product page', async ({ page }) => {
    await page.goto(PDP, { waitUntil: 'domcontentloaded' })
    const row = page.getByRole('region', { name: 'You May Also Need — scrollable product list' })
    if ((await row.count()) === 0) test.skip(true, 'no overflow row on this PDP today')

    const first = row.locator('a').first()
    const href = await first.getAttribute('href')
    await first.click()
    await page.waitForURL(`**${href}`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })
})

test.describe('responsive — no horizontal overflow on the repaired routes', () => {
  const PATHS = ['/categories', SURGERY, TROCARS]
  for (const path of PATHS) {
    for (const vp of VIEWPORTS) {
      test(`${path} @ ${vp.name}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.w, height: vp.h })
        await page.goto(path, { waitUntil: 'domcontentloaded' })
        // Bounded: with 18 viewport permutations running in parallel against
        // one server, 'networkidle' can simply never settle and eats the whole
        // 30s test timeout before the catch ever runs. Layout is measurable as
        // soon as CSS has applied, so a short bounded settle is enough.
        await page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {})
        await expectNoHorizontalOverflow(page, `${path} @ ${vp.name}`)
      })
    }
  }
})

test.describe('P0.7 — redirect integrity', () => {
  const CASES = [
    { from: '/collections/surgery-procedure', to: SURGERY },
    { from: '/collections/trocars-trocar-kits', to: TROCARS },
    { from: '/collections/surgery-procedure?sort=PRICE_ASC', to: `${SURGERY}?sort=PRICE_ASC` },
  ]

  for (const { from, to } of CASES) {
    test(`${from} → ${to} in one hop`, async ({ request }) => {
      const res = await request.get(from, { maxRedirects: 0 })
      expect(res.status()).toBe(301)
      expect(res.headers()['location']).toContain(to.split('?')[0])

      const followed = await request.get(from)
      expect(followed.status()).toBe(200)
      expect(new URL(followed.url()).pathname + new URL(followed.url()).search).toBe(to)
    })
  }

  test('legacy AeroWalk handle redirects under BOTH route shapes', async ({ request }) => {
    const canonical = '/product/aerowalk-ultra-lite-rollator-rolling-walker'
    for (const from of [
      `${canonical}-blue`,
      '/category/mobility/aerowalk-ultra-lite-rollator-rolling-walker-blue',
      '/category/surgery-procedure/aerowalk-ultra-lite-rollator-rolling-walker-blue',
    ]) {
      const res = await request.get(from, { maxRedirects: 0 })
      expect(res.status(), from).toBe(301)
      expect(res.headers()['location'], from).toContain(canonical)
    }
  })

  test('canonical destinations do not redirect again (no chain, no loop)', async ({ request }) => {
    for (const path of [SURGERY, TROCARS]) {
      const res = await request.get(path, { maxRedirects: 0 })
      expect(res.status(), path).toBe(200)
    }
  })
})
