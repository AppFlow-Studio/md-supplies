# AeroWalk Variant Field Sync (LG-03 catalog/media close-out + LG-04) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the PDP (both routes), structured data, and Quick Add a typed, tested contract for the four variant-detail fields Bilal approved on 2026-08-14 (Manufacturer Item Number, Order Size / Sold As, Units per Order, Variant Description) plus native variant media — so the moment Izzy writes the AeroWalk pilot data in Shopify, the storefront renders it correctly with no further dev work, and no PDP surface can show one variant's identity while another variant's media/content is visible.

**Architecture:** Extend the existing LG-03 selected-variant pipeline (`lib/shopify/types.ts` → `lib/shopify/normalize.ts` → `GET_PRODUCT` → `useSelectedVariant` → `ProductView`) with four new variant metafields, following the exact pattern already used for `variant.image` (optional field, graceful null on unpopulated data). Add a small resolver module encoding Bilal's three display rules (variant-first, product-fallback-only-when-blank, no duplicate display) so `ProductView`, `ProductSchema`, and any future consumer share one implementation. Separately, close a pre-existing gap: Quick Add reads a different type (`ProductCardData` in `types/product.ts`) fed by the shared card-query fragment, which has never carried variant images — extend that path the same way so Quick Add can't show a stale color either.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Shopify Storefront API (GraphQL), Vitest + Testing Library, Playwright.

**Spec:** Bilal's 2026-08-14 Slack message (AeroWalk pilot field contract + Sardor's 8 tasks), read together with `MDSupplies-Launch-Remediation-Execution-Plan-2026-08-13`'s LG-03/LG-04 sections and Izzy's `LG-01-LG-02-GATE-REPORT-2026-08-13` (0 of 224 color families have variant-level images; AeroWalk — Blue `10277BL`, White `10277WT`, Grey `10277GY` — is the pilot). No spec file exists in `docs/superpowers/specs/` for this; this plan argues directly from those three sources.

## Global Constraints

- Do not unarchive, delete, or rebuild AeroWalk (or any) archived products — Izzy's data work only; this plan is dev-only and touches no Shopify data.
- Manufacturer item number and internal SKU are different identifiers and must always render as two separate, separately-labeled values — never conflated (this repo currently has exactly this bug: see Task 7).
- Do not duplicate a product-level value into every variant's display when the variant value is absent and would just repeat the shared one identically — use the resolver from Task 5 everywhere, not ad hoc `??` chains.
- Parent product title, handle, and canonical/schema URL stay color-neutral and variant-neutral; only the *selected* variant's identity (color, manufacturer number, media) may vary. Already implemented for title/canonical (LG-03) — do not regress it while adding the new fields.
- If a selected color has no verified image, never fall back to another color's image — fall back to the neutral placeholder chain (`ProductImage`'s existing fallback), never `product.images.nodes`, on any multi-color product surface (PDP gallery, Quick Add gallery, structured data).
- New variant metafield keys are **proposed, not confirmed** — Task 1's contract doc is the single source of truth for the exact `namespace`/`key` strings every other task must use verbatim. If Izzy's actual definitions differ, only Task 1's doc and the query string literals in Tasks 4/9 need to change — every other task consumes the already-normalized field, not the raw key.
- Every new/changed field on `ProductVariant` must be optional (`field?: T`), mirroring the existing `image?: ProductImage | null` field — this keeps every pre-existing test fixture across the repo type-checking without modification, exactly as the LG-03 comment on `image` already documents.

---

## File Structure

| File | Responsibility |
|---|---|
| `docs/launch/2026-08-14-variant-field-contract.md` | New. Proposed metafield contract for Izzy; pinned-field recap; post-Izzy verification checklist. |
| `lib/shopify/types.ts` | Add `VariantMetafields` type; extend `ProductVariant`; widen `CollectionProduct.variants.nodes` Pick to include `image`. |
| `lib/shopify/normalize.ts` | Add `normalizeVariant`; wire into `normalizeProduct`; extend `RawProduct`/add `RawVariant`. |
| `lib/shopify/queries/products.ts` | `GET_PRODUCT`: add 4 variant metafields. `PRODUCT_CARD_FRAGMENT`, `SEARCH_PRODUCTS_BY_TAG`: add `variant.image`. |
| `lib/shopify/queries/collections.ts` | `GET_COLLECTION`: add `variant.image`. |
| `lib/shopify/queries/search.ts` | `SEARCH_PRODUCTS`: add `variant.image`. |
| `lib/shopify/__tests__/product-query-metafields.test.ts` | Extend with variant-metafield and variant-image query guards. |
| `lib/product/resolve-variant-value.ts` | New. `resolveVariantValue` / `resolveVariantSupplement` — Bilal's 3 display rules, shared by `ProductView` and `ProductSchema`. |
| `lib/product/__tests__/resolve-variant-value.test.ts` | New. Unit tests for the resolver. |
| `components/product/useSelectedVariant.ts` | Fix gallery fallback to never leak a sibling color's images; expose `isMultiColor`. |
| `components/product/__tests__/useSelectedVariant.test.ts` | New. Unit tests for the gallery fix. |
| `components/product/ProductView.tsx` | Manufacturer-number/SKU split (fixes existing mislabeling), reposition + variant-source the Order Unit block, add Variant Description supplement. |
| `components/product/__tests__/ProductView.test.tsx` | New. Component tests for the above. |
| `components/schema/ProductSchema.tsx` | No signature change — `mpn`/`image` are already optional props, just newly populated by callers. |
| `app/product/[slug]/page.tsx` | Pass `mpn` + variant-aware `image` to `ProductSchema`. |
| `app/category/[slug]/[product]/page.tsx` | **Add** `ProductSchema` (currently missing entirely — parity gap) with the same wiring. |
| `app/product/__tests__/variant-schema.test.ts` | Extend fixtures + assertions for `mpn`/variant image. |
| `app/category/__tests__/product-schema.test.ts` | New. Proves the category route now emits `ProductSchema` too. |
| `types/product.ts` | Add `image` to `ProductCardData.variants[]` entries. |
| `components/store/ShopifyQuickAddButton.tsx` | `toCardData`: pass variant `image` through. |
| `components/product/QuickAddContent.tsx` | Switch gallery to the selected variant's image (with the same no-other-color-leak rule), reset `activeImg` on variant switch. |
| `components/product/__tests__/QuickAddContent.test.tsx` | Extend with variant-image-switch assertions. |

---

### Task 1: Field contract proposal doc for Izzy

**Files:**
- Create: `docs/launch/2026-08-14-variant-field-contract.md`

**Interfaces:**
- Produces: the exact `namespace`/`key` string literals every later task's query/type must match verbatim (`custom.manufacturer_item_number`, `custom.order_size`, `custom.units_per_order`, `custom.variant_description`, all as **variant**-owner metafield definitions).

- [ ] **Step 1: Write the contract doc**

```markdown
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
  and rendered on the PDP; Quick Add is being extended in this same pass to
  read it too (Quick Add currently never swaps its image on variant
  selection — pre-existing gap, unrelated to AeroWalk, being fixed alongside
  it).
- Variant SKU, barcode, price, availability: already native fields, already
  synced (LG-03).

## Display resolution rules (dev-side, already implemented as of this pass)

1. Selected variant value first.
2. Shared/product value only when the variant value is blank.
3. Never render the variant-specific block a second time if it is identical
   to the shared value already shown elsewhere on the page (applies to
   Variant Description vs. the main product Description).

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
```

- [ ] **Step 2: Commit**

```bash
git add docs/launch/2026-08-14-variant-field-contract.md
git commit -m "docs(catalog): propose AeroWalk variant field contract for Izzy"
```

---

### Task 2: Type the four variant metafields + widen `CollectionProduct`

**Files:**
- Modify: `lib/shopify/types.ts`

**Interfaces:**
- Produces: `VariantMetafields` type; `ProductVariant.manufacturerNumber?: string | null`, `.orderSize?: string | null`, `.unitsPerOrder?: string | null`, `.description?: string | null`; `CollectionProduct.variants.nodes` now `Pick<ProductVariant, ... | 'image'>`.

- [ ] **Step 1: Add `VariantMetafields` and extend `ProductVariant`**

In `lib/shopify/types.ts`, replace the existing `ProductVariant` type (lines 43-60):

```typescript
export type VariantMetafields = {
  /** `custom.manufacturer_item_number` (variant-owned, proposed — see
      docs/launch/2026-08-14-variant-field-contract.md). No product-level
      fallback: every variant carries its own value directly. Optional/null
      until Izzy's AeroWalk pilot write lands. */
  manufacturerNumber?: string | null
  /** `custom.order_size` (variant-owned, reuses the existing product-level
      key/name — see contract doc). Falls back to `Product.orderSize` when
      blank via lib/product/resolve-variant-value.ts. */
  orderSize?: string | null
  /** `custom.units_per_order` (variant-owned). Falls back to
      `Product.unitsPerOrder` / `Product.quantityOfUnits` when blank. */
  unitsPerOrder?: string | null
  /** `custom.variant_description` (variant-owned, proposed). Only ever
      rendered as a supplement to `Product.description`, and only when it
      differs from it — see resolveVariantSupplement. */
  description?: string | null
}

export type ProductVariant = {
  id: string;
  title: string;
  sku: string | null;
  /** Shopify barcode field; often junk (SKU copies) — see lib/gtin.ts. */
  barcode?: string | null;
  availableForSale: boolean;
  quantityAvailable: number | null;
  selectedOptions: SelectedOption[];
  price: Money;
  compareAtPrice: Money | null;
  /** Shopify's own variant-media assignment (native field, not a metafield).
      Null/absent when the variant has no assigned image — callers fall back
      to the product's shared gallery rather than inferring color from
      filename/text. Optional so existing variant fixtures/queries that don't
      select it still type-check. */
  image?: ProductImage | null;
} & VariantMetafields;
```

