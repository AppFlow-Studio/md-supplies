'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown } from 'lucide-react'

const SORT_OPTIONS = [
  { value: 'RELEVANCE', label: 'Relevance' },
  { value: 'PRICE_ASC', label: 'Price: Low to High' },
  { value: 'PRICE_DESC', label: 'Price: High to Low' },
]

interface Props {
  currentSort?: string
  activeFilters: string[]
  q: string
}

export function SearchSort({ currentSort, activeFilters, q }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const selected = SORT_OPTIONS.find((o) => o.value === currentSort) ?? SORT_OPTIONS[0]

  const handleSelect = (value: string) => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (value !== 'RELEVANCE') params.set('sort', value)
    activeFilters.forEach((f) => params.append('filter', f))
    const qs = params.toString()
    router.push(qs ? `/search?${qs}` : '/search')
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2"
      >
        <span className="text-gray-500 text-[13px] tracking-[0.26px]">SORT BY:</span>
        <span className="text-navy-900 text-[15px] font-semibold tracking-[0.3px]">{selected.label}</span>
        <ChevronDown size={13} className={`text-navy-900 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-20 bg-white border border-gray-200 shadow-md w-[220px]">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt.value)}
                className={`w-full text-left px-4 py-3 text-[14px] hover:bg-neutral-50 transition-colors ${
                  opt.value === selected.value ? 'text-navy-900 font-semibold' : 'text-gray-500'
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
