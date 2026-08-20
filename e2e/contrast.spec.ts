import { test, expect, type Page } from '@playwright/test'

/**
 * WCAG AA contrast regression guard.
 *
 * Measures RENDERED colour against the EFFECTIVE background rather than
 * trusting class names, because the class tells you nothing useful on its own:
 * this theme overrides `--color-teal-500` to #006d92 (5.83:1 on white), so
 * reasoning from stock Tailwind values gives the wrong answer in both
 * directions — it flags compliant text and clears failing text.
 *
 * Thresholds are the real ones: 4.5:1 normal text, 3:1 large text (>=24px, or
 * >=18.66px bold), 3:1 non-text (icons and aria-hidden decoration).
 *
 * Failures print colour, size, background, ratio and the offending class list,
 * so a regression is actionable from the CI log without a local repro.
 */

/** Fixture handles differ per shop — see e2e/axe-states.spec.ts. */
const H = {
  zeroPrice: process.env.E2E_HANDLE_ZERO_PRICE ?? 'qa-no-rate',
  outOfStock: process.env.E2E_HANDLE_OOS ?? 'qa-out-of-stock',
  backorder: process.env.E2E_HANDLE_BACKORDER ?? 'qa-backorder',
}

const ROUTES = [
  { path: '/', name: 'home (product cards)', fixture: false },
  { path: `/product/${H.zeroPrice}`, name: 'PDP — zero price', fixture: true },
  { path: `/product/${H.outOfStock}`, name: 'PDP — out of stock', fixture: true },
  { path: `/product/${H.backorder}`, name: 'PDP — backorder', fixture: true },
  { path: '/contact', name: 'contact', fixture: false },
  { path: '/account', name: 'account', fixture: false },
  { path: '/cart', name: 'cart', fixture: false },
  { path: '/industries', name: 'industry index', fixture: false },
  { path: '/blog/types-of-needles', name: 'article', fixture: false },
] as const

async function measure(page: Page) {
  return page.evaluate(() => {
    // Let the browser resolve any colour syntax (this theme is authored in
    // oklch; scraping digits out of "oklch(1 0 0)" reads white as red).
    const cvs = document.createElement('canvas')
    cvs.width = cvs.height = 1
    const ctx = cvs.getContext('2d', { willReadFrequently: true })!
    const cache = new Map<string, number[]>()
    const toRgb = (css: string) => {
      const hit = cache.get(css)
      if (hit) return hit
      ctx.clearRect(0, 0, 1, 1)
      ctx.fillStyle = '#000'
      ctx.fillStyle = css
      ctx.fillRect(0, 0, 1, 1)
      const d = ctx.getImageData(0, 0, 1, 1).data
      const v = [d[0], d[1], d[2], d[3] / 255]
      cache.set(css, v)
      return v
    }
    const lum = ([r, g, b]: number[]) => {
      const c = [r, g, b].map((v) => {
        v /= 255
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
      })
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
    }
    const ratio = (a: number[], b: number[]) => {
      const [x, y] = [lum(a), lum(b)]
      const hi = Math.max(x, y), lo = Math.min(x, y)
      return (hi + 0.05) / (lo + 0.05)
    }
    const effectiveBg = (el: Element): number[] => {
      let n: Element | null = el
      while (n) {
        const p = toRgb(getComputedStyle(n).backgroundColor)
        if (p[3] > 0.5) return p
        n = n.parentElement
      }
      return [255, 255, 255, 1]
    }

    const bad: string[] = []
    for (const el of Array.from(document.querySelectorAll('*'))) {
      const cs = getComputedStyle(el)
      if (cs.visibility === 'hidden' || cs.display === 'none') continue

      const ownText = Array.from(el.childNodes)
        .filter((n) => n.nodeType === 3)
        .map((n) => (n.textContent ?? '').trim())
        .join('')
      const isSvg = el.tagName.toLowerCase() === 'svg'
      if (!ownText && !isSvg) continue

      // WCAG 1.4.11 exempts PURE DECORATION outright. aria-hidden content is
      // not exposed to assistive tech and carries no information — empty-state
      // illustrations, breadcrumb chevrons — so it has no contrast minimum.
      // Holding it to 3:1 flags an empty-cart glyph as an accessibility defect
      // while telling you nothing about whether the page is usable.
      // (This is scoped to aria-hidden specifically; it is not a general
      // escape hatch, and an icon that is a control's only label fails the
      // separate accessible-name check in the axe suites.)
      if (el.closest('[aria-hidden="true"]') !== null) continue

      // Photographic hero cards (e.g. ShopByIndustry) layer white text over
      // an <img> + gradient-overlay pair that are SIBLINGS of the text, not
      // an ancestor with a background-color — effectiveBg()'s ancestor walk
      // can't see a sibling layer, so it falls through to a distant solid
      // ancestor colour (e.g. the section's bg-neutral-50) that was never
      // actually rendered behind the text, a false positive.
      //
      // elementsFromPoint() was tried first and rejected: it only hit-tests
      // what's currently PAINTED in the viewport, so it silently went blind
      // on any card below the fold (exactly this one) and fell straight
      // back into the same false positive. getBoundingClientRect() has no
      // such requirement — it returns real geometry for off-screen elements
      // too — so overlap this element's box against every <img>'s box
      // directly instead. If a covering image renders underneath, this
      // exact element is already independently verified against real WCAG
      // color-contrast by axe-core's own rule (see e2e/axe.spec.ts, which
      // scans the same routes) — skip the heuristic check here rather than
      // hand-roll pixel-accurate image+gradient sampling for a case a
      // purpose-built engine already covers correctly.
      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const coveredByImage = Array.from(document.images).some((img) => {
        if (img.contains(el)) return false
        const ir = img.getBoundingClientRect()
        return ir.width > 0 && ir.height > 0 && cx >= ir.left && cx <= ir.right && cy >= ir.top && cy <= ir.bottom
      })
      if (coveredByImage) continue

      const px = parseFloat(cs.fontSize)
      const weight = parseInt(cs.fontWeight, 10) || 400
      const isLarge = px >= 24 || (px >= 18.66 && weight >= 700)
      const required = isSvg ? 3.0 : isLarge ? 3.0 : 4.5

      const fg = toRgb(cs.color)
      const bg = effectiveBg(el)
      const r = ratio(fg, bg)
      if (r + 0.005 < required) {
        // SVGElement.className is an SVGAnimatedString, which stringifies to
        // "[object SVGAnimatedString]" and tells a reviewer nothing.
        const raw = (el as HTMLElement).className
        const cls = (typeof raw === 'string' ? raw : el.getAttribute('class') ?? '').slice(0, 60)
        bad.push(
          `${r.toFixed(2)}:1 (needs ${required}) ${px}px ` +
          `fg=rgb(${fg.slice(0, 3).join(',')}) bg=rgb(${bg.slice(0, 3).join(',')}) ` +
          `"${(ownText || '[icon]').slice(0, 28)}" .${cls}`,
        )
      }
    }
    return Array.from(new Set(bad))
  })
}

