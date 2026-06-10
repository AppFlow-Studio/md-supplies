'use client'

import { useRouter } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import type { CollectionFilter } from '@/lib/shopify/types'

interface Props {
  filters: CollectionFilter[]
  activeFilters: string[]
  currentSort?: string
  q: string
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
        <ChevronDown size={16} className={`text-navy-900 transition-transform ${open ? 'rotate-180' : ''}`} />
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
              <span className="flex-1 text-navy-900 text-[15px] tracking-[0.3px]">{value.label}</span>
              <span className="text-gray-500 text-[15px] tracking-[0.3px]">{value.count}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

const MAX_PRICE = 200000

function parsePriceMax(activeFilters: string[]): number {
  for (const f of activeFilters) {
    try {
      const parsed = JSON.parse(f)
      if (parsed?.price?.max !== undefined) return Number(parsed.price.max)
    } catch { /* ignore */ }
  }
  return MAX_PRICE
}

function PriceRangeFilter({
  activeFilters,
  onSetPrice,
}: {
  activeFilters: string[]
  onSetPrice: (input: string) => void
}) {
  const [open, setOpen] = useState(true)
  const [value, setValue] = useState(() => parsePriceMax(activeFilters))

  const pct = Math.round((value / MAX_PRICE) * 100)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setValue(Number(e.target.value))

  const handleCommit = () => {
    onSetPrice(value >= MAX_PRICE ? '' : JSON.stringify({ price: { min: 0, max: value } }))
  }

  const displayMax =
    value >= MAX_PRICE
      ? '$200,000 +'
      : `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <div className="mb-7">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between mb-3"
      >
        <p className="text-navy-900 text-[18px] font-semibold tracking-[0.36px] uppercase">Price Range</p>
        <ChevronDown size={16} className={`text-navy-900 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className="h-px bg-gray-200 mb-5" />
      {open && (
        <div>
          <input
            type="range" min={0} max={MAX_PRICE} step={500} value={value}
            onChange={handleChange} onMouseUp={handleCommit} onTouchEnd={handleCommit}
            className="price-slider w-full"
            style={{ '--slider-pct': `${pct}%` } as React.CSSProperties}
            aria-label="Maximum price"
          />
          <div className="flex justify-between mt-3">
            <span className="text-navy-900 text-[13px] font-semibold tracking-[0.26px]">$0.00</span>
            <span className="text-navy-900 text-[13px] font-semibold tracking-[0.26px]">{displayMax}</span>
          </div>
        </div>
      )}
    </div>
  )
}

export function SearchFilters({ filters, activeFilters, currentSort, q }: Props) {
  const router = useRouter()

  const buildUrl = (nextFilters: string[]) => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (currentSort) params.set('sort', currentSort)
    nextFilters.forEach((f) => params.append('filter', f))
    const qs = params.toString()
    return qs ? `/search?${qs}` : '/search'
  }

  const toggleFilter = (input: string) => {
    const next = activeFilters.includes(input)
      ? activeFilters.filter((f) => f !== input)
      : [...activeFilters, input]
    router.push(buildUrl(next))
  }

  const setPriceFilter = (input: string) => {
    const withoutPrice = activeFilters.filter((f) => {
      try { return JSON.parse(f)?.price === undefined } catch { return true }
    })
    const next = input ? [...withoutPrice, input] : withoutPrice
    router.push(buildUrl(next))
  }

  const clearAll = () => router.push(buildUrl([]))

  return (
    <div className="flex flex-col">
      {activeFilters.length > 0 && (
        <button
          type="button"
          onClick={clearAll}
          className="text-teal-500 text-[13px] font-medium tracking-[0.26px] self-start mb-5 hover:underline"
        >
          Clear all filters
        </button>
      )}
      {filters.map((f) => {
        if (f.type === 'PRICE_RANGE') {
          return <PriceRangeFilter key={f.id} activeFilters={activeFilters} onSetPrice={setPriceFilter} />
        }
        return <FilterGroup key={f.id} filter={f} activeFilters={activeFilters} onToggle={toggleFilter} />
      })}
    </div>
  )
}
