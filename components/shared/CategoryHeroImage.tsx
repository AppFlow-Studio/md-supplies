'use client'

import { useState } from 'react'
import { CategoryImage } from '@/components/shared/CategoryImage'

/**
 * Category hero artwork that removes itself when no image can load.
 *
 * The hero previously reserved a fixed 55%-wide panel for the banner. When the
 * CDN was unreachable (2026-08-02: every Bunny request returned 401) that panel
 * rendered as a large blank neutral rectangle beside the heading — the "blank
 * hero" in the screenshots. Collapsing instead of reserving means a missing
 * image costs nothing visually, and the copy simply uses the full width.
 */
export function CategoryHeroImage({
  bannerPath,
  alt,
  className = 'hidden lg:block absolute right-0 top-0 bottom-0 w-[55%]',
  sizes = '55vw',
  objectPosition,
}: {
  bannerPath: string
  alt: string
  className?: string
  sizes?: string
  /** Per-route focal point for the object-cover crop. */
  objectPosition?: string
}) {
  const [unavailable, setUnavailable] = useState(false)
  if (unavailable) return null

  return (
    <div className={className}>
      <CategoryImage
        bannerPath={bannerPath}
        alt={alt}
        sizes={sizes}
        objectPosition={objectPosition}
        onUnavailable={() => setUnavailable(true)}
      />
    </div>
  )
}
