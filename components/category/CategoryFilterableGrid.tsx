'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import type { CollectionProduct, CollectionFilter } from '@/lib/shopify/types'
import type { ProductReviewSummary } from '@/lib/trustshop/types'
import { parseSortKey, parseFilterParam, parseSearchParam } from '@/lib/catalog/category-params'
import { parsePageSize } from '@/lib/catalog/page-size'
import { CategoryResultsView } from '@/components/category/CategoryResultsView'
import { CategoryResultsSkeleton } from '@/components/category/CategoryResultsSkeleton'

// Client filter island for the STATIC category / subcategory routes.
//
// The bare URL prerenders a fully-static default grid (`defaultGrid`, rendered
// server-side and passed in). This island reads useSearchParams(): with NO
// filter/sort/search/pagination params present it renders that default grid
// verbatim and NEVER fetches — which is the bare-URL crawler path, zero
// function invocations. Only when a param appears does it call the cached
// /api/catalog route and swap in the filtered view.
//
// Hydration contract (same rule as components/product/useSelectedVariant.ts):
// server and client FIRST render must match. The bare URL's first client render
// is `defaultGrid` (the early return); a `?filter=`-carrying deep link ALSO
// first renders `defaultGrid` (this component is the Suspense child whose
// fallback IS defaultGrid — see CategoryPageView), and only AFTER the mount
// effect fires does it fetch and swap. A brief default→filtered flash on
// deep-links is accepted (the PDP variant precedent).

// The response shape from app/api/catalog/route.ts.
interface CatalogApiResponse {
  products: CollectionProduct[]
  filters: CollectionFilter[]
  categoryFacet: CollectionFilter | null
  filterLabelMap: [string, string][]
  reviewSummaries: [string, ProductReviewSummary | null][]
  total: number
  renderedCount: number
  hasNext: boolean
  title: string
  handle: string
  searchQuery: string | null
}

interface Props {
  slug: string
  /** L2 subcategory tag, when this grid is a subcategory branch. */
  sub?: string
  baseUrl: string
  searchScopeTitle: string
  tabsAllLabel?: string
  tabsLeadingLinks?: { label: string; href: string }[]
  /** OR'd with Boolean(q) client-side to pick the limited sort-option set. */
  sourceKindIsTag: boolean
  facetKey: string
  /** The server-rendered static default grid — Suspense fallback AND bare-URL view. */
  defaultGrid: ReactNode
}

// Only these params make the view "filtered" — a bare tracking param (utm_*,
// gclid) on the URL must NOT trigger a fetch (a crawler following an ad link is
// still the default view). Mirrors the server's isFiltered determination.
function hasCatalogParams(sp: URLSearchParams): boolean {
  return (
    sp.has('filter') ||
    sp.has('sort') ||
    sp.has('q') ||
    sp.has('page') ||
    sp.has('per_page')
  )
}

