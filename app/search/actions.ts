'use server'

import { storefrontFetch } from '@/lib/shopify/storefront'
import { SEARCH_PRODUCTS } from '@/lib/shopify/queries/search'
import type { CollectionProduct, PageInfo } from '@/lib/shopify/types'

interface SearchData {
  search: {
    nodes: CollectionProduct[]
    pageInfo: PageInfo
  }
}

export async function loadMoreSearchProducts(params: {
  q: string
  after: string
  sortKey: string
  reverse: boolean
  filters: Record<string, unknown>[]
}): Promise<{ products: CollectionProduct[]; pageInfo: PageInfo }> {
  const data = await storefrontFetch<SearchData>(SEARCH_PRODUCTS, {
    query: params.q,
    first: 12,
    after: params.after,
    sortKey: params.sortKey,
    reverse: params.reverse,
    filters: params.filters,
  })
  return {
    products: data.search.nodes,
    pageInfo: data.search.pageInfo,
  }
}
