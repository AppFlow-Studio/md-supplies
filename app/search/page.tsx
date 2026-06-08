import type { Metadata } from 'next'
import { buildMetadata } from '@/lib/seo'
import Link from 'next/link'
import { Search, X, ChevronRight } from 'lucide-react'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { SEARCH_PRODUCTS } from '@/lib/shopify/queries/search'
import { ProductGrid } from '@/components/category/ProductGrid'
import { SearchFilters } from '@/components/search/SearchFilters'
import { SearchSort } from '@/components/search/SearchSort'
import { SearchFilterDrawer } from '@/components/search/SearchFilterDrawer'
import type { CollectionProduct, CollectionFilter, PageInfo } from '@/lib/shopify/types'

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
  return Array.isArray(filter) ? filter : [filter]
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
  const { sortKey, reverse } = parseSortKey(sp.sort)
  const isFiltered = activeFilterStrings.length > 0 || Boolean(sp.sort)

  let products: CollectionProduct[] = []
  let totalCount = 0
  let productFilters: CollectionFilter[] = []
  let pageInfo: PageInfo = { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null }

  if (q.trim()) {
    try {
      const data = await storefrontFetch<SearchData>(SEARCH_PRODUCTS, {
        query: q,
        first: 12,
        after: sp.after ?? null,
        sortKey,
        reverse,
        filters: parseFilters(activeFilterStrings),
      })
      products = data.search.nodes
      totalCount = data.search.totalCount
      productFilters = data.search.productFilters ?? []
      pageInfo = data.search.pageInfo
    } catch {
      // network error — show empty state
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

  const loadMoreUrl = (() => {
    const p = new URLSearchParams()
    if (q) p.set('q', q)
    if (sp.sort) p.set('sort', sp.sort)
    activeFilterStrings.forEach((f) => p.append('filter', f))
    if (pageInfo.endCursor) p.set('after', pageInfo.endCursor)
    return `/search?${p.toString()}`
  })()

  const clearFiltersUrl = (() => {
    const p = new URLSearchParams()
    if (q) p.set('q', q)
    return `/search?${p.toString()}`
  })()

  return (
    <main className="bg-[#f9fafc] min-h-screen">
      {/* Search bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-8">
          <form method="GET" action="/search">
            <div className="flex gap-3 max-w-[600px]">
              <div className="flex-1 flex items-center border border-gray-200 focus-within:border-navy-900 transition-colors px-4 gap-3 bg-white">
                <Search size={18} className="text-gray-500 shrink-0" />
                <input
                  type="search"
                  name="q"
                  defaultValue={q}
                  placeholder="Search medical supplies…"
                  className="flex-1 h-[48px] text-[15px] text-navy-900 placeholder:text-gray-500 outline-none bg-transparent"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="bg-navy-900 text-white h-[48px] px-6 text-[14px] font-semibold tracking-[0.28px] uppercase hover:bg-navy-950 transition-colors shrink-0"
              >
                Search
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-6 flex gap-0 items-start">
        {/* Desktop filter sidebar — only when we have a query + filters */}
        {q.trim() && productFilters.length > 0 && (
          <aside className="hidden lg:block w-[280px] shrink-0 pr-10 sticky top-[140px]">
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
                let label = f
                try {
                  const parsed = JSON.parse(f)
                  if (parsed?.price) {
                    const { min, max } = parsed.price
                    label = max >= 200000
                      ? `Price: $${Number(min).toLocaleString()}+`
                      : `Price: $${Number(min).toLocaleString()} – $${Number(max).toLocaleString()}`
                  } else {
                    label = String(Object.values(parsed).join(', '))
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

          {/* Results grid */}
          {q.trim() && products.length > 0 && (
            <ProductGrid
              products={products}
              emptyStateHref={clearFiltersUrl}
              emptyStateMessage={`No results for "${q}"`}
            />
          )}

          {/* Load more — when filtered/sorted */}
          {isFiltered && pageInfo.hasNextPage && (
            <div className="flex items-center justify-center pt-12">
              <Link
                href={loadMoreUrl}
                className="flex items-center gap-2 border border-navy-900 text-navy-900 text-[14px] font-semibold px-5 h-[44px] hover:bg-neutral-50 transition-colors"
              >
                Load More
                <ChevronRight size={16} />
              </Link>
            </div>
          )}

          {/* Empty state — query but no results */}
          {q.trim() && products.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-6">
              <Search size={48} className="text-gray-300" />
              <div className="text-center">
                <p className="text-navy-900 text-[20px] font-semibold mb-2">
                  No results for &ldquo;{q}&rdquo;
                </p>
                <p className="text-gray-500 text-[15px]">
                  {isFiltered
                    ? 'Try removing some filters or adjusting your search.'
                    : 'Try a different search term or browse our categories below.'}
                </p>
              </div>
              {isFiltered ? (
                <Link
                  href={clearFiltersUrl}
                  className="border border-navy-900 text-navy-900 text-[14px] font-semibold px-5 h-[40px] flex items-center hover:bg-neutral-50 transition-colors"
                >
                  Clear filters
                </Link>
              ) : (
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
              )}
            </div>
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