- [ ] **Step 2: Widen `CollectionProduct.variants.nodes` to carry `image`**

In the same file, find `CollectionProduct` (around line 160):

```typescript
  variants: { nodes: Pick<ProductVariant, 'id' | 'title' | 'price' | 'compareAtPrice' | 'availableForSale' | 'quantityAvailable'>[] };
```

Replace with:

```typescript
  // 'image' added so Quick Add (fed by this type) can switch its gallery on
  // variant selection instead of always showing the product's first image
  // regardless of which color is picked — the same defect LG-03 fixed on the
  // PDP, present here too because this type never carried variant media.
  variants: { nodes: Pick<ProductVariant, 'id' | 'title' | 'price' | 'compareAtPrice' | 'availableForSale' | 'quantityAvailable' | 'image'>[] };
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit -p .`
Expected: 0 errors (both new fields are optional, so no existing literal/fixture breaks).

- [ ] **Step 4: Commit**

```bash
git add lib/shopify/types.ts
git commit -m "feat(catalog): type the AeroWalk variant field contract"
```

---

### Task 3: Normalize the raw variant metafields

**Files:**
- Modify: `lib/shopify/normalize.ts`

**Interfaces:**
- Consumes: `VariantMetafields` (Task 2).
- Produces: `normalizeVariant(raw: RawVariant): ProductVariant`, exported `RawVariant` type; `normalizeProduct` now maps `variants.nodes` through it.

- [ ] **Step 1: Add `RawVariant` and `normalizeVariant`, update `RawProduct`**

Replace the full contents of `lib/shopify/normalize.ts`:

```typescript
import type { Product, ProductMetafields, ProductVariant, VariantMetafields } from '@/lib/shopify/types'

// Shopify returns metafields as `{ value: string } | null`, not bare strings.
// This type reflects the actual JSON shape before we normalize it.
export type RawMetafield = { value: string } | null

// Mirrors ProductVariant's raw-metafield shape the same way RawProduct does
// for product-level metafields (below) — variant.image is a native field,
// already correctly typed on ProductVariant, so it is NOT part of this
// remapped set.
export type RawVariant = Omit<ProductVariant, keyof VariantMetafields> & {
  [K in keyof VariantMetafields]?: RawMetafield
}

export type RawProduct = Omit<Product, keyof ProductMetafields | 'variants'> & {
  variants: { nodes: RawVariant[] }
} & {
  [K in keyof ProductMetafields]: RawMetafield
}

function normalizeVariant(raw: RawVariant): ProductVariant {
  const mv = (m: RawMetafield | undefined): string | null => m?.value ?? null
  return {
    ...raw,
    manufacturerNumber: mv(raw.manufacturerNumber),
    orderSize:          mv(raw.orderSize),
    unitsPerOrder:      mv(raw.unitsPerOrder),
    description:        mv(raw.description),
  }
}

/**
 * Flattens GET_PRODUCT's raw metafield objects into the Product shape the
 * UI consumes. Shared by every route that renders a PDP — the category
 * product route previously skipped this and passed raw `{ value }` objects
 * into ProductView (crashing spec rows / breaking the backorder date).
 */
export function normalizeProduct(raw: RawProduct): Product {
  const mv = (m: RawMetafield): string | null => m?.value ?? null
  return {
    ...raw,
    variants:             { nodes: raw.variants.nodes.map(normalizeVariant) },
    brandName:            mv(raw.brandName),
    unitsPerOrder:        mv(raw.unitsPerOrder),
    quantityOfUnits:      mv(raw.quantityOfUnits),
    orderSize:            mv(raw.orderSize),
    material:             mv(raw.material),
    use:                  mv(raw.use),
    features:             mv(raw.features),
    color:                mv(raw.color),
    sterility:            mv(raw.sterility),
    thickness:            mv(raw.thickness),
    gloveSize:            mv(raw.gloveSize),
    needleGauge:          mv(raw.needleGauge),
    needleLength:         mv(raw.needleLength),
    sizeLength:           mv(raw.sizeLength),
    estimatedRestockDate: mv(raw.estimatedRestockDate),
    backorderRestockEta:  mv(raw.backorderRestockEta),
    testsFor:             mv(raw.testsFor),
    detectableDrugs:      mv(raw.detectableDrugs),
    adulterants:          mv(raw.adulterants),
    otherFeatures:        mv(raw.otherFeatures),
    typeList:             mv(raw.typeList),
    customBadge1:         mv(raw.customBadge1),
    customBadge2:         mv(raw.customBadge2),
    customBadge3:         mv(raw.customBadge3),
  }
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p .`
Expected: 0 errors. If `app/category/[slug]/[product]/page.tsx`'s `generateMetadata` (which types its fetch as `Product | null`, not `RawProduct`, per the code read earlier) now errors because raw variant metafields aren't flattened there, that call site was already passing raw data straight through without normalization for `p.images`/`p.title` only (no variant fields touched) — confirm it still compiles; it does not need to change for this task.

- [ ] **Step 3: Commit**

```bash
git add lib/shopify/normalize.ts
git commit -m "feat(catalog): normalize variant-level manufacturer/order-unit/description metafields"
```

---

### Task 4: Query the four variant metafields in `GET_PRODUCT`

**Files:**
- Modify: `lib/shopify/queries/products.ts`
- Modify: `lib/shopify/__tests__/product-query-metafields.test.ts`

**Interfaces:**
- Consumes: namespace/key literals from Task 1's contract doc.
- Produces: `GET_PRODUCT` variant selection now includes the 4 metafields; a query-guard test proves it (same pattern as the existing `brandName`/`freeShipping` guards in this file).

- [ ] **Step 1: Write the failing test**

In `lib/shopify/__tests__/product-query-metafields.test.ts`, add a new `describe` block after the existing `GET_PRODUCT metafield selections` block (after line 55):

```typescript
// AeroWalk pilot (2026-08-14): variant-level manufacturer number, order
// size, units per order and description. Proposed contract —
// docs/launch/2026-08-14-variant-field-contract.md. If Izzy's actual
// namespace/key differs, this test (and only the query string below) needs
// to change; every other consumer reads the already-normalized field name.
describe('GET_PRODUCT variant-level metafield selections (AeroWalk pilot)', () => {
  it('requests custom.manufacturer_item_number on each variant', () => {
    expect(GET_PRODUCT).toMatch(/manufacturerNumber:\s*metafield\(/)
    expect(GET_PRODUCT).toContain('key: "manufacturer_item_number"')
  })

  it('requests custom.order_size on each variant', () => {
    expect(GET_PRODUCT).toMatch(/orderSize:\s*metafield\(/)
  })

  it('requests custom.units_per_order on each variant', () => {
    expect(GET_PRODUCT).toMatch(/unitsPerOrder:\s*metafield\(/)
  })

  it('requests custom.variant_description on each variant', () => {
    expect(GET_PRODUCT).toMatch(/description:\s*metafield\(/)
    expect(GET_PRODUCT).toContain('key: "variant_description"')
  })

  it('is still a single parseable template literal', () => {
    expect(GET_PRODUCT.split('{').length).toBe(GET_PRODUCT.split('}').length)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/shopify/__tests__/product-query-metafields.test.ts`
Expected: FAIL — the four new `it` blocks fail because `GET_PRODUCT` doesn't request these fields yet.

- [ ] **Step 3: Add the fields to `GET_PRODUCT`'s variant selection**

In `lib/shopify/queries/products.ts`, replace the `variants(first: 100) { nodes { ... } }` block (lines 74-90):

```graphql
      variants(first: 100) {
        nodes {
          id
          title
          sku
          barcode
          availableForSale
          # Shopify's own variant-media assignment (LG-03) — never inferred
          # from filename/option text. Falls back to the shared product
          # gallery client-side when a variant has no assigned image.
          image { id url altText width height }

          selectedOptions { name value }
          price { amount currencyCode }
          compareAtPrice { amount currencyCode }

          # AeroWalk pilot (2026-08-14) — proposed contract, see
          # docs/launch/2026-08-14-variant-field-contract.md. Resolves to
          # null on every variant until Izzy's write lands; ProductView
          # already handles null gracefully via resolveVariantValue.
          manufacturerNumber: metafield(namespace: "custom", key: "manufacturer_item_number") { value }
          orderSize: metafield(namespace: "custom", key: "order_size") { value }
          unitsPerOrder: metafield(namespace: "custom", key: "units_per_order") { value }
          description: metafield(namespace: "custom", key: "variant_description") { value }
        }
      }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/shopify/__tests__/product-query-metafields.test.ts`
Expected: PASS, all tests in the file.

- [ ] **Step 5: Commit**

