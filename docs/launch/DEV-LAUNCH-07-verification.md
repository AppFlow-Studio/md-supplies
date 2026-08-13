# DEV-LAUNCH-07 — Final Launch Configuration & Implementation Plan

**Ticket:** DEV-LAUNCH-07 (2026-08-05) · **Priority:** P0 launch gate · **Owner:** Developers
**Builds on:** [DEV-LAUNCH-02-config.md](./DEV-LAUNCH-02-config.md) (env/config, done)
**Branch:** `catalog-cro-review-sardor-dev` @ base `3cd4498`

## Starting position

Most of this ticket's scope was already built by prior work on this branch:
`lib/brand.ts` (public Brand, never Vendor), `lib/purchasability.ts` (zero-price
vs. out-of-stock kept distinct, fail-closed), `lib/labels/labels.ts` (shared
RX/backorder contract), and the card/PDP/cart components already wire through
those shared modules rather than re-implementing checks locally. This pass
verified that wiring end to end against the two hard rules and fixed the gaps
found — it did not start from zero.

## The two hard rules — verified

**Public Brand never falls back to Shopify Vendor.** `lib/brand.ts`'s
`publicBrand()` reads only `custom.brand_name`; every consumer (card, quick
add, PDP, "You May Also Like"/"Frequently Bought With", structured data)
calls it and never reads `vendor` for display. Confirmed live against the QA
store's `gloves` collection (brand line renders `AMSINO INTERNATIONAL, INC.`
/ `AMMEX CORPORATION` — the approved field, not the fulfiller). Regression
tests: `lib/__tests__/purchasability.test.ts`, new brand tests in
`components/store/__tests__/ShopifyProductCard.test.tsx`.

**Zero-price products display contact-for-pricing and stay blocked from
checkout.** `lib/purchasability.ts`'s `resolvePurchasable()` checks price
before availability, everywhere. Confirmed live: QA fixture `qa-no-rate`
("QA Xylocaine Order-For-Pricing", price `$0.00`) renders "Contact for
pricing" and a disabled "REQUEST PRICING" button on the PDP. Two bypasses of
this rule were found and fixed this pass (below).

## Defects found and fixed this pass

### 1. Quick add's modal ignored price when switching variants (checkout-bypass)

`components/store/ShopifyQuickAddButton.tsx` correctly disables the card
trigger using `resolvePurchasable()` on the *first* variant — but once the
modal (`QuickAddContent.tsx`) was open, `canAdd` only checked
`availableForSale`, never price. On a multi-variant product where variant A
is priced (so the trigger opens) and variant B is `availableForSale: true`
with price `0`, a shopper could select variant B inside the modal and add a
$0 line straight past the rule. Fixed: `QuickAddContent.tsx` now runs every
variant (default selection, swatch buttons, the Add to Cart button) through
the same `resolvePurchasable()`/`hasUsablePrice()` the card and PDP use — a
zero-price swatch is disabled and reads "Contact for pricing", never `$0.00`.

### 2. Quick add could show "Added to Cart" for a line Shopify silently dropped

`AddToCartButton.tsx` (PDP) already checks the boolean `addItem()` returns
before celebrating (a documented Phase 11 fix). `QuickAddContent.tsx`'s
`handleAdd` did not — it always set `added = true`, regardless of whether
Shopify actually added the line. Fixed to match `AddToCartButton`'s pattern.

### 3. Product structured data emitted a $0 Offer for quote-only products

`ProductSchema.tsx` always emitted `offers.price` unconditionally. For a
zero-price product this put `price: 0` in the page's JSON-LD while the page
itself said "Contact for pricing" — a structured-data/PDP disagreement that
could surface a misleading $0 rich result. Fixed: the `Offer` node is now
omitted entirely (via `hasUsablePrice()`) when the price is not usable,
rather than fabricating one.

### 4. Cards/quick-add fed by the shared `ProductCard` GraphQL fragment were missing brand/RX/backorder fields

