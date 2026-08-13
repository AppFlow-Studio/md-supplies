import { storefrontFetch } from '@/lib/shopify/storefront'
import { mapSortKeyForSearchQuery, type ProductSource } from '@/lib/category-results-source'

// The authoritative answer to two questions the product toolbar and the pager
// both need and neither could previously get:
//
//   1. How many products match the CURRENT query, exactly?
//   2. What cursor starts page N at the current page size?
//
// Why a walk rather than a field: the Storefront API (2026-04) exposes no total
// on `Collection.products`. Introspected on 2026-08-12 — ProductConnection has
// exactly `edges, filters, nodes, pageInfo`, and Collection has no
// productsCount. `Query.search` DOES expose `totalCount`, so the tag-sourced
// path gets its total in one request and only walks for cursors.
//
// What this replaced: `first = currentPage * PAGE_SIZE + 1` full product
// payloads, capped at the Storefront `first: 250` ceiling. That is why page
// size was stuck at 9 (250/9 = 27 pages) and why the toolbar could only say
// "Showing 9 products" — it never had a denominator. The walk here fetches IDs
// and cursors only, so it costs one small request per 250 products and is
// cached, while the page fetch drops from up to 250 full products to exactly
// one page's worth.

const INDEX_PAGE_SIZE = 250

/**
 * Hard ceiling on how deep the index walks. The largest category on the live
 * catalogue is exam-room at 845 products (measured 2026-08-12), so every
 * approved route resolves in at most 4 requests. Past this we stop walking and
 * report the total as a floor rather than issuing an unbounded number of
 * requests — see `exact` on the result.
 */
const MAX_INDEXED_PRODUCTS = 5000

export type ProductIndex = {
  /** Product count for the current query. */
  total: number
  /**
   * False when the result set exceeded MAX_INDEXED_PRODUCTS and `total` is a
   * floor rather than the true count. Callers must not print an inexact total
   * as if it were exact.
   */
  exact: boolean
  /**
   * Cursor to pass as `after` to start at 0-based `offset`, or null for the
   * first item (no cursor). Returns null when the offset is past the end.
   */
  cursorForOffset(offset: number): string | null
  /** True when at least one product exists at `offset`. */
  hasOffset(offset: number): boolean
}

type EdgePage = {
  edges: { cursor: string }[]
  pageInfo: { hasNextPage: boolean; endCursor: string | null }
}

const COLLECTION_INDEX_QUERY = `#graphql
  query CatalogCollectionIndex(
    $handle: String!
    $first: Int!
    $after: String
    $sortKey: ProductCollectionSortKeys
    $reverse: Boolean
    $filters: [ProductFilter!]
  ) {
    collection(handle: $handle) {
      products(first: $first, after: $after, sortKey: $sortKey, reverse: $reverse, filters: $filters) {
        edges { cursor }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`

const SEARCH_INDEX_QUERY = `#graphql
  query CatalogSearchIndex(
    $query: String!
    $first: Int!
    $after: String
    $sortKey: SearchSortKeys
    $reverse: Boolean
    $filters: [ProductFilter!]
  ) {
    search(
      query: $query
      types: PRODUCT
      first: $first
      after: $after
      sortKey: $sortKey
      reverse: $reverse
      productFilters: $filters
    ) {
      totalCount
      edges { cursor }
      pageInfo { hasNextPage endCursor }
    }
  }
`

export type IndexOpts = {
  sortKey: string
  reverse: boolean
  filters: Record<string, unknown>[]
  /** Already-sanitized search text, or undefined. */
  text?: string
  /** Storefront query string for tag/search-scoped sources. */
  searchQuery?: string
  cacheTags: string[]
}

function buildIndex(cursors: string[], total: number, exact: boolean): ProductIndex {
  return {
    total,
    exact,
    cursorForOffset(offset) {
      if (offset <= 0) return null
      // The cursor of the item BEFORE the offset: Storefront `after` is
      // exclusive, so `after: cursors[n-1]` starts the page at item n.
      return cursors[offset - 1] ?? null
    },
    hasOffset(offset) {
      return offset < total
    },
  }
}

/** Walks a connection collecting cursors until exhausted or capped. */
async function walk(
  query: string,
  variables: Record<string, unknown>,
  pick: (data: never) => EdgePage | null,
  cacheTags: string[],
): Promise<{ cursors: string[]; truncated: boolean } | null> {
  const cursors: string[] = []
  let after: string | null = null

  while (true) {
    const data = await storefrontFetch<never>(
      query,
      { ...variables, first: INDEX_PAGE_SIZE, after },
      { next: { revalidate: 300, tags: cacheTags } },
    )
    const page = pick(data)
    if (!page) return null

    for (const edge of page.edges) cursors.push(edge.cursor)

    if (cursors.length >= MAX_INDEXED_PRODUCTS) return { cursors, truncated: page.pageInfo.hasNextPage }
    if (!page.pageInfo.hasNextPage || !page.pageInfo.endCursor) break
    after = page.pageInfo.endCursor
  }

  return { cursors, truncated: false }
}

/**
 * Builds the index for a product source under the current query.
 *
 * Returns null when the source itself does not resolve (missing collection) so
 * the caller can 404 rather than render an honest-looking empty page.
 */
export async function fetchProductIndex(
  source: ProductSource,
  opts: IndexOpts,
): Promise<ProductIndex | null> {
  const useSearch = source.kind === 'tag' || Boolean(opts.searchQuery)

  if (useSearch) {
    const query = opts.searchQuery ?? (source.kind === 'tag' ? source.query : '')
    if (!query) return null

    // Query.search takes SearchSortKeys, a much narrower enum than the
    // collection sort keys — same mapping the display fetch uses, so the index
    // cursors line up with the products they index.
    const sortKey = mapSortKeyForSearchQuery(opts.sortKey)

    const walked = await walk(
      SEARCH_INDEX_QUERY,
      {
        query,
        sortKey,
        reverse: opts.reverse,
        filters: opts.filters,
      },
      (data: never) => (data as { search: (EdgePage & { totalCount: number }) | null }).search,
      opts.cacheTags,
    )
    if (!walked) return null

    // `search.totalCount` is authoritative and cheap; the walk only supplies
    // cursors. When the walk was capped, totalCount is still the true total —
    // only deep-page cursors are unavailable, which the page clamp handles.
    const first = await storefrontFetch<{ search: { totalCount: number } | null }>(
      SEARCH_INDEX_QUERY,
      { query, first: 1, after: null, sortKey, reverse: opts.reverse, filters: opts.filters },
      { next: { revalidate: 300, tags: opts.cacheTags } },
    )
    const total = first.search?.totalCount ?? walked.cursors.length
    return buildIndex(walked.cursors, total, true)
  }

  if (source.kind !== 'collection') return null

  const walked = await walk(
    COLLECTION_INDEX_QUERY,
    {
      handle: source.handle,
      sortKey: opts.sortKey,
      reverse: opts.reverse,
      filters: opts.filters,
    },
    (data: never) => (data as { collection: { products: EdgePage } | null }).collection?.products ?? null,
    opts.cacheTags,
  )
  if (!walked) return null

  return buildIndex(walked.cursors, walked.cursors.length, !walked.truncated)
}
