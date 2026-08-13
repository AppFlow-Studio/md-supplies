import 'server-only'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_ALL_COLLECTION_HANDLES } from '@/lib/shopify/queries/collections'

// DEV-NAV-01 — the complete live collection-handle set for nav link
// reconciliation.
//
// The layout previously fetched a single page of 249 rich SlimCollections and
// used it as the "does this collection exist" allowlist. The store has ~695
// collections, so every collection sorting past that page looked non-existent
// and its nav link failed closed to /categories — which is exactly how the
// Needles/Syringes header link (handle `needles-syringes`, verified live)
// ended up pointing at the generic categories page.
//
// This query is handles-only and paginated, so the allowlist is complete and
// cheaper than the truncated rich query it replaces.

const PAGE_SIZE = 250
// Safety stop: bounded loop so an API paging bug can't spin forever.
const MAX_PAGES = 20

export type CollectionHandle = { handle: string }

export async function fetchAllCollectionHandles(): Promise<CollectionHandle[]> {
  const out: CollectionHandle[] = []
  let after: string | null = null

  try {
    for (let page = 0; page < MAX_PAGES; page++) {
      const data: {
        collections: {
          nodes: { handle: string }[]
          pageInfo: { hasNextPage: boolean; endCursor: string | null }
        }
      } = await storefrontFetch(
        GET_ALL_COLLECTION_HANDLES,
        { first: PAGE_SIZE, after },
        { next: { revalidate: 3600, tags: ['shopify', 'collections'] } },
      )

      out.push(...data.collections.nodes.map((n) => ({ handle: n.handle })))

      const { hasNextPage, endCursor } = data.collections.pageInfo
      if (!hasNextPage || !endCursor || endCursor === after) break
      after = endCursor
    }
  } catch {
    // Partial results are still better than none: callers treat an EMPTY list
    // as "reconciliation unavailable" and stop degrading links (see the
    // Header's validHandles guard), so returning what we have keeps the nav
    // correct for everything already fetched.
    return out
  }

  return out
}
