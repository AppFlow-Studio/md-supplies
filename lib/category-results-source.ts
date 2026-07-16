import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_COLLECTION } from '@/lib/shopify/queries/collections'
import { GET_PRODUCTS_BY_TAG_FILTERED } from '@/lib/shopify/queries/products'
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

// The root products() query has no COLLECTION_DEFAULT sort key (that only
// exists on a collection's own products connection) — BEST_SELLING is the
// closest equivalent "sensible default" for a tag-derived listing.
//
// It also names its "created date" sort key CREATED_AT (ProductSortKeys),
// whereas GET_COLLECTION's products connection uses ProductCollectionSortKeys,
// which names the equivalent value CREATED. Without mapping CREATED ->
// CREATED_AT here, selecting "Newest" sort on an L2 subcategory page (a tag
// source) would send an invalid enum value to Shopify's API.
function mapSortKeyForTagQuery(sortKey: string): string {
  if (sortKey === 'COLLECTION_DEFAULT') return 'BEST_SELLING'
  if (sortKey === 'CREATED') return 'CREATED_AT'
  return sortKey
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

  const data = await storefrontFetch<{ products: Collection['products'] }>(
    GET_PRODUCTS_BY_TAG_FILTERED,
    {
      query: source.query,
      first: opts.first,
      after: null,
      sortKey: mapSortKeyForTagQuery(opts.sortKey),
      reverse: opts.reverse,
      filters: opts.filters,
    },
    { next: { revalidate: 300, tags: ['shopify', 'products', 'category-tree'] } },
  )
  return { products: data.products, title: source.title, handle: source.slug }
}
