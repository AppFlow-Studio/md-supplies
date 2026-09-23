'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { track } from '@/lib/analytics/track'
import { buildPageViewEvent } from '@/lib/analytics/events'

/**
 * SPA page_view for GTM.
 *
 * Reads the query string from `window.location` inside the effect rather than
 * through `useSearchParams()` (DEV-TRACK-01). `useSearchParams()` forces the
 * nearest Suspense boundary to client-render, and on a PPR route whose shell is
 * postponed (`x-nextjs-postponed: 1`) that boundary did not resolve — so
 * /product/[slug] emitted NO page_view at all, while fully-prerendered routes
 * like /category/[slug] (`x-nextjs-prerender: 1`) were fine. Verified against a
 * real `next build && next start`, not inferred: two different PDPs produced a
 * dataLayer of gtm.js → view_item → gtm.load with no page_view entry. The PDP
 * is where campaign traffic lands, so that was the worst possible route to lose.
 *
 * Reading `window.location` is the same technique — and for the same reason —
 * that components/product/useSelectedVariant.ts already uses in this codebase:
 * it avoids the static-generation bailout and the Suspense requirement entirely.
 *
 * Deduplication is by full URL rather than by dependency array. The effect has
 * no dependency list, so it runs after every render, and the ref makes it a
 * no-op unless the URL actually changed. That covers query-only transitions
 * (filter, sort, pagination — which `usePathname()` alone cannot see, since the
 * pathname is unchanged) while making a repeat push for the same URL
 * impossible, including under React StrictMode's double-invoked effects in
 * development.
 */
export function PageViewTracker() {
  // Subscribed purely so a route change re-renders this component; the value
  // itself is not used — window.location is the authority.
  usePathname()
  const lastUrlRef = useRef<string | null>(null)

  useEffect(() => {
    const path = `${window.location.pathname}${window.location.search}`
    if (lastUrlRef.current === path) return
    lastUrlRef.current = path
    track(
      buildPageViewEvent({
        path,
        location: `${window.location.origin}${path}`,
        title: document.title,
      }),
    )
  })

  return null
}
