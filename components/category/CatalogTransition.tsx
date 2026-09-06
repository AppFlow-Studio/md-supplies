'use client'

import { createContext, useContext, useTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Phase 5 — one shared transition for every catalog control.
 *
 * Filter, sort, search, clear and pagination all navigate through
 * `navigate()` here. Because the navigation runs inside a React transition,
 * the CURRENT results stay on screen and interactive while the next ones are
 * fetched — the grid is never blanked and the header, breadcrumbs, hero and
 * subcategory navigator never unmount. `pending` drives a results-only
 * indicator instead of a whole-page spinner.
 *
 * scroll: false everywhere — Phase 6 owns scrolling, so the router must not
 * also jump the viewport to the top of the document on every interaction.
 */

type CatalogTransitionValue = {
  pending: boolean
  navigate: (url: string) => void
}

const CatalogTransitionContext = createContext<CatalogTransitionValue | null>(null)

export function CatalogTransitionProvider({
  children,
  externalPending = false,
}: {
  children: ReactNode
  /**
   * Phase 3 — a pending signal owned OUTSIDE the router transition. On the
   * static category route the grid is refreshed by the client filter island's
   * own `fetch('/api/catalog')`, not a `router.push`, so `useTransition`'s
   * pending never fires for it. Threading the island's own `loading` in here
   * lets CatalogResultsState dim the current grid during that fetch exactly as
   * it does during a same-page navigation — no blank flash. Defaults to false,
   * so every other caller (real navigations) is unchanged.
   */
  externalPending?: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const navigate = (url: string) => {
    startTransition(() => router.push(url, { scroll: false }))
  }

  return (
    <CatalogTransitionContext.Provider value={{ pending: pending || externalPending, navigate }}>
      {children}
    </CatalogTransitionContext.Provider>
  )
}

/**
 * Controls outside a provider (or in tests) fall back to a plain scroll-free
 * push, so they still work without the in-place niceties.
 */
export function useCatalogTransition(): CatalogTransitionValue {
  const ctx = useContext(CatalogTransitionContext)
  const router = useRouter()
  if (ctx) return ctx
  return {
    pending: false,
    navigate: (url: string) => router.push(url, { scroll: false }),
  }
}
