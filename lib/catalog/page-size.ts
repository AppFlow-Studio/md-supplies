// `?per_page=` — the "Show [20] per page" control's URL state.
//
// Validation lives here rather than at each call site because the value feeds
// a Storefront `first:` argument. Anything that reaches GraphQL has to be a
// known-good integer from the approved set; a caller must never be able to turn
// a URL string into an unbounded fetch.

/** Approved choices, in the order the select renders them. */
export const PAGE_SIZE_OPTIONS = [10, 20, 30, 50, 100] as const

export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number]

/**
 * 20 is the default: it divides evenly by the two-column phone grid and the
 * three-column desktop grid, and it is a practical commerce page size. Nothing
 * in the Storefront contract forces a different number — deterministic page N
 * is served by a cursor walk (lib/catalog/product-index.ts), so even the 100
 * option costs one extra index request rather than a 100-item `first:` ceiling.
 */
export const DEFAULT_PAGE_SIZE: PageSize = 20

export function isPageSize(n: number): n is PageSize {
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(n)
}

/**
 * Parses `?per_page=`. Anything not exactly one of the approved integers —
 * negative, zero, decimal, oversized, an array, junk — falls back to the
 * default rather than erroring, so a hand-edited or crawled URL degrades to the
 * normal page instead of a 500.
 */
export function parsePageSize(raw?: string | string[]): PageSize {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (typeof value !== 'string') return DEFAULT_PAGE_SIZE
  const trimmed = value.trim()
  // Reject "20.0", "020", "2e1", " 20 " variants that Number() would accept:
  // one canonical spelling per page size keeps the URL space (and therefore
  // the crawl space) from multiplying.
  if (!/^[1-9][0-9]*$/.test(trimmed)) return DEFAULT_PAGE_SIZE
  const n = Number(trimmed)
  return isPageSize(n) ? n : DEFAULT_PAGE_SIZE
}

/** True when the value should appear in the URL at all (default stays clean). */
export function isNonDefaultPageSize(size: PageSize): boolean {
  return size !== DEFAULT_PAGE_SIZE
}

/**
 * The exact requested wording (spec §"Count label"):
 *   `Showing 20 products of 307` · `Showing 1 product of 1`
 *
 * `visible` is how many cards are actually rendered, never the requested page
 * size — the last page of 307 at 20 per page shows 7. `total` is the
 * authoritative count for the current query, not a per-page figure.
 *
 * Zero results are NOT reported as "Showing 0 products of 0": the spec calls
 * that out as misleading feedback. The grid's empty state carries the recovery
 * action; this line just has to agree with it rather than print a pair of
 * zeroes the shopper has to interpret.
 */
export function formatResultCount(visible: number, total: number): string {
  if (total === 0) return 'No products found'
  return `Showing ${visible} ${visible === 1 ? 'product' : 'products'} of ${total}`
}
