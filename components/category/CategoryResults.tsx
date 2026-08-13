import { Suspense } from 'react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { X } from 'lucide-react'
import { buildCollectionItemListSchema, jsonLdSafe } from '@/lib/schema'
import { SITE_URL } from '@/lib/seo/constants'
import { type ProductSource } from '@/lib/category-results-source'
import { fetchCatalogPage } from '@/lib/catalog/fetch-page'
import { getVisibleFilters } from '@/lib/shopify/filters'
import { getAllowedFacets, type FacetRouteKind } from '@/lib/filter-registry'
import { withTrackingParams, type TrackingParamSource } from '@/lib/analytics/tracking-params'
import { formatResultCount, DEFAULT_PAGE_SIZE, type PageSize } from '@/lib/catalog/page-size'
import { PerPageSelect } from '@/components/category/PerPageSelect'
import { CategoryTabs } from '@/components/category/CategoryTabs'
import { attachCardShippingDisplay } from '@/lib/shipping-resolver/attach'
import { CategoryFilters } from '@/components/category/CategoryFilters'
import { CategorySearch } from '@/components/category/CategorySearch'
import { CategorySort } from '@/components/category/CategorySort'
import { ProductGrid } from '@/components/category/ProductGrid'
import { CategoryPagination } from '@/components/category/CategoryPagination'
import { FilterDrawer } from '@/components/category/FilterDrawer'
import { ScrollToResults } from '@/components/category/ScrollToResults'
import { CatalogTransitionProvider } from '@/components/category/CatalogTransition'
import { CatalogResultsState } from '@/components/category/CatalogResultsState'
import { ROUTES } from '@/lib/routes'
import { getNonce } from '@/lib/csp-nonce'

