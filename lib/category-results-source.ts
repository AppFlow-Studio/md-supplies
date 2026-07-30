import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_COLLECTION } from '@/lib/shopify/queries/collections'
import { SEARCH_PRODUCTS_BY_TAG } from '@/lib/shopify/queries/products'
import type { Collection } from '@/lib/shopify/types'

// Lets CategoryResults pull products from either a Shopify collection (L1
// pages, unchanged behavior) or a raw tag query (L2 subcategory pages, which
// have no backing collection — a boundary subcategory can't be one Shopify
// collection shared by two parent categories).
export type ProductSource =
  | { kind: 'collection'; handle: string }
  | { kind: 'tag'; query: string; title: string; slug: string }

export type ProductConnectionResult = {
  products: Collection['products']
  title: string
  handle: string
} | null

// SEARCH_PRODUCTS_BY_TAG queries Query.search(...), whose sort key type is
// SearchSortKeys — a third, much narrower enum distinct from both
// ProductSortKeys (root products()) and ProductCollectionSortKeys
// (Collection.products). Confirmed live against this store's Storefront API
// (2026-04): SearchSortKeys only accepts RELEVANCE and PRICE — BEST_SELLING,
// CREATED_AT, CREATED, and TITLE are all rejected with "provided invalid
// value" / "Expected ... to be one of: PRICE, RELEVANCE". This matches the
// ALLOWED_SORT_KEYS allowlist app/search/actions.ts already uses for the same
// field. COLLECTION_DEFAULT and BEST_SELLING (no relevance-ranked equivalent
// on this endpoint) and CREATED (no created-date sort on this endpoint) all
// fall back to RELEVANCE; PRICE passes through unchanged.
function mapSortKeyForSearchQuery(sortKey: string): string {
  if (sortKey === 'PRICE') return 'PRICE'
  return 'RELEVANCE'
}

export async function fetchProductConnection(
  source: ProductSource,
  opts: { first: number; sortKey: string; reverse: boolean; filters: Record<string, unknown>[] },
): Promise<ProductConnectionResult> {
  if (source.kind === 'collection') {
    const data = await storefrontFetch<{ collection: Collection | null }>(
      GET_COLLECTION,
      {
        handle: source.handle,
        first: opts.first,
        after: null,
        sortKey: opts.sortKey,
        reverse: opts.reverse,
        filters: opts.filters,
      },
      { next: { revalidate: 300, tags: ['shopify', 'products', 'collections', `collection:${source.handle}`] } },
    )
    if (!data.collection) return null
    return { products: data.collection.products, title: data.collection.title, handle: data.collection.handle }
  }

  const data = await storefrontFetch<{
    search: {
      nodes: Collection['products']['nodes']
      pageInfo: Collection['products']['pageInfo']
      productFilters: Collection['products']['filters']
    }
  }>(
    SEARCH_PRODUCTS_BY_TAG,
    {
      query: source.query,
      first: opts.first,
      after: null,
      sortKey: mapSortKeyForSearchQuery(opts.sortKey),
      reverse: opts.reverse,
      filters: opts.filters,
    },
    { next: { revalidate: 300, tags: ['shopify', 'products', 'category-tree'] } },
  )
  return {
    products: { nodes: data.search.nodes, pageInfo: data.search.pageInfo, filters: data.search.productFilters },
    title: source.title,
    handle: source.slug,
  }
}
