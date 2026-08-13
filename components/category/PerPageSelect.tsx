'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useId } from 'react'
import { useCatalogTransition } from '@/components/category/CatalogTransition'
import { withTrackingParams } from '@/lib/analytics/tracking-params'
import { PAGE_SIZE_OPTIONS, DEFAULT_PAGE_SIZE, type PageSize } from '@/lib/catalog/page-size'

/**
 * "Show [20] per page".
 *
 * State lives in the URL (`?per_page=`) like sort, filter and page, so the
 * choice survives refresh, sharing and Back/Forward. Changing it resets to page
 * 1 — page 4 at 10 per page is not page 4 at 100 per page, and silently keeping
 * the number would land the shopper somewhere they did not ask for. Every other
 * piece of state (filters, sort, search, tracking params) is preserved.
 *
 * The default is omitted from the URL so the canonical, unfiltered category
 * page keeps a clean address and does not mint a second URL for the same view.
 */
interface Props {
  value: PageSize
  currentSort?: string
  activeFilters: string[]
  q?: string
}

export function PerPageSelect({ value, currentSort, activeFilters, q }: Props) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { navigate } = useCatalogTransition()
  const id = useId()

  const buildUrl = (next: number) => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (currentSort) params.set('sort', currentSort)
    activeFilters.forEach((f) => params.append('filter', f))
    if (next !== DEFAULT_PAGE_SIZE) params.set('per_page', String(next))
    // `page` is deliberately NOT carried over.
    withTrackingParams(params, searchParams)
    const qs = params.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      <label htmlFor={id} className="text-gray-600 text-[14px] whitespace-nowrap">
        Show
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => navigate(buildUrl(Number(e.target.value)))}
        className="min-h-[44px] border border-gray-200 bg-white px-3 text-[15px] text-navy-900 focus:outline-none focus:border-navy-900"
      >
        {PAGE_SIZE_OPTIONS.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
      <span className="text-gray-600 text-[14px] whitespace-nowrap">per page</span>
    </div>
  )
}
