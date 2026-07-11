'use client'

import { useSearchParams } from 'next/navigation'
import type { CollectionFilter } from '@/lib/shopify/types'
import { withTrackingParams } from '@/lib/analytics/tracking-params'
import { FilterRail } from '@/components/filters/FilterRail'

// Thin wrapper: all filter UI/state lives in the shared FilterRail
// (NF5/NF6/NF17); this only knows how to build a /search URL.

interface Props {
  filters: CollectionFilter[]
  activeFilters: string[]
  currentSort?: string
  q: string
}

export function SearchFilters({ filters, activeFilters, currentSort, q }: Props) {
  const searchParams = useSearchParams()

  const buildUrl = (nextFilters: string[]) => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (currentSort) params.set('sort', currentSort)
    nextFilters.forEach((f) => params.append('filter', f))
    withTrackingParams(params, searchParams)
    const qs = params.toString()
    return qs ? `/search?${qs}` : '/search'
  }

  return <FilterRail filters={filters} activeFilters={activeFilters} buildUrl={buildUrl} />
}
