// Registry-driven collection filters (allowlist, no raw tags, page-specific).
//
// The Storefront `collection.products.filters` response is treated as
// UNTRUSTED input: even if Search & Discovery is misconfigured to expose a
// raw-tag facet, this registry is the gate. Facets render only when their
// source is explicitly allowlisted for the current collection — everything
// else is default-denied. This is the custom-site companion to the
// Shopify-side S&D cleanup and follows the same one-registry allowlist rule
// as the nav registry in lib/category-nav.ts.

import type { CollectionFilter } from '@/lib/shopify/types'

// ── Facet id shapes (Storefront API) ────────────────────────────────────────
// filter.v.availability · filter.v.price · filter.p.type / filter.p.product_type
// filter.p.vendor · filter.p.category · filter.v.option.<name>
// filter.p.m.<ns>.<key> / filter.v.m.<ns>.<key> (metafields) · filter.p.tag

type FacetRule = { readonly name: string; matches(facetId: string): boolean }

function exact(name: string, ...ids: string[]): FacetRule {
  return { name, matches: (id) => ids.includes(id) }
}

function variantOption(optionName: string): FacetRule {
  return {
    name: `option:${optionName}`,
    matches: (id) => id.toLowerCase() === `filter.v.option.${optionName.toLowerCase()}`,
  }
}

function metafield(namespace: string, key: string): FacetRule {
  return {
    name: `metafield:${namespace}.${key}`,
    matches: (id) =>
      id === `filter.p.m.${namespace}.${key}` || id === `filter.v.m.${namespace}.${key}`,
  }
}

const AVAILABILITY = exact('availability', 'filter.v.availability')
const PRICE = exact('price', 'filter.v.price')
const VENDOR = exact('vendor', 'filter.p.vendor')
// Both spellings observed across Storefront API versions.
const PRODUCT_TYPE = exact('productType', 'filter.p.type', 'filter.p.product_type')
const CATEGORY = exact('category', 'filter.p.category')

// Approved product metafields, human name → ns/key.
// Verified against the live Storefront API (2026-07-12): collection facet ids
// for gloves / needles-syringes / mobility confirm namespace `custom` and the
// exact keys below. `size` is live as `size_length_` (trailing underscore)
// and `length` as `needle_length` — the previous guesses never matched and
// silently dropped those facets. `volume` / `weight` / `tests_for` do not
// appear in any sampled collection's live facets yet (S&D not configured or
// no Storefront access) — they stay registered and simply fail closed until
// the definitions go live. Definitions must be single_line_text_field /
// boolean / number_integer / number_decimal with BOTH "filterable" and
// Storefront access enabled, or the facet never appears regardless of this
// registry.
const METAFIELD_NS = 'custom'
export const APPROVED_METAFIELDS = {
  material: metafield(METAFIELD_NS, 'material'),
  size: metafield(METAFIELD_NS, 'size_length_'),
  gloveSize: metafield(METAFIELD_NS, 'glove_size'),
  needleGauge: metafield(METAFIELD_NS, 'needle_gauge'),
  orderSize: metafield(METAFIELD_NS, 'order_size'),
  testsFor: metafield(METAFIELD_NS, 'tests_for'),
  length: metafield(METAFIELD_NS, 'needle_length'),
  volume: metafield(METAFIELD_NS, 'volume'),
  weight: metafield(METAFIELD_NS, 'weight'),

  // The category facet the client is actually asking for, and the
  // highest-coverage attribute in the catalogue: populated on 100% of products
  // in most categories, and the field behind the old site's "Categories" list
  // (22 of its 33 values reproduce exactly).
  //
  // It fails closed today. The production definition has storefront_access:
  // NONE, so the Storefront API never returns this facet and the rail omits it.
  // Registered now so it appears the moment that setting is enabled, with no
  // further code change.
  customerCategory: metafield(METAFIELD_NS, 'customer_filter_category'),

  // The public BRAND facet. Deliberately NOT Shopify's `vendor` field: vendor
  // holds the FULFILLING vendor, which disagrees with brand on 51% of active
  // products (the DUK 7609 bandage is branded Dukal but fulfilled by MedPlus).
  // Rendering vendor as "Brand" would mislabel half the catalogue, so brand and
  // fulfiller stay separate exactly as the shipping rules require.
  brandName: metafield(METAFIELD_NS, 'brand_name'),
} as const

