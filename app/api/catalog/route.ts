import { NextRequest, NextResponse } from 'next/server'
import { isRateLimited, clientIp } from '@/lib/rate-limit'
import {
  parseSortKey,
  parseFilterParam,
  parseSearchParam,
} from '@/components/category/CategoryPageView'
import { parsePageSize, DEFAULT_PAGE_SIZE } from '@/lib/catalog/page-size'
import type { ProductSource } from '@/lib/category-results-source'
import { resolveCatalogView } from '@/lib/catalog/resolve-catalog-view'
import type { FacetRouteKind } from '@/lib/filter-registry'
import {
  getShopifyHandle,
  getL1ByCollectionHandle,
  getCategorySlug,
  getFeaturedSubcategoryBySlug,
  buildSubcategoryTagQuery,
  buildL2Tree,
  humanizeTag,
} from '@/lib/category-tree'
import { fetchProductTagSummaries } from '@/lib/category-tree-data.server'

// Cached catalog data for the CLIENT filter island (CategoryFilterableGrid).
//
// The bare category/subcategory URLs are now a FULLY STATIC prerender (zero
// function invocations for crawler traffic — that is the whole point of Phase
// 3). Every filter/sort/search/pagination interaction moves client-side and
// hits THIS route, which re-derives the exact same ProductSource + cacheTags
// the page would have used and runs the identical resolveCatalogView pipeline.
//
// CRITICAL — cacheTags must be BYTE-IDENTICAL to what CategoryPageView.tsx /
// renderSubcategoryPage compute, or the Shopify collections/products webhook
// (app/api/revalidate) would invalidate the page's fetches but NOT this route's,
// leaving filtered views stale after a catalog change. The slug→source
// resolution below is deliberately copied from those files rather than
// parameterised, because it is a correctness contract, not shared plumbing:
// the client is NEVER trusted to send kind/facetKey/tag-query — only slug/sub.
//
// No `use cache` here: the per-fetch `next: { revalidate, tags }` inside
// fetchCatalogPage already caches at the data layer with the right tags. The
// response Cache-Control below adds a CDN/edge layer on top for repeat
// filter combinations.

// Matches the predictive-search route's per-IP soft cap. Filter interactions
// are user-paced (a click per selection), so 120/min leaves ample headroom for
// a real shopper flipping through facets while capping scripted enumeration of
// the whole filter space.
const RATE_LIMIT = { limit: 120, windowMs: 60_000 }

// s-maxage 300 mirrors the 5-minute data-cache revalidate; SWR lets the edge
// serve a slightly stale filter result instantly while it refreshes behind the
// scenes, so a popular filter combo never pays the full round-trip twice.
const CACHE_CONTROL = 'public, s-maxage=300, stale-while-revalidate=600'

type ResolvedSource = {
  source: ProductSource
  cacheTags: string[]
  facetKey: string
  facetKind: FacetRouteKind
  searchScopeTitle: string
}

/**
 * Re-derives the ProductSource + cacheTags for a bare `slug` (L1 category),
 * mirroring components/category/CategoryPageView.tsx exactly. Returns null when
 * the slug resolves to neither an L1 nor a featured subcategory.
 */
function resolveL1Source(slug: string): ResolvedSource | null {
  const shopifyHandle = getShopifyHandle(slug)
  const l1 = getL1ByCollectionHandle(shopifyHandle)
  const featured = l1 ? undefined : getFeaturedSubcategoryBySlug(shopifyHandle)
  if (!l1 && !featured) return null

  const displayName = l1?.displayName ?? featured!.displayName

  const source: ProductSource =
    l1?.productSet === 'tag'
      ? { kind: 'tag', query: `tag:"category:${l1.tag}"`, title: displayName, slug }
      : {
          kind: 'collection',
          handle: shopifyHandle,
          // Same rule as CategoryPageView: registry-backed L1s scope text search
          // by their category tag; a featured subcategory deliberately gets NO
          // tag scope (its products carry the PARENT's tag).
          searchScope: l1 ? `tag:"category:${l1.tag}"` : undefined,
        }

  const cacheTags =
    source.kind === 'tag'
      ? ['shopify', 'products', 'category-tree', `category:${l1!.tag}`]
      : ['shopify', 'products', 'collections', `collection:${shopifyHandle}`]

  return { source, cacheTags, facetKey: slug, facetKind: 'category', searchScopeTitle: displayName }
}

/**
 * Re-derives the ProductSource + cacheTags for an L2 subcategory (`slug` + L2
 * `sub` tag), mirroring app/category/[slug]/[product]/page.tsx's
 * renderSubcategoryPage. Returns null when slug isn't an L1 or the `sub` tag is
 * not a real L2 node under it.
 */
