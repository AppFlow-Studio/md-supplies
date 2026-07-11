'use client'

import {
  useState, useEffect, useRef, useCallback,
  type KeyboardEvent, type FormEvent,
} from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, ArrowRight, Tag } from 'lucide-react'
import type { PredictiveResults } from '@/app/api/search/predictive/route'
import { ProductImage } from '@/components/shared/ProductImage'

function sanitizeStyledText(raw: string): string {
  return raw
    .replace(/<(?!\/?(?:mark|span)\b)[^>]*>/gi, '')
    .replace(/<(mark|span)\s[^>]*>/gi, '<$1>')
}

interface Props {
  onClose: () => void
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

const EMPTY: PredictiveResults = { products: [], collections: [], queries: [] }

export function SearchDropdown({ onClose }: Props) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [query, setQuery] = useState('')
  // `fetched.for` records which query the data belongs to so loading and
  // results can be derived during render instead of reset via a synchronous
  // setState in the effect body (which trips react-hooks/set-state-in-effect
  // and causes cascading renders). The effect only ever calls setState from
  // its async fetch callbacks, which the rule allows.
  const [fetched, setFetched] = useState<{ for: string; data: PredictiveResults }>({ for: '', data: EMPTY })
  const [activeIdx, setActiveIdx] = useState(-1)

  const debouncedQuery = useDebounce(query, 280)

