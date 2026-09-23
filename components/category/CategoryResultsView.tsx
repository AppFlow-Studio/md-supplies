import { Suspense } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'
import type { CollectionProduct, CollectionFilter } from '@/lib/shopify/types'
import { buildCollectionItemListSchema, jsonLdSafe } from '@/lib/schema'
import { SITE_URL } from '@/lib/seo/constants'
import { type TrackingParamSource } from '@/lib/analytics/tracking-params'
import {
  buildPersistParams,
  buildRemoveFilterUrl,
  buildClearAllUrl,
  buildClearSearchUrl,
  type CategoryUrlState,
} from '@/lib/catalog/category-urls'
import { formatResultCount, type PageSize } from '@/lib/catalog/page-size'
import { PerPageSelect } from '@/components/category/PerPageSelect'
import { CategoryTabs } from '@/components/category/CategoryTabs'
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
import type { ProductReviewSummary } from '@/lib/trustshop/types'

// Presentational catalog grid — NO fetch, NO server-only imports.
//
// Phase 3 split: this is the rail + search + sort + tabs + grid + pagination
// chrome, taking fully-resolved data as props. It is deliberately server- AND
// client-safe (every child control is already 'use client', and everything
// here is pure prop rendering) so that BOTH the server default render
// (CategoryResults server head) and the client filter island
// (CategoryFilterableGrid) can render the identical tree — no UI drift between
// the crawler's static view and the shopper's filtered view.
//
// GOTCHA: `attachCardShippingDisplay` (lib/shipping-resolver/attach) is
// server-only. Its output rides in on the `products` prop already attached — it
// MUST run in the data head / API route before this view, never here, or a
// client import of this file would drag server-only code into the bundle.

export interface CategoryResultsViewProps {
  // ── Resolved data (fetched + piped upstream) ──
  products: CollectionProduct[]
  /** Visible filter rail groups (post gate/order/visibility). */
  filters: CollectionFilter[]
  /** The Category-facet group the tab row is a view over, or undefined. */
  categoryFacet: CollectionFilter | undefined
  /** input -> human label, for active-chip text. */
  filterLabelMap: Map<string, string>
  /** Keyed by Shopify GID — not user-specific, safe in both the static
      default-grid prerender and the shared /api/catalog cache. */
  reviewSummaries: Map<string, ProductReviewSummary | null>
  /** Authoritative count of products matching the current query. */
  total: number
  hasNext: boolean
  /** Products actually on screen this page (`products.length`). */
  renderedCount: number
  title: string
  handle: string
  searchQuery?: string

  // ── Display / config (URL + state) ──
  baseUrl: string
  facetKey: string
  sortKey: string
  reverse: boolean
  sortParam?: string
  activeFilterStrings: string[]
  currentPage: number
  pageSize: PageSize
  trackingParamsSource: TrackingParamSource
  searchScopeTitle?: string
  tabsAllLabel?: string
  tabsLeadingLinks?: { label: string; href: string }[]
  /**
   * Whether the underlying ProductSource is a tag query. The client island
   * can't see `source.kind`, so this static flag is passed and OR'd with
   * `Boolean(searchText)` to decide the limited sort-option set — matching the
   * former `source.kind === 'tag' || Boolean(searchText)`.
   */
  sourceKindIsTag: boolean
  /** True when any filter/sort/search is active — gates the ItemList JSON-LD. */
  isFiltered: boolean
  /**
   * Phase 3 — the client filter island's own fetch-loading flag. When true the
   * grid dims (CatalogResultsState) as it does during a router navigation. The
   * server default render never passes this (defaults false).
   */
  externalPending?: boolean
}

export function CategoryResultsView({
  products,
  filters,
  categoryFacet,
  filterLabelMap,
  reviewSummaries,
  total: matchingTotal,
  hasNext,
  renderedCount,
  title,
  handle,
  searchQuery,
  baseUrl,
  sortParam,
  activeFilterStrings,
  currentPage,
  pageSize,
  trackingParamsSource,
  searchScopeTitle,
  tabsAllLabel,
  tabsLeadingLinks,
  sourceKindIsTag,
  isFiltered,
  externalPending = false,
}: CategoryResultsViewProps) {
  const searchText = searchQuery?.trim() || undefined
  const startIndex = (currentPage - 1) * pageSize

  const urlState: CategoryUrlState = {
    baseUrl,
    sortParam,
    activeFilterStrings,
    searchText,
    pageSize,
    trackingParamsSource,
  }

  // persistParams drives pagination (CategoryPagination appends `page`) — kept
  // as a URLSearchParams for that component's existing contract.
  const persistParams = buildPersistParams(urlState)
  const clearSearchUrl = buildClearSearchUrl(urlState)
  const clearAllUrl = buildClearAllUrl(urlState)

  // Complete results state — any change here is a new result set (drives the
  // scroll anchor). Includes filters, sort, search and page.
  const resultsKey = JSON.stringify([activeFilterStrings, sortParam ?? '', searchText ?? '', currentPage, pageSize])

  return (
    <CatalogTransitionProvider externalPending={externalPending}>
      {/* ItemList of this page's visible products (audit L16) — canonical
          (unfiltered) views only, positions continue across pages. */}
      {!isFiltered && products.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLdSafe(
              buildCollectionItemListSchema(
                products,
                (h) => `${SITE_URL}${ROUTES.product(h)}`,
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
            leadingLinks={tabsLeadingLinks}
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
                `renderedCount` is what is actually on screen (the last page of
                307 at 20 per page shows 7, not 20); `matchingTotal` is the
                authoritative count for the current filters/search from the
                product index, never a per-page figure or a DOM count.
                aria-live announces the updated count after async filter/search
                navigations without moving focus. */}
            <p className="text-gray-600 text-[16px]" aria-live="polite" role="status">
              {formatResultCount(renderedCount, matchingTotal)}
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
                      limitedSortOptions={sourceKindIsTag || Boolean(searchText)}
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

          {/* No "Search: …" chip here. It duplicated the search field's own
              clear button — same action, same X glyph, two controls — which is
              half of the reported duplicate-clear defect (the other half was
              the browser's native cancel button, suppressed in globals.css).
              The active query is still surfaced, informationally: the result
              count above reads `… for “{searchText}”` and is aria-live, so the
              state is announced without offering a second way to undo it.
              `clearSearchUrl` survives as the empty-results recovery link. */}

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
                    href={buildRemoveFilterUrl(urlState, f)}
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
              reviewSummaries={reviewSummaries}
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