`GET_COLLECTION` (the category grid) already selected `brandName`,
`estimatedRestockDate`, and `isRxOnly`. The shared `PRODUCT_CARD_FRAGMENT` —
used by `GET_PRODUCTS_BY_VENDOR` (partner product listings, a live
`ShopifyProductCard` surface at `/partners/[slug]/products`), `GET_PRODUCT_RECS`
(PDP "You May Also Like" / "Frequently Bought With"), `GET_PRODUCTS`, and
`GET_PRODUCT_CARD_FULL` — did not, so those surfaces silently degraded: no
brand line even when `custom.brand_name` was set, no RX badge for the 40
ACTIVE metafield-only RX products, and a backordered item read as plain "Out
of Stock" instead of carrying a restock date. This was a documented,
intentional degradation path in `lib/shopify/types.ts` (`CollectionProduct`'s
comments say queries that omit the fields "degrade to tag-only detection"),
not a hard-rule violation, but it disagreed with the category grid on the
same data. Fixed by adding the three metafield selections to
`PRODUCT_CARD_FRAGMENT` once, fixing every consumer.

None of the four defects affects the two hard rules' *safety direction* —
every failure mode found was fail-open in a completeness sense (showing less
than it should) or, for #1, an actual gap in the checkout-block rule; none
ever showed a fabricated Vendor-as-Brand or a genuinely purchasable $0 line.

## Scope already correct, verified not re-broken

- **Single- vs multi-variant consistency**: `ProductView.tsx`'s
  `getDefaultVariant()` now also prefers a purchasable variant over merely
  an available one (a $0 variant could otherwise win the default slot even
  when a real one exists) — same pattern applied to quick add.
- **Cart-level agreement**: `lib/purchasability.ts`'s `blockedCartLines()` /
  `blockedCheckoutMessage()` are already wired into both `CartPopup.tsx` and
  `CartPageClient.tsx`, blocking "Proceed to Checkout" and naming the
  offending line if a zero-price item ever reaches the cart.
- **GID identity**: every list key and cart/variant reference (`product.id`,
  `variant.id`, `line.id`) is the Shopify GID; SKU is used only for display
  (`Item #:`, "SKU: …"), never as a React key or lookup identity — confirmed
  by reading every card/cart/selector component in this data path.
- **Accessible quick add**: focus trap, Escape-to-close, and focus-return to
  the trigger were already implemented and covered by
  `QuickAddModal.test.tsx`; unchanged this pass.

## GraphQL fields used (Brand, RX, price, inventory, backorder)

| Concern | Field(s) | Queries |
|---|---|---|
| Public Brand | `metafield(namespace: "custom", key: "brand_name")` → `brandName` | `GET_PRODUCT`, `GET_COLLECTION`, `SEARCH_PRODUCTS_BY_TAG`, `PRODUCT_CARD_FRAGMENT` (all five consumers) |
| RX | `metafield(namespace: "custom", key: "is_rx_only")` → `isRxOnly`, unioned in `lib/rx-gate.ts` with the `compliance:rx-only` **tag** | same set as Brand |
| Backorder | `metafield(namespace: "custom", key: "estimated_back_order_restock_date")` → `estimatedRestockDate`, resolved by `lib/labels/labels.ts` | same set as Brand |
| Price | `variants.nodes.price { amount currencyCode }` / `compareAtPrice`, `priceRange.minVariantPrice` | every product/card query |
| Inventory / availability | `availableForSale` at both product and variant level (never a real-time stock count — no `quantityAvailable`-as-truth claim is rendered) | every product/card query |

`lib/shopify/__tests__/product-query-metafields.test.ts` asserts these
selections exist in the raw query strings for `GET_PRODUCT`,
`GET_PRODUCTS_BY_VENDOR`, and `GET_PRODUCT_RECS` — a regression here fails a
unit test, not just a code review.

## Test evidence

```
npx tsc --noEmit                          # clean
npx eslint . --max-warnings 0             # clean
npx vitest run                            # 123 files, 1178 tests passed
rm -rf .next && npm run build              # exit 0, 67/67 pages, zero API errors
```

