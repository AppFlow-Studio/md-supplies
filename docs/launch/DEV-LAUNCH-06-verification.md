# DEV-LAUNCH-06 — Catalog Discovery Verification & e2e Hardening

**Ticket:** DEV-LAUNCH-06 (Final Launch Configuration & Implementation Plan, 2026-08-05)
**Owner:** Developers · **Priority:** P0 launch gate
**Builds on:** [DEV-LAUNCH-02-config.md](./DEV-LAUNCH-02-config.md) (QA fixture configuration)

- **Last commit at time of writing:** `3cd44982faad2f95ce4c6d2da51e73ade26c7eb8`
  (DEV-LAUNCH-05) — everything described in this document is **uncommitted**,
  pending review.
- **Branch:** `catalog-cro-review-sardor-dev`
- **QA store queried:** `md-supplies-qa-shipping-and-checkout.myshopify.com`

## Summary

The engineering this ticket describes — a default-deny filter allowlist,
client-side-only catalog navigation, server-side search scoping, OCC's
canonical-collection design, and industry tag-scoping — was already built and
covered by 1,159 passing Vitest tests (`lib/filter-registry.ts`,
`lib/category-results-source.ts`, `components/filters/FilterRail.tsx`, etc.).
What was missing, confirmed independently against
`docs/audits/2026-08-02-catalog-cro/FINAL-REPORT.md` §13 and
`docs/TASK-REGISTER-2026-08-03.md` (C-01, C-02, D2), was **verification against
real QA-store data** and **Playwright coverage of filter/sort/pagination
interactions**, which barely existed (`e2e/no-reload.spec.ts` covered only the
scoped search box).

One genuine gap surfaced during that verification: **`/search` had no
pagination at all** in the sense every other discovery surface has it — only a
cursor-based "Load More" button, inconsistent with category/OCC/industry's
deep-linkable `?page=N`. Added deterministic page-N pagination to `/search`,
matching the category model exactly (see "Search pagination added" below).

This pass: bootstrapped real QA-store fixtures, fixed one production-code
regression and two test-data bugs found via that verification, added the
missing e2e coverage, added search pagination, and ran everything against the
live QA store — including discovering and correcting a stale local test
server that had silently been serving pre-change code for one round of
verification (see "Methodology note" below).

## What was fixed

1. **`lib/filter-registry.ts` — registry key mismatch (production code bug).**
   `apparel`, `room-furniture`, and `surgery-procedure` were keyed by category
   **tag**, but `getFacetRules()` is called with the route slug, which for
   these three categories *is* the live Shopify collection handle
   (`capes-gowns`, `seating`, `trocars-trocar-kits`). All three silently fell
   through to `DEFAULT_FACET_RULES` (Availability/Price only), losing their
   intended registry entries — the exact class of regression this ticket's
   "preserve filter allowlists" criterion exists to catch. Fixed; regression
   test in `lib/__tests__/filter-registry.test.ts` updated to the correct keys.
