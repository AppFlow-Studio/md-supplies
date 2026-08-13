// Facet VALUE ordering — the single sort used by the filter rail, the mobile
// drawer and the Category tab row, so all three present identical order.
//
// Rule (spec §"Facet relevance and ordering rules"): exact live count
// descending, ties broken alphabetically with a locale-aware, numeric-safe
// comparison. Nothing here is hardcoded — every count comes from the
// Storefront filter response for the CURRENT query.
//
// Determinism matters as much as the order itself: this module is imported by
// server components and by the client rail, and both must produce byte-identical
// output or React reports a hydration mismatch. `Intl.Collator` with an explicit
// locale (never the ambient system locale, which differs between the build host
// and the browser) is what makes that safe.

import type { CollectionFilterValue } from '@/lib/shopify/types'

// Explicit 'en' rather than undefined: undefined resolves to the runtime's
// default locale, which is not guaranteed to match between server and client.
// `numeric` sorts "10 Gauge" after "9 Gauge" instead of lexicographically.
const COLLATOR = new Intl.Collator('en', { numeric: true, sensitivity: 'base' })

export function compareFacetValues(
  a: Pick<CollectionFilterValue, 'label' | 'count'>,
  b: Pick<CollectionFilterValue, 'label' | 'count'>,
): number {
  if (b.count !== a.count) return b.count - a.count
  const byLabel = COLLATOR.compare(a.label, b.label)
  // Final tiebreak on the raw label keeps the sort total (and therefore
  // stable across engines) when the collator considers two labels equal —
  // e.g. "Large" vs "large" under sensitivity: 'base'.
  return byLabel !== 0 ? byLabel : (a.label < b.label ? -1 : a.label > b.label ? 1 : 0)
}

/**
 * Count-descending, alphabetical on ties. Returns a new array; the input is
 * never mutated (the same filter object is reused across the rail and tabs).
 */
export function orderFacetValues<T extends Pick<CollectionFilterValue, 'label' | 'count'>>(
  values: readonly T[],
): T[] {
  return [...values].sort(compareFacetValues)
}

/**
 * A facet gets its own scoped search box once it offers more than this many
 * values (spec §7: "more than seven available values").
 */
export const FACET_SEARCH_THRESHOLD = 7

export function needsFacetSearch(valueCount: number): boolean {
  return valueCount > FACET_SEARCH_THRESHOLD
}

/**
 * Case/diacritic-insensitive substring match for the facet-scoped search box.
 * Kept here rather than inline in the rail so the server-rendered tab row and
 * the client rail agree on what "matches" means.
 */
export function facetValueMatches(label: string, query: string): boolean {
  const q = normalizeForSearch(query)
  return q.length === 0 || normalizeForSearch(label).includes(q)
}

function normalizeForSearch(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
}
