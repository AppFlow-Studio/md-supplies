'use client'

import { useState } from 'react'
import type { Partner } from '@/types/partner'
import { PartnerCard } from './PartnerCard'

type Filter = 'all' | 'brand' | 'vendor'

interface Props {
  partners: Partner[]
}

export function PartnerDirectory({ partners }: Props) {
  const [filter, setFilter] = useState<Filter>('all')

  const visible = filter === 'all' ? partners : partners.filter((p) => p.type === filter)

  return (
    <div>
      <div className="flex gap-2 mb-8" role="group" aria-label="Filter partners by type">
        {(['all', 'brand', 'vendor'] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              filter === f
                ? 'bg-navy-900 text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {f === 'all' ? 'All Partners' : f === 'brand' ? 'Brands' : 'Vendors'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {visible.map((partner) => (
          <PartnerCard key={partner.slug} partner={partner} />
        ))}
      </div>

      {visible.length === 0 && (
        <p className="text-gray-500 text-sm py-12 text-center">No partners found.</p>
      )}
    </div>
  )
}
