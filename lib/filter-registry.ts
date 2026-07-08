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
// TODO(Izzy): confirm exact ns/key pairs from the metafield definitions.
// Definitions must be single_line_text_field / boolean / number_integer /
// number_decimal with BOTH "filterable" and Storefront access enabled,
// or the facet never appears regardless of this registry.
const METAFIELD_NS = 'custom'
export const APPROVED_METAFIELDS = {
  material: metafield(METAFIELD_NS, 'material'),
  size: metafield(METAFIELD_NS, 'size'),
  gloveSize: metafield(METAFIELD_NS, 'glove_size'),
  needleGauge: metafield(METAFIELD_NS, 'needle_gauge'),
  orderSize: metafield(METAFIELD_NS, 'order_size'),
  testsFor: metafield(METAFIELD_NS, 'tests_for'),
  length: metafield(METAFIELD_NS, 'length'),
  volume: metafield(METAFIELD_NS, 'volume'),
  weight: metafield(METAFIELD_NS, 'weight'),
} as const

// ── Hard deny: raw tags never render, no matter what S&D returns ───────────
export function isBlockedFacetId(facetId: string): boolean {
  return facetId === 'filter.p.tag' || facetId.startsWith('filter.p.tag.')
}

// Internal taxonomy/ops tag values that must never leak into the UI.
// (Values of the tag facet — blocked wholesale via isBlockedFacetId — and
// also rejected as URL-supplied filter inputs below.)
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
const OCC_RULES: FacetRule[] = [AVAILABILITY, PRICE, VENDOR, PRODUCT_TYPE]

export const filterRegistry: Record<string, FacetRule[]> = {
  // OCC hub + its eligible collections: no glove / needle / testing facets.
  occ: OCC_RULES,
  'hygiene-kits': OCC_RULES,
  'school-supplies': OCC_RULES,
  backpacks: OCC_RULES,
  'gifts-toys': OCC_RULES,

  gloves: [
    APPROVED_METAFIELDS.gloveSize,
    variantOption('size'),
    APPROVED_METAFIELDS.material,
    VENDOR,
    PRICE,
    AVAILABILITY,
  ],

  'needles-syringes': [
    APPROVED_METAFIELDS.needleGauge,
    APPROVED_METAFIELDS.length,
    APPROVED_METAFIELDS.volume,
    APPROVED_METAFIELDS.orderSize,
    VENDOR,
    PRICE,
    AVAILABILITY,
  ],

  mobility: [
    APPROVED_METAFIELDS.weight,
    APPROVED_METAFIELDS.size,
    variantOption('size'),
    VENDOR,
    PRICE,
    AVAILABILITY,
  ],
}

// Safe default for any collection without an explicit registry entry.
export const DEFAULT_FACET_RULES: FacetRule[] = [AVAILABILITY, PRICE, VENDOR]

// Sources that MAY be referenced by registry entries (spec §"Allowed filter
// sources"). Exported so the guard test can assert registry entries never
// reference anything outside this set.
export const ALL_ALLOWED_RULES: FacetRule[] = [
  CATEGORY,
  PRODUCT_TYPE,
  VENDOR,
  PRICE,
  AVAILABILITY,
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
const ALLOWED_INPUT_KEYS = new Set([
  'available',
  'price',
  'productType',
  'productVendor',
  'variantOption',
  'productMetafield',
  'variantMetafield',
  'category',
  'taxonomyMetafield',
])

export function isAllowedFilterInput(input: string): boolean {
  try {
    const parsed: unknown = JSON.parse(input)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return false
    const keys = Object.keys(parsed)
    return keys.length > 0 && keys.every((k) => ALLOWED_INPUT_KEYS.has(k))
  } catch {
    return false
  }
}
