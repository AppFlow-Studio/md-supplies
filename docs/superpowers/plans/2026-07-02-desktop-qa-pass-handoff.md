# Desktop/Laptop QA Pass — Handoff (2026-07-02)

Ticket: P2 QA/CRO pass across desktop/laptop widths (1280/1366/1440/1536/1920)
and browser zoom (80/100/125/150%), verifying mobile still works. Sign-off
with Temur before the client link goes out.

Scope agreed with user: **representative sweep**, not full 200-shot matrix —
5-width sweep at 100% zoom across core pages, plus zoom spot-checks
(80/125/150%) at the two extreme widths (1280, 1920) only. Fix straightforward
layout bugs as found; flag anything ambiguous/asset-level instead of guessing.

Branch: `sardor-dev`. Dev server: `npm run dev` (localhost:3000). No commits
made — everything below is still in the working tree.

## Pre-existing uncommitted work (not mine — leave alone)

This was already modified/untracked when I started (someone's in-progress
product-card-hover-quick-add feature). Don't touch or attribute to QA:

- `app/partners/page.tsx`, `components/b2b/ManufacturersGrid.tsx`,
  `components/category/CategoryFilters.tsx`, `components/category/CategorySort.tsx`,
  `components/store/ShopifyProductCard.tsx`, `components/store/ShopifyQuickAddButton.tsx`
- `docs/superpowers/plans/2026-06-17-priority-11-implementation.md`,
  `docs/superpowers/specs/2026-06-17-priority-11-design.md`
- `public/images/partners.png` (added)
- `docs/superpowers/plans/2026-07-02-product-card-hover-quick-add.md` (new)
- `lib/category-images.ts` (new) — WIP infra for category hero images, not
  wired up yet, unrelated to this ticket.

## Fixes made this session (uncommitted, ready to review)

1. **`components/category/CategoryResults.tsx`** — desktop filter `<aside>`
   (line ~93) was `sticky top-[140px]` with no height cap. Gloves-style
   categories have 10+ filter groups all default-open, making the sidebar
   ~5500px tall — far taller than the 3-row product grid. Since the parent
   is a flex row (`items-start`), the row stretched to match, leaving a
   massive dead white gap between pagination and "Related Categories" below
   it (confirmed via DOM measurement, not just a screenshot guess). Fixed by
   adding `max-h-[calc(100vh-160px)] overflow-y-auto` so the sidebar scrolls
   independently instead of forcing document height. Page height dropped
   from ~7500px to ~3650px at 1920 width; gap is gone at all 5 widths tested.

2. **`app/search/page.tsx`** — identical bug, identical fix, on the
   `/search` results sidebar (line ~142). Same `sticky top-[140px]` → added
   `max-h-[calc(100vh-160px)] overflow-y-auto`.

3. **`components/brand/BrandGrid.tsx`** — removed a stray `console.log(groups)`
   debug leftover (was firing on every render of the Partners page brand
   grid). Pure cleanup, unrelated to layout.

`components/category/CategoryResultsSkeleton.tsx` has the same sidebar
pattern but its skeleton content is short (5 fake groups) — never tall
enough to trigger the bug, so I left it alone.

## Real bug found, NOT fixed — needs asset fix, not code

**`/partners` page: 4 brand logos are invisible (white-on-white).** Confirmed
via DOM (`naturalWidth > 0`, `complete: true` — they load fine) but they
render nothing because their SVG source files use `fill:#FFFFFF` as their
*only* color, sitting on the white tile background:

- Aspen Surgical (`aspen-surgical.svg`)
- Bionix (`bionix.svg`)
- Lumex (`lumex.svg`)
- TIDI Products (`tidi-products.svg`)

Checked all 32 SVG brand logos on the page for this pattern — these 4 are
the only ones with an exclusively-white fill (a few others mix white with a
real color and are fine, e.g. myco-medical, owen-mumford, welch-allyn).
This is very likely dark-background logo variants uploaded to BunnyCDN by
mistake. Not something to patch in code (a blanket CSS fix like inverting
colors would break the correctly-colored logos). Needs the source SVGs
re-exported/replaced by whoever manages the brand asset library — the
`lib/category-images.ts` comment names "Deepika" as the asset contact for
category images, possibly the same contact for brand logos. **Flag to
Temur/client before sign-off**, this reads as a "broken image" per the
ticket's acceptance criteria.

## Confirmed NOT bugs (investigated and ruled out — don't re-litigate)