function parseFilters(filterStrings: string[]): Record<string, unknown>[] {
  return filterStrings.flatMap((f) => {
    try {
      const parsed = JSON.parse(f)
      return parsed ? [parsed] : []
    } catch {
      return []
    }
  })
}

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
}: Props) {
  const nonce = await getNonce()
  const searchText = searchQuery?.trim() || undefined
  const isFiltered = activeFilterStrings.length > 0 || Boolean(sortParam) || Boolean(searchText)

  const persistParams = new URLSearchParams()
  if (sortParam) persistParams.set('sort', sortParam)
  activeFilterStrings.forEach((f) => persistParams.append('filter', f))
  if (searchText) persistParams.set('q', searchText)
  if (pageSize !== DEFAULT_PAGE_SIZE) persistParams.set('per_page', String(pageSize))
  withTrackingParams(persistParams, trackingParamsSource)
  const page1Qs = persistParams.toString()
  const page1Url = page1Qs ? `${baseUrl}?${page1Qs}` : baseUrl

  let result: Awaited<ReturnType<typeof fetchCatalogPage>>
  try {
    result = await fetchCatalogPage(source, {
      sortKey,
      reverse,
      filters: parseFilters(activeFilterStrings),
      text: searchText,
      page: currentPage,
      pageSize,
      cacheTags,
    })
  } catch (err) {
    if (currentPage > 1) {
      redirect(page1Url)
    }
    throw err
  }

  if (!result) notFound()

  const { title, handle, total: matchingTotal } = result
  const startIndex = (currentPage - 1) * pageSize
  const products = attachCardShippingDisplay(result.products)
  const hasNext = result.hasNext

  if (!isFiltered && currentPage > 1 && products.length === 0) notFound()

  const allowedFacets = getAllowedFacets(facetKey, result.facets, facetKind, activeFilterStrings)
  const filters = getVisibleFilters(allowedFacets, activeFilterStrings)

  const removeFilterUrl = (filterToRemove: string) => {
    const next = activeFilterStrings.filter((f) => f !== filterToRemove)
    const p = new URLSearchParams()
    if (sortParam) p.set('sort', sortParam)
    next.forEach((f) => p.append('filter', f))
    if (searchText) p.set('q', searchText)
    if (pageSize !== DEFAULT_PAGE_SIZE) p.set('per_page', String(pageSize))
    withTrackingParams(p, trackingParamsSource)
    const qs = p.toString()
    return qs ? `${baseUrl}?${qs}` : baseUrl
  }

  // Clearing the search keeps sort/filter state (and vice versa).
  const clearSearchUrl = (() => {
    const p = new URLSearchParams()
    if (sortParam) p.set('sort', sortParam)
    activeFilterStrings.forEach((f) => p.append('filter', f))
    if (pageSize !== DEFAULT_PAGE_SIZE) p.set('per_page', String(pageSize))
    withTrackingParams(p, trackingParamsSource)
    const qs = p.toString()
    return qs ? `${baseUrl}?${qs}` : baseUrl
  })()

  // Clearing every filter keeps sort, search and page size — only the facet
  // selections go, and pagination resets to page 1.
  const clearAllUrl = (() => {
    const p = new URLSearchParams()
    if (sortParam) p.set('sort', sortParam)
    if (searchText) p.set('q', searchText)
    if (pageSize !== DEFAULT_PAGE_SIZE) p.set('per_page', String(pageSize))
    withTrackingParams(p, trackingParamsSource)
    const qs = p.toString()
    return qs ? `${baseUrl}?${qs}` : baseUrl
  })()

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

  // Complete results state — any change here is a new result set (drives the
  // scroll anchor). Includes filters, sort, search and page.
  const resultsKey = JSON.stringify([activeFilterStrings, sortParam ?? '', searchText ?? '', currentPage, pageSize])

  return (
    <CatalogTransitionProvider>
      {/* ItemList of this page's visible products (audit L16) — canonical
          (unfiltered) views only, positions continue across pages. */}
      {!isFiltered && products.length > 0 && (
        <script
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: jsonLdSafe(
              buildCollectionItemListSchema(
                products,
                (handle) => `${SITE_URL}${ROUTES.product(handle)}`,
                startIndex + 1,
              ),
            ),
          }}
        />
      )}
      {/* Category tab row — full width, above the two-column body, so it sits
          directly beneath the hero as specified rather than inside the results
          column. Same facet object as the rail's Category group. */}
      {tabsAllLabel && (
        <Suspense fallback={null}>
          <CategoryTabs
            facet={categoryFacet}
            activeFilters={activeFilterStrings}
            allLabel={tabsAllLabel}
            ariaLabel={`${searchScopeTitle ?? title} categories`}
            currentSort={sortParam}
            q={searchText}
            pageSize={pageSize}
          />
        </Suspense>
      )}

      <div className="flex items-start lg:gap-10">
      {/* Desktop filter sidebar. Suspense boundary: CategoryFilters reads
          useSearchParams(), which on the statically-generated category route
          would otherwise bail the WHOLE page out to client rendering and cache
          an empty shell (audit H1). The boundary confines the client-side
          render to the filter rail. */}
      {/* pr-4 + the row's lg:gap-10 leaves a clear channel between the rail's
          scrollbar and the results column. It was pr-10 with no row gap, which
          put the search field flush against the scrollbar. */}
      <aside className="hidden lg:block w-[280px] shrink-0 pr-4 sticky top-[140px] max-h-[calc(100vh-160px)] overflow-y-auto">
        <Suspense fallback={null}>
          <CategoryFilters
            filters={filters}
            activeFilters={activeFilterStrings}
            currentSort={sortParam}
            q={searchText}
          />
        </Suspense>
      </aside>

      {/* Product area */}
      <ScrollToResults resultsKey={resultsKey}>
        <div>
          {/* Collection-scoped search (DEV-SEARCH-01). Suspense: reads
              useSearchParams() for tracking params — see the sidebar note. */}
          <Suspense fallback={null}>
            <CategorySearch
              scopeTitle={searchScopeTitle ?? title}
              searchQuery={searchText}
              currentSort={sortParam}
              activeFilters={activeFilterStrings}
            />
          </Suspense>

          {/* Discovery toolbar — exact requested hierarchy.
              Row 1 is the search field ALONE (rendered above). Row 2 is result
              count left / Sort far right, with Sort pushed to the grid's right
              edge so it never reads as part of the left filter rail. Row 3 is
              the active chips. Products follow immediately.
              Mobile/tablet: full-width search, then Filters + Sort as equal
              48px controls. */}
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
            {/* Exact wording: "Showing {rendered} products of {matching total}".
                `products.length` is what is actually on screen (the last page of
                307 at 20 per page shows 7, not 20); `matchingTotal` is the
                authoritative count for the current filters/search from the
                product index, never a per-page figure or a DOM count.
                aria-live announces the updated count after async filter/search
                navigations without moving focus. */}
            <p className="text-gray-600 text-[16px]" aria-live="polite" role="status">
              {formatResultCount(products.length, matchingTotal)}
              {searchText ? <> for “{searchText}”</> : null}
            </p>

            {/* Mobile/tablet: Filters + Sort as two equal 48px controls, then
                the per-page control on its own row so nothing is squeezed
                below 44px or pushed off-screen at 320px.
                Desktop: per-page then Sort, right-aligned. */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
              <div className="flex items-stretch gap-2">
                <div className="lg:hidden flex-1">
                  <Suspense fallback={null}>
                    <FilterDrawer
                      filters={filters}
                      activeFilters={activeFilterStrings}
                      currentSort={sortParam}
                      q={searchText}
                    />
                  </Suspense>
                </div>
                <div className="flex-1 lg:flex-none">
                  {/* Suspense: CategorySort reads useSearchParams() — see the
                      sidebar boundary note above. */}
                  <Suspense fallback={null}>
                    <CategorySort
                      currentSort={sortParam}
                      activeFilters={activeFilterStrings}
                      q={searchText}
                      limitedSortOptions={source.kind === 'tag' || Boolean(searchText)}
                    />
                  </Suspense>
                </div>
              </div>
              <Suspense fallback={null}>
                <PerPageSelect
                  value={pageSize}
                  currentSort={sortParam}
                  activeFilters={activeFilterStrings}
                  q={searchText}
                />
              </Suspense>
            </div>
          </div>

          {/* Active search chip — mirrors the filter chips below */}
          {searchText && (
            <div className="flex flex-wrap gap-2 mb-6">
              <Link
                href={clearSearchUrl}
                className="flex items-center gap-1 bg-navy-900 text-white text-[12px] font-medium px-3 h-[28px] hover:bg-navy-950 transition-colors"
              >
                Search: {searchText}
                <X size={11} />
              </Link>
            </div>
          )}

          {/* Active filter chips */}
          {activeFilterStrings.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {activeFilterStrings.map((f) => {
                let label = filterLabelMap.get(f) ?? f
                try {
                  const parsed = JSON.parse(f)
                  if (parsed?.price) {
                    const { min, max } = parsed.price
                    label = max >= 200000
                      ? `Price: $${Number(min).toLocaleString()}+`
                      : `Price: $${Number(min).toLocaleString()} – $${Number(max).toLocaleString()}`
                  }
                } catch { /* keep raw */ }
                return (
                  <Link
                    key={f}
                    href={removeFilterUrl(f)}
                    className="flex items-center gap-1 bg-navy-900 text-white text-[12px] font-medium px-3 h-[28px] hover:bg-navy-950 transition-colors"
                  >
                    {label}
                    <X size={11} />
                  </Link>
                )
              })}
              {/* Clear-all lives with the chips rather than only inside the
                  desktop rail and the mobile drawer, so it is reachable at
                  every breakpoint without opening anything. */}
              <Link
                href={clearAllUrl}
                className="flex items-center min-h-[28px] border border-navy-900 text-navy-900 text-[12px] font-semibold px-3 hover:bg-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-900"
              >
                Clear all
              </Link>
            </div>
          )}

          {/* Product grid. Only THIS subtree reacts to a pending navigation:
              products dim but stay on screen, so nothing flashes and the
              surrounding layout never unmounts. Empty search results recover
              by clearing the query (keeping filters), not the whole state. */}
          <CatalogResultsState>
            <ProductGrid
              products={products}
              emptyStateHref={searchText ? clearSearchUrl : baseUrl}
              categorySlug={handle}
              itemListId={handle}
              itemListName={title}
            />
          </CatalogResultsState>

          {/* Pagination — works for both plain and filtered/sorted views */}
          <CategoryPagination
            currentPage={currentPage}
            hasNext={hasNext}
            baseUrl={baseUrl}
            persistParams={persistParams}
          />
        </div>
      </ScrollToResults>
      </div>
    </CatalogTransitionProvider>
  )
}