// ── Hard deny: raw tags never render, no matter what S&D returns ───────────
export function isBlockedFacetId(facetId: string): boolean {
  return facetId === 'filter.p.tag' || facetId.startsWith('filter.p.tag.')
}

// Internal taxonomy/ops tag values that must never leak into the UI.
// Enforced in two places: the tag facet itself is blocked wholesale via
// isBlockedFacetId, and every STRING VALUE inside URL/action-supplied filter
// objects is rejected when it matches one of these patterns (see
// isSaneString below) — so an internal tag can't be smuggled through an
// allowed key like productType or a metafield value.
export const BLOCKED_TAG_PATTERNS: readonly RegExp[] = [
  /^brand:/i,
  /^category:/i,
  /^subcategory:/i,
  /^industry:/i,
  /^partner:/i,
  /^shipping:/i,
  /^compliance:/i,
  /^discontinued$/i,
  /^consolidation-duplicate$/i,
]

// ── Per-collection facet sets, keyed by collection handle ───────────────────
// Any handle without an entry gets DEFAULT_FACET_RULES. Adding a new filter
// requires a registry entry here — nothing is ever derived from tags.
//
// Entries below are grounded in a measured coverage audit of all 10,329 active
// products across 30 L1 categories (evidence: IZ-FILTER-01_category-filter-
// matrix.csv, 540 candidate facets). A facet is registered only where it is at
// least 60% populated AND carries 2 to 40 distinct values: one value narrows
// nothing, and a value per product is a list rather than a filter.
//
// Before that audit only 10 collections had entries and the other 20 fell
// through to Availability/Price/Vendor, which is exactly the client's complaint
// that filters "don't cover the product range".

// Measured at or near 100% population in every audited category, so every
// collection gets these. Registering a facet does not force it to render: the
// Storefront API has to return it, so anything not yet live simply fails closed.
const UNIVERSAL: FacetRule[] = [
  APPROVED_METAFIELDS.customerCategory,
  APPROVED_METAFIELDS.brandName,
  APPROVED_METAFIELDS.orderSize,
  PRODUCT_TYPE,
  VENDOR,
  PRICE,
  AVAILABILITY,
]

/** Category-specific facets first, then the universal set. */
function withUniversal(...specific: FacetRule[]): FacetRule[] {
  return [...specific, ...UNIVERSAL]
}

// NOTE ON `custom.type`: deliberately never registered. Its meaning is not
// consistent across categories — on gloves it holds MATERIAL values ("Nitrile
// Gloves", "Latex Gloves"), which is the inversion Bilal reported. Exam versus
// Surgical, the value he wants under Type, comes from `product_type` instead,
// which is 100% populated on gloves (Exam Glove 343, Surgical Glove 70) and is
// already an approved source. So gloves get a correct Type facet with no data
// migration, and Material waits on `custom.material` being populated (0.9%
// today, so it fails closed until then).
const OCC_RULES: FacetRule[] = withUniversal()