async function resolveSubcategorySource(slug: string, sub: string): Promise<ResolvedSource | null> {
  const shopifyHandle = getShopifyHandle(slug)
  const l1 = getL1ByCollectionHandle(shopifyHandle)
  if (!l1) return null

  const l2Nodes = buildL2Tree(await fetchProductTagSummaries())
  const node = l2Nodes.find((n) => n.tag === sub)
  // Only accept a node genuinely parented (or cross-linked) under this L1 — the
  // same membership check renderSubcategoryPage's caller performs before it runs.
  if (!node || (node.parentTag !== l1.tag && node.crossLinkParentTag !== l1.tag)) return null

  const title = humanizeTag(node.tag)
  const source: ProductSource = {
    kind: 'tag',
    query: buildSubcategoryTagQuery(l1.tag, node.tag),
    title,
    slug: node.tag,
  }
  // renderSubcategoryPage passes the tag source through CategoryResults' default
  // cacheTags (['shopify','products']). Kept identical so revalidation matches.
  const cacheTags = ['shopify', 'products']

  return {
    source,
    cacheTags,
    facetKey: getCategorySlug(l1),
    facetKind: 'category',
    searchScopeTitle: title,
  }
}

export async function GET(req: NextRequest) {
  if (isRateLimited(`catalog:${clientIp(req)}`, RATE_LIMIT)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const params = req.nextUrl.searchParams
  const slug = params.get('slug')
  if (!slug) {
    return NextResponse.json({ error: 'missing_slug' }, { status: 400 })
  }
  const sub = params.get('sub') || undefined

  // Re-derive source SERVER-SIDE — the client sends only slug/sub, never
  // kind/facetKey/tag-query (default-deny: an attacker-supplied source could
  // otherwise scope the query to arbitrary tags).
  const resolved = sub ? await resolveSubcategorySource(slug, sub) : resolveL1Source(slug)
  if (!resolved) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  // Validate every display/query input with the SAME helpers the page uses, so
  // the API and the server render agree on what a valid filter/sort/search/page
  // is (default-deny on filters via isAllowedFilterInput lives in parseFilterParam).
  const activeFilterStrings = parseFilterParam(params.getAll('filter'))
  const { sortKey, reverse } = parseSortKey(params.get('sort') ?? undefined)
  const sortParam = params.get('sort') ?? undefined
  const searchQuery = parseSearchParam(params.get('q') ?? undefined)
  const pageSize = parsePageSize(params.get('per_page') ?? undefined)
  const requestedPage = parseInt(params.get('page') ?? '1', 10)
  const isFiltered =
    activeFilterStrings.length > 0 || Boolean(sortParam) || Boolean(searchQuery) || pageSize !== DEFAULT_PAGE_SIZE

  if (isNaN(requestedPage) || requestedPage < 1) {
    return NextResponse.json({ error: 'out_of_range' }, { status: 400 })
  }

  let resolution: Awaited<ReturnType<typeof resolveCatalogView>>
  try {
    resolution = await resolveCatalogView({
      source: resolved.source,
      facetKey: resolved.facetKey,
      facetKind: resolved.facetKind,
      sortKey,
      reverse,
      activeFilterStrings,
      searchQuery,
      currentPage: requestedPage,
      pageSize,
      cacheTags: resolved.cacheTags,
      isFiltered,
    })
  } catch {
    // Page-1 fetch failure — a genuine upstream error. The client keeps the
    // prior grid on screen and can retry; 502 signals a transient failure.
    return NextResponse.json({ error: 'fetch_failed' }, { status: 502 })
  }

  if (resolution.status === 'not_found') {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }
  // A deep page that fell off the end / failed — signal the client to reset to
  // page 1 rather than rendering an empty grid (the server would 404/redirect).
  if (resolution.status === 'fetch_failed_deep' || resolution.status === 'empty_past_end') {
    return NextResponse.json({ error: 'out_of_range' }, { status: 400 })
  }

  // filterLabelMap is a Map — serialize as entries; the client reconstructs it
  // via `new Map(resp.filterLabelMap)`.
  const body = {
    products: resolution.products,
    filters: resolution.filters,
    categoryFacet: resolution.categoryFacet ?? null,
    filterLabelMap: [...resolution.filterLabelMap.entries()],
    total: resolution.total,
    renderedCount: resolution.renderedCount,
    hasNext: resolution.hasNext,
    title: resolution.title,
    handle: resolution.handle,
    searchQuery: resolution.searchQuery ?? null,
  }

  return NextResponse.json(body, {
    headers: { 'Cache-Control': CACHE_CONTROL },
  })
}
