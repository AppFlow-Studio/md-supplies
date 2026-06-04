'use client'

import { useState } from 'react'
import { X, SlidersHorizontal } from 'lucide-react'
import type { CollectionFilter } from '@/lib/shopify/types'
import { CategoryFilters } from '@/components/category/CategoryFilters'

interface Props {
  filters: CollectionFilter[]
  activeFilters: string[]
  currentSort?: string
}

export function FilterDrawer({ filters, activeFilters, currentSort }: Props) {
  const [open, setOpen] = useState(false)
  const count = activeFilters.length

  return (
    <>
      {/* Trigger — mobile only */}
      <div className="lg:hidden mb-4">
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 border border-navy-900 text-navy-900 text-[14px] font-semibold px-4 h-[40px] hover:bg-neutral-50 transition-colors"
        >
          <SlidersHorizontal size={15} />
          {count > 0 ? `Filters (${count})` : 'Filters'}
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          {/* Drawer panel */}
          <div className="absolute inset-y-0 left-0 w-full max-w-[320px] bg-white flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <span className="text-navy-900 text-[16px] font-semibold">
                Filters
              </span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close filters"
              >
                <X size={20} className="text-navy-900" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-6">
              <CategoryFilters
                filters={filters}
                activeFilters={activeFilters}
                currentSort={currentSort}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
