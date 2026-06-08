'use client'

import {
  useState, useEffect, useRef, useCallback,
  type KeyboardEvent, type FormEvent,
} from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, ArrowRight, Tag } from 'lucide-react'
import type { PredictiveResults } from '@/app/api/search/predictive/route'

/** Strip everything except <mark> and <span> (no attributes). */
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
  const [results, setResults] = useState<PredictiveResults>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)

  const debouncedQuery = useDebounce(query, 280)

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 40)
  }, [])

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults(EMPTY)
      setActiveIdx(-1)
      return
    }
    let cancelled = false
    setLoading(true)
    fetch(`/api/search/predictive?q=${encodeURIComponent(debouncedQuery)}`)
      .then((r) => r.json())
      .then((data: PredictiveResults) => {
        if (!cancelled) {
          setResults(data)
          setActiveIdx(-1)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })
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
        <div className="max-w-360 mx-auto px-4 md:px-8 py-5">
          {/* Input row */}
          <form onSubmit={handleSubmit} className="flex gap-2 relative">
            <div className="flex-1 flex items-center border-2 border-navy-900 px-4 gap-3 bg-white transition-colors">
              <Search
                size={17}
                className={`shrink-0 transition-colors ${loading ? 'text-teal-500 animate-pulse' : 'text-gray-400'}`}
              />
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search products, categories…"
                autoComplete="off"
                className="flex-1 h-[46px] text-[15px] text-navy-900 placeholder:text-gray-400 outline-none bg-transparent"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => { setQuery(''); setResults(EMPTY); inputRef.current?.focus() }}
                  className="text-gray-400 hover:text-navy-900 transition-colors shrink-0 p-1"
                  aria-label="Clear"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="bg-navy-900 text-white h-[46px] px-7 text-[13px] font-bold tracking-[0.5px] uppercase hover:bg-navy-950 transition-colors shrink-0"
            >
              Search
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-navy-900 transition-colors px-2"
              aria-label="Close search"
            >
              <X size={18} />
            </button>
          </form>

          {/* Dropdown */}
          {showDropdown && hasResults && (
            <div
              ref={dropdownRef}
              className="mt-3 border border-gray-100 bg-white shadow-lg overflow-hidden max-h-[400px] overflow-y-auto"
            >
              {/* Query suggestions */}
              {results.queries.length > 0 && (
                <div className="py-1">
                  <p className="px-4 pt-2.5 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-[0.8px]">
                    Suggestions
                  </p>
                  {results.queries.map((q) => {
                    const idx = flatIdx++
                    const isActive = activeIdx === idx
                    return (
                      <button
                        key={q.text}
                        type="button"
                        onClick={() => navigate(`/search?q=${encodeURIComponent(q.text)}`)}
                        className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${isActive ? 'bg-neutral-50' : 'hover:bg-neutral-50'}`}
                      >
                        <Search size={13} className="text-gray-300 shrink-0" />
                        <span
                          className="text-[14px] text-navy-900 [&_mark]:bg-transparent [&_mark]:font-semibold [&_mark]:text-teal-500"
                          dangerouslySetInnerHTML={{ __html: sanitizeStyledText(q.styledText) }}
                        />
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Products */}
              {results.products.length > 0 && (
                <div className={`py-1 ${results.queries.length > 0 ? 'border-t border-gray-100' : ''}`}>
                  <p className="px-4 pt-2.5 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-[0.8px]">
                    Products
                  </p>
                  {results.products.map((p) => {
                    const idx = flatIdx++
                    const isActive = activeIdx === idx
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => navigate(`/product/${p.handle}`)}
                        className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${isActive ? 'bg-neutral-50' : 'hover:bg-neutral-50'}`}
                      >
                        <div className="w-9 h-9 shrink-0 border border-gray-100 bg-gray-50 overflow-hidden flex items-center justify-center">
                          {p.featuredImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.featuredImage.url}
                              alt={p.featuredImage.altText ?? p.title}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <span className="text-[10px] font-bold text-gray-300 uppercase">
                              {p.title.slice(0, 2)}
                            </span>
                          )}
                        </div>
                        <span className="text-[13px] text-navy-900 line-clamp-1 flex-1 leading-snug">{p.title}</span>
                        <ArrowRight size={12} className="text-gray-300 shrink-0" />
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Collections */}
              {results.collections.length > 0 && (
                <div className={`py-1 ${results.queries.length > 0 || results.products.length > 0 ? 'border-t border-gray-100' : ''}`}>
                  <p className="px-4 pt-2.5 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-[0.8px]">
                    Categories
                  </p>
                  {results.collections.map((c) => {
                    const idx = flatIdx++
                    const isActive = activeIdx === idx
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => navigate(`/category/${c.handle}`)}
                        className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${isActive ? 'bg-neutral-50' : 'hover:bg-neutral-50'}`}
                      >
                        <Tag size={13} className="text-gray-300 shrink-0" />
                        <span className="text-[13px] text-navy-900 flex-1">{c.title}</span>
                        <ArrowRight size={12} className="text-gray-300 shrink-0" />
                      </button>
                    )
                  })}
                </div>
              )}

              {/* See all results */}
              <div className="border-t border-gray-100 px-4 py-2.5 bg-neutral-50">
                <button
                  type="button"
                  onClick={() => navigate(`/search?q=${encodeURIComponent(query)}`)}
                  className="text-[12px] font-semibold text-teal-500 hover:text-teal-600 transition-colors flex items-center gap-1"
                >
                  See all results for &ldquo;{query}&rdquo;
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>
          )}

          {/* No results state */}
          {showDropdown && !hasResults && !loading && (
            <div className="mt-3 border border-gray-100 bg-white shadow-lg px-4 py-4">
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
