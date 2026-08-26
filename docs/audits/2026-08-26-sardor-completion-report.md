# Sardor — Headless Category & Navigation Remediation: Completion Report

**Ticket:** `MDSupplies_Sardor_Headless_Category_Navigation_Remediation_2026-08-24.md`
**Branch:** `catalog-cro-review`
**HEAD at time of this report:** `7111761`
**Verification run today:** `npx tsc --noEmit` — clean · `npm test` — 153/153 test files, 1652/1652 tests passing · working tree clean

---

## Summary

All 11 codebase-owned tasks in the ticket are implemented, tested, and documented. One item remains open by design: the shared production-data QA pass with Izzy (this branch's audit data is QA-store only, ~1,100 products, vs. production's ~7,000+).

---

## P0 — Navigation

### 1. Restore the Mobility dropdown/subcategories — ✅ Done (two separate nav surfaces, both now fixed)

**Commits:** `633c893`, plus a second fix in `components/layout/Header.tsx` (this pass, 2026-08-26)

This header actually has two independent nav surfaces, and the first fix wave only reached one of them:

- **The "Categories" mega-dropdown** (`categoriesItem`) — fixed in `633c893`. Root cause: the nav moved off the old handle-prefix convention on 2026-06-08 and was never rewired to the tag-derived L2 tree that already powered the in-page subcategory list. Wired Header/Footer through `buildCategoryTreeNav`, fail-soft per the root layout's existing convention. Also extended the "More Categories" column (Home Care, Bariatric, etc.) to render nested children. A real regression was caught and fixed in the same commit: a `col-start-1` CSS hack built for one old outlier collapsed the 2-column grid into a single column once most categories carried children — fixed by removing the hack, capping children per cell at 3, and adding `max-h-[80vh] overflow-y-auto` as a fallback.
- **The flat top-level shortcut row** (Categories / OCC / Gloves / Home Care / Mobility / Needles·Syringes / Testing & Screening — `otherItems`) — **not touched by `633c893`, and this is what the client's Vercel-preview screenshot showed missing Mobility's dropdown.** Root cause: this row's dropdown chevron and contents came straight from `item.items`, i.e. whatever sub-links are nested under that entry in **Shopify Admin → Online Store → Navigation → main menu** (`app/layout.tsx`'s `GET_MENU` fetch, handle `main-menu`). Home Care had sub-links configured there; Mobility didn't — a second, untested data source independent of the tag-derived tree, and exactly the "category data source mismatch" the ticket asked to check for. Fixed by making this row's dropdown content come from the same `navChildren()` tag-derived tree as the mega-menu (both desktop and mobile), so a shortcut's dropdown is deterministic and no longer depends on a content editor separately maintaining Shopify's Navigation menu. `Header.test.tsx` gained two regression tests locking this in (`Header — otherItems dropdown is tag-derived, not menu-item-derived`) plus fixture updates elsewhere that had baked in the old menu-item-derived behavior. Full suite re-verified green after the change (153/153 files, 1654/1654 tests, tsc clean, lint clean).

### 2. Audit every top-level department — ✅ Done

**Doc:** `docs/audits/2026-08-25-nav-reconciliation-table.md`

All 25 `CATEGORY_TREE_L1` departments audited (not just Mobility), including Home Care specifically. Route resolution, truncation risk on long labels, and desktop/mobile dropdown behavior all checked.

One cosmetic-only finding, not a defect: in the "More Categories" column, departments with 0 tag-derived children (Room Furniture, Face Masks) sit in the same grid row as departments with 3 (Bariatric, Pharmacy Products), producing uneven row heights. This is the expected result of removing the `col-start-1` hack in Task 1 and is flagged for client/Izzy sign-off, not silently redesigned.

Zero-product departments (Room Furniture, Face Masks — QA store only) render a clean "no products found" empty state, not a broken layout. Flagged for Izzy to confirm as QA-store sparsity vs. a real production gap.

