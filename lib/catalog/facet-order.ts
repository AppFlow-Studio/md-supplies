// Facet VALUE ordering — the single sort used by the filter rail, the mobile
// drawer and the Category tab row, so all three present identical order.
//
// Rule (H-03, launch plan 2026-08-13): natural numeric-then-alphabetic order
// on the label. Counts remain visible next to each value but no longer
// control order — the live count used to sort first, which put "2-0", "3-0",
// "4-0", "5-0" out of numeric order on Surgical Sutures (whichever size had
// the most stock that day won the top slot) instead of the catalog's own
// numeric-then-alphabetic organization. Nothing here is hardcoded — every
// label comes from the Storefront filter response for the CURRENT query.
//
// Determinism matters as much as the order itself: this module is imported by
// server components and by the client rail, and both must produce byte-identical
// output or React reports a hydration mismatch. `Intl.Collator` with an explicit
// locale (never the ambient system locale, which differs between the build host
// and the browser) is what makes that safe.

import type { CollectionFilterValue } from '@/lib/shopify/types'

// Explicit 'en' rather than undefined: undefined resolves to the runtime's
// default locale, which is not guaranteed to match between server and client.
// `numeric` sorts "10-0" after "9-0"/"2-0" instead of lexicographically.
const COLLATOR = new Intl.Collator('en', { numeric: true, sensitivity: 'base' })

/** Collapse stray/inconsistent whitespace before comparing — H-03: "compare
 *  the display label without its count," i.e. don't let incidental spacing
 *  in the source label perturb natural-sort order. */
function normalizeLabel(label: string): string {
  return label.trim().replace(/\s+/g, ' ')
}

export function compareFacetValues(
  a: Pick<CollectionFilterValue, 'label'>,
  b: Pick<CollectionFilterValue, 'label'>,
): number {
  const la = normalizeLabel(a.label)
  const lb = normalizeLabel(b.label)
  const byLabel = COLLATOR.compare(la, lb)
  // Final tiebreak on the raw label keeps the sort total (and therefore
  // stable across engines) when the collator considers two labels equal —
  // e.g. "Large" vs "large" under sensitivity: 'base'.
  return byLabel !== 0 ? byLabel : (la < lb ? -1 : la > lb ? 1 : 0)
}

/**
 * Natural numeric-then-alphabetic order on the label. The count each value
 * carries is preserved on the object and still rendered — it just no longer
 * decides position. Returns a new array; the input is never mutated (the
 * same filter object is reused across the rail and tabs).
 */
export function orderFacetValues<T extends Pick<CollectionFilterValue, 'label'>>(
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
