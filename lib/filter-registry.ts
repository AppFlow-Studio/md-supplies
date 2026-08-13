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
import { orderFacetValues } from '@/lib/catalog/facet-order'

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

  // ── Added 2026-08-12 from the approved Search & Discovery table ──────────
  // Every key below was READ OFF the live Storefront filter response, not
  // guessed: audit/live/facets.json records the exact facet ids returned for
  // all 25 category collections on 2026-08-12. Before this, S&D published
  // Type/Thickness/Features/Other Features/Sterility/Use/Color/Certification/
  // Detectable Drugs on the store, but this registry had no entry for them, so
  // the default-deny gate silently dropped every one — the gloves rail showed
  // 5 of the 13 facets Shopify was actually returning.
  //
  // `type` is registered now (it was deliberately withheld while it held
  // material values on gloves). The live response shows the inversion is
  // fixed: gloves Type has 8 values over 442 products AND a separate Material
  // facet with 6 values over 317, so the two no longer collide.
  type: metafield(METAFIELD_NS, 'type'),
  thickness: metafield(METAFIELD_NS, 'thickness'),
  features: metafield(METAFIELD_NS, 'features'),
  otherFeatures: metafield(METAFIELD_NS, 'other_features'),
  sterility: metafield(METAFIELD_NS, 'sterility'),
  use: metafield(METAFIELD_NS, 'use'),
  color: metafield(METAFIELD_NS, 'color'),
  certification: metafield(METAFIELD_NS, 'certification'),
  detectableDrugs: metafield(METAFIELD_NS, 'detectable_drugs'),
  // Approved in the S&D table but NOT returned by any of the 25 sampled
  // collections on 2026-08-12 — including testing-screening, the only page
  // that would use it. Registered so it appears the moment the definition goes
  // live; until then the default-deny gate keeps it invisible. Reported as a
  // data follow-up rather than faked from another field.
  adulterants: metafield(METAFIELD_NS, 'adulterants'),

  // The category facet the client is actually asking for, and the
  // highest-coverage attribute in the catalogue: populated on 100% of products
  // in most categories, and the field behind the old site's "Categories" list
  // (22 of its 33 values reproduce exactly).
  //
  // VERIFIED LIVE against the production Storefront API (2026-07-28): returned
  // on every collection sampled, with counts. occ 39 values, exam-room 100,
  // wound-care 64, testing-screening 52, mobility 45, surgical-sutures 13.
  //
  // Worth recording why that surprised us: the metafield DEFINITION reports
  // access.storefront NONE, which looks like it should block this. It does not.
  // That setting governs reading a metafield's VALUE on a product
  // (product.metafield(...)); filter facets are published separately from the
  // Search & Discovery index, so a definition can be unreadable yet still
  // filterable. Do not "fix" the definition on the strength of this facet.
  customerCategory: metafield(METAFIELD_NS, 'customer_filter_category'),

  // The public BRAND facet. Deliberately NOT Shopify's `vendor` field: vendor
  // holds the FULFILLING vendor, which disagrees with brand on 51% of active
  // products (the DUK 7609 bandage is branded Dukal but fulfilled by MedPlus).
  // Rendering vendor as "Brand" would mislabel half the catalogue, so brand and
  // fulfiller stay separate exactly as the shipping rules require.
  brandName: metafield(METAFIELD_NS, 'brand_name'),
} as const

