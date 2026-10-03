import 'server-only'

import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_PRODUCT_TAGS_BY_QUERY } from '@/lib/shopify/queries/products'
import { CATEGORY_TREE_L1, parseProductTags } from '@/lib/category-tree'

export type PartnerCategory = { tag: string; label: string; count: number }

type TagsResponse = {
  products: {
    nodes: { tags: string[] }[]
    pageInfo: { hasNextPage: boolean; endCursor: string | null }
  }
}

// 8 x 250 = 2,000 products — above every partner's live count today; a
// bigger vendor still gets pills, just counted over its first 2,000.
const MAX_PAGES = 8

/** Shopify search query for a partner's products, optionally scoped to one L1 category tag. */
export function partnerProductQuery(vendorName: string, categoryTag?: string): string {
  const vendor = `vendor:"${vendorName}"`
  return categoryTag ? `${vendor} AND tag:"category:${categoryTag}"` : vendor
}

/**
 * The L1 categories a partner's products are tagged into, most products
 * first. Built from the products' own `category:` tags, so a pill only exists
 * when Shopify data backs it; tags that aren't a registered L1 are ignored.
 * A failed scan returns [] (the page then simply shows no pills).
 */
export async function fetchPartnerCategories(vendorName: string): Promise<PartnerCategory[]> {
  const counts = new Map<string, number>()
  let after: string | null = null
  try {
    for (let page = 0; page < MAX_PAGES; page++) {
      const data: TagsResponse = await storefrontFetch<TagsResponse>(
        GET_PRODUCT_TAGS_BY_QUERY,
        { query: partnerProductQuery(vendorName), first: 250, after },
        { next: { revalidate: 3600, tags: ['shopify', 'products', 'category-tree'] } },
      )
      for (const node of data.products.nodes) {
        for (const tag of new Set(parseProductTags(node.tags).categories)) {
          counts.set(tag, (counts.get(tag) ?? 0) + 1)
        }
      }
      if (!data.products.pageInfo.hasNextPage || !data.products.pageInfo.endCursor) break
      after = data.products.pageInfo.endCursor
    }
  } catch {
    return []
  }

  return CATEGORY_TREE_L1
    .filter((c) => counts.has(c.tag))
    .map((c) => ({ tag: c.tag, label: c.displayName, count: counts.get(c.tag)! }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}
