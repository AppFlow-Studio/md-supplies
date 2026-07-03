import Link from 'next/link'
import { notFound } from 'next/navigation'
import { X } from 'lucide-react'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_COLLECTION } from '@/lib/shopify/queries/collections'
import type { Collection } from '@/lib/shopify/types'
import { getVisibleFilters } from '@/lib/shopify/filters'
import { withTrackingParams, type TrackingParamSource } from '@/lib/analytics/tracking-params'
import { CategoryFilters } from '@/components/category/CategoryFilters'
import { CategorySort } from '@/components/category/CategorySort'
import { ProductGrid } from '@/components/category/ProductGrid'
import { CategoryPagination } from '@/components/category/CategoryPagination'
import { FilterDrawer } from '@/components/category/FilterDrawer'
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
  after: string | null
  prevCursors: string[]
  trackingParamsSource: TrackingParamSource
}

export async function CategoryResults({
  slug,
  sortKey,
  reverse,
  sortParam,
  activeFilterStrings,
  currentPage,
  after,
  prevCursors,
  trackingParamsSource,
}: Props) {
  const isFiltered = activeFilterStrings.length > 0 || Boolean(sortParam)

  const data = await storefrontFetch<{ collection: Collection | null }>(GET_COLLECTION, {
    handle: slug,
    first: 9,
    after,
    sortKey,
    reverse,
    filters: parseFilters(activeFilterStrings),
  })

  if (!data.collection) notFound()

  if (!isFiltered && currentPage > 1 && data.collection.products.nodes.length === 0) notFound()

  const { collection } = data
  const products = collection.products.nodes
  const { pageInfo } = collection.products
  const rawFilters = collection.products.filters ?? []
  const filters = getVisibleFilters(rawFilters, activeFilterStrings)

  const removeFilterUrl = (filterToRemove: string) => {
    const next = activeFilterStrings.filter((f) => f !== filterToRemove)
    const p = new URLSearchParams()
    if (sortParam) p.set('sort', sortParam)
    next.forEach((f) => p.append('filter', f))
    withTrackingParams(p, trackingParamsSource)
    const qs = p.toString()
    return qs ? `/category/${slug}?${qs}` : `/category/${slug}`
  }

  const persistParams = new URLSearchParams()
  if (sortParam) persistParams.set('sort', sortParam)
  activeFilterStrings.forEach((f) => persistParams.append('filter', f))
  withTrackingParams(persistParams, trackingParamsSource)

  const filterLabelMap = new Map(
    rawFilters.flatMap((g) => g.values.map((v) => [v.input, v.label] as const)),
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
          hasNext={pageInfo.hasNextPage}
          nextCursor={pageInfo.endCursor ?? null}
          prevCursors={prevCursors}
          currentAfter={after}
          baseUrl={ROUTES.category(slug)}
          persistParams={persistParams}
        />
      </div>
    </>
  )
}