```bash
git add lib/shopify/queries/products.ts lib/shopify/__tests__/product-query-metafields.test.ts
git commit -m "feat(catalog): query variant-level manufacturer number, order unit and description"
```

---

### Task 5: Resolver module for Bilal's 3 display rules

**Files:**
- Create: `lib/product/resolve-variant-value.ts`
- Create: `lib/product/__tests__/resolve-variant-value.test.ts`

**Interfaces:**
- Produces: `resolveVariantValue(variantValue: string | null | undefined, productValue: string | null | undefined): string | null` and `resolveVariantSupplement(variantValue: string | null | undefined, primaryValue: string | null | undefined): string | null`.
- Consumed by: Task 7 (`ProductView.tsx`), Task 8 (`ProductSchema` wiring only needs the raw variant value, not this resolver — noted there).

- [ ] **Step 1: Write the failing tests**

```typescript
// lib/product/__tests__/resolve-variant-value.test.ts
import { describe, it, expect } from 'vitest'
import { resolveVariantValue, resolveVariantSupplement } from '../resolve-variant-value'

// Bilal, 2026-08-14: "selected variant value first; shared product value
// only when the variant value is blank and a shared fallback is valid; no
// duplicate display when both values are identical."
describe('resolveVariantValue', () => {
  it('prefers the variant value when present', () => {
    expect(resolveVariantValue('Box of 50', 'Case of 100')).toBe('Box of 50')
  })

  it('falls back to the product value when the variant value is blank', () => {
    expect(resolveVariantValue(null, 'Case of 100')).toBe('Case of 100')
    expect(resolveVariantValue(undefined, 'Case of 100')).toBe('Case of 100')
    expect(resolveVariantValue('', 'Case of 100')).toBe('Case of 100')
  })

  it('returns null when neither value exists', () => {
    expect(resolveVariantValue(null, null)).toBeNull()
    expect(resolveVariantValue(undefined, undefined)).toBeNull()
  })
})

describe('resolveVariantSupplement', () => {
  it('returns the variant value when it differs from the primary value', () => {
    expect(resolveVariantSupplement('Ships in a padded mailer', 'A rollator.')).toBe('Ships in a padded mailer')
  })

  it('returns null when the variant value is blank — nothing to supplement', () => {
    expect(resolveVariantSupplement(null, 'A rollator.')).toBeNull()
    expect(resolveVariantSupplement(undefined, 'A rollator.')).toBeNull()
  })

  it('returns null when the variant value is identical to the primary value — no duplicate display', () => {
    expect(resolveVariantSupplement('A rollator.', 'A rollator.')).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/product/__tests__/resolve-variant-value.test.ts`
Expected: FAIL with "Cannot find module '../resolve-variant-value'".

- [ ] **Step 3: Implement**

```typescript
// lib/product/resolve-variant-value.ts

/**
 * Bilal, 2026-08-14 (Sardor task 4): "selected variant value first; shared
 * product value only when the variant value is blank and a shared fallback
 * is valid." Used for Order Size / Units per Order, where a genuinely
 * shared product-level value is a valid display (most variants inherit
 * shared packaging) — unlike resolveVariantSupplement below, this always
 * returns a value to render, never a redundancy check.
 */
export function resolveVariantValue(
  variantValue: string | null | undefined,
  productValue: string | null | undefined,
): string | null {
  if (variantValue) return variantValue
  if (productValue) return productValue
  return null
}

/**
 * For fields that supplement an already-rendered primary value (Variant
 * Description supplementing the product Description) rather than replace
 * it: "no duplicate display when both values are identical." Returns null
 * (render nothing) both when there's no variant-specific value at all, and
 * when there is one but it reads identically to what's already shown.
 */
export function resolveVariantSupplement(
  variantValue: string | null | undefined,
  primaryValue: string | null | undefined,
): string | null {
  if (!variantValue) return null
  if (variantValue === primaryValue) return null
  return variantValue
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/product/__tests__/resolve-variant-value.test.ts`
Expected: PASS, 6/6.

- [ ] **Step 5: Commit**

```bash
git add lib/product/resolve-variant-value.ts lib/product/__tests__/resolve-variant-value.test.ts
git commit -m "feat(catalog): add variant-value resolver for Bilal's 3 display rules"
```

---

### Task 6: Fix the gallery fallback to never leak a sibling color's image

**Files:**
- Modify: `components/product/useSelectedVariant.ts`
- Create: `components/product/__tests__/useSelectedVariant.test.ts`

**Interfaces:**
- Consumes: `Product`, `ProductVariant` (existing).
- Produces: `useSelectedVariant` now also returns `isMultiColor: boolean`; `galleryImages` is `[]` (not the full shared gallery) when the selected variant has no image on a multi-color product.

- [ ] **Step 1: Write the failing test**

```typescript
// components/product/__tests__/useSelectedVariant.test.ts
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSelectedVariant } from '../useSelectedVariant'
import type { Product, ProductVariant } from '@/lib/shopify/types'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/product/aerowalk',
}))

const blueImg = { id: 'img-blue', url: 'https://cdn/blue.jpg', altText: 'Blue', width: 800, height: 800 }
const whiteImg = { id: 'img-white', url: 'https://cdn/white.jpg', altText: 'White', width: 800, height: 800 }

function makeVariant(overrides: Partial<ProductVariant>): ProductVariant {
  return {
    id: 'gid://shopify/ProductVariant/1',
    title: 'Blue',
    sku: 'SKU-1',
    availableForSale: true,
    quantityAvailable: 10,
    selectedOptions: [{ name: 'Color', value: 'Blue' }],
    price: { amount: '10.00', currencyCode: 'USD' },
    compareAtPrice: null,
    ...overrides,
  }
}

function makeProduct(overrides: Partial<Product>): Product {
  return {
    id: 'gid://shopify/Product/1',
    title: 'AeroWalk Ultra-Lite Rollator',
    handle: 'aerowalk-ultra-lite-rollator',
    description: '', descriptionHtml: '', vendor: 'Drive Medical',
    availableForSale: true, tags: [],
    priceRange: { minVariantPrice: { amount: '10', currencyCode: 'USD' }, maxVariantPrice: { amount: '10', currencyCode: 'USD' } },
    images: { nodes: [blueImg] },
    variants: { nodes: [] },
    options: [{ id: 'opt1', name: 'Color', values: ['Blue', 'White', 'Grey'] }],
    seo: { title: null, description: null },
    collections: { nodes: [] },
    brandName: null, unitsPerOrder: null, quantityOfUnits: null, orderSize: null,
    material: null, use: null, features: null, color: null, sterility: null,
    thickness: null, gloveSize: null, needleGauge: null, needleLength: null,
    sizeLength: null, estimatedRestockDate: null, backorderRestockEta: null,
    testsFor: null, detectableDrugs: null, adulterants: null, otherFeatures: null,
    typeList: null, customBadge1: null, customBadge2: null, customBadge3: null,
    ...overrides,
  }
}

describe('useSelectedVariant — gallery fallback (AeroWalk gap)', () => {
  it('uses the selected variant image first when present', () => {
    const variant = makeVariant({ image: whiteImg })
    const product = makeProduct({ images: { nodes: [blueImg] } })
    const { result } = renderHook(() => useSelectedVariant(product, variant))
    expect(result.current.galleryImages[0]).toEqual(whiteImg)
  })

  it('never falls back to another color\'s shared images when the selected variant has no image on a multi-color product', () => {
    const variant = makeVariant({ image: null })
    const product = makeProduct({ images: { nodes: [blueImg] } }) // only Blue's image exists at product level
    const { result } = renderHook(() => useSelectedVariant(product, variant))
    expect(result.current.galleryImages).toEqual([])
    expect(result.current.isMultiColor).toBe(true)
  })

  it('falls back to the shared product gallery when the product is not multi-color (no leak risk)', () => {
    const variant = makeVariant({ image: null, selectedOptions: [{ name: 'Title', value: 'Case of 24' }] })
    const product = makeProduct({
      images: { nodes: [blueImg] },
      options: [{ id: 'opt1', name: 'Title', values: ['Each', 'Case of 24'] }],
    })
    const { result } = renderHook(() => useSelectedVariant(product, variant))
    expect(result.current.galleryImages).toEqual([blueImg])
    expect(result.current.isMultiColor).toBe(false)
  })

  it('resets the active image index when the selected variant changes', () => {
    const blue = makeVariant({ id: 'v-blue', image: blueImg })
    const white = makeVariant({ id: 'v-white', image: whiteImg, selectedOptions: [{ name: 'Color', value: 'White' }] })
    const product = makeProduct({ images: { nodes: [] } })
    const { result, rerender } = renderHook(
      ({ v }: { v: ProductVariant }) => useSelectedVariant(product, v),
      { initialProps: { v: blue } },
    )
    act(() => result.current.setActiveImg(2))
    expect(result.current.activeImg).toBe(2)
    rerender({ v: white })
    expect(result.current.activeImg).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/product/__tests__/useSelectedVariant.test.ts`
Expected: FAIL on the "never falls back to another color's shared images" test (currently returns `[blueImg]`, not `[]`) and on `isMultiColor` being `undefined`.

- [ ] **Step 3: Implement the fix**

Replace `components/product/useSelectedVariant.ts`:

