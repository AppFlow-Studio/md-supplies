# LG-04 packaging breakdown — QA evidence & production-readiness — 2026-08-17

**Prepared by:** Sardor (dev) · **For:** Bilal (approval) / Izzy (production mirror)
**Scope:** Bilal's 2026-08-17 6:25 PM message — QA pass for the three packaging-breakdown
fields (`custom.inner_pack_quantity`, `custom.packs_per_case`, `custom.total_order_quantity`)
before Izzy mirrors the 458 QA values + 10 variant-name corrections into production.

**Draft only — not yet posted to Slack.** Sending is the user's call, not automated.

---

## 1. Summary

All items Bilal asked for are QA-verified **except one product, scoped precisely below**.
Full suite: 146/146 test files, 1494/1494 tests green (12 pre-existing LG-04 tests + 1 new
this session), `tsc --noEmit` clean, `eslint` clean. No Shopify writes made — read-only QA
verification only, per the standing ground rule.

| Item Bilal asked for | Status |
|---|---|
| Variant-first, product-fallback reasoning | ✅ Confirmed correct — see §2 |
| Show Total Units only when present; inner/packs when available; never derive, never zero | ✅ Implemented + tested (pre-existing) |
| Never show one variant's data while another is selected | ✅ New test added, passed first run — see §3 |
| Test the 3 named QA products | ✅ 3 of 3 pass — see §4 |
| Both PDP routes render identically | ✅ Confirmed by architecture — see §5 |
| Cart line + structured data unaffected | ✅ Confirmed — see §6 |
| 10 corrected-variant-name products | ⏳ Not started — nobody has named the 10 products yet (see §7) |

---

## 2. Variant-first, product-level-fallback reasoning

`order_size` and `units_per_order` already resolve variant-value-first, product-value-fallback
(`resolveVariantValue`, pre-existing). The three new packaging-breakdown fields
(`innerPackQuantity`, `packsPerCase`, `totalOrderQuantity`) are **variant-only** — Izzy did not
create product-level versions of these three fields, so there is nothing to fall back to.
This is confirmed correct, not a gap: the field-shape proposal Izzy built from (§1 of
`2026-08-17-task-triage-and-izzy-response.md`) explicitly scoped these three as
product-variant-only, additive to the four confirmed fields, not a replacement.

## 3. Sibling-variant leak test (Bilal's "another variant's values" failure mode)

Added a test to `components/product/__tests__/ProductView.test.tsx` (LG-04 describe block):
renders a Box variant with `innerPackQuantity=100, packsPerCase=8, totalOrderQuantity=null`,
switches to a sibling Case variant with `innerPackQuantity=null, packsPerCase=null,
totalOrderQuantity=2000`, and asserts the Case variant's values (and only those) are visible —
neither the Box variant's numbers nor its row labels persist after the switch.

**Result: passed on first run**, no production code changed. `ProductView` reads
`selectedVariant.innerPackQuantity` / `.packsPerCase` / `.totalOrderQuantity` directly off the
hook-selected variant on every render — there is no cached or derived intermediate state for
these three fields, so the sibling-leak bug class (the one that hit the AeroWalk image gallery
previously) does not apply here architecturally. This closes the coverage gap Bilal flagged;
no regression found.

## 4. The 3 named QA products

- `3cc-23g-x-1-1-2-im-thin-wall-luer-lok-tip-box-309589` — ✅ Box variant: inner+total, no
  packs. Case variant: inner+packs, blank total. Both render correctly.
- `1cc-27g-x-1-2-luer-lok-syringe-detachable-needle-box-305789` — ✅ Case variant is
  total-only. Box variant carries inner+total both = 50 (not "nothing else" as originally
  described — a data nuance, not a bug; renders fine either way).
- `pen-needle-4mm-depth-32g-x-5-32-box-9543` — ✅ **Resolved and verified, 2026-08-17.**
  Izzy published all 7 seeded products to Online Store + the Headless channel; original
  hypothesis (not published to Storefront/Headless) confirmed correct. Re-ran
  `scripts/verify-lg04-packaging-breakdown.ts` against the real handle — now resolves 6
  variants (not the single blank case originally assumed):
  - 4 of 6 variants (4mm/Box of 100, 4mm/Box of 50, 6mm/Box of 100, 8mm/Box of 100) carry
    `innerPackQuantity`/`totalOrderQuantity` both populated and equal (e.g. `100`/`100`),
    `packsPerCase` null — a third combination beyond the two already unit-tested
    (inner+packs-no-total, total-only), but structurally the same independently-gated
    render path (`ProductView.tsx` renders each of the three rows off its own null-check,
    not a combination-specific branch), so no new unit test is needed to trust this case.
  - 2 of 6 variants (6mm/Box of 50 sku 118218, 8mm/Box of 50 sku 118220) have **all three
    packaging fields null**, plus `orderSize`/`unitsPerOrder` also null at the variant
    level — these are the genuine "fully blank" case, matching the existing
    "shows none of the three breakdown rows" unit test's assertion.
  - Data nuance, not a bug: Izzy's description implied the whole product would be blank;
    in practice it's 4 populated / 2 blank variants. Same class of minor discrepancy as
    product 2 above (Box variant having both inner+total). Renders correctly either way.

