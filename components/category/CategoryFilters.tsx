'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import type { CollectionFilter } from '@/lib/shopify/types'
import { withTrackingParams } from '@/lib/analytics/tracking-params'
import { FilterRail } from '@/components/filters/FilterRail'

// Thin wrapper: all filter UI/state lives in the shared FilterRail
// (NF5/NF6/NF17); this only knows how to build a category URL.

interface Props {
  filters: CollectionFilter[]
  activeFilters: string[]
  currentSort?: string
}

export function CategoryFilters({ filters, activeFilters, currentSort }: Props) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const buildUrl = (nextFilters: string[]) => {
    const params = new URLSearchParams()
    if (currentSort) params.set('sort', currentSort)
    nextFilters.forEach((f) => params.append('filter', f))
    withTrackingParams(params, searchParams)
    const qs = params.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }

  return <FilterRail filters={filters} activeFilters={activeFilters} buildUrl={buildUrl} />
}