```typescript
'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import type { Product, ProductImage, ProductVariant } from '@/lib/shopify/types'

/**
 * The single selected-variant view model for both PDP routes (LG-03).
 * Owns the variant selection, the derived gallery (variant media first,
 * falling back to the shared product gallery), and keeps the URL's
 * `?variant=` in sync so the selected state is shareable and survives a
 * refresh — without a full page reload on selection.
 */
export function useSelectedVariant(product: Product, initialVariant: ProductVariant) {
  const router = useRouter()
  const pathname = usePathname()
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant>(initialVariant)
  const [activeImg, setActiveImg] = useState(0)

  // Only a genuine multi-value color dimension carries "another variant's
  // image would misrepresent this one" risk — an Each/Case selection or a
  // single-color product has no such risk, so the shared gallery remains a
  // safe fallback there (unchanged behavior).
  const isMultiColor = product.options.some(
    (o) => o.name.toLowerCase() === 'color' && o.values.length > 1,
  )

  // Reset the active gallery image whenever the selected variant changes —
  // otherwise a shopper who scrolled to thumbnail 3 on Blue lands on the
  // wrong image the instant they switch to Red. Adjusted during render
  // (React's documented pattern for resetting state when something else
  // changes) rather than in an effect, which would cascade an extra render.
  const [lastVariantId, setLastVariantId] = useState(selectedVariant.id)
  if (selectedVariant.id !== lastVariantId) {
    setLastVariantId(selectedVariant.id)
    setActiveImg(0)
  }

  // AeroWalk gap (2026-08-14): a multi-color product with no verified media
  // for the selected color must never show a sibling color's image as if it
  // belonged to this one — the exact defect Bilal reported ("both
  // storefronts continue showing the Blue image" for White/Grey). Empty
  // gallery here means ProductImage's own placeholder chain renders
  // instead (never `product.images.nodes`, which mixes every color).
  const galleryImages: ProductImage[] = selectedVariant.image
    ? [selectedVariant.image, ...product.images.nodes.filter((img) => img.id !== selectedVariant.image!.id)]
    : isMultiColor
      ? []
      : product.images.nodes

  function select(variant: ProductVariant) {
    setSelectedVariant(variant)
    // Shallow update only — no scroll jump, no full navigation. Shareable
    // deep link: `?variant=<id>` rehydrates the same selected state on
    // refresh (resolveInitialVariant, read server-side by both page.tsx routes).
    router.replace(`${pathname}?variant=${encodeURIComponent(variant.id)}`, { scroll: false })
  }

  return { selectedVariant, select, galleryImages, activeImg, setActiveImg, isMultiColor }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/product/__tests__/useSelectedVariant.test.ts`
Expected: PASS, 4/4.

- [ ] **Step 5: Commit**

```bash
git add components/product/useSelectedVariant.ts components/product/__tests__/useSelectedVariant.test.ts
git commit -m "fix(catalog): stop PDP gallery from showing a sibling color's image (AeroWalk)"
```

---

### Task 7: ProductView — manufacturer number / SKU split, variant-sourced order unit, description supplement

**Files:**
- Modify: `components/product/ProductView.tsx`
- Create: `components/product/__tests__/ProductView.test.tsx`

**Interfaces:**
- Consumes: `resolveVariantValue`, `resolveVariantSupplement` (Task 5); `useSelectedVariant`'s new `isMultiColor` (Task 6, already destructured but unused before this task — now used only implicitly via the hook, no direct new usage needed in `ProductView` itself since the hook already applies it).
- Produces: no new exported interface — internal render changes only.

- [ ] **Step 1: Write the failing tests**

```typescript
// components/product/__tests__/ProductView.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProductView } from '../ProductView'
import type { Product, ProductVariant } from '@/lib/shopify/types'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/product/aerowalk',
}))
vi.mock('@/components/store/CartProvider', () => ({
  useCart: () => ({ addItem: vi.fn() }),
}))

const blueImg = { id: 'img-blue', url: 'https://cdn/blue.jpg', altText: 'Blue', width: 800, height: 800 }
const whiteImg = { id: 'img-white', url: 'https://cdn/white.jpg', altText: 'White', width: 800, height: 800 }

const blueVariant: ProductVariant = {
  id: 'gid://shopify/ProductVariant/1', title: 'Blue', sku: '10277BL',
  availableForSale: true, quantityAvailable: 10,
  selectedOptions: [{ name: 'Color', value: 'Blue' }],
  price: { amount: '129.99', currencyCode: 'USD' }, compareAtPrice: null,
  image: blueImg,
  manufacturerNumber: '10277BL', orderSize: 'Each', unitsPerOrder: '1', description: null,
}

const whiteVariant: ProductVariant = {
  ...blueVariant, id: 'gid://shopify/ProductVariant/2', title: 'White',
  selectedOptions: [{ name: 'Color', value: 'White' }],
  image: whiteImg,
  manufacturerNumber: '10277WT', orderSize: null, unitsPerOrder: null,
  description: 'Includes an extra-wide seat pad not on other colors.',
}

const product: Product = {
  id: 'gid://shopify/Product/1', title: 'AeroWalk Ultra-Lite Rollator',
  handle: 'aerowalk-ultra-lite-rollator', description: 'A lightweight rollator.',
  descriptionHtml: '<p>A lightweight rollator.</p>', vendor: 'Drive Medical',
  availableForSale: true, tags: [],
  priceRange: { minVariantPrice: { amount: '129.99', currencyCode: 'USD' }, maxVariantPrice: { amount: '129.99', currencyCode: 'USD' } },
  images: { nodes: [blueImg] },
  variants: { nodes: [blueVariant, whiteVariant] },
  options: [{ id: 'opt1', name: 'Color', values: ['Blue', 'White'] }],
  seo: { title: null, description: null }, collections: { nodes: [] },
  brandName: null, unitsPerOrder: 'Each', quantityOfUnits: null, orderSize: 'Each',
  material: null, use: null, features: null, color: null, sterility: null,
  thickness: null, gloveSize: null, needleGauge: null, needleLength: null,
  sizeLength: null, estimatedRestockDate: null, backorderRestockEta: null,
  testsFor: null, detectableDrugs: null, adulterants: null, otherFeatures: null,
  typeList: null, customBadge1: null, customBadge2: null, customBadge3: null,
}

function renderPDP(initialVariant: ProductVariant) {
  return render(
    <ProductView
      product={product}
      initialVariant={initialVariant}
      relatedProducts={[]}
      complementaryProducts={[]}
    />,
  )
}

describe('ProductView — manufacturer number vs internal SKU (AeroWalk)', () => {
  it('shows internal SKU and manufacturer number as two separately-labeled values near the title', () => {
    renderPDP(blueVariant)
    expect(screen.getByText('SKU: 10277BL')).toBeInTheDocument()
    expect(screen.getByText('Mfr #: 10277BL')).toBeInTheDocument()
  })

  it('Specifications tab shows Manufacturer Item Number and Internal SKU as separate rows, not one conflated "Item Number"', () => {
    renderPDP(blueVariant)
    expect(screen.getByText('Manufacturer Item Number')).toBeInTheDocument()
    expect(screen.getByText('Internal SKU')).toBeInTheDocument()
    expect(screen.queryByText('Item Number')).not.toBeInTheDocument()
  })

  it('switching from Blue to White updates the manufacturer number', () => {
    renderPDP(blueVariant)
    fireEvent.click(screen.getByRole('button', { name: 'Color: White' }))
    expect(screen.getByText('Mfr #: 10277WT')).toBeInTheDocument()
  })
})

describe('ProductView — variant-sourced order unit, above Add to Cart', () => {
  it('falls back to the shared product order size when the variant has none (White)', () => {
    renderPDP(whiteVariant)
    expect(screen.getByText('Each')).toBeInTheDocument()
  })

  it('order unit block renders before the Add to Cart button in document order', () => {
    renderPDP(blueVariant)
    const orderUnitLabel = screen.getByText('UNIT')
    const addToCart = screen.getByRole('button', { name: /Add to Cart/i })
    // compareDocumentPosition: DOCUMENT_POSITION_FOLLOWING = 4 means addToCart follows orderUnitLabel
    // eslint-disable-next-line no-bitwise
    expect(orderUnitLabel.compareDocumentPosition(addToCart) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

describe('ProductView — Variant Description supplement (no duplicate display)', () => {
  it('renders the variant description when it differs from the product description', () => {
    renderPDP(whiteVariant)
    expect(screen.getByText(/extra-wide seat pad/)).toBeInTheDocument()
  })

  it('renders nothing extra when the variant has no description', () => {
    renderPDP(blueVariant)
    expect(screen.queryByText('Variant Details')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run components/product/__tests__/ProductView.test.tsx`
Expected: FAIL — `Mfr #:` text doesn't exist yet, `Item Number` heading is still conflated, order unit block is positioned after price rather than guaranteed-before-AddToCart-with-new-content, no `Variant Details` block exists.

- [ ] **Step 3: Implement — identity line near title**

In `components/product/ProductView.tsx`, add the resolver imports near the top (after the `useSelectedVariant` import, line 25):

```typescript
import { resolveVariantValue, resolveVariantSupplement } from '@/lib/product/resolve-variant-value'
```

Replace the SKU paragraph (lines 267-270):