- **Big blank sections in early homepage screenshots** — Playwright's
  full-page screenshot auto-stitch doesn't reliably trigger the
  `framer-motion whileInView` scroll animations used site-wide
  (`components/ui/FadeIn.tsx`, `WhyChooseUs`, `ShopByIndustry`, etc.) before
  capturing. Not a real bug — confirmed by manually scrolling first. Fixed
  my own screenshot methodology (incremental `scrollTo` loop before
  capture), not the app.
- **"Duplicated" sticky header in full-page screenshots** — `Header.tsx` is
  `sticky top-0`; Playwright's screenshot stitching captures it twice at the
  seam. Screenshot artifact only, not a real rendering bug.
- **CSS `document.documentElement.style.zoom` is NOT equivalent to real
  browser zoom** — it scales rendering but does NOT shrink
  `window.innerWidth`, so Tailwind media-query breakpoints never reflow,
  causing false "content missing" results (e.g. hero product grid appearing
  to vanish at 150% zoom). Real browser zoom (Ctrl+/-) does shrink the
  effective CSS-px viewport. Correct emulation: set
  `viewport.width = physicalWidth / zoomFactor` (+ `deviceScaleFactor: zoom`).
  This is what the QA script now does. With the corrected method, zoom
  behavior across all tested pages/widths was clean — breakpoints reflow
  properly, no overlap or missing content.
- **OCC hero image appearing to bleed off the right edge at 1280–1440px** —
  intentional: `components/b2b/AnimatedOCCHeroSection.tsx` line ~63 has
  `lg:max-[1449px]:-mr-14 overflow-hidden`, a deliberate edge-bleed design
  for that width range. Contained, no real horizontal overflow
  (`scrollWidth === clientWidth` confirmed).
- **`/product/nitrile-exam-gloves-powder-free` 404s** — this is the
  hardcoded PDP handle in `e2e/routes.spec.ts` and `e2e/visual.spec.ts`.
  It's stale/outdated store data, not a live-site bug — but it likely means
  those two e2e tests are currently failing/red. Worth a heads-up to
  whoever owns e2e, separate from this ticket. I used a real handle instead:
  `/product/100-nitrile-exam-gloves-pf-text-finger-cobalt-blue-small`.

## What's actually been reviewed vs. just captured

Screenshots exist (were in the session's temp scratchpad, **not saved
anywhere persistent — will need to be regenerated tomorrow**, see script
below) for:

- **Widths sweep** (100% zoom): home, /categories, /category/gloves, PDP,
  /solutions/occ, /partners, /search × all 5 widths (1280/1366/1440/1536/1920).
  **Closely reviewed:** 1280 and 1920 for every page above (the two
  extremes). **Not yet individually reviewed:** 1366, 1440, 1536 — captured
  but not eyeballed. Given 1280 and 1920 were clean and the site uses
  standard Tailwind breakpoints (no weird one-off widths in between), these
  three are low-risk, but should still be spot-checked before sign-off.
- **Zoom spot-check** (1280 & 1920 physical × 80/125/150%, corrected
  effective-viewport method): all 7 pages captured. **Reviewed:** home and
  category-gloves at z150 both widths, occ at z150/w1280, home at z80/w1920
  — all clean. **Not yet reviewed:** partners, search, pdp, categories at
  the remaining zoom combos.
- **Mobile spot-check (task incomplete)** — was about to run
  (`node qa-sweep.js mobile`, 390px viewport) when this session ended.
  Not started.

## Remaining tasks (in order)

1. Regenerate screenshots (script below) — mobile spot-check first
   (390px width: home, /categories, /category/gloves, PDP, /solutions/occ,
   /partners, /search — verify browsing/filtering/PDP/cart still work).
2. Review the not-yet-reviewed width (1366/1440/1536) and zoom combos above.
3. Check header/footer, search dropdown, cart drawer, and pagination
   controls specifically at each width (only spot-checked inline as part of
   full-page shots so far, not interacted with individually except once).
4. Fix anything else found; re-screenshot to confirm.
5. Write up final QA findings (screenshots + issue list) for Temur sign-off,
   per the ticket's "QA Screenshot Evidence" section.
