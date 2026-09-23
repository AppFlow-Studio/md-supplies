# DEV-REVIEWS-01 — Completion report (handoff draft)

**Status: NOT Done.** Code is complete and verified against the ticket's
architecture, but the ticket's own hard completion rule ("deployed preview +
required screenshots/evidence attached to the Notion ticket") is not met from
this environment — see **Known limitations / deferred items** below. This
document is the 11-point handoff write-up so whoever has Vercel/Notion access
can close it out without re-deriving the implementation.

## 1. Branch + final commit SHA

- Branch: `catalog-cro-review`
- Final commit for this ticket's scope: `b530174` (`fix(reviews): store review summary is also flat, no data wrapper`)
- Full commit range for the feature: `0b8a2a6` (initial integration) through `b530174`

## 2. Files / components / services changed

Service layer (`lib/trustshop/`): `client.ts`, `product.ts`, `store.ts`,
`schemas.ts`, `types.ts`, `normalize.ts`, `product-id.ts`,
`collection-summaries.ts`, `observability.ts`, `write-schema.ts`,
`store-write-schema.ts` — matches the ticket's suggested structure exactly.

UI (`components/reviews/`): `ProductRating`, `ProductReviewSummaryLink`,
`ProductReviewDistribution`, `ProductReviews`, `ProductReviewCard`,
`ProductReviewFilters`, `ProductReviewMedia`, `ReviewMediaModal`,
`WriteProductReview`, `StoreRating`, `StoreReviews`, `StoreReviewCard`,
`WriteStoreReview`.

Server write proxies: `app/api/reviews/product/route.ts`,
`app/api/reviews/store/route.ts` (shared anti-abuse helpers in
`lib/forms/guards.ts`, `lib/rate-limit.ts`).

Integration points: `components/product/ProductView.tsx` (main PDP),
`app/category/[slug]/[product]/page.tsx` (category-nested PDP — added later,
this surface had zero reviews UI at all until commit `13fb5e4`),
`components/store/ShopifyProductCard.tsx`, `components/category/ProductGrid.tsx`,
`components/category/CategoryResults.tsx`, `components/search/SearchResultsSection.tsx`
(all summary-only, card-level), `components/schema/ProductSchema.tsx` (JSON-LD),
`app/reviews/page.tsx` (dedicated store-reviews page).

Tests: `lib/trustshop/__tests__/*`, `components/reviews/__tests__/*`,
`app/api/reviews/{product,store}/__tests__/*`, `components/schema/__tests__/ProductSchema.test.tsx`,
`e2e/product-reviews.spec.ts`, `e2e/store-reviews.spec.ts`, `e2e/evidence-capture-reviews.spec.ts`.

## 3. Cache / revalidation strategy actually used

Next.js `fetch`-level `next: { revalidate, tags }` on every TrustShop GET,
tagged per numeric Shopify product ID (`tagsFor(numericId)`) or a shared
store tag; writes call `revalidateTag(..., 'max')` on success only (best-effort,
not blocking the response). TTLs actually shipped:

| Data | TTL |
| --- | --- |
| Product summary | 15 min |
| Product reviews | 7 min |
| Product media | 25 min |
| Store summary | 15 min |
| Store reviews | 12 min |
| Store media | 30 min |

Collection/search cards never call TrustShop per-card directly — they go
through `getReviewSummariesByGid` → `getManyProductReviewSummaries`, which
batches with bounded concurrency and re-keys by GID. A malformed GID or a
fully-failed batch degrades to an empty map (every card just renders with no
rating row), never a thrown error and never a sequential per-card waterfall.

## 4. TrustShop timeout / retry behavior actually used

Centralized in `lib/trustshop/client.ts`:

- 5s request timeout via `AbortSignal.timeout` on every request (GET and POST).
- GET: up to 2 retries, exponential backoff with jitter (`250ms * 2^attempt + jitter`),
  **only** for `rate_limited` (429), `server` (5xx), and `timeout` — never for
  4xx/validation failures.
- POST: single attempt, no retry code path at all (not a disabled flag —
  `trustShopPost` and `trustShopGet` are separate functions that share no
  retry logic), because no idempotency-key contract is documented and a retry
  could duplicate a review.
