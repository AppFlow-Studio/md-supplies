import {
  fetchProductConnection,
  sanitizeSearchText,
  type ProductSource,
} from '@/lib/category-results-source'
import { fetchProductIndex } from '@/lib/catalog/product-index'
import type { CollectionFilter, CollectionProduct } from '@/lib/shopify/types'
import type { PageSize } from '@/lib/catalog/page-size'

// One entry point for "give me page N of this product set, plus the exact
// number of products that match".
//
// Before this, CategoryResults asked for `first = page * 9 + 1` FULL product
// payloads and sliced client-side, which meant:
//   · no denominator, so the toolbar could only say "Showing 9 products";
//   · a hard page ceiling at Storefront's `first: 250`;
//   · page 20 downloading 181 products to display 9.
// Now the index supplies the total and the start cursor, and this fetch pulls
// exactly one page.

export type CatalogPage = {
  /** Products for the requested page only. */
  products: CollectionProduct[]
  /** Raw Storefront facets — NOT yet gated; callers pass them to getAllowedFacets. */
  facets: CollectionFilter[]
  /** Authoritative count of products matching the current query. */
  total: number
  /** False when `total` is a floor (result set beyond the index cap). */
  exactTotal: boolean
  title: string
  handle: string
  hasNext: boolean
}

export type FetchCatalogPageOpts = {
  sortKey: string
  reverse: boolean
  filters: Record<string, unknown>[]
  /** Raw ?q= text. */
  text?: string
  /** 1-based. */
  page: number
  pageSize: PageSize
  /** Extra Next data-cache tags for this source. */
  cacheTags: string[]
}

/**
 * The Storefront query string this source resolves to, or null when the source
 * does not use `Query.search` (plain collection browse, or the OCC
 * intersection path which cannot be expressed as one query).
 */
function searchQueryFor(source: ProductSource, text: string): string | null {
  if (source.kind === 'tag') {
    return text ? `${text} AND (${source.query})` : source.query
  }
  if (!text) return null
  if (source.searchScope) return `${text} AND (${source.searchScope})`
  // OCC-style collection with no tag scope: membership is enforced by
  // post-fetch intersection, so there is no single query to count.
  return null
}

export async function fetchCatalogPage(
  source: ProductSource,
  opts: FetchCatalogPageOpts,
): Promise<CatalogPage | null> {
  const text = opts.text ? sanitizeSearchText(opts.text) : ''
  const offset = (opts.page - 1) * opts.pageSize
  const searchQuery = searchQueryFor(source, text)

  // ── Path A: the OCC intersection fallback ────────────────────────────────
  // Membership is applied AFTER the fetch, so cursors do not survive and the
  // index cannot be used. Kept exactly as it was; the whole (capped) member set
  // comes back in one page and is sliced here.
  const isIntersectionPath = source.kind === 'collection' && Boolean(text) && !source.searchScope
  if (isIntersectionPath) {
    const result = await fetchProductConnection(source, {
      first: 250,
      sortKey: opts.sortKey,
      reverse: opts.reverse,
      filters: opts.filters,
      text: opts.text,
    })
    if (!result) return null
    const all = result.products.nodes
    return {
      products: all.slice(offset, offset + opts.pageSize),
      facets: result.products.filters ?? [],
      total: all.length,
      // Exact for the set we can prove: the intersection is complete within
      // the membership cap enforced in fetchCollectionProductIdSet, which
      // returns null (→ 404) rather than truncating silently.
      exactTotal: true,
      title: result.title,
      handle: result.handle,
      hasNext: all.length > offset + opts.pageSize,
    }
  }

  // ── Path B: indexed ──────────────────────────────────────────────────────
  const index = await fetchProductIndex(source, {
    sortKey: opts.sortKey,
    reverse: opts.reverse,
    filters: opts.filters,
    ...(searchQuery ? { searchQuery } : {}),
    cacheTags: opts.cacheTags,
  })
  if (!index) return null

  // Requesting a page past the end is not an error state to render — the
  // caller decides (404 for a clean deep link, redirect to page 1 otherwise).
  if (offset > 0 && !index.hasOffset(offset)) {
    return {
      products: [],
      facets: [],
      total: index.total,
      exactTotal: index.exact,
      title: source.kind === 'tag' ? source.title : source.handle,
      handle: source.kind === 'tag' ? source.slug : source.handle,
      hasNext: false,
    }
  }

  const result = await fetchProductConnection(source, {
    first: opts.pageSize,
    after: index.cursorForOffset(offset),
    sortKey: opts.sortKey,
    reverse: opts.reverse,
    filters: opts.filters,
    text: opts.text,
  })
  if (!result) return null

  return {
    products: result.products.nodes,
    facets: result.products.filters ?? [],
    total: index.total,
    exactTotal: index.exact,
    title: result.title,
    handle: result.handle,
    hasNext: offset + result.products.nodes.length < index.total,
  }
}