New/extended unit coverage this pass:
- `components/product/__tests__/QuickAddContent.test.tsx` (new) — zero-price
  variant blocks the add, defaults to a priced variant when one exists,
  never shows "Added to Cart" for a dropped line.
- `components/schema/__tests__/ProductSchema.test.tsx` (new) — Offer omitted
  for zero/NaN price, Brand node omitted/emitted correctly.
- `components/shared/__tests__/ProductImage.test.tsx` (new) — the
  real-image → category-placeholder → global-placeholder → neutral-div
  fallback chain, so "missing image" never renders a broken-image icon.
- `components/store/__tests__/ShopifyProductCard.test.tsx` (extended) —
  zero-price card state, brand omission never falls back to vendor, approved
  brand renders when present.
- `lib/shopify/__tests__/product-query-metafields.test.ts` (extended) —
  guards the fragment fix in defect #4.

### Live verification against the QA store (manual, this pass)

Ran the dev server against the real QA store (`.env.local`,
`md-supplies-qa-shipping-and-checkout.myshopify.com`) and drove it with
browser automation:

| Fixture | Route | Observed |
|---|---|---|
| Zero-price (`qa-no-rate`) | `/product/qa-no-rate` | "Contact for pricing", disabled "REQUEST PRICING" |
| Out of stock (`qa-out-of-stock`) | `/product/qa-out-of-stock` | Red "Out of Stock" indicator + real price ($9.99) shown together, disabled "OUT OF STOCK" button — price and stock kept as distinct states, per `lib/purchasability.ts` |
| "Backorder" fixture (`qa-backorder`) | `/product/qa-backorder` | Renders as a normal in-stock, in-price product (`$12.50`, enabled "ADD TO CART") — this QA fixture is currently `availableForSale: true`, so it does not exercise the backordered branch. Not a code defect; noted honestly rather than claimed as verified, matching the existing skip-with-reason pattern in `e2e/axe-states.spec.ts`. |
| Category grid (`gloves`) | `/category/gloves` | Cards show the approved brand line, real price, quick-add "+" |
| Quick add → Add to Cart | same page | Modal opens with correct product/price; clicking Add to Cart shows the pending state, then opens the cart popup with the correct line and subtotal; button reverts to "Add to Cart" after the confirmation window — full round trip against the live Storefront API |

### 2026-08-09 update — Izzy's fixture set landed, previously-open gaps closed live

Izzy added a full fixture set to the QA store (`qa-missing-image`, `qa-missing-brand`,
a genuinely-backordered `qa-backorder`, plus the DEV-LAUNCH-08 RX set below). Re-ran
the dev server against `.env.local` and drove it with browser automation:

| Fixture | Route | Observed |
|---|---|---|
| `qa-backorder` (now `availableForSale: false`, restock metafield `2027-03-01`) | `/product/qa-backorder` | Exercises the real backordered branch for the first time: price still shown (`$12.50`), amber "Back-ordered – ships 2027-03-01" label, disabled grey "OUT OF STOCK" button — price and backorder state kept as distinct signals, per `lib/labels/labels.ts`'s single-metafield-source contract |
| `qa-missing-image` (brand `Dynarex` present, zero product images) | `/product/qa-missing-image` | PDP falls through the image chain to the neutral placeholder div — no broken-image icon, no layout collapse, brand line ("DYNAREX") and price/Add-to-Cart render normally. Card view (`/search?q=qa-missing`) falls to the illustrated category placeholder instead of the neutral div (same fallback chain, different tier — both are "visually complete", neither is a broken-image icon) |
| `qa-missing-brand` (real image, no `custom.brand_name`) | `/product/qa-missing-brand` | No brand line renders at all (not "undefined", not empty gap) — title sits directly under the breadcrumb, price/Add-to-Cart unaffected. Same on the card |

Full test suite re-run after this pass: `npx tsc --noEmit` clean, `npx eslint . --max-warnings 0` clean, `npx vitest run` 124 files / 1191 tests passed, `npm run build` exit 0, 67/67 pages.

