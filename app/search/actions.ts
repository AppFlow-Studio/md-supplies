'use server'

import { storefrontFetch } from '@/lib/shopify/storefront'
import { SEARCH_PRODUCTS } from '@/lib/shopify/queries/search'
import { isAllowedFilterObject } from '@/lib/filter-registry'
import type { CollectionProduct, PageInfo } from '@/lib/shopify/types'

interface SearchData {
  search: {
    nodes: CollectionProduct[]
    pageInfo: PageInfo
  }
}

// Server actions are publicly invokable, so params here are as untrusted as
// URL-supplied ones — same default-deny gate the search/category pages use.
const ALLOWED_SORT_KEYS = new Set(['RELEVANCE', 'PRICE'])
const MAX_QUERY_LENGTH = 200

export async function loadMoreSearchProducts(params: {
  q: string
  after: string
  sortKey: string
  reverse: boolean
  filters: Record<string, unknown>[]
}): Promise<{ products: CollectionProduct[]; pageInfo: PageInfo }> {
  const data = await storefrontFetch<SearchData>(SEARCH_PRODUCTS, {
    query: params.q.slice(0, MAX_QUERY_LENGTH),
    first: 12,
    after: params.after,
    sortKey: ALLOWED_SORT_KEYS.has(params.sortKey) ? params.sortKey : 'RELEVANCE',
    reverse: params.reverse,
    filters: params.filters.filter(isAllowedFilterObject),
  })
  return {
    products: data.search.nodes,
    pageInfo: data.search.pageInfo,
  }
}