---

## P0 — Codebase Category Registry

### 3. Frontend category ↔ Shopify collection reconciliation table — ✅ Done

**Doc:** `docs/audits/2026-08-25-nav-reconciliation-table.md`

All 25 frontend-configured categories resolve to a live Shopify collection handle in the QA store. No missing handles, no flagged rows this run.

**Caveat carried in the doc itself:** this is QA-store data only. Re-running `scripts/audit-category-tree.ts` against production credentials (or handing it to Izzy) is required before treating the table as production-confirmed — this is the joint step still open (see "What's left," below).

### 4. Fix the root cause, one deterministic mapping — ✅ Done

**Commits:** `4bbb1c9`, `a77a945`

Consolidated the legacy `category-nav.ts` registry into `category-tree.ts` as the single source of truth for nav/breadcrumbs/sitemap — no duplicated category definitions. Separately found and fixed a latent bug: two call sites in `app/category/[slug]/[product]/page.tsx` resolved L1 by matching the route slug directly against `collectionHandle`, which diverges from the public slug for Face Masks (slug `face-masks`, handle `face-coverings`). Fixed to resolve through `getShopifyHandle()` first, matching what `CategoryPageView.tsx` already did correctly. No Shopify handles were renamed; route/SEO stability preserved throughout.

---

## P0 — Product Type / Tag Logic Investigation

### 5. Product Type usage conclusion — ✅ Done

**Doc:** `docs/audits/2026-08-25-product-type-usage-conclusion.md`
**Regression test:** `lib/__tests__/filter-registry.test.ts`

**Conclusion:** Product Type has no effect on category routing, category membership, subcategory grouping, navigation, or fallback categorization anywhere in the codebase. Its only live use is the `/search` page's facet allowlist. All category membership/routing is driven entirely by `category:`/`subcategory:` product tags.

The meeting anecdote (a Product Type edit appearing to make a product visible) is explained instead by the cache-invalidation gap fixed in Task 6: a tag/category change could take up to 5 minutes to appear, independent of which field was edited.

---

## P0 — Shopify Save / Cache Revalidation

### 6. Shopify save → storefront revalidation — ✅ Done

**Commits:** `b10c489`, `141194b`

- `b10c489`: the product webhook only invalidated product-specific cache tags, not the broad collections tag — so a tag/category-membership change on save wasn't reflected on category pages until the 300s background revalidate. Fixed to invalidate the collections tag on every product webhook (webhooks can't know which collections were affected, so this invalidates broadly rather than guessing).
- `141194b`: found and fixed a second, independent bug — React's `cache()` wrapper around `storefrontFetch` memoized by argument set, so a retry after a transient failure replayed the same memoized rejected promise instead of issuing a new HTTP request. Threaded a `dedupeSalt` that only affects the memoization key, never sent to Shopify and never touching Next's separate revalidate/tags cache.

---

## P0 — Intermittent Blank Category Pages

### 7–8. Investigate blank category pages / distinguish failure types — ✅ Done

**Commit:** `80becbd`

Isolated the subcategory tag scan in `CategoryPageView.tsx` so a transient failure in that one fetch degrades gracefully instead of blanking the whole page, with a retry added to `fetchProductTagSummaries`. The fix distinguishes missing collection / fetch error / subcategory-scan failure as separate states rather than collapsing them all into one blank result.

### 9. Focused diagnostics — ✅ Done

**File:** `lib/log-error.ts` (added in `80becbd`)

Structured logging distinguishing failure class, without exposing internal detail to customers.

---

## P1 — Focused Regression QA

### 10. Regression QA across all frontend-configured category routes — ✅ Done

**Commit:** `f867e3b`

E2e coverage added for header dropdown subcategories; reconciliation doc (Task 3) independently confirms all 25 category routes resolve (HTTP < 400, no not-found heading), corroborating existing coverage in `e2e/categories-hub-integration.spec.ts`.