Not re-run this pass: the `axe-states.spec.ts` live QA run (no code changed in the
render path; the fixtures now exist but that spec's own fixture handles/assertions
weren't touched). Recommend re-running it now that `qa-missing-image`/`qa-missing-brand`
exist, as a follow-up, since it was written before those fixtures did.

Ran `e2e/axe-states.spec.ts` (the existing product-state a11y spec, which
already targets these same three QA fixture handles) against the live QA
store:

```
6 passed, 2 failed (pdp-zero-price, pdp-backorder)
  scrollable-region-focusable [serious] .gap-0
```

This is the PDP's "More products" horizontally-scrollable row
(`overflow-x-auto` with no keyboard affordance) — a pre-existing,
already-tracked defect (see `docs/TASK-REGISTER-2026-08-03.md` §C-01: "a PDP
`scrollable-region-focusable` axe violation... pre-existing... tracked
separately"), unrelated to zero-price/backorder rendering and not introduced
or touched by this pass. Flagged here rather than silently left out of the
evidence.

## Screenshots

Captured live against the QA store during this pass (see conversation
attachments): PDP zero-price state, PDP out-of-stock state, PDP normal
in-stock state, category grid cards, quick-add modal (open + pending +
success), cart popup after a live add.

**Not captured — no fixture exists**: missing-image and missing-Brand PDP/
card states. No QA-store product currently has a missing image or a missing
`custom.brand_name` (the 41 production products missing brand_name, per
`docs/TASK-REGISTER-2026-08-03.md` B-17, are a production-catalog fact, not
represented on the QA store). The render logic for both states is unit-
tested (`ProductImage.test.tsx`'s fallback chain; `ShopifyProductCard.test.tsx`'s
brand-omission case) but not screenshotted against a real fixture — same gap
already tracked under "Needs from Izzy: QA fixtures for zero-price, OOS,
backorder, missing-image, and missing-Brand" in the ticket's own
dependencies.

## Acceptance criteria status

| Criterion | Status |
|---|---|
| No Shopify Vendor is shown as Brand | ✅ verified live + unit tests |
| Zero-price products cannot be added or checked out | ✅ fixed (defect #1) + verified live + unit tests; structured data no longer disagrees (defect #3) |
| Unavailable variants cannot be submitted | ✅ (pre-existing, `resolvePurchasable` checked on every surface) |
| Backorder state uses the configured source and does not masquerade as in stock | ✅ live-verified 2026-08-09 — `qa-backorder` now genuinely backordered on the QA store, renders price + amber backorder label + disabled button, never "in stock" |
| Missing image and missing Brand states remain visually complete | ✅ live-verified 2026-08-09 — `qa-missing-image` and `qa-missing-brand` fixtures now exist on the QA store; both render complete, no broken-image icon, no layout gap |
| Quick add is keyboard operable and returns focus correctly | ✅ pre-existing (`QuickAddModal.test.tsx`), unchanged |

## Dependencies status

- **DEV-LAUNCH-02**: done (see `DEV-LAUNCH-02-config.md`).
- **Needs from Izzy — QA fixtures for zero-price, OOS, backorder,
  missing-image, missing-Brand**: ✅ fully satisfied as of 2026-08-09. Zero-price
  and OOS fixtures already existed and behave correctly live. `qa-backorder`
  is now genuinely backordered. `qa-missing-image` and `qa-missing-brand`
  now exist and both render visually-complete states, live-verified.
- **DEV-LAUNCH-08 (RX state on the same surfaces)**: unaffected by this
  pass; RX detection/badging is unchanged (still the shared
  `lib/rx-gate.ts` union), and the fragment fix in defect #4 makes RX data
  *available* to more surfaces without changing gate behavior.
- **DEV-LAUNCH-09 (cart agreement)**: `blockedCartLines()` is already wired
  into both cart surfaces; unaffected by this pass.
- **DEV-SHIP-01**: `SHIPPING_RESOLVER_ENABLED` remains off; not touched.