6. Once satisfied, this needs to run again against the **Vercel preview**
   (per the ticket's dependency note — P0-1 must be deployed first), not
   just local dev, before sign-off.

## Playwright QA script (recreate from scratch — scratchpad didn't persist)

Run from repo root with `NODE_PATH` pointing at the project's `node_modules`
(the project's `@playwright/test` dependency, not a global install):

```bash
NODE_PATH="<repo-root>/node_modules" node qa-sweep.js widths   # 5 widths x 100% zoom
NODE_PATH="<repo-root>/node_modules" node qa-sweep.js zoom     # 1280/1920 x 80/125/150%
NODE_PATH="<repo-root>/node_modules" node qa-sweep.js mobile   # 390px
NODE_PATH="<repo-root>/node_modules" node qa-sweep.js interactions  # cart drawer, sort dropdown
```

```javascript
// qa-sweep.js
const { chromium } = require('playwright')
const path = require('path')

const BASE = 'http://localhost:3000'
const OUT = path.join(__dirname, 'shots') // mkdir this first

const PAGES = [
  { path: '/', name: 'home' },
  { path: '/categories', name: 'categories' },
  { path: '/category/gloves', name: 'category-gloves' },
  { path: '/product/100-nitrile-exam-gloves-pf-text-finger-cobalt-blue-small', name: 'pdp' },
  { path: '/solutions/occ', name: 'occ' },
  { path: '/partners', name: 'partners' },
  { path: '/search?q=gloves', name: 'search' },
]

const WIDTHS = [1280, 1366, 1440, 1536, 1920]
const ZOOM_WIDTHS = [1280, 1920]
const ZOOMS = [0.8, 1.25, 1.5]

async function shootPage(page, name) {
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
  // Manually scroll like a real user so scroll-triggered (framer-motion whileInView)
  // sections actually mount before the full-page screenshot stitches them in.
  const height = await page.evaluate(() => document.body.scrollHeight)
  for (let y = 0; y < height; y += 300) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y)
    await page.waitForTimeout(120)
  }
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(300)
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true })
}

async function run() {
  const mode = process.argv[2] || 'widths'
  const browser = await chromium.launch()

  if (mode === 'widths') {
    for (const width of WIDTHS) {
      const context = await browser.newContext({ viewport: { width, height: 1000 } })
      const page = await context.newPage()
      const consoleErrors = []
      page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })
      for (const p of PAGES) {
        await page.goto(BASE + p.path, { waitUntil: 'domcontentloaded' })
        await shootPage(page, `w${width}-${p.name}`)
      }
      if (consoleErrors.length) console.log(`[w${width}] console errors:`, consoleErrors.slice(0, 5))
      await context.close()
    }
  } else if (mode === 'zoom') {
    // Real browser page-zoom (Ctrl+/-) shrinks the *effective CSS-px viewport* that
    // media queries see - unlike the CSS `zoom` property, which only scales rendering
    // and leaves window.innerWidth unchanged. Emulate it by setting the viewport to
    // physicalWidth / zoomFactor, which reproduces the actual breakpoint behavior.
    for (const width of ZOOM_WIDTHS) {
      for (const zoom of ZOOMS) {
        const effectiveWidth = Math.round(width / zoom)
        const context = await browser.newContext({
          viewport: { width: effectiveWidth, height: 1000 },
          deviceScaleFactor: zoom,
        })
        const page = await context.newPage()
        for (const p of PAGES) {
          await page.goto(BASE + p.path, { waitUntil: 'domcontentloaded' })
          await shootPage(page, `w${width}-z${Math.round(zoom * 100)}-${p.name}`)
        }
        await context.close()
      }
    }
  } else if (mode === 'mobile') {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const page = await context.newPage()
    for (const p of PAGES) {
      await page.goto(BASE + p.path, { waitUntil: 'domcontentloaded' })
      await shootPage(page, `mobile-${p.name}`)
    }
    await context.close()
  } else if (mode === 'interactions') {
    // cart drawer, filters, sort, pagination at desktop width
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
    const page = await context.newPage()

    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: /cart/i }).first().click().catch(() => {})
    await page.waitForTimeout(500)
    await shootPage(page, 'w1440-cart-open')

    await page.goto(BASE + '/category/gloves', { waitUntil: 'domcontentloaded' })
    await shootPage(page, 'w1440-category-filters-sort')
    const sortTrigger = page.locator('[data-testid*="sort" i], button:has-text("Sort")').first()
    await sortTrigger.click({ timeout: 3000 }).catch(() => {})
    await page.waitForTimeout(300)
    await shootPage(page, 'w1440-category-sort-open')

    await context.close()
  }

  await browser.close()
  console.log('done:', mode)
}

run().catch((e) => { console.error(e); process.exit(1) })
```

To find a valid product handle for the PDP route if the store catalog
changes again: navigate to any category page and grep rendered `<a
href="/product/...">` or `href="/category/<slug>/..."` links via Playwright
(curl won't work — product links are streamed in via a Suspense boundary,
not present in the initial HTML response).
