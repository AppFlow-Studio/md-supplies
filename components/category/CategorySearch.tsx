'use client'

import { useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useCatalogTransition } from '@/components/category/CatalogTransition'
import { Search, X, Loader2 } from 'lucide-react'
import { withTrackingParams } from '@/lib/analytics/tracking-params'

// DEV-SEARCH-01: collection-scoped search field rendered above every L1/L2/
// OCC product grid. Search text is server-rendered URL state (?q=) exactly
// like sort/filter — router.push triggers a soft navigation (no document
// reload), Back/Forward restores prior queries, and copying the URL
// reproduces the result state. Scoping is enforced server-side in
// fetchProductConnection, never in the browser.

const DEBOUNCE_MS = 300

interface Props {
  /** Collection display title for the contextual label/placeholder. */
  scopeTitle: string
  /** Current ?q= value from the server render (source of truth). */
  searchQuery?: string
  currentSort?: string
  activeFilters: string[]
}

export function CategorySearch({ scopeTitle, searchQuery, currentSort, activeFilters }: Props) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [value, setValue] = useState(searchQuery ?? '')
  // Shared with filters/sort/pagination so one indicator covers them all.
  const { pending: isPending, navigate } = useCatalogTransition()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // External URL changes (Back/Forward, clearing the search chip) win over
  // local typing state. Adjusted during render rather than in an effect —
  // React re-runs this component immediately without a cascading commit.
  const [lastQuery, setLastQuery] = useState(searchQuery)
  if (searchQuery !== lastQuery) {
    setLastQuery(searchQuery)
    setValue(searchQuery ?? '')
  }

  const buildUrl = (q: string) => {
    const p = new URLSearchParams()
    if (currentSort) p.set('sort', currentSort)
    activeFilters.forEach((f) => p.append('filter', f))
    const trimmed = q.trim()
    if (trimmed) p.set('q', trimmed)
    withTrackingParams(p, searchParams)
    const qs = p.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }

  const commit = (q: string) => {
    // A new query resets pagination (no `page` param is carried over) and
    // must not scroll-jump the viewport.
    navigate(buildUrl(q))
  }

  const onChange = (next: string) => {
    setValue(next)
    if (timer.current) clearTimeout(timer.current)
    // Debounce ~300 ms; the pending timer is the only in-flight "request" on
    // the client (the server render is superseded by the latest navigation),
    // so clearing it on every keystroke also cancels stale commits. An empty
    // field only navigates when it clears an existing query.
    const trimmed = next.trim()
    if (!trimmed && !(searchQuery ?? '').trim()) return
    timer.current = setTimeout(() => commit(next), DEBOUNCE_MS)
  }

  const onClear = () => {
    if (timer.current) clearTimeout(timer.current)
    setValue('')
    if ((searchQuery ?? '').trim()) commit('')
  }

  const inputId = 'category-scoped-search'

  return (
    <div className="mb-6">
      <label htmlFor={inputId} className="sr-only">
        Search within {scopeTitle}
      </label>
      <div className="relative max-w-[520px]">
        <Search
          size={16}
          aria-hidden
          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
        <input
          id={inputId}
          type="search"
          inputMode="search"
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (timer.current) clearTimeout(timer.current)
              commit(value)
            }
            if (e.key === 'Escape') onClear()
          }}
          placeholder={`Search within ${scopeTitle}`}
          className="w-full h-[48px] bg-white border border-gray-200 pl-11 pr-11 text-[14px] text-navy-900 placeholder:text-gray-400 focus:outline-none focus:border-navy-900 transition-colors"
        />
        {isPending ? (
          <Loader2
            size={16}
            aria-hidden
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 animate-spin"
          />
        ) : value ? (
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-navy-900 transition-colors"
          >
            <X size={16} />
          </button>
        ) : null}
      </div>
    </div>
  )
}
