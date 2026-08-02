import { Suspense } from 'react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { X } from 'lucide-react'
import { buildCollectionItemListSchema, jsonLdSafe } from '@/lib/schema'
import { SITE_URL } from '@/lib/seo/constants'
import { fetchProductConnection, type ProductSource } from '@/lib/category-results-source'
import { getVisibleFilters } from '@/lib/shopify/filters'
import { getAllowedFacets } from '@/lib/filter-registry'
import { withTrackingParams, type TrackingParamSource } from '@/lib/analytics/tracking-params'
import { CATEGORY_PAGE_SIZE } from '@/lib/category-utils'
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
}: Props) {
  const searchText = searchQuery?.trim() || undefined
  const isFiltered = activeFilterStrings.length > 0 || Boolean(sortParam) || Boolean(searchText)

  const persistParams = new URLSearchParams()
  if (sortParam) persistParams.set('sort', sortParam)
  activeFilterStrings.forEach((f) => persistParams.append('filter', f))
  if (searchText) persistParams.set('q', searchText)
  withTrackingParams(persistParams, trackingParamsSource)
  const page1Qs = persistParams.toString()
  const page1Url = page1Qs ? `${baseUrl}?${page1Qs}` : baseUrl

  const first = currentPage * CATEGORY_PAGE_SIZE + 1

  let result: Awaited<ReturnType<typeof fetchProductConnection>>
  try {
    result = await fetchProductConnection(source, {
      first,
      sortKey,
      reverse,
      filters: parseFilters(activeFilterStrings),
      text: searchText,
    })
  } catch (err) {
    if (currentPage > 1) {
      redirect(page1Url)
    }
    throw err
  }

  if (!result) notFound()

  const { products: connection, title, handle } = result
  const allNodes = connection.nodes
  const startIndex = (currentPage - 1) * CATEGORY_PAGE_SIZE
  const products = attachCardShippingDisplay(allNodes.slice(startIndex, startIndex + CATEGORY_PAGE_SIZE))
  const hasNext = allNodes.length > currentPage * CATEGORY_PAGE_SIZE

  if (!isFiltered && currentPage > 1 && products.length === 0) notFound()

  const allowedFacets = getAllowedFacets(facetKey, connection.filters ?? [])
  const filters = getVisibleFilters(allowedFacets, activeFilterStrings)

  const removeFilterUrl = (filterToRemove: string) => {
    const next = activeFilterStrings.filter((f) => f !== filterToRemove)
    const p = new URLSearchParams()
    if (sortParam) p.set('sort', sortParam)
    next.forEach((f) => p.append('filter', f))
    if (searchText) p.set('q', searchText)
    withTrackingParams(p, trackingParamsSource)
    const qs = p.toString()
    return qs ? `${baseUrl}?${qs}` : baseUrl
  }

  // Clearing the search keeps sort/filter state (and vice versa).
  const clearSearchUrl = (() => {
    const p = new URLSearchParams()
    if (sortParam) p.set('sort', sortParam)
    activeFilterStrings.forEach((f) => p.append('filter', f))
    withTrackingParams(p, trackingParamsSource)
    const qs = p.toString()
    return qs ? `${baseUrl}?${qs}` : baseUrl
  })()

  const filterLabelMap = new Map(
    allowedFacets.flatMap((g) => g.values.map((v) => [v.input, v.label] as const)),
  )

  // Complete results state — any change here is a new result set (drives the
  // scroll anchor). Includes filters, sort, search and page.
  const resultsKey = JSON.stringify([activeFilterStrings, sortParam ?? '', searchText ?? '', currentPage])

  return (
    <CatalogTransitionProvider>
      {/* ItemList of this page's visible products (audit L16) — canonical
          (unfiltered) views only, positions continue across pages. */}
      {!isFiltered && products.length > 0 && (
        <script
          type="application/ld+json"
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
      {/* Desktop filter sidebar. Suspense boundary: CategoryFilters reads
          useSearchParams(), which on the statically-generated category route
          would otherwise bail the WHOLE page out to client rendering and cache
          an empty shell (audit H1). The boundary confines the client-side
          render to the filter rail. */}
      <aside className="hidden lg:block w-[280px] shrink-0 pr-10 sticky top-[140px] max-h-[calc(100vh-160px)] overflow-y-auto">
        <Suspense fallback={null}>
          <CategoryFilters
            filters={filters}
            activeFilters={activeFilterStrings}
            currentSort={sortParam}
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

          {/* Discovery toolbar (Phase 8).
              Desktop: result count left, sort right, both aligned with the grid.
              Mobile/tablet: a dedicated row where Filters and Sort sit side by
              side as equal, clearly-labelled 48px targets — no icon-only
              ambiguity and no hover-dependent controls. */}
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* aria-live: announces updated counts after async filter/search
                navigations without moving focus. */}
            <p className="text-gray-600 text-[16px]" aria-live="polite" role="status">
              {searchText
                ? `${products.length} result${products.length === 1 ? '' : 's'} for “${searchText}”`
                : `Showing ${products.length} product${products.length === 1 ? '' : 's'}`}
            </p>

            <div className="flex items-stretch gap-2">
              {/* Mobile filter trigger sits in the toolbar beside Sort. */}
              <div className="lg:hidden flex-1">
                <Suspense fallback={null}>
                  <FilterDrawer
                    filters={filters}
                    activeFilters={activeFilterStrings}
                    currentSort={sortParam}
                  />
                </Suspense>
              </div>
              <div className="flex-1 sm:flex-none">
                {/* Suspense: CategorySort reads useSearchParams() — see the
                    sidebar boundary note above. */}
                <Suspense fallback={null}>
                  <CategorySort
                    currentSort={sortParam}
                    activeFilters={activeFilterStrings}
                    limitedSortOptions={source.kind === 'tag' || Boolean(searchText)}
                  />
                </Suspense>
              </div>
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
    </CatalogTransitionProvider>
  )
}