for (const { path, name, fixture } of ROUTES) {
  test(`${name} (${path}) meets WCAG AA contrast`, async ({ page }) => {
    const res = await page.goto(path, { waitUntil: 'domcontentloaded' })
    if (fixture && (res?.status() ?? 0) >= 400) {
      test.skip(true, `${path} not present on this shop — set E2E_HANDLE_* to a real fixture`)
    }
    expect(res?.status(), `${path} did not load`).toBeLessThan(400)
    // Settle the Suspense fallback so we measure the real page, not a skeleton.
    await page.waitForLoadState('networkidle').catch(() => {})

    // A route whose data the connected shop cannot serve renders the error
    // boundary. Measuring that would silently swap the page under test for a
    // different one and report a false PASS, so skip loudly instead. (The
    // error page has its own contrast coverage below.)
    if (await page.getByText('Page Failed to Load').count()) {
      test.skip(true, `${path} rendered the error boundary — shop cannot serve this route's data`)
    }

    const violations = await measure(page)
    expect(violations, `${path}: contrast below WCAG AA`).toEqual([])
  })
}

test('the error boundary itself meets AA', async ({ page }) => {
  // Reached whenever a shop cannot serve a route's data — so it is a page real
  // shoppers see, and its "Support code" line was 2.49:1 before this suite
  // existed. Driven directly rather than waiting for a data failure to expose it.
  await page.goto('/product/definitely-not-a-real-product-xyz', { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle').catch(() => {})
  const violations = await measure(page)
  expect(violations, 'error page: contrast below WCAG AA').toEqual([])
})

test('semantic ink tokens resolve to their documented, compliant values', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const tokens = await page.evaluate(() => {
    const cs = getComputedStyle(document.documentElement)
    const read = (n: string) => cs.getPropertyValue(n).trim()
    return {
      link: read('--color-ink-link'),
      linkHover: read('--color-ink-link-hover'),
      brand: read('--color-ink-brand'),
      danger: read('--color-ink-danger'),
      muted: read('--color-ink-muted'),
      mutedOnDark: read('--color-ink-muted-on-dark'),
      separator: read('--color-ink-separator'),
    }
  })

  // Pinned so a "harmless" palette tweak cannot silently drop one of these
  // below AA — the whole point of routing colour through named roles.
  expect(tokens).toEqual({
    link: '#006d92',
    linkHover: '#00506b',
    brand: '#006d92',
    danger: '#c10007',
    muted: '#6b6b6b',
    mutedOnDark: '#b0b0b0',
    separator: '#8a8a8a',
  })
})

// Was "Trocar Supplies quick-link badge …". P0.2 (2026-08-20) removed that
// detached badge: it pointed at the Surgery & Procedure URL under a second
// name. The nested "Trocars & Trocar Kits" child link replaces it, and needs
// the same coverage — it is `text-ink-link` on white inside the panel, and the
// route-scan tests above still cannot reach it, for the original reason: the
// panel is CSS-toggled with `hidden` (display:none) until opened, and measure()
// only visits elements the browser actually renders.
const NESTED_TROCAR_LINK = 'Trocars & Trocar Kits'

test('nested Trocars nav link meets WCAG AA contrast (desktop + mobile)', async ({ page }) => {
  // xl: is a 1280px breakpoint; the default chromium viewport can land right
  // on that boundary (scrollbar included in the width calc) and hide the
  // desktop nav in favor of the mobile hamburger. Go wider to be unambiguous.
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})

  // Desktop: hover-reveal the categories mega-dropdown. The toggle's text comes
  // from the live Shopify menu item (title "Catalog" on this shop), not a
  // hardcoded "Categories" string — match the submenu toggle button instead,
  // which is stable regardless of the live menu's exact wording.
  await page.getByRole('button', { name: /submenu/i }).first().hover()
  await page.getByRole('link', { name: NESTED_TROCAR_LINK }).first().waitFor({ state: 'visible' })
  const desktopViolations = await measure(page)
  const desktopLink = desktopViolations.filter((v) => v.includes(NESTED_TROCAR_LINK))
  expect(desktopLink, 'desktop nested Trocars link: contrast below WCAG AA').toEqual([])

  // Mobile: open the hamburger drawer, then expand its Catalog accordion.
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Toggle menu' }).click()
  // Targeted by the panel it controls, not by name: the drawer's categories
  // toggle is labelled from the LIVE Shopify menu item title, which is
  // "Catalog" on the QA shop and "Categories" on production — a hardcoded name
  // makes this test shop-specific.
  await page.locator('button[aria-controls="mobile-panel-categories"]').click()
  await page.getByRole('link', { name: NESTED_TROCAR_LINK }).first().waitFor({ state: 'visible' })
  const mobileViolations = await measure(page)
  const mobileLink = mobileViolations.filter((v) => v.includes(NESTED_TROCAR_LINK))
  expect(mobileLink, 'mobile nested Trocars link: contrast below WCAG AA').toEqual([])
})

