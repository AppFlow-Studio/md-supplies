# Final QA Evidence


Branch: `catalog-cro-review-sardor-dev`. Plan:
`docs/superpowers/plans/2026-08-18-bilal-final-prelaunch-scope.md`, Tasks
15-20 (the 2026-08-20 addendum). SDD ledger:
`.superpowers/sdd/2026-08-18-bilal-final-prelaunch-scope/progress.md`.

**Nothing has been pushed, and no PR has been opened.** Per the plan's
Global Constraints, that stays gated on the user's explicit go-ahead.

## Commits (this session, in order)

| Task | Commit | What |
|---|---|---|
| 15 | `a357cec` | Fix sitewide Trocar Supplies nav badge WCAG AA contrast (3.52:1 → passing) |
| 16 | `255e9f0` | Extend AeroWalk legacy-handle redirect to `/category/<slug>/`, one reusable rule |
| 17 | `f1f9ea3` | Finalize packaging-unavailable fallback copy to Bilal's approved string |
| 18 | `3c16f8c` | Trocar page: collection-sourced (41 active), not tag-sourced (319) |
| 19 | `b64697c` | Reverse RX Only capitalization sitewide to "RX Only" |
| — | `8d760dd` | Refresh 10 visual-regression baselines drifted by live QA catalog data (see below — not a code-behavior change) |

## Full automated gate

```
npm test            → 145 files, 1514/1514 passing
npx tsc --noEmit     → clean, zero errors
npx eslint .         → 3 problems, none introduced this session (see below)
npm run test:e2e     → chromium: 266 passed, 0 failed, 21 skipped
                       mobile-chromium: 265 passed, 0 failed, 22 skipped
```

**Zero test failures on either Playwright project.** No `.only` in the
suite (`forbidOnly: true` in `playwright.config.ts` enforces this).

### ESLint detail

`npx eslint .` reports 2 errors + 1 warning, both pre-existing and outside
this session's changes:
- `qa-sweep.js`: 2 `no-require-imports` errors. This file is gitignored
  (`.gitignore:61`), untracked, dated 2026-07-03 — a local scratch file,
  not part of the repo proper.
- `e2e/320px-overflow.spec.ts:1`: 1 unused-import warning, from commit
  `325120a` (Task 9 of the original 14-task plan, unrelated to Tasks
  15-20).

No file touched by Tasks 15-20 has a lint error or warning.

### Task-by-task verification