```tsx
            {/* SKU + Manufacturer Item Number — kept as two separately-
                labeled values (never conflated): the plan's Figure 3
                requirement, previously violated by the Specifications tab
                (see below), now consistent site-wide. */}
            <div className="flex flex-col gap-0.5">
              <p className="text-gray-500 text-[13px] tracking-[0.26px]">
                SKU: {variantSku}
              </p>
              {selectedVariant.manufacturerNumber && (
                <p className="text-gray-500 text-[13px] tracking-[0.26px]">
                  Mfr #: {selectedVariant.manufacturerNumber}
                </p>
              )}
            </div>
```

- [ ] **Step 4: Implement — variant-sourced order unit, repositioned above Add to Cart**

Add these two computed values right after the existing `hasPackaging`/`hasOptions` block (after line 190):

```typescript
  // AeroWalk pilot: variant-specific order unit overrides the shared product
  // value; falls back to it only when the variant's own field is blank
  // (resolveVariantValue — Bilal's rule 2). Used identically by the
  // above-the-fold block and the ORDER PACKAGING tab, so they can never show
  // two different totals for the same selection (LG-04 acceptance).
  const resolvedOrderSize = resolveVariantValue(selectedVariant.orderSize, product.orderSize)
  const resolvedUnitsPerOrder = resolveVariantValue(
    selectedVariant.unitsPerOrder,
    product.unitsPerOrder ?? product.quantityOfUnits,
  )
  const resolvedHasPackaging = Boolean(resolvedOrderSize || resolvedUnitsPerOrder)

  // Variant Description supplements the product Description tab — never
  // shown if blank, never shown if it would just repeat the product
  // description verbatim (resolveVariantSupplement — Bilal's rule 3).
  const variantDescriptionSupplement = resolveVariantSupplement(
    selectedVariant.description,
    product.description,
  )
```

Now move the UNIT/QUANTITY block. Delete it from its current location (the block starting `{/* UNIT / QUANTITY table */}` through its closing `)}` — lines 346-374, immediately before `{/* Qty + Add to cart */}`), and re-insert an updated version directly after the `VariantSelector` block and before the `{/* Price. ... */}` comment (i.e., between lines 320 and 322):

```tsx
            {/* UNIT / QUANTITY — variant-sourced, positioned directly below
                the selector and above Add to Cart per Bilal (2026-08-14):
                "Populate variant-specific order units/packaging and display
                them clearly above Add to Cart." Reads the same resolved
                values as the ORDER PACKAGING tab — never a second
                computation (LG-04). */}
            {resolvedHasPackaging && (
              <div className="border border-[rgba(102,102,100,0.5)]">
                <div className="bg-navy-900 flex">
                  <div className="flex-1 px-4 py-3">
                    <p className="text-white text-[15px] font-bold tracking-[0.3px]">UNIT</p>
                  </div>
                  <div className="flex-1 px-4 py-3">
                    <p className="text-white text-[15px] font-bold tracking-[0.3px]">QUANTITY</p>
                  </div>
                </div>
                <div className="flex">
                  <div className="flex-1 px-4 py-3">
                    {resolvedOrderSize && (
                      <p className="text-gray-500 text-[15px] font-medium tracking-[0.3px]">
                        {resolvedOrderSize}
                      </p>
                    )}
                  </div>
                  <div className="flex-1 px-4 py-3">
                    {resolvedUnitsPerOrder && (
                      <p className="text-gray-500 text-[15px] font-medium tracking-[0.3px]">
                        {resolvedUnitsPerOrder}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

```

- [ ] **Step 5: Implement — Specifications tab: split Item Number, add Variant Details**

Replace the "Item Number" block in the SPECIFICATIONS tab (lines 465-469):

```tsx
                {/* Manufacturer Item Number and Internal SKU — kept as two
                    separate, separately-labeled rows. Previously this tab
                    showed one heading, "Item Number", over `variantSku` (the
                    INTERNAL sku) — silently conflating the two identifiers
                    the launch plan's non-negotiable rule requires kept
                    apart (Figure 3). */}
                {selectedVariant.manufacturerNumber && (
                  <div>
                    <h2 className="text-navy-900 text-[22px] font-semibold tracking-[0.44px] mb-2">Manufacturer Item Number</h2>
                    <p className="text-gray-500 text-[15px] leading-[28px] tracking-[0.3px]">{selectedVariant.manufacturerNumber}</p>
                  </div>
                )}
                <div>
                  <h2 className="text-navy-900 text-[22px] font-semibold tracking-[0.44px] mb-2">Internal SKU</h2>
                  <p className="text-gray-500 text-[15px] leading-[28px] tracking-[0.3px]">{variantSku}</p>
                </div>
```

Then, immediately after the "Description" block in the same tab (after line 488's closing `)}`), add the Variant Details supplement:

```tsx
                {/* Variant Details — supplements the description above only
                    when the archived source had genuinely variant-specific
                    content; never a duplicate of it (resolveVariantSupplement). */}
                {variantDescriptionSupplement && (
                  <div>
                    <h2 className="text-navy-900 text-[22px] font-semibold tracking-[0.44px] mb-2">Variant Details</h2>
                    <p className="text-gray-500 text-[15px] leading-[28px] tracking-[0.3px]">{variantDescriptionSupplement}</p>
                  </div>
                )}
```

- [ ] **Step 6: Implement — ORDER PACKAGING tab reads the same resolved values**

Replace the `activeTab === 'ORDER PACKAGING'` block's table rows (lines 527-543's `[{...}]` array literal):

```tsx
            {activeTab === 'ORDER PACKAGING' && (
              <div className="flex flex-col gap-6 max-w-[760px]">
                {resolvedHasPackaging ? (
                  <table className="w-full max-w-[500px]">
                    <tbody>
                      {[
                        { label: 'Order Size', value: resolvedOrderSize },
                        { label: 'Units Per Order', value: resolvedUnitsPerOrder },
                      ]
                        .filter((r) => r.value != null)
                        .map(({ label, value }, i) => (
                          <tr key={label} className={i % 2 === 0 ? 'bg-neutral-50' : 'bg-white'}>
                            <td className="py-3 px-4 text-[14px] font-semibold text-navy-900 w-[200px]">{label}</td>
                            <td className="py-3 px-4 text-[14px] text-gray-500">{value}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-gray-500 text-[15px] leading-[28px] tracking-[0.3px]">
                    Packaging information not available for this product.
                  </p>
                )}
              </div>
            )}
```

Note this drops the old third row (`Quantity of Units` / `product.quantityOfUnits`) as a *separately displayed* field — it's now folded into `resolvedUnitsPerOrder`'s fallback chain (`product.unitsPerOrder ?? product.quantityOfUnits`) in Step 4, so it still surfaces, just not as a redundant third row next to Units Per Order.

- [ ] **Step 7: Also remove the now-unused old `hasPackaging` if nothing else reads it**

Search: `hasPackaging` is still referenced nowhere else after Steps 4-6 replace both its usages. Delete the original `const hasPackaging = ...` line (line 188) — `resolvedHasPackaging` fully replaces it.

- [ ] **Step 8: Run tests to verify they pass**

Run: `npx vitest run components/product/__tests__/ProductView.test.tsx`
Expected: PASS, 7/7.

- [ ] **Step 9: Run the full existing test file for this component to check no regression**

Run: `npx vitest run components/product/__tests__/ProductView.a11y.test.tsx`
Expected: PASS (unchanged assertions — this reorders DOM but doesn't remove landmarks/headings/roles the a11y test checks).

- [ ] **Step 10: Commit**

```bash
git add components/product/ProductView.tsx components/product/__tests__/ProductView.test.tsx
git commit -m "fix(catalog): split manufacturer number from internal SKU; variant-source order unit and description (AeroWalk)"
```

---

### Task 8: Structured data — mpn + variant image, and add ProductSchema to the category route

**Files:**
- Modify: `app/product/[slug]/page.tsx`
- Modify: `app/category/[slug]/[product]/page.tsx`
- Modify: `app/product/__tests__/variant-schema.test.ts`
- Create: `app/category/__tests__/product-schema.test.ts`

**Interfaces:**
- Consumes: `ProductSchema`'s existing `mpn?: string` and `image: string` props (component itself is unchanged — see plan's File Structure note).
- Produces: both PDP routes now emit `ProductSchema` with `mpn` and a variant-aware `image`; the category route previously emitted no `ProductSchema` at all.

- [ ] **Step 1: Write the failing tests — `/product/[slug]` mpn + variant image**