// ── Hard deny: raw tags never render, no matter what S&D returns ───────────
// `filter.p.vendor` is denied for the same reason brand deliberately reads a
// metafield: Shopify's vendor field holds the FULFILLING vendor (MedPlus,
// Medchain, …), and Bilal's 2026-07-28 instruction forbids exposing internal
// fulfillers as customer-facing brands. The live store's Vendor facet was
// removed from Search & Discovery on 2026-07-29 (CHANGE-01 in the agency
// repo's live-filters bundle); a registry that still allowed it would
// reintroduce on this site exactly what was removed from the live one.
export function isBlockedFacetId(facetId: string): boolean {
  return (
    facetId === 'filter.p.tag' ||
    facetId.startsWith('filter.p.tag.') ||
    facetId === 'filter.p.vendor'
  )
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
// Entries below are grounded in a measured coverage audit of all 7,385 active
// products across 30 L1 categories (evidence: IZ-FILTER-01_category-filter-
// matrix.csv, 540 candidate facets). A facet is registered only where it is at
// least 60% populated AND carries 2 to 40 distinct values: one value narrows
// nothing, and a value per product is a list rather than a filter.
//
// Before that audit only 10 collections had entries and the other 20 fell
// through to Availability/Price/Vendor, which is exactly the client's complaint
// that filters "don't cover the product range".

// ── Ordered, per-route allowlists (spec §"Category-specific public facet
// registry" / §"Industry-specific public facet registry") ──────────────────
//
// ORDER IS PART OF THE CONTRACT. Unlike the previous FacetRule[] sets, the
// position of a rule in these arrays is the display order of the facet group
// in the rail and the drawer — getAllowedFacets sorts the Storefront response
// into registry order rather than passing through Shopify's arbitrary order.
//
// These are allowlists, not render instructions: a facet listed here still has
// to be returned by the Storefront API with at least one non-zero value for
// the current product set before it renders (see getAllowedFacets). Empty
// groups are never emitted, so "Certification" being allowed on all 25
// categories does not mean 25 empty Certification groups — on 2026-08-12 it is
// live on gloves only.
const M = APPROVED_METAFIELDS

/** Facets every category page shares, in their approved relative order. */
const TAIL: FacetRule[] = [M.orderSize, M.brandName, PRICE, M.certification]

/** Category → the approved ordered facet list, minus the shared tail. */
function cat(...head: FacetRule[]): FacetRule[] {
  return [M.customerCategory, ...head, ...TAIL]
}

// OCC and its eligible collections are not one of the 25 approved category
// routes, so they get the generic set: Category leads (it is the facet the
// client's old site exposed and the one the complaint was about), then the
// shared tail.
const OCC_RULES: FacetRule[] = cat()

// The 25 approved CATEGORY routes, keyed by the public route slug.
//
// getAllowedFacets is called with the route slug, which for 24 of the 25 is
// also the Shopify collection handle; the exceptions (testing-screening,
// trocars-trocar-kits, capes-gowns, seating, face-coverings) are keyed on the
// handle for the same reason, because that IS the public slug — see the route
// table in lib/route-registry.ts.
export const filterRegistry: Record<string, FacetRule[]> = {
  occ: OCC_RULES,
  'hygiene-kits': OCC_RULES,
  'school-supplies': OCC_RULES,
  backpacks: OCC_RULES,
  // NOTE: no collection with the handle `gifts-toys` exists, in the 07-19
  // baseline or on the live storefront. This entry predates the coverage audit
  // and is inert. Left in place rather than removed so whoever added it can
  // confirm the intended handle.
  'gifts-toys': OCC_RULES,
  'office-supplies': OCC_RULES,

  // Category, Type, Material, Glove Size, Size, Thickness, Features, Other
  // Features, Sterility, Use, Color, Order Size, Brand Name, Price, Certification
  gloves: cat(M.type, M.material, M.gloveSize, M.size, M.thickness, M.features, M.otherFeatures, M.sterility, M.use, M.color),

  'wound-care': cat(M.type, M.material, M.size, M.features, M.otherFeatures, M.sterility, M.use, M.color),

  'needles-syringes': cat(M.type, M.needleGauge, M.length, M.size, M.material, M.features, M.otherFeatures, M.sterility, M.use),

  'surgical-sutures': cat(M.type, M.material, M.size, M.length, M.features, M.otherFeatures, M.sterility, M.use, M.color),

  // The L1 collection handle is testing-screening; `testing` is the category:
  // tag value and is not a collection.
  'testing-screening': cat(M.type, M.testsFor, M.detectableDrugs, M.adulterants, M.size, M.features, M.otherFeatures, M.sterility, M.use),

  'exam-room': cat(M.type, M.material, M.size, M.features, M.otherFeatures, M.use, M.color),

  respiratory: cat(M.type, M.material, M.size, M.features, M.otherFeatures, M.sterility, M.use),

  mobility: cat(M.type, M.material, M.size, M.features, M.otherFeatures, M.use, M.color),

  'patient-therapy-rehab': cat(M.type, M.material, M.size, M.features, M.otherFeatures, M.use, M.color),

  // Surgery & Procedure. Keyed on the live collection handle because that is
  // the public route slug.
  'trocars-trocar-kits': cat(M.type, M.material, M.size, M.needleGauge, M.length, M.features, M.otherFeatures, M.sterility, M.use, M.color),

  // Apparel.
  'capes-gowns': cat(M.type, M.material, M.size, M.features, M.otherFeatures, M.sterility, M.use, M.color),

  hygiene: cat(M.type, M.material, M.size, M.features, M.otherFeatures, M.use, M.color),

  disinfectants: cat(M.type, M.size, M.features, M.otherFeatures, M.use),

  'home-care': cat(M.type, M.material, M.size, M.features, M.otherFeatures, M.use, M.color),

  'emergency-supplies': cat(M.type, M.material, M.size, M.features, M.otherFeatures, M.sterility, M.use, M.color),

  incontinence: cat(M.type, M.material, M.size, M.features, M.otherFeatures, M.use, M.color),

  'iv-therapy': cat(M.type, M.needleGauge, M.length, M.material, M.size, M.features, M.otherFeatures, M.sterility, M.use),

  'urology-ostomy': cat(M.type, M.material, M.size, M.features, M.otherFeatures, M.sterility, M.use, M.color),

  sterilization: cat(M.type, M.material, M.size, M.features, M.otherFeatures, M.sterility, M.use),

  dental: cat(M.type, M.material, M.size, M.needleGauge, M.length, M.features, M.otherFeatures, M.sterility, M.use, M.color),

  'housekeeping-janitorial': cat(M.type, M.material, M.size, M.features, M.otherFeatures, M.use, M.color),

  bariatric: cat(M.type, M.material, M.size, M.features, M.otherFeatures, M.use, M.color),

  // Room Furniture.
  seating: cat(M.type, M.material, M.size, M.features, M.otherFeatures, M.use, M.color),

  // Face Masks. Registered under BOTH keys on purpose: `face-masks` is the
  // canonical public slug (proxy.ts 301s the handle to it) and is what
  // getAllowedFacets is called with, while `face-coverings` is the Shopify
  // handle and stays registered so a direct hit on the pre-redirect URL cannot
  // silently fall through to the bare default facet set.
  // Thickness is approved here and live on other routes, so it stays
  // registered even though this route currently returns no Thickness values.
  'face-masks': cat(M.type, M.material, M.size, M.thickness, M.features, M.otherFeatures, M.sterility, M.use, M.color),
  'face-coverings': cat(M.type, M.material, M.size, M.thickness, M.features, M.otherFeatures, M.sterility, M.use, M.color),

  'pharmacy-products': cat(M.type, M.material, M.size, M.testsFor, M.features, M.otherFeatures, M.sterility, M.use, M.color),
}

// ── The 5 approved INDUSTRY routes ─────────────────────────────────────────
// Industry pages span several product families, so Category leads even more
// firmly than on a category page. Keyed by industry slug; resolved through
// getIndustryFacetRules so an industry can never accidentally pick up a
// same-named category entry.
export const industryFilterRegistry: Record<string, FacetRule[]> = {
  'urgent-care': cat(M.type, M.testsFor, M.needleGauge, M.length, M.material, M.gloveSize, M.size, M.thickness, M.features, M.otherFeatures, M.sterility, M.use, M.color),
  'hrt-clinics': cat(M.type, M.needleGauge, M.length, M.size, M.material, M.features, M.otherFeatures, M.sterility, M.use),
  'home-health': cat(M.type, M.material, M.gloveSize, M.size, M.features, M.otherFeatures, M.sterility, M.use, M.color),
  'clinics-doctors-offices': cat(M.type, M.testsFor, M.needleGauge, M.length, M.material, M.gloveSize, M.size, M.thickness, M.features, M.otherFeatures, M.sterility, M.use, M.color),
  pharmacies: cat(M.type, M.testsFor, M.detectableDrugs, M.adulterants, M.material, M.size, M.features, M.otherFeatures, M.sterility, M.use, M.color),
}

// Safe default for any collection without an explicit registry entry.
export const DEFAULT_FACET_RULES: FacetRule[] = [AVAILABILITY, PRICE]

// Search spans every collection, so unlike getAllowedFacets there is no
// collection handle to key a per-collection allowlist on. One registry
// entry covers all of search: the same non-tag sources approved anywhere
// (availability/price/productType) plus every approved metafield,
// since a search result set can span collections with different metafield
// registries.
export const SEARCH_FACET_RULES: FacetRule[] = [
  AVAILABILITY,
  PRICE,
  PRODUCT_TYPE,
  ...Object.values(APPROVED_METAFIELDS),
]

/** The single gate for search-page facets — mirrors getAllowedFacets but
 *  keyed on the search-wide allowlist instead of a collection handle. */
export function getSearchFacets(facets: CollectionFilter[]): CollectionFilter[] {
  return facets
    .filter(
      (facet) => !isBlockedFacetId(facet.id) && SEARCH_FACET_RULES.some((rule) => rule.matches(facet.id)),
    )
    // Same count-descending value order as the category rail — /search shares
    // the FilterRail component, so a different order there would be a visible
    // inconsistency for the same facet.
    .map((facet) =>
      facet.type === 'PRICE_RANGE' ? facet : { ...facet, values: orderFacetValues(facet.values) },
    )
}

// Sources that MAY be referenced by registry entries (spec §"Allowed filter
// sources"). Exported so the guard test can assert registry entries never
// reference anything outside this set.
export const ALL_ALLOWED_RULES: FacetRule[] = [
  CATEGORY,
  PRODUCT_TYPE,
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

/** Industry routes resolve against their own registry, never the category one. */
export function getIndustryFacetRules(industrySlug: string): FacetRule[] {
  return industryFilterRegistry[industrySlug] ?? DEFAULT_FACET_RULES
}

/** Which registry a route family reads from. */
export type FacetRouteKind = 'category' | 'industry'

export function getFacetRulesFor(kind: FacetRouteKind, key: string): FacetRule[] {
  return kind === 'industry' ? getIndustryFacetRules(key) : getFacetRules(key)
}

/**
 * The single gate for the filter rail: returns only the facets whose source is
 * allowlisted for this route, IN REGISTRY ORDER, with each group's values
 * ordered by exact live count descending (alphabetical on ties).
 *
 * Three things happen here and nowhere else, so the rail, the mobile drawer and
 * the Category tab row cannot disagree:
 *
 *  1. Default-deny. Blocked sources (raw tags, vendor) are stripped, then
 *     anything not explicitly allowlisted for this route is dropped. An
 *     unexpected facet appearing in Search & Discovery cannot reach the UI.
 *  2. Registry order. Shopify returns facets in its own order; the approved
 *     spec fixes the order per route (Category first, Price/Certification last).
 *  3. Relevance. A group with no values carrying a non-zero count is not a
 *     filter — it is noise — so it is not emitted at all. PRICE_RANGE is
 *     exempt: its single value carries bounds rather than a count.
 */
export function getAllowedFacets(
  collectionHandle: string,
  facets: CollectionFilter[],
  kind: FacetRouteKind = 'category',
  /**
   * Currently-selected filter inputs. A selected value keeps its group alive
   * even after another selection drives its count to zero — otherwise the
   * group vanishes and the user has no way to deselect it (spec: "preserve
   * selected values even if another selection makes their current count zero").
   */
  activeFilterInputs: readonly string[] = [],
): CollectionFilter[] {
  const rules = getFacetRulesFor(kind, collectionHandle)
  const active = new Set(activeFilterInputs)
  const ordered: CollectionFilter[] = []

  for (const rule of rules) {
    const facet = facets.find((f) => !isBlockedFacetId(f.id) && rule.matches(f.id))
    if (!facet) continue
    if (facet.type === 'PRICE_RANGE') {
      ordered.push(facet)
      continue
    }
    // Relevance gate: a group whose every value is zero-count narrows nothing.
    if (!facet.values.some((v) => v.count > 0 || active.has(v.input))) continue
    ordered.push({ ...facet, values: orderFacetValues(facet.values) })
  }

  return ordered
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
  // `productVendor` is deliberately ABSENT. Denying the `filter.p.vendor` FACET
  // only stops the rail from rendering a Vendor group — it does not stop a
  // hand-crafted or crawled `?filter={"productVendor":"MedPlus"}` from being
  // accepted here and forwarded to the Storefront API, which would filter the
  // catalogue by internal FULFILLING vendor, render a vendor chip, and mint
  // indexable faceted URLs keyed on fulfiller names. Facet-deny and input-deny
  // are two separate gates and both have to close. Omitting the key is the
  // enforcement: unknown keys are default-denied by isAllowedFilterObject.
  // The partner pages do NOT depend on this — they pass `vendor:"…"` as a
  // Storefront `query` string, which never reaches this validator.
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
