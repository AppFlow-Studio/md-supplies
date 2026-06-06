'use client'

import { useState, useMemo, useRef } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'

interface Brand {
  vendor: string
  count: number
  slug: string
}

interface Props {
  brands: Brand[]
}

const CATEGORIES = ['Surgical', 'Diagnostics', 'Imaging']

export function BrandDirectory({ brands }: Props) {
  const [query, setQuery] = useState('')
  const [activeLetter, setActiveLetter] = useState<string | null>(null)
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const filtered = useMemo(() => {
    if (!query.trim()) return brands
    const q = query.toLowerCase()
    return brands.filter((b) => b.vendor.toLowerCase().includes(q))
  }, [brands, query])

  const grouped = useMemo(() => {
    const map: Record<string, Brand[]> = {}
    for (const brand of filtered) {
      const letter = brand.vendor[0].toUpperCase()
      if (!map[letter]) map[letter] = []
      map[letter].push(brand)
    }
    return map
  }, [filtered])

  const availableLetters = Object.keys(grouped).sort()

  function scrollToLetter(letter: string) {
    setActiveLetter(letter)
    sectionRefs.current[letter]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="flex gap-8 lg:gap-14">

      {/* ── Left Sidebar (desktop only) ── */}
      <aside className="hidden lg:flex flex-col w-[220px] shrink-0 sticky top-[120px] self-start">
        <h2 className="text-navy-900 text-[20px] font-semibold tracking-[0.4px]">Brand Directory</h2>
        <p className="text-gray-500 text-[15px] tracking-[0.3px] mb-6">Clinical Manufacturers</p>

        {/* Only available letters, compact grid */}
        {availableLetters.length > 0 && (
          <div className="grid grid-cols-4 gap-1 mb-6">
            {availableLetters.map((letter) => (
              <button
                key={letter}
                onClick={() => scrollToLetter(letter)}
                className={`text-[14px] h-[32px] flex items-center justify-center font-medium tracking-[0.28px] transition-colors ${
                  activeLetter === letter
                    ? 'bg-navy-900 text-white'
                    : 'text-navy-900 hover:text-teal-500'
                }`}
              >
                {letter}
              </button>
            ))}
          </div>
        )}

        {/* Nav section */}
        <div className="flex flex-col">
          <div className="bg-navy-900 px-4 py-3">
            <span className="text-white text-[14px] font-medium">A-Z Directory</span>
          </div>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className="text-left px-4 py-3 text-gray-500 text-[14px] hover:text-navy-900 transition-colors border-b border-gray-100"
            >
              {cat}
            </button>
          ))}
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 min-w-0">

        {/* Mobile title (hidden on desktop where sidebar handles it) */}
        <div className="lg:hidden mb-5">
          <h2 className="text-navy-900 text-[20px] font-semibold tracking-[0.4px]">Brand Directory</h2>
          <p className="text-gray-500 text-[15px] tracking-[0.3px]">Clinical Manufacturers</p>
        </div>

        {/* Search bar */}
        <div className="border border-[rgba(102,102,100,0.2)] bg-white flex items-center gap-3 px-4 h-[55px] mb-4">
          <Search className="text-gray-500 shrink-0" size={15} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by brand name or manufacturer..."
            className="flex-1 bg-transparent text-[18px] text-gray-500 placeholder:text-[rgba(102,102,100,0.8)] outline-none leading-[30px] font-medium"
          />
        </div>

        {/* Mobile letter nav — horizontal scrollable row (hidden on desktop) */}
        {availableLetters.length > 0 && (
          <div className="lg:hidden flex gap-1 overflow-x-auto pb-1 mb-6 scrollbar-none">
            {availableLetters.map((letter) => (
              <button
                key={letter}
                onClick={() => scrollToLetter(letter)}
                className={`text-[14px] min-w-[32px] h-[32px] flex items-center justify-center font-medium tracking-[0.28px] transition-colors shrink-0 ${
                  activeLetter === letter
                    ? 'bg-navy-900 text-white'
                    : 'text-navy-900 hover:text-teal-500'
                }`}
              >
                {letter}
              </button>
            ))}
          </div>
        )}


        {/* Letter groups */}
        {availableLetters.length === 0 ? (
          <p className="text-gray-500 text-[15px] py-12">No brands match your search.</p>
        ) : (
          <div className="flex flex-col gap-12">
            {availableLetters.map((letter) => (
              <div
                key={letter}
                ref={(el) => { sectionRefs.current[letter] = el }}
              >
                {/* Large faint letter heading + divider */}
                <div className="mb-5">
                  <span className="text-[72px] font-bold text-gray-200 leading-none block">{letter}</span>
                  <div className="h-px bg-gray-200 mt-1" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {grouped[letter].map(({ vendor, slug }) => (
                    <div key={slug} className="bg-white flex flex-col p-6 gap-3">
                      <div className="flex gap-2 flex-wrap">
                        <span className="bg-[#c7effd] text-teal-500 text-[11px] tracking-[0.22px] px-3 py-1">
                          Medical
                        </span>
                      </div>
                      <span className="text-navy-900 text-[20px] font-semibold tracking-[0.4px] leading-[1.2]">
                        {vendor}
                      </span>
                      <p className="text-gray-500 text-[15px] leading-[22px] tracking-[0.3px] flex-1">
                        Clinical-grade medical supplies available at wholesale pricing.
                      </p>
                      <Link
                        href={`/brands/${slug}`}
                        className="text-teal-500 text-[13px] font-medium tracking-[0.26px] hover:underline mt-auto"
                      >
                        View Products →
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
