'use client'

import { useRouter, usePathname } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import type { CollectionFilter } from '@/lib/shopify/types'

interface Props {
  filters: CollectionFilter[]
  activeFilters: string[]   // JSON strings, e.g. ['{"available":true}', '{"productVendor":"Medline"}']
  currentSort?: string
}

function Checkbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onChange}
      className={`size-[16px] shrink-0 border flex items-center justify-center transition-colors ${
        checked ? 'bg-navy-900 border-navy-900' : 'bg-white border-[rgba(102,102,100,0.6)]'
      }`}
    >
      {checked && (
        <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
          <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  )
}

function FilterGroup({
  filter,
  activeFilters,
  onToggle,
}: {
  filter: CollectionFilter
  activeFilters: string[]
  onToggle: (input: string) => void
}) {
  const [open, setOpen] = useState(true)

  if (filter.type === 'PRICE_RANGE') return null // handled elsewhere if needed

  return (
    <div className="mb-7">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between mb-3"
      >
        <p className="text-navy-900 text-[18px] font-semibold tracking-[0.36px] uppercase">
          {filter.label}
        </p>
        <ChevronDown
          size={16}
          className={`text-navy-900 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div className="h-px bg-gray-200 mb-5" />
      {open && (
        <div className="flex flex-col gap-[18px]">
          {filter.values.map((value, idx) => (
            <label key={idx} className="flex items-center gap-[14px] cursor-pointer">
              <Checkbox
                checked={activeFilters.includes(value.input)}
                onChange={() => onToggle(value.input)}
              />
              <span className="flex-1 text-navy-900 text-[15px] tracking-[0.3px]">
                {value.label}
              </span>
              <span className="text-gray-500 text-[15px] tracking-[0.3px]">
                {value.count}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

export function CategoryFilters({ filters, activeFilters, currentSort }: Props) {
  const router = useRouter()
  const pathname = usePathname()

  const buildUrl = (nextFilters: string[]) => {
    const params = new URLSearchParams()
    if (currentSort) params.set('sort', currentSort)
    nextFilters.forEach((f) => params.append('filter', f))
    const qs = params.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }

  const toggleFilter = (input: string) => {
    const next = activeFilters.includes(input)
      ? activeFilters.filter((f) => f !== input)
      : [...activeFilters, input]
    router.push(buildUrl(next))
  }

  const clearAll = () => router.push(buildUrl([]))

  const hasActive = activeFilters.length > 0

  return (
    <div className="flex flex-col">
      {hasActive && (
        <button
          type="button"
          onClick={clearAll}
          className="text-teal-500 text-[13px] font-medium tracking-[0.26px] self-start mb-5 hover:underline"
        >
          Clear all filters
        </button>
      )}
      {filters.map((f) => (
        <FilterGroup
          key={f.id}
          filter={f}
          activeFilters={activeFilters}
          onToggle={toggleFilter}
        />
      ))}
    </div>
  )
}