## 5. Both PDP routes render identically

`app/product/[slug]/page.tsx` and `app/category/[slug]/[product]/page.tsx` both: fetch via
the same `GET_PRODUCT` query, normalize via the same `normalizeProduct`, resolve the initial
variant via the same `resolveInitialVariant`, and pass the result into the same `<ProductView>`
component with the same prop shape. Neither route touches `innerPackQuantity`, `packsPerCase`,
or `totalOrderQuantity` directly — both are thin wrappers. A route-level test would only
re-assert that `normalizeProduct`/`ProductView` work, which is already covered by the unit
suite. No route-level divergence is possible for these fields given this architecture; no
additional test added.

## 6. Cart line + structured data unaffected

Grepped the full codebase for `innerPackQuantity`, `packsPerCase`, `totalOrderQuantity`, and
`shippingReturns`. All four appear only in: the GraphQL query (`lib/shopify/queries/products.ts`),
`types.ts`, `normalize.ts`, `ProductView.tsx`, and their respective tests/verify scripts.
None appear in any cart code path (`CartProvider`, cart line-item builders) or in
`ProductSchema`/structured-data code. They were never wired into either, so there is nothing
to leak — confirmed by absence, not by a new test asserting a negative that was never at risk.

## 7. The 10 corrected variant-name products

Not started — nobody has named which 10 products these are yet, and this codebase has no
Admin search scope to discover them independently (`lib/shopify/admin.ts` is deliberately
RX-metafield-only). **Needs the list from Izzy** before this can be verified.

## 8. Real browser walkthrough (desktop) — 2026-08-17

Ran `next dev` against the QA store and drove it live via browser automation. Confirms
everything above holds in an actual rendered page, not just unit tests:

- **AeroWalk pilot (all 3 colors):** switching Blue→White→Grey updates image, SKU, Mfr #,
  H1, breadcrumb, and URL together every time — no sibling-color leakage anywhere, on the
  PDP, in Quick Add (category grid), or in structured data.
- **RETURNS tab:** Vendor Shipping & Returns section renders the real Drive Medical text
  cleanly (rich-text parser confirmed working outside the test suite).
- **LG-04 product 1 (3cc syringe):** live Box→Case switch matches the new unit test exactly
  — Total Order Quantity row disappears, Packs Per Case appears, Inner Pack Quantity stays
  correct. No stale data across the switch.
- **LG-04 product 3 (pen-needle-9543, now unblocked):** the genuinely-blank variant (6mm
  Depth / Box of 50) renders "Packaging information not available for this product" — no
  zeros, no empty labeled rows, no leaked sibling data. This is the live confirmation of the
  "all three blank, must fail gracefully" case Bilal asked for.
- **Quick Add:** gallery correctly follows the selected variant's own image for all three
  AeroWalk colors (the prior AeroWalk image-gallery fix holds under live testing).
- **Cart popup + full cart page:** both show the correct variant (image, title, color,
  SKU, price) with no packaging fields leaking into the cart line item, confirming §6's grep
  finding under real interaction, not just static analysis.
- **Structured data (`application/ld+json`):** `sku`/`mpn`/`image` correctly reflect the
  selected variant (verified on Grey), canonical `url` stays the neutral query-free product
  URL per LG-03, and none of the three packaging fields appear in the schema.

**Not yet done:** mobile-viewport walkthrough — the browser automation's window-resize tool
isn't taking effect in this environment (reports success but the viewport stays at desktop
width across three attempts). Flagged to the user rather than retried further; needs either
a manual resize or a different environment to complete.

**Unrelated finding, out of scope, not fixed:** the live DOM ends up with the `Product` and
`BreadcrumbList` JSON-LD blocks duplicated (5 `<script type="application/ld+json">` tags
instead of 3) on both PDP routes. The raw server-rendered HTML is correct (exactly 3 tags,
confirmed via a `fetch()` of the page's own URL) — the duplication happens client-side during
hydration, and lines up with a pre-existing React hydration-mismatch warning in the console
about the CSP `nonce` attribute differing between server and client on that exact script tag.
This predates today's session (unrelated to the packaging-breakdown fields, `shippingReturns`,
or anything touched this session) and reproduces on a fresh full page load, not just
client-side navigation — worth a ticket for whoever owns the CSP-nonce/caching architecture
(`app/layout.tsx`'s nonce-per-request note, `productFetchOptions`'s data-cache revalidate),
since duplicate structured data could affect SEO tools that read the post-hydration DOM. Not
blocking this QA sign-off.

---

## 9. Recommendation to Bilal

**Ready to sign off on production-readiness for the packaging-breakdown feature — all 3 of 3
named products pass, per Bilal's instruction to go for all three rather than 2 of 3.**

One item remains outstanding, unrelated to the packaging-breakdown sign-off itself:
- The 10 corrected-variant-name products (§7) — still needs Izzy's list; no code blocker.

Everything code-side is TDD'd, green (146/146 files, 1494/1494 tests, `tsc`/`eslint` clean),
and ready to commit pending the user's explicit go-ahead to push/open a PR.