### 11. Repeated navigation / mobile QA — ✅ Done

**File:** `e2e/responsive.spec.ts`

Covers repeated navigation, browser back/forward, hard refresh, and mobile expandable-department tap behavior.

---

## What's left — shared QA with Izzy

Not something Sardor's side can close alone:

- Re-run `scripts/audit-category-tree.ts` against **production** Storefront credentials (this branch's reconciliation table is QA-store data, ~1,100 products vs. production's ~7,000+) — confirm the 25 handles still resolve and no zero-count row is a real gap rather than QA sparsity.
- Walk the shared sample list together against production: Shower Commodes, Home Care, Mobility, Wheelchairs, Walkers (+ 1–2 more), verifying `Shopify tag → collection membership → storefront handle → navigation → live category page`.
- Sign off (or request a redesign of) the cosmetic uneven-row-height finding in the "More Categories" dropdown column.
- Confirm whether Room Furniture / Face Masks showing 0 products is QA-store sparsity or a real production gap.

---

## Screenshots — what to capture and where

The client asked for screenshots of the dropdowns specifically, plus general findings evidence. Below is the concrete capture list — URL, viewport, and what the shot needs to show.

### Desktop (1440×900 recommended)

| # | What | Where | What the shot must show |
|---|---|---|---|
| 1 | Mobility dropdown open | Home page → hover/click "Mobility" in the header | Full subcategory list under Mobility (the client-reported missing item) |
| 2 | Home Care dropdown open | Header → "More Categories" column → hover/click "Home Care" | Home Care's subcategories now present (was reported as showing only a limited set) |
| 3 | Full mega-dropdown, scrolled to top | Header → open "Catalog"/Categories trigger | All department columns visible together, for an at-a-glance completeness check |
| 4 | Full mega-dropdown, scrolled to bottom | Same panel, scrolled down inside it | The "Browse all categories →" link + the `max-h-[80vh] overflow-y-auto` scroll fallback working |
| 5 | "More Categories" column, Bariatric/Room Furniture and Face Masks/Pharmacy Products rows | Same panel | The known cosmetic row-height unevenness — needed for the client/Izzy sign-off decision, not a bug fix |
| 6 | A subcategory page reached from the dropdown | Click a Mobility child (e.g. Rollators) from the open dropdown | Confirms the link target renders a real product listing, not a 404 |

### Mobile (375×812 recommended, e.g. iPhone X viewport)

| # | What | Where | What the shot must show |
|---|---|---|---|
| 7 | Collapsed mobile menu | Any page, tap the hamburger/menu icon | Baseline closed state |
| 8 | Mobility expanded in mobile menu | Tap "Mobility" inside the open mobile menu | Subcategories expand inline (tap-to-expand mechanism) |
| 9 | Home Care expanded in mobile menu | Tap "Home Care" inside the open mobile menu | Subcategories expand inline |
| 10 | Menu closed after selecting a category | Tap a subcategory link from the expanded mobile menu | Menu closes and the correct category page loads (no stale open-menu state left behind) |

### Category page / empty-state evidence

| # | What | Where | What the shot must show |
|---|---|---|---|
| 11 | Room Furniture category page | `/category/seating` | Graceful "no products found" empty state, not a blank page or 404 (QA store currently has 0 products here) |
| 12 | Face Masks category page | `/category/face-masks` | Same graceful empty state |
| 13 | A populated category page for contrast | `/category/mobility` or `/category/home-care` | Normal populated state, to contrast against 11/12 |

### Regression evidence (optional but useful for the client)

| # | What | Where | What the shot must show |
|---|---|---|---|
| 14 | Direct-URL load of a subcategory | Paste `/category/mobility/rollators` directly into the address bar | Route resolves correctly without going through nav first |
| 15 | Back/forward navigation | Navigate category → category → browser Back | No blank/stale page on return |

