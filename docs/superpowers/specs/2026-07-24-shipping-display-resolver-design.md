# Shipping Display Resolver — Design

**Ticket:** DEV-SHIP-01 (Developer Clean-Fix Execution Plan v1.0, 2026-07-22)
**Status:** Design approved, not yet implemented
**Date:** 2026-07-24

## Problem

Shopify delivery profiles/rates are the rating truth; checkout is the final authority on
actual rate. `shipping-facts-v3.json` (schema v3.0, delivered 2026-07-20) is a snapshot
derived from those rates, classifying every product/variant into a display-safe class.
Bilal's ruling: **not for production display or Shopify writes — clean classes provisional
for checkout testing only.** This design builds the resolver now, behind a feature flag
disabled in production, so the build is unblocked without publishing anything unapproved.

The central risk: 17 variants carry `effective_rate_class: FREE` while their
`public_display_class` is `unknown`. Reading the wrong field produces a false
free-shipping badge on a product that isn't free. Only `public_display_class`
(and, where populated, `display_copy`) may ever reach the UI.

## Data findings (verified against the delivered file)

The file at the integration path (see "Data file location" below) was inspected directly:

- Structure: `{ _meta, delivery_profiles: [...10], products: { [productGid]: ProductRecord } }`,
  `ProductRecord.variants: { [variantGid]: VariantRecord }`.
- Counts verified to match the ticket exactly: `public_display_class` distribution
  (standard-paid 5,394 / threshold 927 / standard-free 635 / unknown 429 / manual-quote 0),
  `diagnostic_status` distribution, held counts (41 + 152), Canada-restricted (998),
  and the 17-variant current-state patch. The data is authentic.
- **Checksum discrepancy.** The ticket text and the file's own
  `_meta.checksum_sha256_of_payload` both declare `547a9f62a0b76cf9bfe3c54cb7b1566ed…`.
  The actual SHA-256 of the delivered file's bytes is `431fdd1960d77514e3fec79dfbb9403b8f735e22a690c28f2c2781a656f4d324`.
  Several re-serializations (minified, sorted-keys, payload-only, full-file, full-file-minus-checksum-field)
  were tried and none reproduce the declared value — this isn't a whitespace artifact.
  **Decision:** pin the actual computed hash (`431fdd19…`) as the known-good constant in
  code; validate future loads of this file against that pinned value, not the
  self-declared (unreproducible) one. This is a normal supply-chain-integrity pattern
  (pin the hash of the artifact you actually integrated against) and doesn't require
  reverse-engineering the original generator's serialization.
- **QA CSVs not found.** The 4 referenced QA files (fixture matrix, 153-variant-divergent
  list, 17-unsafe-free list, superseded draft) do not exist anywhere on this machine —
  only the JSON landed. Every field needed to reconstruct their content
  (`public_display_class`, `effective_rate_class`, `diagnostic_status`, `hold`,
  `canada_status`, `display_copy`) is present in the JSON itself, so test fixtures are
  derived directly from it (see Testing).

## Codebase findings that shape integration

- **No existing feature-flag framework.** The codebase reads plain env vars directly
  (e.g. `NEXT_PUBLIC_IS_STAGING` in `lib/site-config.ts`). The new flag follows that
  convention rather than introducing one.
- **The current "Free Shipping" badge is driven by a Shopify *tag***
  (`product.tags.includes('free-shipping')` in `components/home/PopularProducts.tsx` and
  `components/store/ShopifyQuickAddButton.tsx`) — not even `custom.free_shipping`, which
  the ticket already distrusts. This is a live, ungoverned free-shipping claim in
  production today, independent of this ticket.
- **`ShippingBlock.tsx` is dead code.** It's fully implemented but never imported
  anywhere in `app/`. `Product.shippingMessage` / `Product.leadTime`
  (`types/product.ts`) are never populated by any mapper. The PDP has no shipping
  section today.
- **Cart lines already carry both GIDs.** `CART_FRAGMENT` (`lib/shopify/queries/cart.ts`)
  returns `merchandise.id` (variant GID) and `merchandise.product.id` (product GID) on
  every line, and the cart hydrates client-side via server actions in
  `app/actions/cart.ts` (`getCart`/`addToCart`/`updateCartLine`) — the natural place to
  attach resolved shipping display before the `Cart` object crosses to the client.
- **Fordeer Product Labels has no runtime footprint on this frontend.**
  `docs/t5-post-launch-removal.md` (pre-existing) states Fordeer's theme-injection
  approach "has no effect on the headless frontend" and names `ProductBadges` as its
  replacement, flagged for post-launch removal. The ticket's §8.3 precedence table
  (Fordeer vs. resolver) therefore has no external signal to arbitrate against in this
  codebase — treated as N/A, documented here rather than built as speculative code.
- **`lib/shopify/queries/products.ts` is GraphQL query strings only** — no mapping
  functions live there. The resolver module is kept separate
  (`lib/shipping-resolver/`) specifically to avoid the file contention the ticket flags
  with the data-contract/category-registry work.

## Architecture

New module: `lib/shipping-resolver/` (server-only).

