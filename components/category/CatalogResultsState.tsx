'use client'

import type { ReactNode } from 'react'
import { useCatalogTransition } from '@/components/category/CatalogTransition'

/**
 * Results-only pending affordance (Phase 5).
 *
 * While the next result set loads, the CURRENT products stay on screen and
 * simply dim — the grid is never blanked and the page never flashes. Only this
 * subtree reacts; the header, breadcrumbs, hero, subcategory navigator and the
 * filter controls all stay fully mounted and stable.
 *
 * `aria-busy` announces the update to assistive tech, and pointer events are
 * suspended so a second click cannot race the in-flight navigation.
 */
export function CatalogResultsState({ children }: { children: ReactNode }) {
  const { pending } = useCatalogTransition()

  return (
    <div
      aria-busy={pending}
      className={
        pending
          ? 'opacity-60 pointer-events-none transition-opacity duration-150 motion-reduce:transition-none'
          : 'opacity-100 transition-opacity duration-150 motion-reduce:transition-none'
      }
    >
      {children}
    </div>
  )
}