- Every attempt logs a structured event (`lib/trustshop/observability.ts`)
  with `operation`, `shopifyProductId`, `httpStatus`, `providerErrorCode`,
  `latencyMs`, `cacheStatus`, `retryCount` — no bearer token, email, or
  review body ever logged.

## 5. Exact Shopify product-ID mapping path

Single helper, `lib/trustshop/product-id.ts::getNumericShopifyProductId`,
matches the ticket's reference implementation verbatim (strips the GID to its
trailing numeric segment, validates it's a positive safe integer, throws
`Invalid Shopify product ID` otherwise). Every TrustShop call site imports
this — no mapping by handle/title/SKU/vendor/variant anywhere in the reviews
code. The original GID is preserved and used for all Shopify-side operations
(cart, product-existence check via `GET_PRODUCT_EXISTS_BY_ID`); conversion
happens only at the TrustShop boundary.

## 6. Preview URL

**None available from this environment.** This session has no Vercel
deployment/preview access. `TRUSTSHOP_API_BASE_URL` and
`TRUSTSHOP_INTEGRATION_KEY` are set in local `.env.local` only (rotated key,
confirmed by Bilal — not the exposed planning-time credential); TrustShop
reads have been live and working against `https://integrations.trustshop.io`
from this dev environment since 2026-09-09. Whoever has deploy access needs
to set the same two env vars on the actual preview/production environment
and confirm reads/writes there.

## 7. Tested product URLs / Shopify numeric IDs

- `/product/surgical-gloves-size-5-50-pr-bx-4-bx-cs-us-only` — used in the
  current Playwright fixture run (real handle from today's local test run,
  auto-selected via `firstPopulatedCategory()`/`requireFixture` QA-data
  helpers, not hardcoded).
- Numeric Shopify product ID `9368798265577` — captured directly from a real
  TrustShop response body during schema-contract debugging on 2026-09-09;
  confirmed genuinely zero-review at TrustShop today.
- No product with TrustShop-seeded review data (multi-review, Verified Buyer,
  merchant reply, media) has been available to this session — see limitations.

## 8. Automated test commands + pass counts (re-run today, 2026-09-09)

```
npx vitest run
```
→ **2028/2028 tests passed** (182/182 files).

```
npx tsc --noEmit
```
→ Clean except one pre-existing, unrelated error in
`e2e/evidence-capture-reviews.spec.ts:108,113` (`CategoryFixture.slug` typing
gap) — not touched by this ticket, present before this session.

```
npx playwright test e2e/product-reviews.spec.ts e2e/store-reviews.spec.ts
```
→ **57 passed, 1 failed, 2 skipped** on the full-suite run. The failure
(`product-reviews.spec.ts:96` — "submitting the review form without a rating
surfaces a field error") reproduced as a page navigating away (a raw GET
form submission with the honeypot `website` field as a query string) instead
of the client handler intercepting it — consistent with a hydration-timing
flake under parallel load, not a code regression: re-run in isolation with
`--retries=2` passed cleanly on the first attempt. Worth a closer look if it
recurs under CI's own parallelism, but not treated as a blocker here.

## 9. Screenshots / evidence