- **`data.ts`** — loads the JSON from `SHIPPING_FACTS_PATH` (env var; default dev path
  `data/shipping-facts-v3.json`, gitignored — the file is 17MB and explicitly marked
  not-for-production, so it is not committed). Lazy singleton per server process: two
  `Map`s (`Map<productGid, ProductRecord>`, `Map<variantGid, VariantRecord>`) built once
  on first access. On load: verify SHA-256 of the raw bytes against the pinned constant,
  then validate structure with `zod` (already a dependency) against the documented field
  enums. Any checksum or schema failure flips the module into **global fallback mode** —
  every subsequent lookup returns the safe fallback; nothing throws, nothing partially
  trusts the file.
- **`resolve.ts`** — the only exported API:
  - `resolveCardShippingDisplay(productGid): ShippingDisplay`
  - `resolveVariantShippingDisplay(productGid, variantGid): ShippingDisplay`
  - Return shape: `{ class: PublicDisplayClass, message: string, displayCopy: string | null }`.
    `effective_rate_class` and `diagnostic_status` are read internally but never appear in
    this type — a caller cannot wire the unsafe field to UI even by accident.
  - `message`/`displayCopy` are sourced from a small central config
    (`lib/shipping-resolver/copy.ts`), never inlined per call site, so copy approval is a
    config edit, not a code change.
  - Fallback (`{ class: 'unknown', message: 'Shipping calculated at checkout.', displayCopy: null }`)
    is produced by one code path for: missing GID, duplicate GID, unmatched GID,
    `hold: true`, global fallback mode, and any other invalid/failed-resolver case.

### Card-level conservative class

`resolveCardShippingDisplay`: if every variant of the product shares one
`public_display_class`, use it. **If they disagree at all** (paid vs. threshold,
threshold vs. free, or any other split — 153 products), the card falls back to
`unknown`/silent. This guarantees a card can never claim free or threshold shipping for
a variant that doesn't qualify. The PDP still resolves the true per-selected-variant
class once the shopper picks one.

## Feature flag

`SHIPPING_RESOLVER_ENABLED` — plain server-side env var (not `NEXT_PUBLIC_`, since the
resolver only ever runs server-side; resolved display data crosses to the client as
already-computed props, never as raw resolver access). Read once via
`isShippingResolverEnabled()`, defaulting to `false` on any unset/invalid value — a
missing var in any environment (including a misconfigured prod deploy) fails to
*disabled*, never *enabled*. When DEV-CORE-01 lands a real flag framework, only this one
helper's internals need to change.

- **Disabled** (default, and required state in production until wording/data/QA are
  approved): every call site keeps its exact current behavior unchanged — tag-based
  `hasFreeShipping`, dormant `ShippingBlock`, no cart shipping messaging.
- **Enabled**: call sites below switch to the resolver's output.

## Integration points

- **Product cards** (`ProductCard.tsx` → `ProductBadges.tsx`): `ProductCardData` gains a
  resolved `shippingDisplay` (via `resolveCardShippingDisplay`), replacing the tag-derived
  `hasFreeShipping` boolean when the flag is on. `ProductBadges` renders a badge only for
  `standard-free` and `threshold` (centrally-configured copy, placeholder pending Bilal's
  approval); `standard-paid`/`unknown`/`manual-quote` render no badge — silent, matching
  the ticket's framing and the card's limited space.
- **PDP** (`app/product/[slug]/page.tsx` → `ProductView`): server-resolves a small
  `{variantGid, shippingDisplay}[]` for just that product's variants (typically ≤ 20 —
  same pattern already used for per-variant price/availability) and passes it as a prop.
  `ShippingBlock.tsx` is wired into `ProductView` for the first time, switching with the
  client-side variant selection — no network call on variant switch, and the dataset
  never reaches the browser.
- **Cart** (`app/actions/cart.ts` → `CartProvider` → `CartPopup`/`CartPageClient`):
  server actions attach a resolved `shippingDisplay` to each cart line (using the GIDs
  already present in `CART_FRAGMENT`) before returning `Cart` to the client — same
  resolve-server-side-ship-only-the-result pattern as the PDP.
- **Fordeer §8.3**: no code (see Findings above).

**Explicitly out of scope** (per ticket): freight behavior, Canada restriction
enforcement, hold enforcement beyond claim-suppression, delivery-profile/rate/location/
Markets changes, `custom.free_shipping` metafield cleanup.

## Testing

Fixtures are derived programmatically from `shipping-facts-v3.json` (the referenced QA
CSVs don't exist on disk) into a committed `lib/shipping-resolver/__tests__/fixtures.ts`,
generated by a one-off script, covering:

- One representative product per `diagnostic_status` bucket, including
  `conditional_min_order` with its exact approved `display_copy` string.
- All 17 unsafe-FREE variants — asserted to render the fallback string, never a free badge.
- A sample of the 153 variant-divergent products — card → `unknown`, PDP → correct
  per-variant truth.
- Both `hold` reasons, a Canada-restricted product (no international messaging), missing
  GID, duplicate GID, and a synthetic checksum/schema-failure case (global fallback mode).

Resolver unit tests live in `lib/shipping-resolver/__tests__/` (matches existing `lib/`
convention), run via `vitest run`. UI-level tests sit alongside
`components/product/__tests__/` and `components/store/__tests__/`.

## Non-goals

Everything in the ticket's "Do not implement from this data" list, plus: no new
feature-flag framework (follows existing env-var convention), no Fordeer integration
code, no changes to `custom.free_shipping`, no Shopify production rate/profile/location
writes.