export const filterRegistry: Record<string, FacetRule[]> = {
  // OCC hub + its eligible collections: no glove / needle / testing facets.
  // The category facet matters most here: it is what the client's old site
  // exposed and what the complaint is about.
  occ: OCC_RULES,
  'hygiene-kits': OCC_RULES,
  'school-supplies': OCC_RULES,
  backpacks: OCC_RULES,
  'gifts-toys': OCC_RULES,

  // 445 products. Type comes from product_type (in UNIVERSAL); glove_size is
  // only 39% populated so it fails closed until filled from vendor data.
  gloves: withUniversal(
    APPROVED_METAFIELDS.gloveSize,
    variantOption('size'),
    APPROVED_METAFIELDS.material,
  ),

  // 593 products. Measured: needle gauge 80%, needle length 78%.
  'needles-syringes': withUniversal(
    APPROVED_METAFIELDS.needleGauge,
    APPROVED_METAFIELDS.length,
    APPROVED_METAFIELDS.volume,
  ),

  // 638 products.
  mobility: withUniversal(
    APPROVED_METAFIELDS.weight,
    APPROVED_METAFIELDS.size,
    variantOption('size'),
  ),

  // ── Categories added from the coverage audit ──────────────────────────────
  // Each previously fell through to Availability/Price/Vendor only.
  'exam-room': OCC_RULES,                                     // 845 products
  'wound-care': withUniversal(APPROVED_METAFIELDS.size),      // 723, size 66%
  'room-furniture': OCC_RULES,                                // 512
  'home-care': OCC_RULES,                                     // 423
  respiratory: OCC_RULES,                                     // 408
  'emergency-supplies': OCC_RULES,                            // 355
  'surgery-procedure': OCC_RULES,                             // 319
  'patient-therapy-rehab': OCC_RULES,                         // 299
  bariatric: OCC_RULES,                                       // 258
  hygiene: OCC_RULES,                                         // 256
  'surgical-sutures': withUniversal(APPROVED_METAFIELDS.material), // 192, material 96%
  testing: withUniversal(APPROVED_METAFIELDS.testsFor),       // 173
  apparel: OCC_RULES,                                         // 152
  incontinence: OCC_RULES,                                    // 114
  'pharmacy-products': OCC_RULES,                             // 101
  'housekeeping-janitorial': OCC_RULES,                       // 85
  'non-medical': OCC_RULES,                                   // 76
  'urology-ostomy': OCC_RULES,                                // 52
  sterilization: withUniversal(APPROVED_METAFIELDS.size),     // 51, size 80%
  'face-masks': OCC_RULES,                                    // 35
  disinfectants: OCC_RULES,                                   // 31
  'office-supplies': OCC_RULES,                               // 18
  'non-healthcare': OCC_RULES,                                // 5

  // Confirmed live 2026-07-17 (docs/superpowers/plans/2026-07-17-attribute-
  // facet-audit.md, Task 1): needle_gauge/needle_length/size_length_/
  // order_size are all live, populated Storefront metafields on this
  // collection today -- same gauge/length/order-size metafield family as
  // needles-syringes above, but with size in place of volume, since dental
  // needle products carry gauge/length/size attributes, not a fill volume.
  dental: withUniversal(
    APPROVED_METAFIELDS.needleGauge,
    APPROVED_METAFIELDS.length,
    APPROVED_METAFIELDS.size,
  ),

  // Confirmed live 2026-07-17 (same audit as dental above) -- IV catheter
  // gauge is the attribute in question (24g-iv-catheters etc.), same
  // metafield family.
  'iv-therapy': withUniversal(
    APPROVED_METAFIELDS.needleGauge,
    APPROVED_METAFIELDS.length,
    APPROVED_METAFIELDS.size,
  ),
}

// Safe default for any collection without an explicit registry entry.
export const DEFAULT_FACET_RULES: FacetRule[] = [AVAILABILITY, PRICE, VENDOR]

// Search spans every collection, so unlike getAllowedFacets there is no
// collection handle to key a per-collection allowlist on. One registry
// entry covers all of search: the same non-tag sources approved anywhere
// (availability/price/vendor/productType) plus every approved metafield,
// since a search result set can span collections with different metafield
// registries.
export const SEARCH_FACET_RULES: FacetRule[] = [
  AVAILABILITY,
  PRICE,
  VENDOR,
  PRODUCT_TYPE,
  ...Object.values(APPROVED_METAFIELDS),
]

/** The single gate for search-page facets — mirrors getAllowedFacets but
 *  keyed on the search-wide allowlist instead of a collection handle. */
export function getSearchFacets(facets: CollectionFilter[]): CollectionFilter[] {
  return facets.filter(
    (facet) => !isBlockedFacetId(facet.id) && SEARCH_FACET_RULES.some((rule) => rule.matches(facet.id)),
  )
}

// Sources that MAY be referenced by registry entries (spec §"Allowed filter
// sources"). Exported so the guard test can assert registry entries never
// reference anything outside this set.
export const ALL_ALLOWED_RULES: FacetRule[] = [
  CATEGORY,
  PRODUCT_TYPE,
  VENDOR,
  PRICE,
  AVAILABILITY,
  // Variant options are an approved source and were already referenced by the
  // gloves and mobility entries, but were missing from this list, so the guard
  // test could not actually verify those two entries. Listed explicitly now.
  variantOption('size'),
  ...Object.values(APPROVED_METAFIELDS),
]