export function CategoryFilterableGrid({
  slug,
  sub,
  baseUrl,
  searchScopeTitle,
  tabsAllLabel,
  tabsLeadingLinks,
  sourceKindIsTag,
  facetKey,
  defaultGrid,
}: Props) {
  const searchParams = useSearchParams()
  const spString = searchParams.toString()
  const isFilteredView = hasCatalogParams(searchParams)

  const [data, setData] = useState<CatalogApiResponse | null>(null)
  const [loading, setLoading] = useState(false)
  // The last successfully-rendered API data — kept on screen (dimmed) while the
  // next fetch is in flight, so switching filters never blanks the grid.
  const lastDataRef = useRef<CatalogApiResponse | null>(null)
  // Gates the loading skeleton so it only shows AFTER hydration: a filtered deep
  // link's FIRST render must be `defaultGrid` (matching SSR) to avoid a hydration
  // mismatch; a filter pressed in-page (already mounted) shows the skeleton
  // instantly.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    // Bare URL (or tracking-params-only): show the static default, never fetch.
    if (!isFilteredView) {
      setData(null)
      lastDataRef.current = null
      return
    }

    const controller = new AbortController()
    setLoading(true)

    // Forward exactly the catalog params the server understands, plus the
    // server-derived slug/sub (the source is re-derived server-side; the client
    // never sends kind/facetKey/tag-query).
    const query = new URLSearchParams()
    query.set('slug', slug)
    if (sub) query.set('sub', sub)
    searchParams.getAll('filter').forEach((f) => query.append('filter', f))
    const sort = searchParams.get('sort')
    if (sort) query.set('sort', sort)
    const q = searchParams.get('q')
    if (q) query.set('q', q)
    const page = searchParams.get('page')
    if (page) query.set('page', page)
    const perPage = searchParams.get('per_page')
    if (perPage) query.set('per_page', perPage)

    fetch(`/api/catalog?${query.toString()}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          // out_of_range (400) / not_found (404) / fetch_failed (502): fall back
          // to the default grid rather than an empty/broken state. A deep page
          // that fell off the end resolves to the default (page-1) view, which
          // is the closest safe thing the static shell can show without a nav.
          throw new Error(`catalog ${res.status}`)
        }
        return (await res.json()) as CatalogApiResponse
      })
      .then((json) => {
        lastDataRef.current = json
        setData(json)
        setLoading(false)
      })
      .catch(() => {
        if (controller.signal.aborted) return // superseded by a newer fetch
        // Error / out-of-range with no prior data → the render falls back to
        // the default grid (see `!view` below). Just stop the dim.
        setLoading(false)
      })

    // Cancel a stale fetch when the params change again mid-flight, so an older
    // slower response can never overwrite a newer one (AbortController keyed on
    // the param string via this effect's dependency).
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spString, isFilteredView, slug, sub])

  // Bare URL: the static default grid, unchanged (matches SSR — no hydration
  // mismatch, no fetch).
  if (!isFilteredView) {
    return <>{defaultGrid}</>
  }

  // A filtered view whose fetch errored (and no prior data to keep showing):
  // fall back to the default grid so the shopper still sees products.
  const view = data ?? lastDataRef.current
  if (!view) {
    // First filtered load with no prior results. Once hydrated, show a
    // layout-stable skeleton for INSTANT feedback the moment a filter is pressed,
    // instead of flashing the unfiltered default grid (which read as "the page
    // refreshed but nothing got filtered"). Before hydration — a filtered deep
    // link's first render — we must still emit `defaultGrid` to match SSR.
    // (A filter -> filter change keeps the PREVIOUS results dimmed via the branch
    // below, so only the default -> first-filter case hits this skeleton.)
    return mounted ? <CategoryResultsSkeleton /> : <>{defaultGrid}</>
  }

  // Rebuild the display state the same way the server did, from the URL — so the
  // chips/links the view emits are byte-identical to a server render of this URL.
  const activeFilterStrings = parseFilterParam(searchParams.getAll('filter'))
  const { sortKey, reverse } = parseSortKey(searchParams.get('sort') ?? undefined)
  const sortParam = searchParams.get('sort') ?? undefined
  const searchQuery = parseSearchParam(searchParams.get('q') ?? undefined)
  const pageSize = parsePageSize(searchParams.get('per_page') ?? undefined)
  const requestedPage = parseInt(searchParams.get('page') ?? '1', 10)
  const currentPage = isNaN(requestedPage) || requestedPage < 1 ? 1 : requestedPage
  const isFiltered =
    activeFilterStrings.length > 0 || Boolean(sortParam) || Boolean(searchQuery)

  return (
    <CategoryResultsView
      products={view.products}
      filters={view.filters}
      categoryFacet={view.categoryFacet ?? undefined}
      filterLabelMap={new Map(view.filterLabelMap)}
      reviewSummaries={new Map(view.reviewSummaries)}
      total={view.total}
      hasNext={view.hasNext}
      renderedCount={view.renderedCount}
      title={view.title}
      handle={view.handle}
      searchQuery={view.searchQuery ?? undefined}
      baseUrl={baseUrl}
      facetKey={facetKey}
      sortKey={sortKey}
      reverse={reverse}
      sortParam={sortParam}
      activeFilterStrings={activeFilterStrings}
      currentPage={currentPage}
      pageSize={pageSize}
      // useSearchParams() gives us the live URL params, the same shape a server
      // component's `await searchParams` would — tracking params ride along so
      // rebuilt links keep attribution.
      trackingParamsSource={searchParams}
      searchScopeTitle={searchScopeTitle}
      tabsAllLabel={tabsAllLabel}
      tabsLeadingLinks={tabsLeadingLinks}
      sourceKindIsTag={sourceKindIsTag}
      isFiltered={isFiltered}
      // Dim the current grid while the next filter result is in flight (no
      // blank flash), the same affordance a same-page navigation gets.
      externalPending={loading}
    />
  )
}
