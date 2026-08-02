'use client'

import { useState } from 'react'
import Image from 'next/image'

interface Props {
  bannerPath: string
  fallbackUrl?: string | null
  alt: string
  sizes?: string
  /** Letter shown in the final fallback tier (e.g. tile.displayName.charAt(0)) when no image loads at all. Omit to fall back to a plain neutral panel. */
  fallbackLabel?: string
  /** Classes for the fallbackLabel wrapper (background + layout) — defaults to the neutral hero panel look. */
  fallbackLabelWrapperClassName?: string
  /** Classes for the fallbackLabel text itself (size + color). */
  fallbackLabelTextClassName?: string
  /**
   * Called when every image source has failed. Lets a parent collapse the
   * space the image was occupying instead of showing a large empty panel —
   * see CategoryHeroImage.
   */
  onUnavailable?: () => void
}

// Fallback chain: approved BunnyCDN banner → optional caller-supplied URL → letter/neutral panel.
// Shopify collection.image is intentionally excluded to prevent random product images appearing in the hero.
export function CategoryImage({
  bannerPath,
  fallbackUrl,
  alt,
  sizes = '55vw',
  fallbackLabel,
  fallbackLabelWrapperClassName = 'absolute inset-0 bg-navy-900/5 flex items-center justify-center',
  fallbackLabelTextClassName = 'text-navy-900/20 text-[36px] font-bold',
  onUnavailable,
}: Props) {
  const [bannerFailed, setBannerFailed] = useState(false)
  const [fallbackFailed, setFallbackFailed] = useState(false)

  const markUnavailable = () => {
    // Reported once every source is exhausted, so the parent can collapse.
    if (!fallbackUrl) onUnavailable?.()
  }

  if (!bannerFailed) {
    return (
      <Image
        src={bannerPath}
        alt={alt}
        fill
        sizes={sizes}
        className="object-cover"
        onError={() => {
          setBannerFailed(true)
          markUnavailable()
        }}
      />
    )
  }

  if (fallbackUrl && !fallbackFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={fallbackUrl}
        alt={alt}
        className="absolute inset-0 w-full h-full object-cover"
        onError={() => {
          setFallbackFailed(true)
          onUnavailable?.()
        }}
      />
    )
  }

  if (fallbackLabel) {
    return (
      <div className={fallbackLabelWrapperClassName}>
        <span className={fallbackLabelTextClassName}>{fallbackLabel}</span>
      </div>
    )
  }

  return <div className="absolute inset-0 bg-navy-900/5" />
}
