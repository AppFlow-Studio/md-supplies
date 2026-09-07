import { isAllowedFilterInput } from '@/lib/filter-registry'

// Pure parsers/validators for the catalog URL params (sort, filter, q). Split
// out of components/category/CategoryPageView so they can be imported by a
// CLIENT component (CategoryFilterableGrid) without dragging that module's
// server-only graph (storefrontFetch, *.server) into the browser bundle.
//
// CategoryPageView re-exports these so every existing server import site keeps
// working; the API route and the client island import them from here directly.
// One implementation = the API, the server render and the client island all
// agree on what a valid filter/sort/search is (default-deny lives here).

export type CategorySearchParams = {
  sort?: string
  filter?: string | string[]
  page?: string
  /** DEV-SEARCH-01: collection-scoped search text. */
  q?: string | string[]
  /** "Show [N] per page" — validated by lib/catalog/page-size. */
  per_page?: string | string[]
}

/** ?q= must be a single sane string; arrays and junk collapse to undefined. */
export function parseSearchParam(q?: string | string[]): string | undefined {
  if (typeof q !== 'string') return undefined
  const trimmed = q.trim()
  return trimmed ? trimmed.slice(0, 80) : undefined
}

export function parseSortKey(sort?: string): { sortKey: string; reverse: boolean } {
  switch (sort) {
    case 'PRICE_ASC':    return { sortKey: 'PRICE', reverse: false }
    case 'PRICE_DESC':   return { sortKey: 'PRICE', reverse: true }
    case 'BEST_SELLING': return { sortKey: 'BEST_SELLING', reverse: false }
    case 'CREATED':      return { sortKey: 'CREATED', reverse: true }
    default:             return { sortKey: 'COLLECTION_DEFAULT', reverse: false }
  }
}

export function parseFilterParam(filter?: string | string[]): string[] {
  if (!filter) return []
  const raw = Array.isArray(filter) ? filter : [filter]
  // Default-deny URL-supplied inputs (rejects tag filters and unknown keys)
  // before they reach the Storefront API, chips, or pagination links.
  return raw.filter(isAllowedFilterInput)
}