`docs/audits/2026-09-07-dev-reviews-01/screenshots/` has 10 real screenshots
plus JSON-LD/log/test-output artifacts (gitignored; regenerate with
`CAPTURE_EVIDENCE=1 E2E_BASE_URL=<url> npx playwright test e2e/evidence-capture-reviews.spec.ts`).
**These were captured before `TRUSTSHOP_API_BASE_URL` was ever set**, so they
only demonstrate the TrustShop-unreachable/fallback path (items 1–10, 13–17 in
the ticket's evidence checklist are covered in that state). They have not
been recaptured against the now-live TrustShop connection. Reviewed-state
evidence (distribution bars, filters, Verified Buyer, merchant reply, media
gallery, Load More / real pagination) cannot be captured at all yet — no
TrustShop-seeded review data has been reachable from this session (see
below). Rich Results Test and a real before/after Lighthouse diff need a live
deployed URL, which this session doesn't have either.

## 10. Known limitations / deferred items

1. **No Vercel preview deploy access** — "verified in the deployed preview"
   cannot be confirmed from this session.
2. **No real Shopify product with seeded TrustShop review data** — blocks
   reviewed-state screenshots and blocks verifying real multi-page pagination
   behavior (`has_next_page` has only been observed against a zero-review
   response for the one test product available).
3. **No Notion access** — evidence/this report cannot be attached to the
   actual ticket from here; needs to be pasted in or uploaded by whoever has
   access.
4. **Rich Results Test / true before-after Lighthouse diff** — needs a live
   deployed URL / a pre-reviews baseline build respectively; only a single
   post-implementation Lighthouse run exists locally, not a diff.
5. One Playwright test (item 8 above) is flaky under full-parallel local
   runs; passes reliably in isolation.
6. Pre-existing, unrelated `tsc` error in `e2e/evidence-capture-reviews.spec.ts`
   (not part of this ticket's scope, not introduced by it).

**TrustShop real-contract note (for whoever picks this up):** the real API's
response shapes did not match the ticket's documented contract in two
separate places — product summary/reviews/media used a flat body (no `data`
wrapper) with `average_review`/`total_review`/`stars_review.star_N` naming
instead of `average_rating`/`total_reviews`/`ratings_distribution.N_star`,
and the reviews-list endpoint uses `has_next_page` rather than the documented
`next_cursor`. Both were discovered and fixed (`373b7e1`, `b530174`) the
first time this dev environment ever reached the live API
(2026-09-09) — full detail in `lib/trustshop/__tests__/schemas.test.ts`,
which pins the real captured response bodies as regression fixtures.

## 11. Confirmation: rotated key is server-only, nothing exposed

- `TRUSTSHOP_INTEGRATION_KEY` lives only in `.env.local` (gitignored) and is
  read exclusively by `lib/env.server.ts` (`import 'server-only'`) →
  `lib/trustshop/client.ts`. No `NEXT_PUBLIC_*` variant exists anywhere in
  the codebase.
- Re-verified today against a fresh production build (`next build && next start`,
  as run by Playwright's `webServer`): `grep`-ing the live key value across
  `.next/static` and `.next/server` returns **zero matches**. (One match
  exists in `.next/dev/cache/turbopack/...` — Turbopack's server-side
  incremental build cache, never served to the browser — confirmed
  irrelevant to the acceptance gate, which is about the client bundle/page
  source/network payloads.)
- The key currently in `.env.local` is the rotated key, confirmed by Bilal
  as distinct from the exposed planning-time credential (see prior session
  notes) — never committed, logged, or pasted into this report.

---

## Reference: Definition-of-Done status against the ticket

| Item | Status |
| --- | --- |
| Rotated TrustShop key provisioned securely | ✅ |
| TrustShop client/service layer centralized + runtime-validated | ✅ |
| Shopify GID → numeric ID mapping proven against real products | ✅ (against the one reachable test product; not yet against a reviewed product) |
| PDP rating summary matches TrustShop exactly | ✅ (zero-review case verified live; reviewed case unverified — no fixture) |
| Full reviews, filtering, sorting, pagination work | ⚠️ implemented + unit/e2e tested against TrustShop's real (corrected) contract; real multi-page pagination unverified live |
| Verified Buyer derives only from TrustShop | ✅ |
| Merchant replies render correctly | ⚠️ implemented, unverified live (no reply fixture) |
| Existing review media displays; no invented upload | ✅ |
| Product-review write flow server-only, validated, abuse-protected | ✅ |
| Collection/search cards use summaries only, no N+1 | ✅ |
| TrustShop outages cannot block product/cart/checkout | ✅ (this is what the existing evidence screenshots demonstrate) |
| Reviewed-product JSON-LD uses same summary as UI | ✅ (code path shared; live reviewed-product confirmation pending) |
| Zero-review JSON-LD omits `aggregateRating` | ✅ verified |
| Store reviews clearly separate from product reviews | ✅ |
| Accessibility + mobile requirements pass | ✅ (axe + viewport assertions in e2e suite) |
| Required automated tests pass | ✅ (2028/2028 unit; 57/58 non-skipped e2e, 1 confirmed flake) |
| Required screenshots/evidence attached | ❌ partial — zero-review/failure-mode set exists but stale (pre-live-API) and reviewed-state set is entirely missing |
| Preview visually verified | ❌ no deploy access from this session |
| Completion report posted before Done | This document — still needs pasting into Notion by whoever has access |