  const isActiveQuery = debouncedQuery.length >= 2
  // Keep showing the last fetched results while the new query loads.
  const results = isActiveQuery ? fetched.data : EMPTY
  const loading = isActiveQuery && fetched.for !== debouncedQuery

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 40)
  }, [])

  useEffect(() => {
    if (debouncedQuery.length < 2) return
    let cancelled = false
    fetch(`/api/search/predictive?q=${encodeURIComponent(debouncedQuery)}`)
      .then((r) => r.json())
      .then((data: PredictiveResults) => {
        if (!cancelled) {
          setFetched({ for: debouncedQuery, data })
          setActiveIdx(-1)
        }
      })
      .catch(() => { if (!cancelled) setFetched({ for: debouncedQuery, data: EMPTY }) })
    return () => { cancelled = true }
  }, [debouncedQuery])

  const hasResults =
    results.queries.length > 0 ||
    results.products.length > 0 ||
    results.collections.length > 0

  const flatItems = [
    ...results.queries.map((q) => ({ type: 'query' as const, href: `/search?q=${encodeURIComponent(q.text)}`, label: q.text })),
    ...results.products.map((p) => ({ type: 'product' as const, href: `/product/${p.handle}`, label: p.title })),
    ...results.collections.map((c) => ({ type: 'collection' as const, href: `/category/${c.handle}`, label: c.title })),
  ]

  const navigate = useCallback((href: string) => {
    router.push(href)
    onClose()
  }, [router, onClose])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    router.push(`/search?q=${encodeURIComponent(q)}`)
    onClose()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!hasResults) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, flatItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault()
      navigate(flatItems[activeIdx].href)
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  const showDropdown = query.length >= 2

  let flatIdx = 0

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-50" onClick={onClose} />

      {/* Panel */}
      <div className="absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-xl z-50">
        <div className="max-w-360 mx-auto px-4 md:px-8 py-4">

          {/* Input row */}
          <form onSubmit={handleSubmit} className="flex gap-0">
            <div className="flex-1 flex items-center border border-gray-200 px-4 gap-3 bg-white">
              <Search
                size={16}
                className={`shrink-0 ${loading ? 'text-teal-500 animate-pulse' : 'text-gray-400'}`}
              />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search products, categories…"
                autoComplete="off"
                className="flex-1 h-[44px] text-[15px] text-navy-900 placeholder:text-gray-400 outline-none bg-transparent"
              />
            </div>
            <button
              type="submit"
              className="bg-navy-900 text-white h-[44px] px-6 text-[13px] font-bold tracking-[0.5px] uppercase hover:bg-navy-950 transition-colors shrink-0 focus:outline-none"
            >
              Search
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-navy-900 transition-colors px-3 focus:outline-none"
              aria-label="Close search"
            >
              <X size={20} />
            </button>
          </form>

          {/* Results dropdown */}
          {showDropdown && (hasResults || loading) && (
            <div ref={dropdownRef} className="mt-2 bg-white border border-gray-100 shadow-md overflow-hidden">

              {/* Suggestions */}
              {results.queries.length > 0 && (
                <>
                  <div className="flex items-center gap-3 px-4 pt-3 pb-2">
                    <span className="text-[10px] font-bold tracking-[1px] uppercase text-gray-400">Suggestions</span>
                    <div className="flex-1 h-px bg-gray-100" />
                  </div>
                  {results.queries.map((q) => {
                    const idx = flatIdx++
                    const isActive = activeIdx === idx
                    return (
                      <button
                        key={q.text}
                        type="button"
                        onClick={() => navigate(`/search?q=${encodeURIComponent(q.text)}`)}
                        className={`w-full flex items-center gap-3 px-4 py-1.5 text-left transition-colors focus:outline-none ${isActive ? 'bg-neutral-50' : 'hover:bg-neutral-50'}`}
                      >
                        <Search size={12} className="text-gray-300 shrink-0" />
                        <span
                          className="text-[13px] text-navy-900 [&_mark]:bg-transparent [&_mark]:font-semibold [&_mark]:text-teal-500"
                          dangerouslySetInnerHTML={{ __html: sanitizeStyledText(q.styledText) }}
                        />
                      </button>
                    )
                  })}
                </>
              )}

              {/* Products */}
              {results.products.length > 0 && (
                <>
                  <div className="flex items-center gap-3 px-4 pt-3 pb-2">
                    <span className="text-[10px] font-bold tracking-[1px] uppercase text-gray-400">Products</span>
                    <div className="flex-1 h-px bg-gray-100" />
                  </div>
                  {results.products.map((p) => {
                    const idx = flatIdx++
                    const isActive = activeIdx === idx
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => navigate(`/product/${p.handle}`)}
                        className={`w-full flex items-center gap-3 px-4 py-1.5 text-left transition-colors focus:outline-none ${isActive ? 'bg-neutral-50' : 'hover:bg-neutral-50'}`}
                      >
                        <div className="relative w-8 h-8 shrink-0 border border-gray-100 bg-gray-50 flex items-center justify-center overflow-hidden">
                          {p.featuredImage ? (
                            <ProductImage
                              src={p.featuredImage.url}
                              alt={p.featuredImage.altText ?? p.title}
                              sizes="32px"
                              className="object-contain"
                            />
                          ) : (
                            <span className="text-[9px] font-bold text-gray-300 uppercase leading-none text-center px-0.5">
                              {p.title.slice(0, 3)}
                            </span>
                          )}
                        </div>
                        <span className="text-[13px] text-navy-900 line-clamp-1 flex-1">{p.title}</span>
                        <ArrowRight size={12} className="text-gray-300 shrink-0" />
                      </button>
                    )
                  })}
                </>
              )}

              {/* Collections */}
              {results.collections.length > 0 && (
                <>
                  <div className="flex items-center gap-3 px-4 pt-3 pb-2">
                    <span className="text-[10px] font-bold tracking-[1px] uppercase text-gray-400">Categories</span>
                    <div className="flex-1 h-px bg-gray-100" />
                  </div>
                  {results.collections.map((c) => {
                    const idx = flatIdx++
                    const isActive = activeIdx === idx
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => navigate(`/category/${c.handle}`)}
                        className={`w-full flex items-center gap-3 px-4 py-1.5 text-left transition-colors focus:outline-none ${isActive ? 'bg-neutral-50' : 'hover:bg-neutral-50'}`}
                      >
                        <Tag size={12} className="text-gray-300 shrink-0" />
                        <span className="text-[13px] text-navy-900 flex-1">{c.title}</span>
                        <ArrowRight size={12} className="text-gray-300 shrink-0" />
                      </button>
                    )
                  })}
                </>
              )}

              {/* Footer */}
              <div className="border-t border-gray-100 mt-1 px-4 py-2.5 flex items-center justify-between bg-neutral-50">
                <button
                  type="button"
                  onClick={() => navigate(`/search?q=${encodeURIComponent(query)}`)}
                  className="text-[12px] font-semibold text-teal-500 hover:text-teal-600 transition-colors flex items-center gap-1 focus:outline-none"
                >
                  See all results for &ldquo;{query}&rdquo;
                  <ArrowRight size={11} />
                </button>
              </div>
            </div>
          )}

          {/* No results */}
          {showDropdown && !hasResults && !loading && (
            <div className="mt-2 border border-gray-100 px-4 py-4 bg-white">
              <p className="text-[13px] text-gray-500">
                No results for &ldquo;<span className="font-semibold text-navy-900">{query}</span>&rdquo;
              </p>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
