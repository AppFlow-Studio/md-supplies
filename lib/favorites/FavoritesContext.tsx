'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { getFavoritesState } from '@/app/actions/favorites'

// Client-side favorites hydration.
//
// Category default grids, /api/catalog's filtered responses, and the
// generateStaticParams-sampled product pages are all shared across viewers
// (a static prerender or a CDN-cached response) under Cache Components. A
// per-viewer value like "is this signed in and are these their favorites"
// can never be baked into that HTML — one visitor's session would leak into
// what every other visitor sees. This provider fetches the real answer via a
// server action (a POST, never subject to a GET route/page cache) once the
// page is live in the browser, and every heart on the page reads the result
// from context instead of a server-rendered prop.
//
// Surfaces that are genuinely per-request already (e.g. /search, the account
// favorites page) keep computing isSignedIn/isFavorited server-side and
// passing them as explicit props — those props still win over context (see
// ShopifyProductCard / ProductView), so this provider changes nothing there.

interface FavoritesState {
  isSignedIn: boolean
  favoritedProductIds: Set<string>
  /** False until the client fetch resolves — every card defaults to the
      guest/unfavorited look until then, then upgrades in place. */
  ready: boolean
}

const DEFAULT_STATE: FavoritesState = {
  isSignedIn: false,
  favoritedProductIds: new Set(),
  ready: false,
}

const FavoritesContext = createContext<FavoritesState>(DEFAULT_STATE)

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FavoritesState>(DEFAULT_STATE)

  useEffect(() => {
    let cancelled = false
    getFavoritesState().then(({ isSignedIn, favoritedProductIds }) => {
      if (cancelled) return
      setState({ isSignedIn, favoritedProductIds: new Set(favoritedProductIds), ready: true })
    })
    return () => {
      cancelled = true
    }
  }, [])

  return <FavoritesContext.Provider value={state}>{children}</FavoritesContext.Provider>
}

export function useFavoritesState(): FavoritesState {
  return useContext(FavoritesContext)
}