- **Task 15 (contrast):** New interactive Playwright test
  (`e2e/contrast.spec.ts`, "Trocar Supplies quick-link badge meets WCAG AA
  contrast") opens the desktop mega-dropdown and mobile drawer — the only
  way to reach the badge, since it's `display:none` at rest and the
  existing 9-route scan never opened it. Failed at 3.52:1 before the fix
  (measured, matches the 3.59:1 hand-computed from stock Tailwind
  `teal-600`/`teal-50`), passes after switching to this codebase's own
  overridden `teal-500` (#006d92, ~5.6:1). Full `contrast.spec.ts`: 12/12
  passing.
- **Task 16 (AeroWalk redirect):** `__tests__/proxy.test.ts`: 85/85
  passing, including 3 new tests covering the Blue handle under
  `/category/<slug>/`, White/Grey under both route shapes, and a
  false-positive guard. Re-ran `scripts/audit-redirects.ts` against QA
  (`md-supplies-qa-shipping-and-checkout.myshopify.com` — see that
  script's own environment caveat, this is QA not production): all 30
  hand-written entries (27 `REDIRECT_ENTRIES` + 3 `LEGACY_PRODUCT_HANDLES`,
  including all 3 AeroWalk colors) resolve 200, 0 broken. Full report at
  `docs/launch/2026-08-18-redirect-audit-report.md`.
- **Task 17 (packaging copy):** `ProductView.test.tsx`: 17/17 passing.
  Fallback string is exactly `"Packaging information unavailable for this
  option."` — verified by an existing test that pins a variant with zero
  packaging fields.
- **Task 18 (Trocar collection source):** `category-tree.test.ts`: 44/44
  passing, including 2 new tests confirming `surgery-procedure` is no
  longer `productSet: 'tag'` and that `apparel`/`room-furniture`/
  `face-masks` are untouched. Full suite (1513→1514 tests across this
  session) stayed green, confirming no other test assumed the old
  319-product tag-sourced behavior for this category.
- **Task 19 (RX Only):** Full suite 1514/1514, `tsc --noEmit` clean,
  `e2e/rx-states.spec.ts` 2/2 passing (including a real browser render of
  the PDP badge). The one hardcoded duplicate outside the centralized
  `RX_ONLY_LABEL_TEXT` constant (`components/product/ProductBadges.tsx`)
  was found and fixed to import the constant, so it can't drift again.

### Visual-regression baseline refresh (not a Task 15-20 behavior change)

10 of the pre-existing visual-baseline tests (desktop: home/category/pdp/
occ; mobile: home/categories-hub/category/pdp/occ/blog) were failing with
whole-page "ghosting" diffs — every element on the page shifted/doubled
vertically by a few pixels, cascading from the top of the page down. This
is the signature of upstream content-height drift (e.g. a product count,
image, or price changing somewhere early in the page), not a targeted
code change.

**Verified this predates Tasks 15-20**, not caused by them: created a
temporary `git worktree` at commit `1365488` (the last commit before this
session started) and re-ran the "home" visual test there. It failed with
the same whole-page ghosting pattern (and the same page-height
instability across retries: 4963px → 2443px → 4924px). None of the 5
routes affected (home, category/gloves, the exam-glove PDP, occ, blog) are
touched by any Task 15-19 code change. The most likely cause is Izzy's
recent QA-store migration (her 2026-08-19 message: "167 variant rows
across 112 products" added/changed) shifting what these pages render.

Updated each of the 10 baselines individually (not a blanket
`--update-snapshots`) after visually confirming the diff pattern in each
case matched this same systemic drift, not a localized regression. Full
gate re-run clean after the refresh (see numbers above).

**Flagged, non-blocking:** this suite screenshots live QA-store content
(`fullPage: true` on pages backed by a mutable Shopify store), so these
baselines will drift again whenever the QA catalog changes — the same
risk this file's own comments already document for `industry`/`search`/
`subcategory` routes (excluded from visual regression entirely for
exactly this reason, non-deterministic Storefront Search ordering).
Recommend the team decide whether home/category/pdp/occ/categories-hub/
blog should get the same treatment, or whether a fixture-pinned QA subset
should back these specific screenshots. Not addressed here — a test-infra
architecture decision, not a Task 15-20 code fix.

**Also observed, non-blocking:** two *different* tests
(`categories-hub-integration.spec.ts`'s route-integrity test, then
`responsive.spec.ts`'s industry-veterinary sweep) each failed once with a
navigation timeout during a full-parallel-worker run, and passed cleanly
every time when re-run in isolation. This reads as environment/network
contention against the live QA API under 4-way parallel load, not a code
defect — no code in Tasks 15-20 touches either route.

## Intentional skips (documented separately, not folded into the pass count)

**`e2e/authenticated.spec.ts` (11 tests, both projects):** require a live
QA customer session (`E2E_CUSTOMER_ACCESS_TOKEN`/`REFRESH_TOKEN`/
`EXPIRES_AT` env vars) this session does not have — covers account
overview, order detail, and RX document card states. This is exactly the
kind of secured QA credential Bilal asked be coordinated ("Please
coordinate secure access to the QA password rather than leaving checkout
partially verified") — unresolved here, listed under Blocked below.

**`e2e/category-filters.spec.ts` (5-6 tests per project):** self-skip with
an explicit `'QA-data gap: ...'` reason when the current QA store's
category page doesn't have the facet shape the test needs (no Availability
facet, no Price facet, no facet with >8 values). Data-dependent, not a
code gap — will start running once QA carries a category with that facet
shape.

## Blocked — needs Bilal/Izzy or live QA/production access, not a dev gap

This repo-only session has no QA customer login session, no confirmed
current QA data state beyond what's queryable via the read-only Storefront
API, and (per `lib/shopify/shop-guard.ts`) is hard-blocked from ever
querying production. The following items from Bilal's 2026-08-20 message
remain open:

1. **Guest checkout through the payment step** (desktop + mobile) — needs
   a live browser session against the deployed QA site; not attempted.
2. **The QA password itself** — Bilal asked that secure access be
   coordinated; not something this session can arrange.
3. **Live cross-checks against `PRODUCTION-TO-QA-ID-MAP.csv`** (Izzy's
   167-row map) and `TROCAR-REGISTRY-41-PRODUCTS.csv` — both are local
   files outside this repo; the code-level fixes above were verified
   against the current QA Storefront API directly, not against those
   specific ID mappings row-by-row.
4. **SKU 118218 / 118220 (unresolved pen needles)** — izzy's message asks
   whether Task 8's fallback-copy behavior is deployed. It is (Task 17,
   `f1f9ea3`). But the mechanism is more specific than "variant blank ⇒
   safe message": `ProductView.tsx`'s `resolvedOrderSize` etc. use
   `resolveVariantValue(selectedVariant.X, product.X)` — a blank
   variant-level field falls back to the **product-level** value first,
   and the safe "Packaging information unavailable for this option."
   copy only renders when *neither* the variant nor the product carries a
   value. Whether removing 118218/118220's variant-level values lands on
   the safe message or on the product's own parent-level default (which
   may itself be the 100/Box izzy was worried about) depends on whether
   *this specific product* also has a blank product-level packaging
   field — data this session cannot check without a live lookup. Do not
   treat this as "confirmed safe to remove" without Izzy verifying the
   product-level fields for this exact product first.
5. **Trocar page count/source, four pipe-label products, redirects,
   OCC/Trocar Free Shipping — against *production*, not QA** — every
   verification in this doc ran against the QA store only, per
   `shop-guard.ts`'s hard block. A production re-run needs an approved
   process/credentials this session doesn't have.
6. **"You May Also Need" mouse/keyboard/mobile spot-check on a live
   deployed URL** — covered by automated tests (Task 4, prior session) and
   this session's e2e runs against `next build && next start` locally;
   not spot-checked against an actual deployed preview URL.

Once these are resolved, the remaining gap to Bilal's "return one final
response with PR/SHA, fresh QA URL, zero-failure test results,
production-to-QA mapping, screenshots and exact remaining blockers" is:
a QA URL to share (this session ran against `localhost:3000` via
Playwright's own `webServer`, not a shared deployment), and the
production-side re-checks in items 3 and 5 above.