2. **`lib/industry-content.ts:31` — dead link.** The HRT Clinics industry page
   linked `ROUTES.category('surgery-procedure')`, a handle no live collection
   has (same root cause as #1). Fixed to `'trocars-trocar-kits'`.
3. **Two stale test fixtures**, both confirmed live against the QA store
   before changing:
   - `/industries/pharmacy` → `/industries/pharmacies` (`lib/industries.ts:184`
     registers the plural slug) — `e2e/routes.spec.ts`, `axe.spec.ts`,
     `visual.spec.ts`.
   - `/product/nitrile-exam-gloves-powder-free` (confirmed via a direct
     Storefront query: `{"product": null}` on the QA store) →
     `/product/exam-glove-nitrile-medium-blue-100-bx-10-bx-cs` (a real QA
     product) — same three files.
4. **`e2e/responsive.spec.ts`** — "urgent-care exposes ... a real result
   count" asserted body text matches `/\d+\s+result/i`, but the page's default
   (unsearched) state reads "Showing N **products**", never containing the
   word "result" unless a search is active. Widened to accept either phrasing.

## Search pagination added

`/search` used `app/search/actions.ts`'s `loadMoreSearchProducts` — a
cursor-advanced "Load More" button — while category, OCC, and industry pages
all use deterministic `?page=N` pagination (`CategoryPagination`,
`lib/category-utils.ts` `MAX_CATEGORY_PAGE`). Brought `/search` in line with
the same model:

- `app/search/page.tsx` now fetches `first: currentPage * SEARCH_PAGE_SIZE + 1`
  from the start every time (no cursor chain), slices the current page
  client-side of the response, and renders the existing `CategoryPagination`
  component — the *same* component category/OCC/industry pages use, not a
  parallel implementation.
- New `SEARCH_PAGE_SIZE` (12, unchanged from the old batch size) and
  `MAX_SEARCH_PAGE` constants in `lib/category-utils.ts`, mirroring
  `CATEGORY_PAGE_SIZE`/`MAX_CATEGORY_PAGE`. A `?page=` beyond `MAX_SEARCH_PAGE`
  or a Storefront error on a deep page both redirect to page 1 with
  `q`/`sort`/`filter` preserved — same fallback category pagination already
  had.
- `app/search/actions.ts` (`loadMoreSearchProducts`, now dead) deleted;
  `components/search/SearchResultsSection.tsx` simplified from a client
  component managing cursor state to a plain server-renderable results grid.
- New `e2e/search-pagination.spec.ts`: page-2 navigation, Back/Forward, sort
  resetting to page 1, and the deep-page redirect — all verified live against
  the QA store with `q=glove` (74 real matches, confirmed via a direct
  Storefront query before writing the test).
- Vitest coverage rewritten: `app/search/__tests__/page.test.ts` (deep-page
  fetch shape, error redirect, out-of-range redirect) and
  `components/search/__tests__/SearchResultsSection.test.tsx` (now a
  presentational-component test, no more cursor mocking).

## Methodology note — a stale local server briefly masked this change

Mid-session, a `next start` process left running from earlier in this
verification pass (never restarted after the `/search` edits, since local
Playwright runs reuse an already-running server rather than always
rebuilding) served **pre-change code** for one round of `search-pagination`
testing — a deep-page redirect and a locator that only exists inside a
category-page results wrapper both appeared to fail. Killing that process and
letting Playwright build+start fresh resolved both; a full re-run (below)
confirms the fresh build is what's now evidenced. Flagging this because it's
exactly the kind of false signal a stale dev server produces, and it's worth
remembering when interpreting *any* local Playwright run in this repo: confirm
the server serving the request actually reflects the latest build.

## What was verified, not changed

- **Filter allowlist** (`lib/filter-registry.ts`): `productVendor` and `tag`
  are rejected on both the facet-render gate and the URL-input gate. Verified
  at the e2e level in `occ-industry-discovery.spec.ts` — a hand-crafted
  `?filter={"productVendor":"MedPlus"}` on both the OCC page and a live
  industry page renders identically to the unfiltered state (no chip, no
  vendor-filtered result set).
- **No full document reload** after first load, across search, sort, filter
  selection, pagination, chip removal, clear-all, and Back/Forward — proven
  via a `window` sentinel value and a zero-document-navigation-request count
  (`e2e/helpers/no-reload.ts`), extended from search-only to also cover
  pagination and filters.
- **Category-scoped search cannot leak.** Live-verified: `"rollator"` (a
  mobility-only term) returns real hits on unscoped `/search` but zero when
  scoped to `/category/gloves` — proving the server-side AND-composition in
  `lib/category-results-source.ts` is actually enforced, not just present in
  code.
- **OCC membership.** `app/solutions/occ/page.tsx` fails safe (a
  "temporarily unavailable" message) rather than falling back to a tag scan
  when the canonical `occ` handle doesn't resolve — which is exactly the
  QA store's current state (see below).
- **Counts/chips/URL/products agree** after every filter, sort, and page
  change — verified via a status-text-vs-rendered-card-count check on every
  interaction, not just at first load.

## QA fixture handles and GIDs

Bootstrapped read-only against the live QA store — no Admin API scope needed
— via `scripts/qa-catalog-fixtures.ts` (`npx tsx` + Storefront API only).
Full table: **[DEV-LAUNCH-06-qa-fixtures.md](./DEV-LAUNCH-06-qa-fixtures.md)**.
Headlines:

- All 25 L1 categories are live on the QA store with real product data
  (`gloves`: 40, `wound-care`: 40, `needles-syringes`: 69, etc.) — the
  `docs/TASK-REGISTER-2026-08-03.md` claim that the QA store "lacks `gloves`,
  `testing-screening`" is now **stale**; that doc has been updated.
- The QA store's Search & Discovery is not configured with the rich
  metafield facets production has — every category currently returns only
  Availability and Price. New specs are written against whatever the
  allowlist actually renders (never a hardcoded facet set) and skip with a
  named reason when a required facet shape isn't present today (e.g., no
  facet currently has >8 values, so the Show-more/less path can't be
  exercised against live QA data yet).
