import { notFound, redirect } from 'next/navigation'
import { type ProductSource } from '@/lib/category-results-source'
import { resolveCatalogView } from '@/lib/catalog/resolve-catalog-view'
import { type FacetRouteKind } from '@/lib/filter-registry'
import { type TrackingParamSource } from '@/lib/analytics/tracking-params'
import { buildPage1Url } from '@/lib/catalog/category-urls'
import { DEFAULT_PAGE_SIZE, type PageSize } from '@/lib/catalog/page-size'
import { CategoryResultsView } from '@/components/category/CategoryResultsView'

// Server data-head for the category grid.
//
// Phase 3 split: the fetch + facet pipeline + shipping attach now live in
// lib/catalog/resolve-catalog-view (shared byte-identically with the
// /api/catalog client-filter route); the presentation lives in
// CategoryResultsView. This head keeps the SERVER-ONLY concerns: it issues the
// data resolution, and it owns the redirect()/notFound() control flow that only
// makes sense on a server render (a clean deep link past the end 404s; a
// deep-page fetch failure bounces to page 1). Every existing server caller
// (CategoryPageView default grid, OCC, industries, the L2 subcategory branch)
// keeps its identical prop contract.

interface Props {
  source: ProductSource
  baseUrl: string
  facetKey: string
  sortKey: string
  reverse: boolean
  sortParam?: string
  activeFilterStrings: string[]
  currentPage: number
  trackingParamsSource: TrackingParamSource
  /** DEV-SEARCH-01: current ?q= text, scoped server-side to this source. */
  searchQuery?: string
  /** Display title for the search field label ("Search within {title}"). */
  searchScopeTitle?: string
  /** Which facet registry `facetKey` resolves against. */
  facetKind?: FacetRouteKind
  /** Validated ?per_page= value. */
  pageSize?: PageSize
  /** Next data-cache tags for this product set. */
  cacheTags?: string[]
  /** "All Gloves" — when set, the Category-facet tab row renders above results. */
  tabsAllLabel?: string
  /**
   * Route links pinned to the front of the tab row, ahead of the facet pills
   * (e.g. Trocars & Trocar Kits on Surgery & Procedure). These navigate to
   * their own category page rather than filtering this one.
   */
  tabsLeadingLinks?: { label: string; href: string }[]
}

export async function CategoryResults({
  source,
  baseUrl,
  facetKey,
  sortKey,
  reverse,
  sortParam,
  activeFilterStrings,
  currentPage,
  trackingParamsSource,
  searchQuery,
  searchScopeTitle,
  facetKind = 'category',
  pageSize = DEFAULT_PAGE_SIZE,
  cacheTags = ['shopify', 'products'],
  tabsAllLabel,
  tabsLeadingLinks,
}: Props) {
  const searchText = searchQuery?.trim() || undefined
  const isFiltered = activeFilterStrings.length > 0 || Boolean(sortParam) || Boolean(searchText)

  const resolution = await resolveCatalogView({
    source,
    facetKey,
    facetKind,
    sortKey,
    reverse,
    activeFilterStrings,
    searchQuery: searchText,
    currentPage,
    pageSize,
    cacheTags,
    isFiltered,
  })

  if (resolution.status === 'not_found') notFound()

  // A deep-page fetch failure bounces to page 1 with all state preserved —
  // mirrors the pre-split `catch (err) { if (currentPage > 1) redirect(page1Url) }`
  // exactly (this fires regardless of filter state, as it did before).
  if (resolution.status === 'fetch_failed_deep') {
    redirect(
      buildPage1Url({
        baseUrl,
        sortParam,
        activeFilterStrings,
        searchText,
        pageSize,
        trackingParamsSource,
      }),
    )
  }

  // A clean deep link past the end 404s — mirrors the pre-split
  // `if (!isFiltered && currentPage > 1 && products.length === 0) notFound()`.
  if (resolution.status === 'empty_past_end') notFound()

  return (
    <CategoryResultsView
      products={resolution.products}
      filters={resolution.filters}
      categoryFacet={resolution.categoryFacet}
      filterLabelMap={resolution.filterLabelMap}
      total={resolution.total}
      hasNext={resolution.hasNext}
      renderedCount={resolution.renderedCount}
      title={resolution.title}
      handle={resolution.handle}
      searchQuery={resolution.searchQuery}
      baseUrl={baseUrl}
      facetKey={facetKey}
      sortKey={sortKey}
      reverse={reverse}
      sortParam={sortParam}
      activeFilterStrings={activeFilterStrings}
      currentPage={currentPage}
      pageSize={pageSize}
      trackingParamsSource={trackingParamsSource}
      searchScopeTitle={searchScopeTitle}
      tabsAllLabel={tabsAllLabel}
      tabsLeadingLinks={tabsLeadingLinks}
      sourceKindIsTag={source.kind === 'tag'}
      isFiltered={isFiltered}
    />
  )
}
