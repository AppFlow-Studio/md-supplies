'use client'

import { useState, useTransition, useRef } from 'react'
import { Heart, Loader2 } from 'lucide-react'
import { toggleFavorite } from '@/app/actions/favorites'
import { track } from '@/lib/analytics/track'
import { buildFavoriteEvent } from '@/lib/analytics/events'
import { ROUTES } from '@/lib/routes'
import type { FavoriteEvent } from '@/lib/analytics/events'

interface Props {
  productId: string
  productHandle: string
  productTitle: string
  variantId?: string | null
  isSignedIn: boolean
  initialFavorited: boolean
  /** Which surface fired the interaction — analytics only, never rendering. */
  list: FavoriteEvent['list']
  size?: 'sm' | 'md'
  className?: string
  /** Account Favorites page only: lets the grid drop the tile immediately on remove. */
  onRemoved?: (productId: string) => void
}

const ICON_SIZE = { sm: 16, md: 20 } as const

export function FavoriteButton({
  productId,
  productHandle,
  productTitle,
  variantId = null,
  isSignedIn,
  initialFavorited,
  list,
  size = 'md',
  className = '',
  onRemoved,
}: Props) {
  const [favorited, setFavorited] = useState(initialFavorited)
  // Empty until the first interaction — the aria-live region must never
  // announce anything on initial mount/hydration (a grid of 20 cards would
  // otherwise each speak their state to every screen-reader visitor).
  const [announcement, setAnnouncement] = useState('')
  const [isPending, startTransition] = useTransition()
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const iconSize = ICON_SIZE[size]
  // Both sizes clear the 24px WCAG AA touch-target minimum with room to
  // spare; "md" (PDP) hits the 44px AAA target exactly, "sm" (card overlay,
  // where a 44px badge would crowd a dense grid) still lands at 40px.
  const dim = size === 'sm' ? 'size-10' : 'size-11'

  function announce(message: string, autoClearMs?: number) {
    setAnnouncement(message)
    if (clearTimer.current) clearTimeout(clearTimer.current)
    if (autoClearMs) clearTimer.current = setTimeout(() => setAnnouncement(''), autoClearMs)
  }

  // Guest: full-page navigation into the existing hosted login flow, same
  // pattern as the account page's own <a href="/api/auth/login"> links (a
  // client-side transition would not carry the cookies the OAuth redirect
  // needs). The intended product/variant + return path travel as query
  // params the login route reads once and stores server-side in a
  // short-lived cookie (app/api/auth/login/route.ts) — never in the OAuth
  // state itself, and never exposing anything but a public product id.
  if (!isSignedIn) {
    const params = new URLSearchParams({
      next: ROUTES.product(productHandle),
      favoriteProductId: productId,
    })
    if (variantId) params.set('favoriteVariantId', variantId)
    return (
      <a
        href={`/api/auth/login?${params.toString()}`}
        onClick={() => track(buildFavoriteEvent({ action: 'auth_prompt', productId, list }))}
        aria-label={`Add ${productTitle} to favorites`}
        className={`inline-flex items-center justify-center ${dim} rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-900 ${className}`}
      >
        <Heart size={iconSize} aria-hidden />
      </a>
    )
  }

  function handleClick() {
    if (isPending) return
    const next = !favorited
    setFavorited(next) // optimistic
    startTransition(async () => {
      const res = await toggleFavorite(productId, variantId)
      if (!res.ok) {
        setFavorited(!next) // rollback
        announce(res.error, 4000)
        return
      }
      setFavorited(res.favorited)
      announce(res.favorited ? `${productTitle} added to favorites` : `${productTitle} removed from favorites`)
      track(buildFavoriteEvent({ action: res.favorited ? 'add' : 'remove', productId, list }))
      if (!res.favorited) onRemoved?.(productId)
    })
  }

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        aria-pressed={favorited}
        aria-label={favorited ? `Remove ${productTitle} from favorites` : `Add ${productTitle} to favorites`}
        className={`inline-flex items-center justify-center ${dim} rounded-full transition-colors disabled:cursor-wait focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-900 ${
          favorited ? 'text-red-500 hover:bg-red-50' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
        } ${className}`}
      >
        {isPending ? (
          <Loader2 size={iconSize} className="animate-spin" aria-hidden />
        ) : (
          // Filled vs outline shape is the primary saved/unsaved signal — not
          // color alone (WCAG 1.4.1): fill is only ever present together
          // with the red stroke, never used to distinguish state on its own.
          <Heart size={iconSize} aria-hidden fill={favorited ? 'currentColor' : 'none'} />
        )}
      </button>

      {/* Screen-reader-only state announcement + concise non-blocking error,
          both live so a toggle or a failed save is spoken without moving
          focus or interrupting the page. Empty (nothing announced) until
          the first interaction. */}
      <span role="status" aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </span>
  )
}
