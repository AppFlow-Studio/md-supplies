# AeroWalk pilot — variant field contract (proposal)

**From:** Sardor (dev) · **To:** Izzy · **Date:** 2026-08-14
**Status:** Proposed — do not create Shopify metafield definitions from this
doc until Izzy confirms or replaces the keys below. Bilal's message names the
four merchant-facing fields; this doc proposes the underlying Shopify
namespace/key so dev and catalog data agree on one contract, not two parallel
names (per Bilal: "Use the same field contract Izzy implements... do not
create parallel code-only names").

## Proposed variant metafield definitions

All four are scoped to the **Product variant** owner type (not Product) —
shown "only when a variant is opened," per Bilal's Admin-structure section.

| Merchant-facing name | Namespace.key | Type | Storefront access | Notes |
|---|---|---|---|---|
| Manufacturer Item Number | `custom.manufacturer_item_number` | Single line text | PUBLIC_READ | New definition. No product-level fallback — every variant (including a lone Default variant) carries its own value directly, per LG-01's "make every Admin variant row self-identifying" rule. |
| Order Size / Sold As | `custom.order_size` | Single line text | PUBLIC_READ | **Reuses the existing key** already live at product level (`custom.order_size`, confirmed in Izzy's LG-01/LG-02 report and already queried by `GET_PRODUCT`). Shopify scopes metafield definitions by owner type, so a variant-level definition with the same namespace/key as the product-level one is not a collision — but please confirm the variant-level definition doesn't already exist under a different key before creating it, to avoid the "duplicate definitions with slightly different names" Bilal flagged. |
| Units per Order | `custom.units_per_order` | Single line text | PUBLIC_READ | Same reuse rationale as Order Size. |
| Variant Description | `custom.variant_description` | Multi-line text | PUBLIC_READ | New. Only populate when the archived source has genuinely variant-specific content — dev already resolves this against the shared product description and will not display it if they'd read identically (see "no duplicate display" rule below). |

If any of these differs from what you create, tell Sardor the actual
namespace/key and only `GET_PRODUCT`'s variant selection in
`lib/shopify/queries/products.ts` and this table need to change — every other
file consumes the already-normalized field name (`manufacturerNumber`,
`orderSize`, `unitsPerOrder`, `description` on the normalized `ProductVariant`
type), not the raw Shopify key.

## Native fields already wired (no metafield needed)

- Variant image: Shopify's native variant-media assignment. Already fetched
  and rendered on the PDP; Quick Add has been extended in this same pass to
  read it too (Quick Add previously never swapped its image on variant
  selection — pre-existing gap, unrelated to AeroWalk, fixed alongside it).
- Variant SKU, barcode, price, availability: already native fields, already
  synced (LG-03).

## Display resolution rules (dev-side, implemented as of this pass)

1. Selected variant value first.
2. Shared/product value only when the variant value is blank.
3. Never render the variant-specific block a second time if it is identical
   to the shared value already shown elsewhere on the page (applies to
   Variant Description vs. the main product Description).

Implementation: `lib/product/resolve-variant-value.ts`
(`resolveVariantValue`, `resolveVariantSupplement`), consumed by
`components/product/ProductView.tsx` and both PDP routes' structured-data
wiring.

## Pinned product metafields (Admin structure — Izzy-owned, confirming dev has no
conflicting expectation)

Order: Rx Only, Backorder, Estimated Backorder Restock Date, Free Shipping,
Vendor Shipping & Returns. Dev already queries `custom.is_rx_only`,
`custom.backorder`, `custom.estimated_back_order_restock_date`,
`custom.free_shipping` (all confirmed live keys — see
`lib/shopify/queries/products.ts`). Vendor Shipping & Returns is H-01,
tracked separately and not part of this pass.

## AeroWalk pilot — what dev needs from Izzy before verification

- The three variant GIDs/handles for Blue (`10277BL`), White (`10277WT`),
  Grey (`10277GY`) on the **one** consolidated AeroWalk product, so QA can be
  pointed at exact URLs.
- Confirmation the four metafield definitions above (or your actual
  namespace/keys) are created **and** have Storefront `PUBLIC_READ` enabled —
  a definition without Storefront access silently returns `null` to every
  query with no error (same failure mode already documented for
  `brand_name`/`free_shipping` in `lib/shopify/queries/products.ts`).
- If the old color-specific product handles are being retired in favor of the
  one consolidated handle, the old→new handle mapping, so a row can be added
  to `docs/redirects-ready.json` (loaded by `proxy.ts`, 301, already the
  mechanism this repo uses for every other consolidated-product redirect —
  no new code needed, just the data row).

## Dev-side status as of this pass (2026-08-14)

Everything below is implemented and tested against mocked/fixture data. None
of it can be verified end-to-end against the real AeroWalk product until the
metafield definitions above exist in Shopify with real data:

- `GET_PRODUCT` requests all four variant metafields plus native variant
  media (already did).
- `ProductView.tsx` renders Manufacturer Item Number separately from
  Internal SKU (previously conflated — see below), shows the resolved
  variant order unit directly below the variant selector and above Add to
  Cart, and shows a Variant Description supplement only when it's genuinely
  different from the shared product description.
- Structured data (`ProductSchema`) on **both** PDP routes emits `mpn` and
  the selected variant's own image — the category route
  (`/category/[slug]/[product]`) previously emitted no structured data at
  all for products; that gap is closed too.
- Quick Add's image gallery now follows the selected variant, the same way
  the PDP does, including never showing a sibling color's image when the
  selected one has none.

### Pre-existing defect found and fixed along the way

The PDP's Specifications tab had a heading literally labeled "Item Number"
displaying the **internal SKU** — conflating the two identifiers the launch
plan's non-negotiable rule (and Figure 3) explicitly requires kept separate.
Fixed as part of this pass: "Manufacturer Item Number" and "Internal SKU" are
now two separate, separately-labeled rows.

## Post-Izzy-write verification checklist (Sardor task 6)

Once the above lands in Shopify and cache/webhook revalidation has run for
the AeroWalk handle:

- [ ] `/product/<aerowalk-handle>` — Blue, White, Grey each show their own
      image, SKU, manufacturer number, order unit, on desktop and mobile.
- [ ] `/category/<collection>/<aerowalk-handle>` — same, both routes must
      never disagree (LG-03 contract).
- [ ] Quick Add from a grid card — same three colors, same fields.
- [ ] Cart line after Add to Cart — correct variant/SKU/image.
- [ ] View page source structured data (`application/ld+json`) — `sku`,
      `mpn`, and `image` all follow the selected variant, not always Blue.
- [ ] Screenshots of all of the above, plus the Shopify Admin product page
      and all three variant records, per Bilal's request.
