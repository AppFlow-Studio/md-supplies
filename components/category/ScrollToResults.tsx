'use client'

import { useEffect, useRef, type ReactNode } from 'react'

interface Props {
  /**
   * The COMPLETE results state, not just the page number. Any change to
   * filters, sort, search or page is a new result set and should bring the
   * results into view; a re-render that changes none of them should not.
   */
  resultsKey: string
  children: ReactNode
}

/**
 * Phase 6 — brings new results into view without hijacking the viewport.
 *
 * Catalog controls navigate with `scroll: false` (the router must not jump to
 * the top of the document on every filter click), so this is what puts the new
 * results where the shopper can see them. Rules:
 *
 *  - never on first mount (a fresh page load must land where the browser put it);
 *  - only when the complete results state actually changed — previously this
 *    keyed on `page` alone, so filter/sort/search changes never scrolled and
 *    pagination always did;
 *  - not at all when the results anchor is already comfortably in view: if the
 *    shopper is looking at the toolbar and ticks a filter, yanking the page is
 *    worse than doing nothing;
 *  - `auto` (instant) rather than `smooth` under prefers-reduced-motion;
 *  - scroll-margin-top keeps the anchor clear of the sticky header, so the
 *    first row of products is not hidden underneath it.
 */
export function ScrollToResults({ resultsKey, children }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const lastKey = useRef<string | null>(null)

  useEffect(() => {
    // First run records the baseline without scrolling.
    if (lastKey.current === null) {
      lastKey.current = resultsKey
      return
    }
    if (lastKey.current === resultsKey) return
    lastKey.current = resultsKey

    const el = ref.current
    if (!el) return

    const rect = el.getBoundingClientRect()
    // Already looking at the results area: leave the viewport alone. The band
    // allows for the sticky header without demanding pixel precision.
    const alreadyVisible = rect.top >= -120 && rect.top <= window.innerHeight * 0.5
    if (alreadyVisible) return

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
  }, [resultsKey])

  return (
    <div ref={ref} className="scroll-mt-[140px] lg:scroll-mt-[168px] flex-1 min-w-0">
      {children}
    </div>
  )
}
