import 'server-only'
import { getNumericShopifyProductId } from './product-id'
import { getManyProductReviewSummaries } from './product'
import type { ProductReviewSummary } from './types'

/**
 * Collection/search card helper: batch-fetches review summaries (bounded
 * concurrency, see getManyProductReviewSummaries) and re-keys the result by
 * Shopify GID — the key every card component already has via
 * `product.id` — so callers never touch the numeric conversion themselves.
 * A malformed GID or a fully-failed batch degrades to an empty map, never a
 * thrown error; every card just renders with no rating row.
 */
export async function getReviewSummariesByGid(
  products: { id: string }[],
): Promise<Map<string, ProductReviewSummary | null>> {
  const numericByGid = new Map<string, number>()
  for (const p of products) {
    try {
      numericByGid.set(p.id, getNumericShopifyProductId(p.id))
    } catch {
      // Malformed GID — skip; that card simply gets no rating.
    }
  }

  try {
    const byNumericId = await getManyProductReviewSummaries([...numericByGid.values()])
    const byGid = new Map<string, ProductReviewSummary | null>()
    for (const p of products) {
      const numericId = numericByGid.get(p.id)
      byGid.set(p.id, numericId !== undefined ? (byNumericId.get(numericId) ?? null) : null)
    }
    return byGid
  } catch {
    return new Map()
  }
}
