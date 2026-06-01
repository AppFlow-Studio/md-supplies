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

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

export function BrandDirectory({ brands }: Props) {
  const [query, setQuery] = useState('')
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
    sectionRefs.current[letter]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="flex gap-0">
      {/* ── A-Z Sidebar ── */}
      <aside className="hidden lg:flex flex-col w-[60px] shrink-0 sticky top-[120px] self-start pt-2">
        <div className="flex flex-col gap-0.5">
          {LETTERS.map((letter) => {
            const active = availableLetters.includes(letter)
            return (
              <button
                key={letter}
                onClick={() => active && scrollToLetter(letter)}
                disabled={!active}
                className={`text-[14px] h-[27px] flex items-center justify-center font-normal tracking-[0.28px] transition-colors ${
                  active
                    ? 'text-navy-900 hover:text-teal-500 cursor-pointer'
                    : 'text-gray-200 cursor-default'
                }`}
              >
                {letter}
              </button>
            )
          })}
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 min-w-0">
        {/* Search bar */}
        <div className="border border-[rgba(102,102,100,0.2)] bg-neutral-100 flex items-center gap-3 px-4 h-[55px] mb-8">
          <Search className="text-gray-500 shrink-0" size={15} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by brand name or manufacturer..."
            className="flex-1 bg-transparent text-[18px] text-gray-500 placeholder:text-[rgba(102,102,100,0.8)] outline-none leading-[30px] font-medium"
          />
        </div>

        {/* Letter groups */}
        {availableLetters.length === 0 ? (
          <p className="text-gray-500 text-[15px] py-12">No brands match your search.</p>
        ) : (
          <div className="flex flex-col gap-10">
            {availableLetters.map((letter) => (
              <div
                key={letter}
                ref={(el) => { sectionRefs.current[letter] = el }}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-navy-900 w-[28px] h-[28px] flex items-center justify-center shrink-0">
                    <span className="text-white text-[14px] font-normal">{letter}</span>
                  </div>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {grouped[letter].map(({ vendor, count, slug }) => (
                    <div key={slug} className="bg-white flex flex-col p-6 gap-3">
                      <div className="flex gap-2 flex-wrap">
                        <span className="bg-[#c7effd] text-teal-500 text-[11px] tracking-[0.22px] px-3 py-1">
                          Medical
                        </span>
                        <span className="text-gray-500 text-[13px] ml-auto">
                          {count} product{count !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <span className="text-navy-900 text-[20px] font-semibold tracking-[0.4px] leading-[1.2]">
                        {vendor}
                      </span>
                      <p className="text-gray-500 text-[15px] leading-[22px] tracking-[0.3px]">
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
