import { withTrackingParams, type TrackingParamSource } from '@/lib/analytics/tracking-params'
import { DEFAULT_PAGE_SIZE, type PageSize } from '@/lib/catalog/page-size'

// Catalog URL builders — the ONE source of truth for every filter/sort/search/
// pagination link a category grid emits. Extracted from CategoryResults so that
// BOTH the server default render (CategoryResults server head) and the client
// island (CategoryFilterableGrid) build identical URLs; keeping the logic in one
// pure module is what stops the two paths drifting (a chip built server-side and
// the same chip re-built client-side must point at the same address, or a
// hydration swap would silently change what "remove this filter" does).
//
// Faithful to the pre-refactor CategoryResults:88-192 behaviour: tracking params
// (utm_*, gclid, …) are re-appended on every rebuild via withTrackingParams so
// in-app navigation never drops attribution (lib/analytics/tracking-params.ts),
// and per_page is only serialized when it differs from the default.

export interface CategoryUrlState {
  baseUrl: string
  sortParam?: string
  activeFilterStrings: string[]
  /** Sanitized ?q= text (already trimmed/defaulted by the caller). */
  searchText?: string
  pageSize: PageSize
  /** Source of tracking params to preserve across the rebuilt URL. */
  trackingParamsSource: TrackingParamSource
}

function withQuery(baseUrl: string, p: URLSearchParams): string {
  const qs = p.toString()
  return qs ? `${baseUrl}?${qs}` : baseUrl
}

/**
 * The full "current view minus page number" query — sort + every active
 * filter + search + per_page + tracking. This is the base every pagination link
 * is built on (CategoryPagination appends `page`), and page 1 of the current
 * view when returned as a URL. Mirrors CategoryResults' former `persistParams`.
 */
export function buildPersistParams(state: CategoryUrlState): URLSearchParams {
  const p = new URLSearchParams()
  if (state.sortParam) p.set('sort', state.sortParam)
  state.activeFilterStrings.forEach((f) => p.append('filter', f))
  if (state.searchText) p.set('q', state.searchText)
  if (state.pageSize !== DEFAULT_PAGE_SIZE) p.set('per_page', String(state.pageSize))
  withTrackingParams(p, state.trackingParamsSource)
  return p
}

/** Page 1 of the current view (all state preserved). Former `page1Url`. */
export function buildPage1Url(state: CategoryUrlState): string {
  return withQuery(state.baseUrl, buildPersistParams(state))
}

/**
 * URL with a single filter removed (all other state preserved, page resets to
 * 1 by omission). Former `removeFilterUrl`.
 */
export function buildRemoveFilterUrl(state: CategoryUrlState, filterToRemove: string): string {
  const next = state.activeFilterStrings.filter((f) => f !== filterToRemove)
  const p = new URLSearchParams()
  if (state.sortParam) p.set('sort', state.sortParam)
  next.forEach((f) => p.append('filter', f))
  if (state.searchText) p.set('q', state.searchText)
  if (state.pageSize !== DEFAULT_PAGE_SIZE) p.set('per_page', String(state.pageSize))
  withTrackingParams(p, state.trackingParamsSource)
  return withQuery(state.baseUrl, p)
}

/**
 * Clearing the search keeps sort/filter/per_page state. Former `clearSearchUrl`.
 */
export function buildClearSearchUrl(state: CategoryUrlState): string {
  const p = new URLSearchParams()
  if (state.sortParam) p.set('sort', state.sortParam)
  state.activeFilterStrings.forEach((f) => p.append('filter', f))
  if (state.pageSize !== DEFAULT_PAGE_SIZE) p.set('per_page', String(state.pageSize))
  withTrackingParams(p, state.trackingParamsSource)
  return withQuery(state.baseUrl, p)
}

/**
 * Clearing every filter keeps sort, search and page size — only the facet
 * selections go, and pagination resets to page 1. Former `clearAllUrl`.
 */
export function buildClearAllUrl(state: CategoryUrlState): string {
  const p = new URLSearchParams()
  if (state.sortParam) p.set('sort', state.sortParam)
  if (state.searchText) p.set('q', state.searchText)
  if (state.pageSize !== DEFAULT_PAGE_SIZE) p.set('per_page', String(state.pageSize))
  withTrackingParams(p, state.trackingParamsSource)
  return withQuery(state.baseUrl, p)
}
