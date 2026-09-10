import 'server-only'
import type { CollectionProduct, CollectionFilter } from '@/lib/shopify/types'
import { type ProductSource } from '@/lib/category-results-source'
import { fetchCatalogPage } from '@/lib/catalog/fetch-page'
import { getVisibleFilters } from '@/lib/shopify/filters'
import { applyRelevanceGate, orderAllowedFacets, type FacetRouteKind } from '@/lib/filter-registry'
import { applyExactFacetCounts } from '@/lib/catalog/exact-facet-counts'
import { expandFilterInputs } from '@/lib/catalog/facet-canonicalization'
import { attachCardShippingDisplay } from '@/lib/shipping-resolver/attach'
import { type PageSize } from '@/lib/catalog/page-size'
import { getReviewSummariesByGid } from '@/lib/trustshop/collection-summaries'
import type { ProductReviewSummary } from '@/lib/trustshop/types'

// The catalog data head, extracted so the SERVER default render
// (components/category/CategoryResults) and the CLIENT filter API route
// (app/api/catalog) run byte-identical resolution — same fetch, same facet
// pipeline, same shipping attach. If these ever drift, a filtered view served
// by the API would show different facets/counts/shipping than the same view
// server-rendered on a deep link, which is exactly the class of bug this Phase
// is meant to avoid.
//
// This module is server-only: it pulls in attachCardShippingDisplay (the
// shipping resolver is server-only) and issues Storefront fetches. The client
// island never imports it — it calls /api/catalog, which does.

// URL filter strings -> Storefront `ProductFilter` inputs.
//
// This is the ONE place a selected filter becomes a query input, and therefore
// the one place a canonical merged value (e.g. "Shower Commodes", standing for
// both the singular and plural spellings live in the catalogue) expands back
// into every raw value it represents. Everything else — chips, selected state,
// links, pagination — keeps working on the single canonical URL string.
function parseFilters(filterStrings: string[]): Record<string, unknown>[] {
  return expandFilterInputs(filterStrings)
}

export type CatalogViewResolution =
  // Successful resolution — full data for CategoryResultsView.
  | {
      status: 'ok'
      products: CollectionProduct[]
      filters: CollectionFilter[]
      categoryFacet: CollectionFilter | undefined
      filterLabelMap: Map<string, string>
      /** Keyed by Shopify GID — not user-specific, so safe in both the static
          default-grid prerender and the shared /api/catalog cache (unlike
          favorites, which are per-viewer and handled client-side instead —
          see lib/favorites/FavoritesContext.tsx). */
      reviewSummaries: Map<string, ProductReviewSummary | null>
      total: number
      hasNext: boolean
      renderedCount: number
      title: string
      handle: string
      searchQuery?: string
    }
  // fetchCatalogPage returned null (source vanished) — caller maps to 404.
  | { status: 'not_found' }
  // The fetch THREW on a deep page (page > 1). The pre-split head redirected to
  // page 1 here regardless of filter state; the API route resets the client to
  // page 1. The SERVER default is always page 1 so it never hits this.
  | { status: 'fetch_failed_deep' }
  // A CLEAN (non-filtered) deep link fell off the end of the set — the
  // pre-split head 404'd this unconditionally. The API route treats it as
  // out-of-range and the client resets to page 1.
  | { status: 'empty_past_end' }

export interface ResolveCatalogViewInput {
  source: ProductSource
  facetKey: string
  facetKind: FacetRouteKind
  sortKey: string
  reverse: boolean
  activeFilterStrings: string[]
  searchQuery?: string
  currentPage: number
  pageSize: PageSize
  cacheTags: string[]
  /**
   * Whether ANY filter/sort/search is active. Passed in rather than derived
   * from sortKey here: the caller has the raw `sortParam` and computes this the
   * same way CategoryResults always has (`sortParam` truthiness), which the
   * lossy sortKey → COLLECTION_DEFAULT mapping can't reproduce. Only gates the
   * "clean deep link past the end" out-of-range check below.
   */
  isFiltered: boolean
}

export async function resolveCatalogView(
  input: ResolveCatalogViewInput,
): Promise<CatalogViewResolution> {
  const searchText = input.searchQuery?.trim() || undefined

  let result: Awaited<ReturnType<typeof fetchCatalogPage>>
  try {
    result = await fetchCatalogPage(input.source, {
      sortKey: input.sortKey,
      reverse: input.reverse,
      filters: parseFilters(input.activeFilterStrings),
      text: searchText,
      page: input.currentPage,
      pageSize: input.pageSize,
      cacheTags: input.cacheTags,
    })
  } catch (err) {
    // A deep-page fetch failure is recoverable by dropping back to page 1;
    // page 1 failing is a real error the caller must surface — the ORIGINAL
    // error is rethrown unchanged so error boundaries and tests see the real
    // Storefront message, not a wrapper.
    if (input.currentPage > 1) return { status: 'fetch_failed_deep' }
    throw err
  }

  if (!result) return { status: 'not_found' }

  const { title, handle, total: matchingTotal } = result
  const products = attachCardShippingDisplay(result.products)
  const hasNext = result.hasNext

  // A clean (non-filtered) deep link past the end is a 404 on the server; the
  // API route treats it as out-of-range so the client can reset to page 1.
  if (!input.isFiltered && input.currentPage > 1 && products.length === 0) {
    return { status: 'empty_past_end' }
  }

  // Facet pipeline, in the order the correctness of each step depends on:
  //   1. default-deny + registry order + duplicate-value merge
  //   2. exact per-value counts, for search-sourced sets only — Shopify's own
  //      counts on Query.search are window-derived and understate the truth
  //      (Home Care -> Shower Commodes reported 2 for a value matching 5), so
  //      they must be corrected BEFORE anything is judged on them
  //   3. relevance gate: drop groups left with nothing to narrow
  //   4. per-value visibility: drop zero-count values, keep selected ones
  const orderedFacets = orderAllowedFacets(input.facetKey, result.facets, input.facetKind)
  const countedFacets = result.searchQuery
    ? await applyExactFacetCounts(result.searchQuery, orderedFacets, input.activeFilterStrings, input.cacheTags)
    : orderedFacets
  const allowedFacets = applyRelevanceGate(countedFacets, input.activeFilterStrings)
  const filters = getVisibleFilters(allowedFacets, input.activeFilterStrings)

  // The tab row and the rail's Category group are two views over ONE object.
  // Taking it from `filters` (post-gate, post-order, post-visibility) rather
  // than re-deriving it is what makes label, value, count and selected state
  // identical by construction.
  const categoryFacet = filters.find(
    (f) => /(^|\.)customer_filter_category$/.test(f.id) || f.label.trim().toLowerCase() === 'category',
  )

  const filterLabelMap = new Map(
    allowedFacets.flatMap((g) => g.values.map((v) => [v.input, v.label] as const)),
  )

  // Summary-only, batched with bounded concurrency (N+1 guard) — never a
  // sequential per-card TrustShop request, and a slow/down provider degrades
  // to no rating rows rather than blocking the collection render.
  const reviewSummaries = await getReviewSummariesByGid(products)

  return {
    status: 'ok',
    products,
    filters,
    categoryFacet,
    filterLabelMap,
    reviewSummaries,
    total: matchingTotal,
    hasNext,
    renderedCount: products.length,
    title,
    handle,
    searchQuery: searchText,
  }
}
