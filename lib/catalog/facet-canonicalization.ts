// Presentation-layer canonicalization for facet VALUES.
//
// The live catalogue carries pairs of `custom.*` metafield values that are the
// same customer-facing concept spelled two ways — almost always a singular and
// a plural of the identical string, occasionally a casing difference. Each one
// renders as two separate options in the filter rail, each with its own partial
// count, so a shopper has to tick both to see everything under one idea.
//
// Full production scan, 2026-08-26 (all 26 collection-backed routes plus the
// three tag-sourced L1s): 18 such groups. They are enumerated in
// docs/audits/2026-08-26-home-care-filter-anomalies.md with per-product
// evidence, and that document is the hand-off asking Izzy to collapse them in
// Shopify. This module is the interim, frontend-only half of the fix:
//
//   · The RAW values stay exactly as Shopify holds them. Nothing here edits,
//     hides, or invents catalogue data.
//   · One customer-facing option renders per concept, under the canonical
//     spelling — which is itself always one of the live raw values, never a
//     new string.
//   · Selecting it queries EVERY raw value in the group (Shopify ORs multiple
//     filters that share a metafield key — verified live: Shower Commode 5 +
//     Shower Commodes 4 -> 9 together on Home Care), so the merged option
//     returns the union, not one half of it.
//   · The URL keeps ONE parameter per logical option (the canonical value).
//     Expansion to the full raw set happens server-side in
//     `expandFilterInputs`, at the single point where URL filter strings are
//     turned into Storefront `ProductFilter` inputs.
//
// Only groups whose members were inspected product-by-product and confirmed to
// be the same concept are listed here — see §"Duplicate value groups" in the
// audit for the product lists. A pair that merely LOOKS similar is reported in
// the audit and left alone in the UI.

import type { CollectionFilter, CollectionFilterValue } from '@/lib/shopify/types'

/** `custom.<key>` a group applies to, matched against the facet id suffix. */
export type CanonicalValueGroup = {
  /** The spelling shown to customers, and the value carried in the URL. */
  canonical: string
  /** Every live raw value that means the same thing, canonical included. */
  variants: readonly string[]
}

/**
 * Verified duplicate groups, keyed by metafield key.
 *
 * Counts in the comments are the live figures on 2026-08-26 and are
 * documentation only — nothing here depends on them.
 */
export const CANONICAL_VALUE_GROUPS: Readonly<Record<string, readonly CanonicalValueGroup[]>> = {
  customer_filter_category: [
    { canonical: 'Gauze Rolls', variants: ['Gauze Roll', 'Gauze Rolls'] },                                     // wound-care 19 + 1
    { canonical: 'Tracheostomy Care Kits', variants: ['Tracheostomy Care Kit', 'Tracheostomy Care Kits'] },     // respiratory 1 + 4
    { canonical: 'Lotions', variants: ['Lotion', 'Lotions'] },                                                 // hygiene 1 + 5
    { canonical: 'Shaving Creams', variants: ['Shaving Cream', 'Shaving Creams'] },                            // hygiene 6 + 1
    { canonical: 'Toothbrush Holders', variants: ['Toothbrush Holder', 'Toothbrush Holders'] },                 // hygiene 4 + 1
    { canonical: 'Bath Mats', variants: ['Bath Mat', 'Bath Mats'] },                                            // home-care 1 + 1
    { canonical: 'Bed Wedges', variants: ['Bed Wedge', 'Bed Wedges'] },                                         // home-care 1 + 1
    { canonical: 'Grab Bars', variants: ['Grab Bar', 'Grab Bars'] },                                            // home-care 4 + 2
    { canonical: 'Pressure Relief Cushions', variants: ['Pressure Relief Cushion', 'Pressure Relief Cushions'] },// home-care 1 + 1
    // The reported defect. Home Care -> Bedside Commodes and -> Shower
    // Commodes both showed these as two options with small, unequal counts.
    { canonical: 'Shower Commodes', variants: ['Shower Commode', 'Shower Commodes'] },                          // home-care 6 + 4
    { canonical: 'Lifeguard Umbrellas', variants: ['Lifeguard Umbrella', 'Lifeguard Umbrellas'] },              // emergency-supplies 1 + 13
    { canonical: 'Bariatric Trapeze Bars', variants: ['Bariatric Trapeze Bar', 'Bariatric Trapeze Bars'] },     // bariatric 1 + 4
    { canonical: 'Beds', variants: ['Bed', 'Beds'] },                                                           // room-furniture 195 + 95
  ],
  other_features: [
    { canonical: '2 Y-Sites', variants: ['2 Y-Site', '2 Y-Sites'] },                                            // needles-syringes 2 + 1
  ],
  type: [
    { canonical: 'Test Strips', variants: ['Test Strip', 'Test Strips'] },                                      // testing-screening 1 + 1
  ],
  tests_for: [
    { canonical: 'COVID-19', variants: ['COVID-19', 'Covid-19'] },                                              // testing-screening 8 + 3
  ],
  // Casing-only splits of one brand. Merged so the rail does not offer the
  // same manufacturer twice; which spelling is official is Izzy's call, and
  // both are flagged in the audit. Picking either here changes presentation
  // only — both raw values are always queried.
  brand_name: [
    { canonical: 'LifeSign', variants: ['LifeSign', 'lifeSign'] },                                              // testing-screening 2 + 1
    { canonical: 'DynaCare', variants: ['dynaCare', 'DynaCare'] },                                              // hygiene 30 + 3
  ],
}