In `app/product/__tests__/variant-schema.test.ts`, update the `blueVariant`/`redVariant` fixtures to add the new fields (fixtures currently list every metafield explicitly as `null`, matching the file's existing style — line 25/34 area):

```typescript
const blueVariant = {
  id: 'gid://shopify/ProductVariant/1',
  title: 'Blue',
  sku: 'SKU-BLUE',
  barcode: null,
  availableForSale: true,
  selectedOptions: [{ name: 'Color', value: 'Blue' }],
  price: { amount: '9.99', currencyCode: 'USD' },
  compareAtPrice: null,
  image: { id: 'img-blue', url: 'https://cdn.shopify.com/blue.jpg', altText: 'Blue', width: 800, height: 800 },
  manufacturerNumber: 'MFR-BLUE-1',
  orderSize: null,
  unitsPerOrder: null,
  description: null,
}
const redVariant = {
  ...blueVariant,
  id: 'gid://shopify/ProductVariant/2',
  title: 'Red',
  sku: 'SKU-RED',
  selectedOptions: [{ name: 'Color', value: 'Red' }],
  price: { amount: '11.99', currencyCode: 'USD' },
  availableForSale: false,
  image: { id: 'img-red', url: 'https://cdn.shopify.com/red.jpg', altText: 'Red', width: 800, height: 800 },
  manufacturerNumber: 'MFR-RED-2',
}
```

Update the `SchemaEl` type (line 13) to include the new props:

```typescript
type SchemaEl = { props: { sku: string; mpn?: string; image: string; price: number; priceCurrency: string; availability: string; url: string } }
```

Add new assertions inside the existing `describe('ProductPage — ?variant= resolution feeds ProductSchema...')` block, after the two existing `it` blocks (after line 124):

```typescript
  it('with a valid ?variant=, structured data mpn and image follow Red, not Blue', async () => {
    const { schemaEl } = await renderProductPage(redVariant.id)
    expect(schemaEl.props.mpn).toBe('MFR-RED-2')
    expect(schemaEl.props.image).toBe('https://cdn.shopify.com/red.jpg')
  })

  it('with no ?variant=, structured data mpn and image use the default (Blue) variant', async () => {
    const { schemaEl } = await renderProductPage(undefined)
    expect(schemaEl.props.mpn).toBe('MFR-BLUE-1')
    expect(schemaEl.props.image).toBe('https://cdn.shopify.com/blue.jpg')
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/product/__tests__/variant-schema.test.ts`
Expected: FAIL — `schemaEl.props.mpn` is `undefined`, `schemaEl.props.image` is still the product's first image regardless of selected variant.

- [ ] **Step 3: Wire `mpn` and variant-aware `image` in `/product/[slug]/page.tsx`**

In `app/product/[slug]/page.tsx`, update the `schemaProps` object (lines 130-149):

```typescript
  const schemaProps = {
    name: product.title,
    description: product.description,
    // AeroWalk fix: prefer the resolved variant's own image so structured
    // data can't disagree with what's on the page (Red must never emit
    // Blue's image) — falls back to the product's default gallery image
    // only when the variant carries none.
    image: resolvedVariant?.image?.url ?? product.images.nodes[0]?.url ?? '',
    sku: resolvedVariant?.sku || slug,
    // gtin only when the Shopify barcode is a checksum-valid GTIN — most
    // barcodes in this catalog are SKU copies and must not be emitted (M5).
    gtin: normalizeGtin(resolvedVariant?.barcode),
    // Manufacturer Item Number (AeroWalk pilot field contract) — omitted
    // entirely rather than emitting an empty string when not yet populated.
    mpn: resolvedVariant?.manufacturerNumber ?? undefined,
    // Product structured data: omit brand entirely rather than emit the
    // fulfilling vendor as a consumer brand (lib/brand.ts).
    brand: publicBrand(product) ?? undefined,
    price: parseFloat(resolvedVariant?.price?.amount ?? '0'),
    priceCurrency: resolvedVariant?.price?.currencyCode ?? 'USD',
    availability: (isAvailable ? 'InStock' : 'OutOfStock') as 'InStock' | 'OutOfStock' | 'PreOrder',
    url: productUrl,
    seller: 'MDSupplies',
    priceValidUntil: buildPriceValidUntil(),
    ...(OFFER_SHIPPING_DETAILS ? { shippingDetails: OFFER_SHIPPING_DETAILS } : {}),
    ...(MERCHANT_RETURN_POLICY ? { returnPolicy: MERCHANT_RETURN_POLICY } : {}),
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/product/__tests__/variant-schema.test.ts`
Expected: PASS, all tests in the file.

- [ ] **Step 5: Write the failing test — category route is missing ProductSchema entirely**

```typescript
// app/category/__tests__/product-schema.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/shopify/storefront', () => ({ storefrontFetch: vi.fn() }))
vi.mock('@/lib/category-tree-data.server', () => ({ fetchProductTagSummaries: vi.fn(async () => []) }))

import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_PRODUCT, GET_PRODUCT_RECS } from '@/lib/shopify/queries/products'
import CategoryProductPage from '../[slug]/[product]/page'

const mockFetch = vi.mocked(storefrontFetch)

const variant = {
  id: 'gid://shopify/ProductVariant/1', title: 'White', sku: 'SKU-WHITE',
  barcode: null, availableForSale: true,
  selectedOptions: [{ name: 'Color', value: 'White' }],
  price: { amount: '129.99', currencyCode: 'USD' }, compareAtPrice: null,
  image: { id: 'img-white', url: 'https://cdn.shopify.com/white.jpg', altText: 'White', width: 800, height: 800 },
  manufacturerNumber: '10277WT', orderSize: null, unitsPerOrder: null, description: null,
}

const rawProduct = {
  id: 'gid://shopify/Product/1', title: 'AeroWalk Ultra-Lite Rollator',
  handle: 'aerowalk-ultra-lite-rollator', description: 'A rollator.',
  descriptionHtml: '<p>A rollator.</p>', vendor: 'Drive Medical',
  availableForSale: true, tags: [],
  priceRange: { minVariantPrice: { amount: '129.99', currencyCode: 'USD' }, maxVariantPrice: { amount: '129.99', currencyCode: 'USD' } },
  images: { nodes: [{ id: 'img1', url: 'https://cdn.shopify.com/default.jpg', altText: 'Default', width: 800, height: 800 }] },
  variants: { nodes: [variant] },
  options: [{ id: 'opt1', name: 'Color', values: ['White'] }],
  seo: { title: null, description: null }, collections: { nodes: [] },
  brandName: null, unitsPerOrder: null, quantityOfUnits: null, orderSize: null,
  material: null, use: null, features: null, color: null, sterility: null,
  thickness: null, gloveSize: null, needleGauge: null, needleLength: null,
  sizeLength: null, estimatedRestockDate: null, backorderRestockEta: null,
  testsFor: null, detectableDrugs: null, adulterants: null, otherFeatures: null,
  typeList: null, customBadge1: null, customBadge2: null, customBadge3: null,
}

beforeEach(() => {
  mockFetch.mockReset()
  mockFetch.mockImplementation(async (query: string) => {
    if (query === GET_PRODUCT) return { product: rawProduct }
    if (query === GET_PRODUCT_RECS) return { related: [], complementary: [] }
    throw new Error(`unexpected query in test: ${query}`)
  })
})

// Parity gap found 2026-08-14: /product/[slug] renders ProductSchema;
// /category/[slug]/[product] never did, for any product, at any time — not
// AeroWalk-specific, but this is the pass that surfaces it, since Bilal's
// checklist requires both routes to agree on structured data.
describe('CategoryProductPage — ProductSchema (parity with /product/[slug])', () => {
  it('renders ProductSchema with the resolved variant sku, mpn and image', async () => {
    const el = (await CategoryProductPage({
      params: Promise.resolve({ slug: 'mobility', product: 'aerowalk-ultra-lite-rollator' }),
      searchParams: Promise.resolve({}),
    })) as unknown as { props: { children: unknown[] } }

    const schemaEl = el.props.children.find(
      (child): child is { props: { sku: string; mpn?: string; image: string } } =>
        Boolean(child) && typeof child === 'object' && 'props' in (child as object) &&
        (child as { props?: { sku?: string } }).props?.sku === 'SKU-WHITE',
    )
    expect(schemaEl).toBeDefined()
    expect(schemaEl!.props.mpn).toBe('10277WT')
    expect(schemaEl!.props.image).toBe('https://cdn.shopify.com/white.jpg')
  })
})
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run app/category/__tests__/product-schema.test.ts`
Expected: FAIL — no child matches (the route renders no `ProductSchema` element at all today).

- [ ] **Step 7: Add `ProductSchema` to `app/category/[slug]/[product]/page.tsx`**

Add the import near the top (after the `BreadcrumbSchema` import, line 14):

```typescript
import { ProductSchema } from '@/components/schema/ProductSchema'
import { normalizeGtin } from '@/lib/gtin'
import { OFFER_SHIPPING_DETAILS, MERCHANT_RETURN_POLICY } from '@/lib/merchant-policy'
```

In the `CategoryProductPage` function, immediately after `const productUrl = buildCanonical({...})` (after line 317), add:

```typescript
  // Parity fix (2026-08-14): this route previously rendered no ProductSchema
  // at all — /product/[slug] is the only route that had it. Mirrors that
  // route's schemaProps exactly, including preferring the resolved variant's
  // own image/mpn so structured data can't disagree with what's rendered
  // (AeroWalk: White/Grey must never emit Blue's image/mpn here either).
  const isAvailable = resolvedVariant?.availableForSale ?? productData.product.availableForSale
  const schemaProps = {
    name: productData.product.title,
    description: productData.product.description,
    image: resolvedVariant?.image?.url ?? productData.product.images.nodes[0]?.url ?? '',
    sku: resolvedVariant?.sku || handle,
    gtin: normalizeGtin(resolvedVariant?.barcode),
    mpn: resolvedVariant?.manufacturerNumber ?? undefined,
    brand: undefined as string | undefined,
    price: parseFloat(resolvedVariant?.price?.amount ?? '0'),
    priceCurrency: resolvedVariant?.price?.currencyCode ?? 'USD',
    availability: (isAvailable ? 'InStock' : 'OutOfStock') as 'InStock' | 'OutOfStock' | 'PreOrder',
    url: productUrl,
    seller: 'MDSupplies',
    priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    ...(OFFER_SHIPPING_DETAILS ? { shippingDetails: OFFER_SHIPPING_DETAILS } : {}),
    ...(MERCHANT_RETURN_POLICY ? { returnPolicy: MERCHANT_RETURN_POLICY } : {}),
  }
```

Note `brand` is left `undefined` here rather than wired to `publicBrand()` — that import doesn't currently exist in this file and pulling it in is a one-line addition (`import { publicBrand } from '@/lib/brand'`) if you want full parity; do that now since it's free:

```typescript
import { publicBrand } from '@/lib/brand'
```

...and change the `brand` line to:

```typescript
    brand: publicBrand(productData.product) ?? undefined,
```

Then render it in the JSX, right after the existing `<meta property="og:type" .../>` and before `<BreadcrumbSchema`:

```tsx
      <meta property="og:type" content="product" />
      <ProductSchema {...schemaProps} />
      <BreadcrumbSchema
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run app/category/__tests__/product-schema.test.ts`
Expected: PASS.

- [ ] **Step 9: Run both schema test files together to confirm no cross-regression**

Run: `npx vitest run app/product/__tests__/variant-schema.test.ts app/category/__tests__/product-schema.test.ts app/category/[slug]/[product]/page.tsx --run 2>/dev/null; npx vitest run app/product/__tests__ app/category/__tests__`
Expected: all PASS.

- [ ] **Step 10: Commit**

```bash
git add app/product/[slug]/page.tsx app/category/[slug]/[product]/page.tsx app/product/__tests__/variant-schema.test.ts app/category/__tests__/product-schema.test.ts
git commit -m "fix(catalog): structured data follows the selected variant's mpn/image on both PDP routes"
```

---

### Task 9: Variant image on every card-grid query (Quick Add data path)

**Files:**
- Modify: `lib/shopify/queries/products.ts` (`PRODUCT_CARD_FRAGMENT`, `SEARCH_PRODUCTS_BY_TAG`)
- Modify: `lib/shopify/queries/collections.ts` (`GET_COLLECTION`)
- Modify: `lib/shopify/queries/search.ts` (`SEARCH_PRODUCTS`)
- Modify: `lib/shopify/__tests__/product-query-metafields.test.ts`

**Interfaces:**
- Produces: every query feeding `CollectionProduct` (Task 2's widened Pick) now actually selects `image` per variant, matching the type.

- [ ] **Step 1: Write the failing tests**

Add to `lib/shopify/__tests__/product-query-metafields.test.ts` (needs `GET_COLLECTION` and `SEARCH_PRODUCTS` imports added to the top-of-file import list alongside the existing ones):

```typescript
import { GET_PRODUCT, GET_PRODUCTS_BY_VENDOR, GET_PRODUCT_RECS, SEARCH_PRODUCTS_BY_TAG, PRODUCT_CARD_FRAGMENT_TEST_ONLY_UNUSED } from '../queries/products'
```

(Skip that last import — `PRODUCT_CARD_FRAGMENT` isn't exported today. Instead, test it indirectly through `GET_PRODUCTS_BY_VENDOR`/`GET_PRODUCT_RECS`, which already interpolate it, exactly like the existing brand/RX guard block does.)

```typescript
// Quick Add gap (2026-08-14): ShopifyQuickAddButton/QuickAddContent read
// CollectionProduct.variants.nodes[].image (types.ts, Task 2) to switch the
// modal's gallery per selected variant — but no card-grid query has ever
// selected it, so the field was always undefined and Quick Add always showed
// the product's first image regardless of which variant was picked. Not
// AeroWalk-specific: every multi-color product had this gap.
describe('variant.image selected on every card-grid query (Quick Add fix)', () => {
  it('the shared ProductCard fragment (GET_PRODUCTS_BY_VENDOR, GET_PRODUCT_RECS) requests it', () => {
    expect(GET_PRODUCTS_BY_VENDOR).toMatch(/variants\(first: 1\) \{\s*nodes \{[^}]*image \{/)
    expect(GET_PRODUCT_RECS).toMatch(/variants\(first: 1\) \{\s*nodes \{[^}]*image \{/)
  })

  it('SEARCH_PRODUCTS_BY_TAG (L2/industry/OCC grids) requests it', () => {
    expect(SEARCH_PRODUCTS_BY_TAG).toMatch(/variants\(first: 10\) \{\s*nodes \{[^}]*image \{/)
  })
})
```

Add a second, separate test to a new-or-existing collections/search query test file — check first whether `lib/shopify/queries/__tests__/collections.test.ts` already has a guard-style suite to extend:

- [ ] **Step 2: Check the existing collections query test file's style**

Run: `npx vitest run lib/shopify/queries/__tests__/collections.test.ts` (just to confirm it currently passes, as a baseline)
Expected: PASS (baseline, before any change).

Then open `lib/shopify/queries/__tests__/collections.test.ts`, and add at the end of the file:

```typescript
describe('GET_COLLECTION variant.image (Quick Add fix, 2026-08-14)', () => {
  it('requests image on each variant so Quick Add can switch its gallery per selection', () => {
    expect(GET_COLLECTION).toMatch(/variants\(first: 10\) \{\s*nodes \{[^}]*image \{/)
  })
})
```

(Add `describe`/`it`/`expect` to the file's existing `vitest` import if not already present, and confirm `GET_COLLECTION` is already imported — it is, per the file's existing suite.)

And create the equivalent for search:

```typescript
// lib/shopify/queries/__tests__/search.test.ts (new file, or append if one exists — check first)
import { describe, it, expect } from 'vitest'
import { SEARCH_PRODUCTS } from '../search'

describe('SEARCH_PRODUCTS variant.image (Quick Add fix, 2026-08-14)', () => {
  it('requests image on the selected variant', () => {
    expect(SEARCH_PRODUCTS).toMatch(/variants\(first: 1\) \{\s*nodes \{[^}]*image \{/)
  })
})
```

Run `Glob lib/shopify/queries/__tests__/search.test.ts` equivalent first (check the file doesn't already exist under a different name) before creating it fresh.

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run lib/shopify/__tests__/product-query-metafields.test.ts lib/shopify/queries/__tests__/collections.test.ts lib/shopify/queries/__tests__/search.test.ts`
Expected: FAIL on every new `it` — none of the four queries select variant `image` yet.

- [ ] **Step 4: Add `image` to `PRODUCT_CARD_FRAGMENT`'s variant selection**

In `lib/shopify/queries/products.ts`, update the fragment's `variants(first: 1)` block (lines 38-45):

```graphql
    variants(first: 1) {
      nodes {
        id
        price { amount currencyCode }
        compareAtPrice { amount currencyCode }
        availableForSale
        # Quick Add fix (2026-08-14): native variant-media assignment, same
        # field the PDP already reads (LG-03). Without this, QuickAddContent
        # always shows the product's first image regardless of the selected
        # variant/color.
        image { id url altText width height }
      }
    }
```

- [ ] **Step 5: Add `image` to `SEARCH_PRODUCTS_BY_TAG`'s variant selection**

In the same file, `SEARCH_PRODUCTS_BY_TAG`'s `variants(first: 10)` block (lines 264-272):

```graphql
          variants(first: 10) {
            nodes {
              id
              title
              price { amount currencyCode }
              compareAtPrice { amount currencyCode }
              availableForSale
              image { id url altText width height }
            }
          }
```

- [ ] **Step 6: Add `image` to `GET_COLLECTION`'s variant selection**

In `lib/shopify/queries/collections.ts`, the `variants(first: 10)` block (lines 105-113):

```graphql
          variants(first: 10) {
            nodes {
              id
              title
              price { amount currencyCode }
              compareAtPrice { amount currencyCode }
              availableForSale
              image { id url altText width height }
            }
          }
```

- [ ] **Step 7: Add `image` to `SEARCH_PRODUCTS`'s variant selection**

In `lib/shopify/queries/search.ts`, the `variants(first: 1)` block (lines 67-74):

```graphql
          variants(first: 1) {
            nodes {
              id
              price { amount currencyCode }
              compareAtPrice { amount currencyCode }
              availableForSale
              image { id url altText width height }
            }
          }
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npx vitest run lib/shopify/__tests__/product-query-metafields.test.ts lib/shopify/queries/__tests__/collections.test.ts lib/shopify/queries/__tests__/search.test.ts`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add lib/shopify/queries/products.ts lib/shopify/queries/collections.ts lib/shopify/queries/search.ts lib/shopify/__tests__/product-query-metafields.test.ts lib/shopify/queries/__tests__/collections.test.ts lib/shopify/queries/__tests__/search.test.ts
git commit -m "feat(catalog): select variant image on every card-grid query for Quick Add"
```

---

### Task 10: Wire variant image through `ProductCardData` and switch Quick Add's gallery

**Files:**
- Modify: `types/product.ts`
- Modify: `components/store/ShopifyQuickAddButton.tsx`
- Modify: `components/product/QuickAddContent.tsx`
- Modify: `components/product/__tests__/QuickAddContent.test.tsx`

**Interfaces:**
- Consumes: `CollectionProduct.variants.nodes[].image` (Task 2 + Task 9).
- Produces: `ProductCardData.variants[]` entries gain `image?: { url: string; altText: string; width: number; height: number } | null`; `QuickAddContent`'s gallery follows the selected variant.

- [ ] **Step 1: Write the failing test**

In `components/product/__tests__/QuickAddContent.test.tsx`, check the existing fixture shape first (read the file), then add a new `describe` block mirroring the existing test style, using two variants with different `image`s:

```typescript
// Appended to components/product/__tests__/QuickAddContent.test.tsx
describe('QuickAddContent — variant image switch (Quick Add fix, 2026-08-14)', () => {
  it('shows the first variant\'s image initially, then switches when a different variant is selected', () => {
    const product: ProductCardData = {
      ...baseProduct, // reuse whatever the file's existing baseProduct/fixture is named — see file
      variants: [
        { id: 'v1', title: 'Blue', price: 12999, available: true, image: { url: 'https://cdn/blue.jpg', altText: 'Blue', width: 800, height: 800 } },
        { id: 'v2', title: 'White', price: 12999, available: true, image: { url: 'https://cdn/white.jpg', altText: 'White', width: 800, height: 800 } },
      ],
    }
    render(<QuickAddContent product={product} titleId="t" />)
    expect(screen.getByAltText('Blue')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'White' }))
    expect(screen.getByAltText('White')).toBeInTheDocument()
  })

  it('never shows a sibling variant\'s image when the selected one has none — falls back to the product image only when it is the same image already shown, not a mismatched one', () => {
    const product: ProductCardData = {
      ...baseProduct,
      image: { url: 'https://cdn/blue.jpg', altText: 'Blue', width: 800, height: 800 },
      variants: [
        { id: 'v1', title: 'Blue', price: 12999, available: true, image: { url: 'https://cdn/blue.jpg', altText: 'Blue', width: 800, height: 800 } },
        { id: 'v2', title: 'Grey', price: 12999, available: true, image: null },
      ],
    }
    render(<QuickAddContent product={product} titleId="t" />)
    fireEvent.click(screen.getByRole('button', { name: 'Grey' }))
    expect(screen.queryByAltText('Blue')).not.toBeInTheDocument()
  })
})
```

Adjust the fixture spread/import names to match whatever `QuickAddContent.test.tsx` already defines (read the file's top before writing this — it already has a working `ProductCardData` fixture and render helper this task must reuse, not duplicate).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/product/__tests__/QuickAddContent.test.tsx`
Expected: FAIL — clicking "White" doesn't change the displayed image at all today (no such wiring exists).

- [ ] **Step 3: Add `image` to `ProductCardData.variants[]`**

In `types/product.ts`, update the `variants` field on `ProductCardData` (line 61):

```typescript
  variants: {
    id: string
    title: string
    price: number
    compareAtPrice?: number
    available: boolean
    /** Native Shopify variant-media assignment. Null/absent when the
        variant has no assigned image — QuickAddContent falls back to a
        neutral state rather than showing a sibling variant's image
        (2026-08-14 fix, mirrors the PDP's useSelectedVariant). */
    image?: { url: string; altText: string; width: number; height: number } | null
  }[];
```

- [ ] **Step 4: Pass `image` through in `toCardData`**

In `components/store/ShopifyQuickAddButton.tsx`, update the `variants: product.variants.nodes.map(...)` block (lines 48-56):

```typescript
    variants: product.variants.nodes.map((v) => ({
      id: v.id,
      title: v.title,
      price: Math.round(parseFloat(v.price.amount) * 100),
      compareAtPrice: v.compareAtPrice
        ? Math.round(parseFloat(v.compareAtPrice.amount) * 100)
        : undefined,
      available: v.availableForSale,
      image: v.image
        ? { url: v.image.url, altText: cleanShopifyAlt(v.image.altText) ?? product.title, width: v.image.width, height: v.image.height }
        : null,
    })),
```

- [ ] **Step 5: Switch the gallery in `QuickAddContent.tsx`**

Replace the `allImages`/`activeImg` setup (lines 31-41):

```typescript
  // Quick Add fix (2026-08-14): the gallery now follows the selected variant
  // the same way the PDP does (useSelectedVariant) — a color with no
  // verified image must never show a sibling color's image, so the fallback
  // is the product's shared gallery only for genuinely shared surfaces
  // (single-color / non-color-variant products), not blindly always.
  const isMultiVariantWithImages = product.variants.some((v) => v.image)
  const [activeImg, setActiveImg] = useState(0)
  const [selectedVariantId, setSelectedVariantId] = useState(
    purchasableVariantsInitial(product),
  )
```

That references a helper not yet defined and reorders `purchasableVariants` before its own declaration — instead, keep the existing declaration order and only change what's necessary. Replace lines 31-46 (from `const allImages = ...` through the `const [added, setAdded] = useState(false)` line) with:

```typescript
  const purchasableVariants = product.variants.filter((v) =>
    resolvePurchasable({ price: v.price / 100, availableForSale: v.available }).purchasable,
  )
  const [activeImg, setActiveImg] = useState(0)
  const [selectedVariantId, setSelectedVariantId] = useState(
    purchasableVariants[0]?.id ?? product.variants[0]?.id ?? '',
  )
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)

  const selectedVariant = product.variants.find((v) => v.id === selectedVariantId) ?? null

  // Quick Add fix (2026-08-14): follow the selected variant's own image the
  // same way the PDP's useSelectedVariant does. A multi-variant product
  // where at least one variant carries its own image is treated the same
  // way the PDP treats "multi-color" — a variant with no image of its own
  // must never show a sibling variant's image, so the gallery is empty
  // (renders the placeholder) rather than falling back to `product.image`.
  const anyVariantHasOwnImage = product.variants.some((v) => v.image)
  const allImages = selectedVariant?.image
    ? [selectedVariant.image]
    : anyVariantHasOwnImage
      ? []
      : product.images && product.images.length > 0
        ? product.images
        : [product.image]
```

Then remove the old, now-duplicate `const selectedVariant = product.variants.find(...)` declaration further down (original line 48) — it's been moved up above `allImages` since `allImages` now depends on it.

Add a reset of `activeImg` whenever the selected variant changes — insert into `handleSelectVariant` (originally lines 99-102):

```typescript
  function handleSelectVariant(id: string) {
    setSelectedVariantId(id)
    setActiveImg(0)
    setAdded(false)
  }
```

Finally, guard the `<Image>` render for the empty-gallery case — currently `allImages[activeImg]?.url ?? ''` (line 111) already tolerates `undefined` gracefully (renders `next/image` with `src=""`, which is not ideal but pre-existing behavior for any product with zero images; leave as-is, since fixing next/image's empty-src handling is a separate, unrelated concern not in scope here).

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run components/product/__tests__/QuickAddContent.test.tsx`
Expected: PASS, including all pre-existing tests in the file (re-run the whole file, not just the new block, since `selectedVariant`'s declaration moved).

- [ ] **Step 7: Commit**

```bash
git add types/product.ts components/store/ShopifyQuickAddButton.tsx components/product/QuickAddContent.tsx components/product/__tests__/QuickAddContent.test.tsx
git commit -m "fix(catalog): Quick Add gallery follows the selected variant's image, never a sibling's"
```

---

### Task 11: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Type-check the whole project**

Run: `npx tsc --noEmit -p .`
Expected: 0 errors.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: clean (0 warnings, matching this repo's `--max-warnings 0` convention referenced in `docs/HANDOFF-catalog-cro-2026-08-03.md`).

- [ ] **Step 3: Full unit/component test suite**

Run: `npx vitest run`
Expected: all test files pass, count increased by the ~10 new test files/blocks added across Tasks 4-10 versus the 139/139 baseline recorded in `2026-08-14-launch-remediation-dev-status.md`.

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 5: Re-run the existing live-data LG-03 e2e spec unchanged, to confirm no regression on the one already-verified multi-color product**

Run: `E2E_BASE_URL=<dev-server-url> npx playwright test e2e/variant-identity.spec.ts --project=chromium --project=mobile-chromium`
Expected: 4/4 passing, same as the 2026-08-14 dev-status baseline. (This does not exercise AeroWalk — that requires Izzy's write and is covered by Task 1's post-write checklist, not by CI.)

- [ ] **Step 6: Update the dev-status doc**

Append a new dated section to a copy of `2026-08-14-launch-remediation-dev-status.md`-style status (or hand this plan's completion back to whichever doc Sardor maintains for Bilal) noting: field contract proposed (pending Izzy confirmation of the 4 keys), PDP + structured data + Quick Add all variant-synced in code, AeroWalk pilot itself still blocked on Izzy's Shopify write + the post-write checklist in Task 1's doc. This step is reporting, not a code change — do it in whatever channel Sardor already uses to report to Bilal (Slack, per the transcript), not necessarily a new committed file.

- [ ] **Step 7: Final commit (if Step 6 produced a committed file)**

```bash
git add -A
git commit -m "docs(catalog): AeroWalk variant field sync — dev-side complete, pending Izzy's pilot write"
```
