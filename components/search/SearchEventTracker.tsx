'use client'

import { useEffect, useRef } from 'react'
import { track } from '@/lib/analytics/track'
import { buildSearchEvent } from '@/lib/analytics/events'
import { normalizeSearchTerm } from '@/lib/analytics/redact'

/**
 * Emits GA4's recommended `search` event for the site-search results page.
 *
 * The results grid already reports `view_item_list`, but that says what was
 * shown, not what was asked for — so zero-result searches (the ones worth
 * acting on) were previously invisible in reporting. `results` carries the
 * count so they can be found.
 *
 * Deduped on the term+count pair rather than fired on every render: filtering
 * or sorting an existing result set re-renders this page but is not a new
 * search.
 */
export function SearchEventTracker({ term, results }: { term: string; results: number }) {
  const lastRef = useRef<string | null>(null)

  useEffect(() => {
    const normalized = normalizeSearchTerm(term)
    if (!normalized) return
    const key = `${normalized}::${results}`
    if (lastRef.current === key) return
    lastRef.current = key
    track(buildSearchEvent({ term: normalized, results }))
  }, [term, results])

  return null
}
