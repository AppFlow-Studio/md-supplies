import type { Metadata } from 'next'
import { buildMetadata } from '@/lib/seo'
import Link from 'next/link'
import { X } from 'lucide-react'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { SEARCH_PRODUCTS } from '@/lib/shopify/queries/search'
import { SearchFilters } from '@/components/search/SearchFilters'
import { SearchSort } from '@/components/search/SearchSort'
import { SearchFilterDrawer } from '@/components/search/SearchFilterDrawer'
import { SearchBarForm } from '@/components/search/SearchBarForm'
import { SearchResultsSection } from '@/components/search/SearchResultsSection'
import { CategoryPagination } from '@/components/category/CategoryPagination'
import type { CollectionProduct, CollectionFilter } from '@/lib/shopify/types'
import { notFound, redirect } from 'next/navigation'
import { getSearchFacets, isAllowedFilterInput } from '@/lib/filter-registry'
import { expandFilterInputs } from '@/lib/catalog/facet-canonicalization'
import { applyExactFacetCounts } from '@/lib/catalog/exact-facet-counts'
import { getVisibleFilters } from '@/lib/shopify/filters'
import { SEARCH_PAGE_SIZE, MAX_SEARCH_PAGE } from '@/lib/category-utils'
import { attachCardShippingDisplay } from '@/lib/shipping-resolver/attach'
import { getReviewSummariesByGid } from '@/lib/trustshop/collection-summaries'
import type { ProductReviewSummary } from '@/lib/trustshop/types'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{
    q?: string
    sort?: string
    page?: string
    filter?: string | string[]
  }>
}

interface SearchData {
  search: {
    totalCount: number
    productFilters: CollectionFilter[]
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

// Same expansion as the category rail: getSearchFacets merges duplicate
// spellings of one concept into a single canonical option, so the query has to
// ask for every raw value that option stands for.
function parseFilters(filterStrings: string[]): Record<string, unknown>[] {
  return expandFilterInputs(filterStrings)
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

  const currentPage = parseInt(sp.page ?? '1', 10)
  if (isNaN(currentPage) || currentPage < 1) notFound()

  // Target for the deep-page/error redirect below: same q/sort/filter, no
  // `page` — i.e. exactly what a fresh page-1 visit would build.
  const page1Url = (() => {
    const p = new URLSearchParams()
    if (q) p.set('q', q)
    if (sp.sort) p.set('sort', sp.sort)
    activeFilterStrings.forEach((f) => p.append('filter', f))
    const qs = p.toString()
    return qs ? `/search?${qs}` : '/search'
  })()

  // Beyond MAX_SEARCH_PAGE the deterministic per-page fetch below would need
  // a Storefront `first` larger than the API allows — bounce to page 1
  // instead of erroring, mirroring category pagination's own depth cap
  // (lib/category-utils.ts MAX_CATEGORY_PAGE).
  if (currentPage > MAX_SEARCH_PAGE) redirect(page1Url)

  let products: CollectionProduct[] = []
  let totalCount = 0
  let productFilters: CollectionFilter[] = []
  let hasNext = false
  let reviewSummaries: Map<string, ProductReviewSummary | null> = new Map()

  if (q.trim()) {
    try {
      // Deterministic page-N fetch (DEV-LAUNCH-06): always from the start, no
      // cursor chain — same model as CategoryResults. `first` overfetches by
      // one page so a real "Next" anchor can be told apart from a page-1
      // duplicate without a second round-trip.
      const data = await storefrontFetch<SearchData>(SEARCH_PRODUCTS, {
        query: q,
        first: currentPage * SEARCH_PAGE_SIZE + 1,
        after: null,
        sortKey,
        reverse,
        filters: parsedFilters,
      })
      const allNodes = data.search.nodes
      const startIndex = (currentPage - 1) * SEARCH_PAGE_SIZE
      // DEV-SHIP-03: search results previously carried no shippingDisplay at
      // all, so a genuinely free-shipping-eligible product never showed the
      // claim on /search. Same attachment every other card grid gets.
      products = attachCardShippingDisplay(allNodes.slice(startIndex, startIndex + SEARCH_PAGE_SIZE))
      hasNext = allNodes.length > currentPage * SEARCH_PAGE_SIZE
      totalCount = data.search.totalCount
      // Summary-only, bounded-concurrency batch (N+1 guard) — same helper
      // CategoryResults.tsx uses, so /search cards agree with /category cards.
      reviewSummaries = await getReviewSummariesByGid(products)
      // Registry gate: only sources approved anywhere in the search
      // allowlist may reach the filter rail (NF3) — the Storefront
      // `productFilters` response is untrusted input.
      // Same two-step the category rail uses. `Query.search` facet counts are
      // window-derived approximations, and /search is search-sourced by
      // definition: measured live on 2026-08-26 for q="shower commode",
      // Shopify reported "Bariatric Commode Chairs 3" for a value matching 8
      // and "Bariatric Shower Chairs 1" for one matching 3 — 4 of the first 10
      // Category values were wrong. Corrected here so the number beside a
      // value is the number clicking it returns, then zero-count values (which
      // only become visible once the counts are right) are dropped unless
      // they are currently selected.
      const gated = getSearchFacets(data.search.productFilters ?? [])
      const counted = await applyExactFacetCounts(q, gated, activeFilterStrings, ['shopify', 'products'])
      productFilters = getVisibleFilters(counted, activeFilterStrings)
    } catch {
      // A Storefront error on a deep page isn't a genuinely empty result —
      // bounce to page 1 (q/sort/filter intact) instead of rendering a false
      // "No results". Page-1 failures keep the original behavior (empty
      // state) since there's no lower fallback.
      if (currentPage > 1) {
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

  // Carried onto every pagination link (CategoryPagination sets/removes only
  // `page` on top of this) — mirrors CategoryResults' own persistParams.
  const persistParams = new URLSearchParams()
  if (q) persistParams.set('q', q)
  if (sp.sort) persistParams.set('sort', sp.sort)
  activeFilterStrings.forEach((f) => persistParams.append('filter', f))

  const filterLabelMap = new Map(
    productFilters.flatMap((g) => g.values.map((v) => [v.input, v.label] as const))
  )

  return (
    <main id="main-content" className="bg-[#f9fafc] min-h-screen">
      {/* Search bar — keyed so controlled input resets on each new query.
          A single static h1 covers both states below: the result count/query
          text changes on every search and (unlike a category or product page)
          this route is noindex, so there's no SEO case for folding the query
          into the heading — a stable, predictable landmark serves screen-
          reader users navigating by heading better than one whose text
          changes underneath them. */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-8">
          <h1 className="text-navy-900 text-[20px] font-semibold mb-4">Search</h1>
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

          {/* Results grid */}
          {q.trim() && (
            <SearchResultsSection
              products={products}
              q={q}
              clearFiltersUrl={clearFiltersUrl}
              isFiltered={isFiltered}
              reviewSummaries={reviewSummaries}
            />
          )}

          {/* Pagination — deterministic page-N, same component and URL model
              as category/OCC/industry pages (DEV-LAUNCH-06). */}
          {q.trim() && products.length > 0 && (
            <CategoryPagination
              currentPage={currentPage}
              hasNext={hasNext}
              baseUrl="/search"
              persistParams={persistParams}
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
