import 'server-only'

import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_ALL_PRODUCT_TAGS } from '@/lib/shopify/queries/products'
import { parseProductTags, type ProductTagSummary } from '@/lib/category-tree'

type ProductTagsResponse = {
  products: {
    nodes: { handle: string; tags: string[] }[]
    pageInfo: { hasNextPage: boolean; endCursor: string | null }
  }
}

// Full-catalog tag scan (~30 requests at 7,400 products / 250 per page).
// Cached for 1 hour under the 'category-tree' tag — the catalog moves daily
// per the spec, so this is far less aggressive than the 5-minute default in
// storefront.ts, and can be bumped via revalidateTag('category-tree') if a
// faster refresh is ever needed.
export async function fetchProductTagSummaries(): Promise<ProductTagSummary[]> {
  const summaries: ProductTagSummary[] = []
  let cursor: string | null = null

  while (true) {
    const data: ProductTagsResponse = await storefrontFetch<ProductTagsResponse>(
      GET_ALL_PRODUCT_TAGS,
      { first: 250, after: cursor },
      { next: { revalidate: 3600, tags: ['shopify', 'category-tree'] } },
    )

    for (const node of data.products.nodes) {
      const { categories, subcategories } = parseProductTags(node.tags)
      summaries.push({ handle: node.handle, categories, subcategories })
    }

    const nextCursor = data.products.pageInfo.endCursor
    if (!data.products.pageInfo.hasNextPage || !nextCursor || nextCursor === cursor) break
    cursor = nextCursor
  }

  return summaries
}
