/**
 * Public Brand resolution — the ONLY approved way to show a brand to a customer.
 *
 * Shopify's `vendor` field holds the **fulfilling vendor** (MedPlus, Medchain,
 * Dynarex, …), not the consumer brand. Bilal's 2026-07-28 instruction forbids
 * exposing internal fulfillers as customer-facing brands, and the live store's
 * Vendor facet was removed from Search & Discovery on 2026-07-29. PR #55's
 * `5f3f26c` hard-denied `filter.p.vendor` in the filter registry — but the
 * *rendering* layer still fell back to `vendor` whenever `custom.brand_name`
 * was empty, which reintroduced the same leak on cards, the PDP, analytics
 * `item_brand`, and Product structured data.
 *
 * Rule: the public brand is `custom.brand_name` or **nothing**. Never vendor.
 *
 * Catalog audit 2026-08-02: 3,790 active products have brand_name ≠ vendor
 * (so the fallback was materially wrong, not cosmetic), and 41 active products
 * have no brand_name at all (so callers must handle absence — hide the line).
 */

export type BrandInput = {
  /** Flattened `custom.brand_name`, or the raw metafield shape. */
  brandName?: { value: string } | string | null
}

/** Public brand, or null when none is approved. Never falls back to vendor. */
export function publicBrand(product: BrandInput | null | undefined): string | null {
  const raw = typeof product?.brandName === 'string' ? product.brandName : product?.brandName?.value
  const trimmed = (raw ?? '').trim()
  return trimmed === '' ? null : trimmed
}

/** True when a brand line may render at all. */
export function hasPublicBrand(product: BrandInput | null | undefined): boolean {
  return publicBrand(product) !== null
}
