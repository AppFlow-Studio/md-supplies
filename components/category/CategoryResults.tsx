import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { X } from 'lucide-react'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_COLLECTION } from '@/lib/shopify/queries/collections'
import type { Collection } from '@/lib/shopify/types'
import { getVisibleFilters } from '@/lib/shopify/filters'
import { getAllowedFacets } from '@/lib/filter-registry'
import { withTrackingParams, type TrackingParamSource } from '@/lib/analytics/tracking-params'
import { CATEGORY_PAGE_SIZE } from '@/lib/category-utils'
import { CategoryFilters } from '@/components/category/CategoryFilters'
import { CategorySort } from '@/components/category/CategorySort'
import { ProductGrid } from '@/components/category/ProductGrid'
import { CategoryPagination } from '@/components/category/CategoryPagination'
import { FilterDrawer } from '@/components/category/FilterDrawer'
import { ScrollToResults } from '@/components/category/ScrollToResults'
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
  slug: string
  sortKey: string
  reverse: boolean
  sortParam?: string
  activeFilterStrings: string[]
  currentPage: number
  trackingParamsSource: TrackingParamSource
}

export async function CategoryResults({
  slug,
  sortKey,
  reverse,
  sortParam,
  activeFilterStrings,
  currentPage,
  trackingParamsSource,
}: Props) {
  const isFiltered = activeFilterStrings.length > 0 || Boolean(sortParam)

  // Built up front so it's available as the page-1 redirect target below,
  // not just for the links rendered at the bottom of this component.
  const persistParams = new URLSearchParams()
  if (sortParam) persistParams.set('sort', sortParam)
  activeFilterStrings.forEach((f) => persistParams.append('filter', f))
  withTrackingParams(persistParams, trackingParamsSource)
  const page1Qs = persistParams.toString()
  const page1Url = page1Qs ? `${ROUTES.category(slug)}?${page1Qs}` : ROUTES.category(slug)

  // Deterministic page-N: fetch from the start of the (sorted/filtered)
  // result set and slice locally, instead of chaining a Storefront `after`
  // cursor. Every `?page=N` becomes self-contained and immune to
  // stale/expired cursors — the tradeoff is refetching earlier pages'
  // products on every request, bounded by MAX_CATEGORY_PAGE upstream.
  const first = currentPage * CATEGORY_PAGE_SIZE + 1

  let data: { collection: Collection | null }
  try {
    data = await storefrontFetch<{ collection: Collection | null }>(GET_COLLECTION, {
      handle: slug,
      first,
      after: null,
      sortKey,
      reverse,
      filters: parseFilters(activeFilterStrings),
    })
  } catch (err) {
    // A transient Storefront failure shouldn't take down a deep page with a
    // full error page — bounce back to page 1 (filters/sort intact)
    // instead. Page 1 has no lower fallback, so let it surface to error.tsx.
    if (currentPage > 1) {
      redirect(page1Url)
    }
    throw err
  }

  if (!data.collection) notFound()

  const { collection } = data
  const allNodes = collection.products.nodes
  const startIndex = (currentPage - 1) * CATEGORY_PAGE_SIZE
  const products = allNodes.slice(startIndex, startIndex + CATEGORY_PAGE_SIZE)
  const hasNext = allNodes.length > currentPage * CATEGORY_PAGE_SIZE

  if (!isFiltered && currentPage > 1 && products.length === 0) notFound()

  // Registry gate: only allowlisted facet sources may reach the filter rail —
  // the Storefront `filters` response is untrusted input.
  const allowedFacets = getAllowedFacets(slug, collection.products.filters ?? [])
  const filters = getVisibleFilters(allowedFacets, activeFilterStrings)

  const removeFilterUrl = (filterToRemove: string) => {
    const next = activeFilterStrings.filter((f) => f !== filterToRemove)
    const p = new URLSearchParams()
    if (sortParam) p.set('sort', sortParam)
    next.forEach((f) => p.append('filter', f))
    withTrackingParams(p, trackingParamsSource)
    const qs = p.toString()
    return qs ? `/category/${slug}?${qs}` : `/category/${slug}`
  }

  const filterLabelMap = new Map(
    allowedFacets.flatMap((g) => g.values.map((v) => [v.input, v.label] as const)),
  )

  return (
    <>
      {/* Desktop filter sidebar */}
      <aside className="hidden lg:block w-[280px] shrink-0 pr-10 sticky top-[140px] max-h-[calc(100vh-160px)] overflow-y-auto">
        <CategoryFilters
          filters={filters}
          activeFilters={activeFilterStrings}
          currentSort={sortParam}
        />
      </aside>

      {/* Product area */}
      <ScrollToResults page={currentPage}>
        <div className="flex-1 min-w-0">
          {/* Sort bar */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-gray-500 text-[15px]">
              Showing {products.length} products
            </p>
            <CategorySort currentSort={sortParam} activeFilters={activeFilterStrings} />
          </div>

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

          {/* Mobile filter drawer */}
          <FilterDrawer
            filters={filters}
            activeFilters={activeFilterStrings}
            currentSort={sortParam}
          />

          {/* Product grid */}
          <ProductGrid
            products={products}
            emptyStateHref={ROUTES.category(slug)}
            categorySlug={collection.handle}
            itemListId={collection.handle}
            itemListName={collection.title}
          />

          {/* Pagination — works for both plain and filtered/sorted views */}
          <CategoryPagination
            currentPage={currentPage}
            hasNext={hasNext}
            baseUrl={ROUTES.category(slug)}
            persistParams={persistParams}
          />
        </div>
      </ScrollToResults>
    </>
  )
}