export function getFacetRules(collectionHandle: string): FacetRule[] {
  return filterRegistry[collectionHandle] ?? DEFAULT_FACET_RULES
}

/**
 * The single gate for the filter rail: returns only the facets whose source
 * is allowlisted for this collection. Blocked sources (raw tags) are stripped
 * first; everything not explicitly allowed is dropped (default-deny).
 */
export function getAllowedFacets(
  collectionHandle: string,
  facets: CollectionFilter[],
): CollectionFilter[] {
  const rules = getFacetRules(collectionHandle)
  return facets.filter(
    (facet) => !isBlockedFacetId(facet.id) && rules.some((rule) => rule.matches(facet.id)),
  )
}

/** Strips only hard-denied facets (raw tags) — used where there is no
 *  collection handle to key an allowlist on (e.g. the search page). */
export function stripBlockedFacets(facets: CollectionFilter[]): CollectionFilter[] {
  return facets.filter((facet) => !isBlockedFacetId(facet.id))
}

// ── URL-supplied filter inputs ──────────────────────────────────────────────
// ?filter= values come straight from the URL, so they get the same
// default-deny treatment before being forwarded to the Storefront API:
// tag filters are rejected outright, unknown keys are rejected.
const MAX_STRING_VALUE_LENGTH = 128

// A user-supplied string forwarded to the Storefront API: non-empty, bounded,
// and never an internal ops tag (BLOCKED_TAG_PATTERNS enforcement point).
function isSaneString(v: unknown): boolean {
  return (
    typeof v === 'string' &&
    v.length > 0 &&
    v.length <= MAX_STRING_VALUE_LENGTH &&
    !BLOCKED_TAG_PATTERNS.some((p) => p.test(v))
  )
}

function isFiniteNonNegative(v: unknown): boolean {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0
}

// {namespace, key, value} triple used by product/variant/taxonomy metafield
// filters — exactly these keys, all sane strings.
function isMetafieldValue(v: unknown): boolean {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false
  const o = v as Record<string, unknown>
  const keys = Object.keys(o).sort()
  return (
    keys.join(',') === 'key,namespace,value' &&
    isSaneString(o.namespace) && isSaneString(o.key) && isSaneString(o.value)
  )
}

// Per-key VALUE validation (NF17): keys named in ALLOWED_INPUT_KEYS but
// carrying a malformed or out-of-shape value are rejected too — the key
// check alone let arbitrary payloads through under an allowed key.
const INPUT_VALIDATORS: Record<string, (v: unknown) => boolean> = {
  available: (v) => typeof v === 'boolean',
  price: (v) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) return false
    const o = v as Record<string, unknown>
    const keys = Object.keys(o)
    if (keys.length === 0 || !keys.every((k) => k === 'min' || k === 'max')) return false
    if (o.min !== undefined && !isFiniteNonNegative(o.min)) return false
    if (o.max !== undefined && !isFiniteNonNegative(o.max)) return false
    if (o.min !== undefined && o.max !== undefined && (o.min as number) > (o.max as number)) return false
    return true
  },
  productType: isSaneString,
  productVendor: isSaneString,
  variantOption: (v) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) return false
    const o = v as Record<string, unknown>
    return (
      Object.keys(o).sort().join(',') === 'name,value' &&
      isSaneString(o.name) && isSaneString(o.value)
    )
  },
  productMetafield: isMetafieldValue,
  variantMetafield: isMetafieldValue,
  taxonomyMetafield: isMetafieldValue,
  category: (v) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) return false
    const o = v as Record<string, unknown>
    return Object.keys(o).join(',') === 'id' && isSaneString(o.id)
  },
}

/** Same allowlist gate as isAllowedFilterInput, for filter values that
 *  arrive already parsed (e.g. server-action params) rather than as JSON
 *  strings from the URL. Validates keys AND value shapes (default-deny). */
export function isAllowedFilterObject(value: unknown): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const entries = Object.entries(value)
  return (
    entries.length > 0 &&
    entries.every(([k, v]) => {
      const validate = INPUT_VALIDATORS[k]
      return validate !== undefined && validate(v)
    })
  )
}

export function isAllowedFilterInput(input: string): boolean {
  try {
    return isAllowedFilterObject(JSON.parse(input))
  } catch {
    return false
  }
}