/** `filter.p.m.custom.brand_name` / `filter.v.m.custom.brand_name` -> `brand_name`. */
function metafieldKeyFromFacetId(facetId: string): string | null {
  const match = /^filter\.[pv]\.m\.custom\.(.+)$/.exec(facetId)
  return match ? match[1] : null
}

function groupsForFacet(facetId: string): readonly CanonicalValueGroup[] {
  const key = metafieldKeyFromFacetId(facetId)
  return (key && CANONICAL_VALUE_GROUPS[key]) || []
}

/** The `{productMetafield:{namespace,key,value}}` input string for one value. */
function metafieldInput(key: string, value: string): string {
  return JSON.stringify({ productMetafield: { namespace: 'custom', key, value } })
}

/**
 * Reads the metafield `{namespace, key, value}` out of a filter input string,
 * or null when the input is any other allowed filter shape (price,
 * availability, variant option, …), which canonicalization never touches.
 */
function parseMetafieldInput(input: string): { namespace: string; key: string; value: string } | null {
  try {
    const parsed = JSON.parse(input) as Record<string, unknown>
    const mf = (parsed.productMetafield ?? parsed.variantMetafield) as
      | { namespace?: unknown; key?: unknown; value?: unknown }
      | undefined
    if (!mf || typeof mf.namespace !== 'string' || typeof mf.key !== 'string' || typeof mf.value !== 'string') {
      return null
    }
    return { namespace: mf.namespace, key: mf.key, value: mf.value }
  } catch {
    return null
  }
}

/**
 * Collapses a facet group's duplicate values into one option each.
 *
 * The surviving option carries the canonical label and the canonical value's
 * own input string, so URL state stays a single readable parameter. Counts are
 * summed as a placeholder only — every search-sourced route replaces them with
 * exact figures (lib/catalog/exact-facet-counts.ts), and on collection-sourced
 * routes Shopify's per-value counts are exact and disjoint (a product carries
 * one spelling or the other, never both — verified across all 18 groups), so
 * the sum is the true union there.
 *
 * Values not in any group pass through untouched, in their original order.
 */
export function canonicalizeFacetValues(facet: CollectionFilter): CollectionFilter {
  const groups = groupsForFacet(facet.id)
  if (groups.length === 0) return facet

  const key = metafieldKeyFromFacetId(facet.id)
  if (!key) return facet

  // raw value -> the group it belongs to.
  const groupByVariant = new Map<string, CanonicalValueGroup>()
  for (const group of groups) {
    for (const variant of group.variants) groupByVariant.set(variant, group)
  }

  const merged: CollectionFilterValue[] = []
  const indexByCanonical = new Map<string, number>()
  let changed = false

  for (const value of facet.values) {
    const parsed = parseMetafieldInput(value.input)
    const group = parsed ? groupByVariant.get(parsed.value) : undefined
    if (!group) {
      merged.push(value)
      continue
    }
    changed = true
    const existing = indexByCanonical.get(group.canonical)
    if (existing !== undefined) {
      merged[existing] = { ...merged[existing], count: merged[existing].count + value.count }
      continue
    }
    indexByCanonical.set(group.canonical, merged.length)
    merged.push({
      ...value,
      label: group.canonical,
      input: metafieldInput(key, group.canonical),
      count: value.count,
    })
  }

  return changed ? { ...facet, values: merged } : facet
}

/** `canonicalizeFacetValues` across a whole rail. */
export function canonicalizeFacets(facets: CollectionFilter[]): CollectionFilter[] {
  return facets.map(canonicalizeFacetValues)
}

/**
 * Turns ONE URL filter string into the Storefront `ProductFilter` inputs it
 * stands for: a canonical value expands to every raw spelling in its group,
 * everything else passes through as itself.
 *
 * Multiple filters sharing a metafield key are ORed by the Storefront API, so
 * the expansion widens the query to the whole concept rather than narrowing it
 * — which is exactly what the single merged option promises.
 */
export function expandFilterInput(input: string): Record<string, unknown>[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(input)
  } catch {
    return []
  }
  if (!parsed || typeof parsed !== 'object') return []

  const mf = parseMetafieldInput(input)
  if (!mf || mf.namespace !== 'custom') return [parsed as Record<string, unknown>]

  const group = (CANONICAL_VALUE_GROUPS[mf.key] ?? []).find((g) => g.canonical === mf.value)
  if (!group) return [parsed as Record<string, unknown>]

  // `productMetafield` vs `variantMetafield` is preserved by rebuilding from
  // the original wrapper key rather than assuming the product form.
  const wrapper = Object.prototype.hasOwnProperty.call(parsed, 'variantMetafield')
    ? 'variantMetafield'
    : 'productMetafield'
  return group.variants.map((value) => ({
    [wrapper]: { namespace: mf.namespace, key: mf.key, value },
  }))
}

/** `expandFilterInput` across every active filter string, in URL order. */
export function expandFilterInputs(inputs: readonly string[]): Record<string, unknown>[] {
  return inputs.flatMap(expandFilterInput)
}
