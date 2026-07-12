import type { Metadata } from 'next'
import { buildMetadata } from '@/lib/seo'
import Link from 'next/link'
import { X } from 'lucide-react'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { SEARCH_PRODUCTS } from '@/lib/shopify/queries/search'
import { getVisibleFilters } from '@/lib/shopify/filters'
import { SearchFilters } from '@/components/search/SearchFilters'
import { SearchSort } from '@/components/search/SearchSort'
import { SearchFilterDrawer } from '@/components/search/SearchFilterDrawer'
import { SearchBarForm } from '@/components/search/SearchBarForm'
import { SearchResultsSection } from '@/components/search/SearchResultsSection'
import type { CollectionProduct, CollectionFilter, PageInfo } from '@/lib/shopify/types'
import { redirect } from 'next/navigation'
import { getSearchFacets, isAllowedFilterInput } from '@/lib/filter-registry'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{
    q?: string
    sort?: string
    after?: string
    filter?: string | string[]
  }>
}

interface SearchData {
  search: {
    totalCount: number
    productFilters: CollectionFilter[]
    pageInfo: PageInfo
    nodes: CollectionProduct[]
  }
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams
  return buildMetadata({
    pageType: 'utility',
    title: sp.q ? `"${sp.q}" — Search` : 'Search',
    slug: 'search',
  })
}

function parseFilterParam(filter?: string | string[]): string[] {
  if (!filter) return []
  const raw = Array.isArray(filter) ? filter : [filter]
  // Default-deny URL-supplied inputs (rejects tag filters and unknown keys).
  return raw.filter(isAllowedFilterInput)
}

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

function parseSortKey(sort?: string): { sortKey: string; reverse: boolean } {
  switch (sort) {
    case 'PRICE_ASC':  return { sortKey: 'PRICE', reverse: false }
    case 'PRICE_DESC': return { sortKey: 'PRICE', reverse: true }
    default:           return { sortKey: 'RELEVANCE', reverse: false }
  }
}

const SUGGESTED = [
  { label: 'Exam Gloves', href: '/category/exam-gloves' },
  { label: 'Face Masks', href: '/category/face-masks' },
  { label: 'Wound Care', href: '/category/wound-care' },
  { label: 'Syringes', href: '/category/syringes' },
]

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams
  const q = sp.q ?? ''

  const activeFilterStrings = parseFilterParam(sp.filter)
  const parsedFilters = parseFilters(activeFilterStrings)
  const { sortKey, reverse } = parseSortKey(sp.sort)
  const isFiltered = activeFilterStrings.length > 0 || Boolean(sp.sort)

  let products: CollectionProduct[] = []
  let totalCount = 0
  let productFilters: CollectionFilter[] = []
  let pageInfo: PageInfo = { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null }

  // Target for the bad-cursor redirect below: same q/sort/filter, no
  // `after` — i.e. exactly what a fresh page-1 visit would build.
  const page1Url = (() => {
    const p = new URLSearchParams()
    if (q) p.set('q', q)
    if (sp.sort) p.set('sort', sp.sort)
    activeFilterStrings.forEach((f) => p.append('filter', f))
    const qs = p.toString()
    return qs ? `/search?${qs}` : '/search'
  })()

  if (q.trim()) {
    try {
      const data = await storefrontFetch<SearchData>(SEARCH_PRODUCTS, {
        query: q,
        first: 12,
        after: sp.after ?? null,
        sortKey,
        reverse,
        filters: parsedFilters,
      })
      products = data.search.nodes
      totalCount = data.search.totalCount
      // Registry gate: only sources approved anywhere in the search
      // allowlist may reach the filter rail (NF3) — the Storefront
      // `productFilters` response is untrusted input.
      productFilters = getSearchFacets(data.search.productFilters ?? [])
      pageInfo = data.search.pageInfo
    } catch {
      // NF10: an expired/mangled `after` cursor throws here just like any
      // other Storefront error, but it isn't a genuinely empty result —
      // bounce to page 1 (q/sort/filter intact) instead of rendering a
      // false "No results". Errors with no cursor involved keep the
      // original behavior (empty state) since there's no lower fallback.
      if (sp.after) {
        redirect(page1Url)
      }
    }
  }

  const removeFilterUrl = (filterToRemove: string) => {
    const next = activeFilterStrings.filter((f) => f !== filterToRemove)
    const p = new URLSearchParams()
    if (q) p.set('q', q)
    if (sp.sort) p.set('sort', sp.sort)
    next.forEach((f) => p.append('filter', f))
    const qs = p.toString()
    return qs ? `/search?${qs}` : '/search'
  }

  const clearFiltersUrl = (() => {
    const p = new URLSearchParams()
    if (q) p.set('q', q)
    return `/search?${p.toString()}`
  })()

  const filterLabelMap = new Map(
    productFilters.flatMap((g) => g.values.map((v) => [v.input, v.label] as const))
  )

  return (
    <main className="bg-[#f9fafc] min-h-screen">
      {/* Search bar — keyed so controlled input resets on each new query */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-8">
          <SearchBarForm key={q} defaultQuery={q} />
        </div>
      </div>

      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-6 flex gap-0 items-start">
        {/* Desktop filter sidebar — only when we have a query + filters */}
        {q.trim() && productFilters.length > 0 && (
          <aside className="hidden lg:block w-[280px] shrink-0 pr-10 sticky top-[140px] max-h-[calc(100vh-160px)] overflow-y-auto">
            <SearchFilters
              filters={productFilters}
              activeFilters={activeFilterStrings}
              currentSort={sp.sort}
              q={q}
            />
          </aside>
        )}

        {/* Main content area */}
        <div className="flex-1 min-w-0">
          {/* Result count + sort bar */}
          {q.trim() && (
            <div className="flex items-center justify-between mb-6">
              <p className="text-gray-500 text-[15px] tracking-[0.3px]">
                {totalCount > 0
                  ? `${totalCount} result${totalCount !== 1 ? 's' : ''} for "${q}"`
                  : `No results for "${q}"`}
              </p>
              {products.length > 0 && (
                <SearchSort
                  currentSort={sp.sort}
                  activeFilters={activeFilterStrings}
                  q={q}
                />
              )}
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

          {/* Mobile filter drawer */}
          {q.trim() && productFilters.length > 0 && (
            <SearchFilterDrawer
              filters={productFilters}
              activeFilters={activeFilterStrings}
              currentSort={sp.sort}
              q={q}
            />
          )}

          {/* Results grid + load more — keyed so client state resets on filter/sort change */}
          {q.trim() && (
            <SearchResultsSection
              key={`${q}|${sp.sort ?? ''}|${activeFilterStrings.join(',')}`}
              initialProducts={products}
              initialPageInfo={pageInfo}
              q={q}
              sortKey={sortKey}
              reverse={reverse}
              filters={parsedFilters}
              clearFiltersUrl={clearFiltersUrl}
              isFiltered={isFiltered}
            />
          )}

          {/* No query state */}
          {!q.trim() && (
            <div className="flex flex-col items-center justify-center py-20 gap-6">
              <p className="text-navy-900 text-[20px] font-semibold">
                What are you looking for?
              </p>
              <p className="text-gray-500 text-[15px]">Browse popular categories:</p>
              <div className="flex flex-wrap gap-3 justify-center">
                {SUGGESTED.map(({ label, href }) => (
                  <Link
                    key={label}
                    href={href}
                    className="border border-navy-900 text-navy-900 text-[14px] font-semibold px-5 h-[40px] flex items-center hover:bg-neutral-50 transition-colors"
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
