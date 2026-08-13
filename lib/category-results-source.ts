import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_COLLECTION, GET_COLLECTION_PRODUCT_IDS } from '@/lib/shopify/queries/collections'
import { SEARCH_PRODUCTS_BY_TAG } from '@/lib/shopify/queries/products'
import type { Collection } from '@/lib/shopify/types'

// Lets CategoryResults pull products from either a Shopify collection (L1
// pages, unchanged behavior) or a raw tag query (L2 subcategory pages, which
// have no backing collection — a boundary subcategory can't be one Shopify
// collection shared by two parent categories).
//
// DEV-SEARCH-01 adds collection-scoped text search on top of both kinds:
// the search text rides the same server-rendered URL state as sort/filter
// (?q=), and scoping is enforced server-side — never by trusting the browser
// to hide non-member products.
export type ProductSource =
  | {
      kind: 'collection'
      handle: string
      /**
       * Registry tag query (e.g. `tag:"category:gloves"`) used to scope text
       * search server-side for registry-backed L1 collections. When absent
       * (OCC and other non-registry collections), text search falls back to
       * intersecting search hits with the collection's own product-ID set —
       * collection identity, not tags, per the plan's OCC membership rule.
       */
      searchScope?: string
    }
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
export function mapSortKeyForSearchQuery(sortKey: string): string {
  if (sortKey === 'PRICE') return 'PRICE'
  return 'RELEVANCE'
}

/**
 * Makes URL-supplied search text safe to embed in a Shopify search query.
 * Strips query-syntax characters (quotes, parens, colons, wildcards, unary
 * minus) so user input can never break out into field filters or boolean
 * operators, lowercases so `AND`/`OR`/`NOT` become plain words, collapses
 * whitespace, and caps the length. Returns '' when nothing searchable remains.
 */
export function sanitizeSearchText(raw: string): string {
  return raw
    .replace(/["'():\\*{}<>[\]-]/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
    .trim()
}

type SearchConnectionData = {
  search: {
    nodes: Collection['products']['nodes']
    pageInfo: Collection['products']['pageInfo']
    productFilters: Collection['products']['filters']
  }
}

type FetchOpts = {
  first: number
  sortKey: string
  reverse: boolean
  filters: Record<string, unknown>[]
  /** Raw ?q= text; sanitized here before it reaches the Storefront API. */
  text?: string
  /**
   * Storefront cursor to start the page at (from lib/catalog/product-index).
   * With this set, `first` is exactly one page's worth instead of every item up
   * to the requested page — which is what lets page size go to 100 and pages go
   * deeper than the old 250-item `first:` ceiling allowed.
   */
  after?: string | null
}

async function fetchSearchConnection(
  query: string,
  opts: FetchOpts,
  cacheTags: string[],
): Promise<SearchConnectionData['search']> {
  const data = await storefrontFetch<SearchConnectionData>(
    SEARCH_PRODUCTS_BY_TAG,
    {
      query,
      first: opts.first,
      after: opts.after ?? null,
      sortKey: mapSortKeyForSearchQuery(opts.sortKey),
      reverse: opts.reverse,
      filters: opts.filters,
    },
    { next: { revalidate: 300, tags: cacheTags } },
  )
  return data.search
}

// Membership cap for the ID-intersection path. OCC-scale collections stay far
// below this; a larger collection would silently truncate enforcement, so the
// helper returns null (→ treat search as unavailable) rather than lie.
const MAX_MEMBERSHIP_IDS = 1000
const MEMBERSHIP_PAGE_SIZE = 250

/**
 * Product-GID set for a collection, for server-side search-membership
 * enforcement on collections without a registry tag scope. Cached via the
 * data cache (5-min revalidate + collection tag). Returns null when the
 * collection is missing or exceeds the enforcement cap.
 */
export async function fetchCollectionProductIdSet(handle: string): Promise<Set<string> | null> {
  const ids = new Set<string>()
  let after: string | null = null
  while (true) {
    const data: {
      collection: {
        products: { nodes: { id: string }[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } }
      } | null
    } = await storefrontFetch(
      GET_COLLECTION_PRODUCT_IDS,
      { handle, first: MEMBERSHIP_PAGE_SIZE, after },
      { next: { revalidate: 300, tags: ['shopify', 'collections', `collection:${handle}`] } },
    )
    if (!data.collection) return null
    for (const n of data.collection.products.nodes) ids.add(n.id)
    if (ids.size > MAX_MEMBERSHIP_IDS) return null
    const { hasNextPage, endCursor } = data.collection.products.pageInfo
    if (!hasNextPage || !endCursor) break
    after = endCursor
  }
  return ids
}

export async function fetchProductConnection(
  source: ProductSource,
  opts: FetchOpts,
): Promise<ProductConnectionResult> {
  const text = opts.text ? sanitizeSearchText(opts.text) : ''

  // ── Text search paths (DEV-SEARCH-01) ──────────────────────────────────
  if (text) {
    if (source.kind === 'tag') {
      const search = await fetchSearchConnection(
        `${text} AND (${source.query})`,
        opts,
        ['shopify', 'products', 'category-tree'],
      )
      return {
        products: { nodes: search.nodes, pageInfo: search.pageInfo, filters: search.productFilters },
        title: source.title,
        handle: source.slug,
      }
    }

    if (source.searchScope) {
      // Registry-backed L1: scope by the registry's category tag, the same
      // membership source the L2 architecture is built on.
      const search = await fetchSearchConnection(
        `${text} AND (${source.searchScope})`,
        opts,
        ['shopify', 'products', 'collections', `collection:${source.handle}`],
      )
      return {
        products: { nodes: search.nodes, pageInfo: search.pageInfo, filters: search.productFilters },
        title: source.handle,
        handle: source.handle,
      }
    }

    // Non-registry collection (OCC): text search + server-side intersection
    // with the collection's product-ID set, so membership comes from the
    // canonical collection itself, never from tag scanning.
    const [search, memberIds] = await Promise.all([
      fetchSearchConnection(text, { ...opts, first: MEMBERSHIP_PAGE_SIZE }, ['shopify', 'products', 'collections', `collection:${source.handle}`]),
      fetchCollectionProductIdSet(source.handle),
    ])
    if (!memberIds) return null
    const nodes = search.nodes.filter((n) => memberIds.has(n.id))
    return {
      products: {
        nodes,
        // Membership filtering happens after the fetch, so cursor pagination
        // no longer applies; the full (capped) member set is returned in one
        // page and CategoryResults' slicing handles display.
        pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null },
        filters: search.productFilters,
      },
      title: source.handle,
      handle: source.handle,
    }
  }

  // ── Original non-search paths (unchanged behavior) ─────────────────────
  if (source.kind === 'collection') {
    const data = await storefrontFetch<{ collection: Collection | null }>(
      GET_COLLECTION,
      {
        handle: source.handle,
        first: opts.first,
        after: opts.after ?? null,
        sortKey: opts.sortKey,
        reverse: opts.reverse,
        filters: opts.filters,
      },
      { next: { revalidate: 300, tags: ['shopify', 'products', 'collections', `collection:${source.handle}`] } },
    )
    if (!data.collection) return null
    return { products: data.collection.products, title: data.collection.title, handle: data.collection.handle }
  }

  const search = await fetchSearchConnection(source.query, opts, ['shopify', 'products', 'category-tree'])
  return {
    products: { nodes: search.nodes, pageInfo: search.pageInfo, filters: search.productFilters },
    title: source.title,
    handle: source.slug,
  }
}
