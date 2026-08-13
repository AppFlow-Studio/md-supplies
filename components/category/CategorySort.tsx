'use client'

import { useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useCatalogTransition } from '@/components/category/CatalogTransition'
import { ChevronDown } from 'lucide-react'
import { withTrackingParams } from '@/lib/analytics/tracking-params'

const SORT_OPTIONS = [
  { value: 'COLLECTION_DEFAULT', label: 'Featured' },
  { value: 'BEST_SELLING', label: 'Best Selling' },
  { value: 'PRICE_ASC', label: 'Price: Low to High' },
  { value: 'PRICE_DESC', label: 'Price: High to Low' },
  { value: 'CREATED', label: 'Newest' },
]

interface Props {
  currentSort?: string
  activeFilters: string[]
  q?: string
  // Tag-sourced (L2) pages run on Shopify's search() field, whose
  // SearchSortKeys only supports RELEVANCE/PRICE — BEST_SELLING and CREATED
  // silently degrade to Featured-identical results (see
  // mapSortKeyForSearchQuery in lib/category-results-source.ts). When true,
  // hide those two options so the dropdown never offers a sort that can't
  // actually take effect.
  limitedSortOptions?: boolean
}

export function CategorySort({ currentSort, activeFilters, q, limitedSortOptions }: Props) {
  const { navigate } = useCatalogTransition()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)

  const options = limitedSortOptions
    ? SORT_OPTIONS.filter((o) => o.value !== 'BEST_SELLING' && o.value !== 'CREATED')
    : SORT_OPTIONS

  const selected = options.find((o) => o.value === currentSort) ?? options[0]

  const handleSelect = (value: string) => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (value !== 'COLLECTION_DEFAULT') params.set('sort', value)
    activeFilters.forEach((f) => params.append('filter', f))
    withTrackingParams(params, searchParams)
    const qs = params.toString()
    navigate(qs ? `${pathname}?${qs}` : pathname)
    setOpen(false)
  }

  return (
    <div className="relative">
      {/* Phase 8: on mobile this is a full-width 48px control sitting beside
          Filters; on desktop it stays a compact inline control aligned right. */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="w-full sm:w-auto flex items-center justify-center sm:justify-start gap-2 h-[48px] sm:h-auto px-4 sm:px-0 border sm:border-0 border-navy-900 bg-white sm:bg-transparent"
      >
        <span className="text-gray-500 text-[14px] sm:text-[13px] tracking-[0.26px]">Sort:</span>
        <span className="text-navy-900 text-[16px] sm:text-[15px] font-semibold tracking-[0.3px]">
          {selected.label}
        </span>
        <ChevronDown
          size={15}
          aria-hidden
          className={`text-navy-900 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-20 bg-white border border-gray-200 shadow-md w-[220px]">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt.value)}
                className={`w-full text-left px-4 py-3 text-[14px] hover:bg-neutral-50 transition-colors ${
                  opt.value === selected.value
                    ? 'text-navy-900 font-semibold'
                    : 'text-gray-500'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