- The canonical `occ` collection **does not resolve** on the QA store. The
  page correctly fails safe. This does not resolve **IZ-01** (production
  canonical-collection confirmation is still Izzy's) but does confirm the
  fail-safe path works.
- All 5 tag-backed industries (`urgent-care`, `hrt-clinics`, `home-health`,
  `clinics-doctors-offices`, `pharmacies`) have live, tag-matching products.

## Playwright evidence

New/extended specs, run against the QA store on a freshly built server
(`npx playwright test`): **`e2e/category-filters.spec.ts`**,
**`e2e/category-sort-pagination.spec.ts`**, **`e2e/category-search-scope.spec.ts`**,
**`e2e/occ-industry-discovery.spec.ts`**, **`e2e/search-pagination.spec.ts`**,
extended **`e2e/no-reload.spec.ts`**.

```
Running 25 tests using 8 workers
  22 passed
  3 skipped (named QA-data-gap reasons — see "What was verified" above)
  0 failed
```

Full repo-wide regression run (all e2e specs, both `chromium` and
`mobile-chromium` projects, 308 tests): **283 passed**. The remaining 24
failures are pre-existing and outside this ticket's scope (none touch a file
this ticket changed — confirmed by the failure list being identical in kind
and count to the pre-search-pagination run) — tracked in
`docs/TASK-REGISTER-2026-08-03.md` rather than fixed here to avoid scope creep
into unrelated subsystems:

| Failure | Cause |
|---|---|
| 12× visual baseline (`home`/`category`/`pdp`/`occ`/`industry`/`blog`, both projects) | Known darwin-only-snapshot gap (`TASK-REGISTER` C-05) — this run is on Windows. Stable across every run. |
| PDP `scrollable-region-focusable` axe violation (`qa-no-rate`, `qa-out-of-stock`, `qa-backorder`, and the newly-corrected gloves PDP handle, both projects — 8 total) | Pre-existing PDP defect, newly *visible* because the PDP e2e fixture now points at a real product instead of a 404 — not introduced by this ticket, but surfaced by fixing the test fixture. Worth a follow-up PDP ticket. Stable across every run. |
| Homepage industry-card contrast (both projects) | Pre-existing, homepage-only, unrelated to catalog code. Stable across every run. |
| Tablet discovery-toolbar layout check (both projects) | Selector ambiguity (likely matches a subcategory-nav link, not a product card) in a pre-existing test; unrelated to any file this ticket touched. Stable across every run. |

Two additional failures appeared in an earlier full run and did **not**
reproduce in the final one — both are environmental flakes, not defects: CSP
`unsafe-eval` in `script-src` (intermittent, unrelated to any file this
ticket touched), and a single `categories-hub-integration.spec.ts` 30s
navigation timeout while 8 workers hammered one local server across the full
300+-test run.

`npm run test` (Vitest, 1,160 tests — one net new after the search-page test
rewrite) and `npx tsc --noEmit` both stay green.

## Evidence not captured by this session

- **Screen recording** of search + filter + sort + pagination without
  reload — by agreement, captured manually/by QA rather than by this session.

## Residual dependencies (unchanged, still on Izzy)

- **IZ-01** — canonical OCC collection GID + production confirmation. This
  session's QA-store check (`occ` handle unresolved on QA) does not substitute
  for it.
- **A-01** — CI Playwright secrets. This session verified everything by
  running locally against the QA store via the already-configured
  `.env.local`; hosted CI still needs `SHOPIFY_STORE_DOMAIN` +
  `SHOPIFY_STOREFRONT_ACCESS_TOKEN` in Actions secrets to run this suite
  itself.