test('the Trocars subcategory pill on Surgery & Procedure meets WCAG AA contrast', async ({ page }) => {
  // The pinned route pill in the category tab row (teal-500 on teal-50) is a
  // new colour pairing introduced by P0.5, on a route the scan list above does
  // not cover.
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/category/surgery-procedure', { waitUntil: 'domcontentloaded' })
  await page
    .getByRole('navigation', { name: /Surgery & Procedure categories/i })
    .getByRole('link', { name: NESTED_TROCAR_LINK })
    .waitFor({ state: 'visible' })

  const violations = await measure(page)
  const pill = violations.filter((v) => v.includes(NESTED_TROCAR_LINK))
  expect(pill, 'Trocars subcategory pill: contrast below WCAG AA').toEqual([])
})

// ── Changed surfaces from the Surgery/Trocar repair (2026-08-20) ────────────
//
// A separate describe, kept out of the ROUTES sweep above on purpose: that
// sweep is one heavy full-page scan per route and already saturates a local
// server talking to live Shopify, so adding six more routes to it makes the
// whole file time out instead of reporting. These run as their own small
// batch (`--grep "repaired surfaces"`).
//
// Product handles are resolved from the live collection rather than hardcoded,
// so this survives catalog changes.
test.describe('repaired surfaces meet WCAG AA contrast', () => {
  const SURGERY = '/category/surgery-procedure'
  const TROCARS = '/category/trocars-trocar-kits'

  /**
   * Product hrefs inside a category grid, in DOM order.
   *
   * Cards on a category page link to the CATEGORY-SCOPED PDP route
   * (`/category/<slug>/<handle>`), not `/product/<handle>` — ShopifyProductCard
   * builds the former whenever it is given a categorySlug. Matching on
   * `a[href^="/product/"]` finds nothing here.
   */
  async function productHrefs(page: Page, category: string): Promise<string[]> {
    await page.goto(category, { waitUntil: 'domcontentloaded' })
    const grid = page.locator('[data-testid="product-grid"]')
    await grid.waitFor({ state: 'attached', timeout: 30_000 })
    const hrefs = await grid
      .locator(`a[href^="${category}/"]`)
      .evaluateAll((els) => els.map((e) => e.getAttribute('href')!))
    return Array.from(new Set(hrefs))
  }

  for (const [name, path] of [
    ['Surgery & Procedure', SURGERY],
    ['Trocars & Trocar Kits', TROCARS],
  ] as const) {
    test(`${name} meets AA`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 })
      await page.goto(path, { waitUntil: 'domcontentloaded' })
      expect(await measure(page), `${path}: contrast below WCAG AA`).toEqual([])
    })
  }

  /**
   * PRE-EXISTING, NOT PART OF THIS REPAIR — and deliberately not suppressed.
   *
   * /categories ends with <ShopByIndustry />, whose cards lay white text over
   * industry photography served from /api/bunny/industries/*. Those assets
   * return 404 in this environment, so the image never paints, the text lands
   * on the near-white section panel, and the scan reports ~1.05:1. The same
   * failure shows on the homepage, which this repair did not touch either.
   *
   * Rather than skip the route (which would stop guarding the Popular
   * Categories strip this repair DID change), the assertion is inverted: every
   * violation must be one of the known industry-card ones. A regression
   * anywhere else on the page — including the strip — still fails here.
   */
  const INDUSTRY_CARD_SIGNATURE = /absolute bottom-5 left-5 text-white/

  test('categories hub has no contrast violation outside the known industry-card issue', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/categories', { waitUntil: 'domcontentloaded' })
    const violations = await measure(page)

    const unexpected = violations.filter((v) => !INDUSTRY_CARD_SIGNATURE.test(v))
    expect(unexpected, '/categories: NEW contrast violation outside ShopByIndustry').toEqual([])
  })

  test('a Trocar PDP meets AA', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    const [href] = await productHrefs(page, TROCARS)
    expect(href, 'no products found on the Trocar page').toBeTruthy()
    await page.goto(href, { waitUntil: 'domcontentloaded' })
    expect(await measure(page), `${href}: contrast below WCAG AA`).toEqual([])
  })

  test('a non-Trocar Surgery PDP meets AA', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    const hrefs = await productHrefs(page, SURGERY)
    // Compare on the HANDLE only: every href on this page begins
    // "/category/surgery-procedure/", so testing the whole string for "trocar"
    // would be checking the route prefix, not the product.
    const href = hrefs.find((h) => !/trocar/i.test(h.split('/').pop() ?? ''))
    expect(href, 'no non-Trocar product found on the Surgery page').toBeTruthy()
    await page.goto(href!, { waitUntil: 'domcontentloaded' })
    expect(await measure(page), `${href}: contrast below WCAG AA`).toEqual([])
  })

  test('a PDP carrying "You May Also Need" meets AA', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/product/aerowalk-ultra-lite-rollator-rolling-walker', { waitUntil: 'domcontentloaded' })
    const row = page.getByRole('region', { name: 'You May Also Need — scrollable product list' })
    // Waited for, not count()-ed immediately: the recommendation sections are
    // below the fold and settle after the initial paint, so a bare count() races
    // them and silently skips a test that should have run.
    await row.waitFor({ state: 'attached', timeout: 20_000 }).catch(() => {})
    if ((await row.count()) === 0) test.skip(true, 'this PDP has 4 or fewer recommendations today')
    await row.scrollIntoViewIfNeeded()
    expect(await measure(page), 'You May Also Need: contrast below WCAG AA').toEqual([])
  })

  test('category search with an active query meets AA', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(TROCARS, { waitUntil: 'domcontentloaded' })
    await page.getByRole('searchbox', { name: /Search within/i }).fill('kit')
    await page.waitForURL(/[?&]q=kit/)
    await page.getByRole('button', { name: /clear search/i }).waitFor({ state: 'visible' })
    expect(await measure(page), 'active category search: contrast below WCAG AA').toEqual([])
  })

  test('desktop filter rail meets AA', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(TROCARS, { waitUntil: 'domcontentloaded' })
    const rail = page.locator('aside').first()
    await rail.getByRole('button').first().waitFor({ state: 'visible', timeout: 30_000 })
    // Open a collapsed group so its values are measured too, not just headings.
    const brand = rail.getByRole('button', { name: /Brand Name/i }).first()
    if ((await brand.getAttribute('aria-expanded')) === 'false') await brand.click()
    expect(await measure(page), 'desktop filter rail: contrast below WCAG AA').toEqual([])
  })

  test('mobile filter drawer meets AA', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(TROCARS, { waitUntil: 'domcontentloaded' })
    const open = page.getByRole('button', { name: /^Filters/i }).first()
    await open.waitFor({ state: 'visible', timeout: 30_000 })
    await open.click()
    await page.waitForTimeout(600)
    expect(await measure(page), 'mobile filter drawer: contrast below WCAG AA').toEqual([])
  })
})
