import 'server-only'

import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_ALL_PRODUCT_TAGS } from '@/lib/shopify/queries/products'
import { GET_COLLECTION_META } from '@/lib/shopify/queries/collections'
import { parseProductTags, type ProductTagSummary } from '@/lib/category-tree'

type ProductTagsResponse = {
  products: {
    nodes: { handle: string; tags: string[] }[]
    pageInfo: { hasNextPage: boolean; endCursor: string | null }
  }
}

// One retry per page: this scan makes ~30 sequential requests, so without a
// retry the probability of the WHOLE scan failing is ~30x a single request's
// transient-failure rate. A single immediate retry absorbs one-off timeouts
// and 5xx blips without masking a genuinely down API (two failures in a row
// on the same page still throws).
async function fetchTagPage(cursor: string | null): Promise<ProductTagsResponse> {
  try {
    return await storefrontFetch<ProductTagsResponse>(
      GET_ALL_PRODUCT_TAGS,
      { first: 250, after: cursor },
      { next: { revalidate: 3600, tags: ['shopify', 'category-tree'] } },
    )
  } catch {
    // storefrontFetch's underlying cachedRequest is wrapped in React's
    // cache(), which memoizes per unique argument set for the life of the
    // server render. Retrying with byte-identical query/variables/
    // fetchOptions would hit the SAME memoized (already-rejected) promise
    // from the failed call above instead of issuing a real second HTTP
    // request — this call would throw instantly without ever retrying. The
    // 'retry' dedupeSalt gives this attempt its own cache() entry so it
    // actually re-fetches.
    return await storefrontFetch<ProductTagsResponse>(
      GET_ALL_PRODUCT_TAGS,
      { first: 250, after: cursor },
      { next: { revalidate: 3600, tags: ['shopify', 'category-tree'] } },
      'retry',
    )
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
    const data = await fetchTagPage(cursor)

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

type CollectionMetaResponse = { collection: { id: string } | null }

/**
 * FIX-duplicate-category-urls (2026-09-05 Izzy brief): a subcategory tag can
 * ALSO be a standalone, real Shopify collection at /category/<tag> — the
 * "flat" form. Izzy's brief found 8 sampled flat/nested pairs all self-
 * canonicalising with no preferred version, and recommended flat as the
 * chosen canonical (it holds the real content; the nested route only ever
 * gets an auto-generated stub — see app/category/[slug]/[product]/page.tsx's
 * neutral-copy fallback). Checked live per request, rather than off a
 * hardcoded pair list, so the fix covers the full category tree rather than
 * just the 8 sampled pairs. Cached the same way as every other per-handle
 * collection fetch in this codebase.
 */
export async function hasFlatCategoryCollection(tag: string): Promise<boolean> {
  try {
    const data = await storefrontFetch<CollectionMetaResponse>(
      GET_COLLECTION_META,
      { handle: tag },
      { next: { revalidate: 300, tags: ['shopify', 'collections', `collection:${tag}`] } },
    )
    return Boolean(data.collection)
  } catch {
    return false
  }
}
