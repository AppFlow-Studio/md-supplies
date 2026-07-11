'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { getProductPlaceholderPath, GLOBAL_PRODUCT_PLACEHOLDER } from '@/lib/bunnycdn'

interface Props {
  src?: string | null
  alt: string
  categoryHandle?: string | null
  className?: string
  sizes?: string
  priority?: boolean
}

// GIF masters (256 colors, weak compression) should eventually be re-uploaded
// as JPEG/WebP in Shopify. next/image converts static GIFs but passes animated
// ones through as-is, so surface each one once for the re-upload backlog.
const loggedGifMasters = new Set<string>()
function logGifMaster(src: string) {
  if (!src.split('?')[0].toLowerCase().endsWith('.gif')) return
  if (loggedGifMasters.has(src)) return
  loggedGifMasters.add(src)
  console.warn(`[image-audit] GIF master, re-upload as JPEG/WebP in Shopify: ${src}`)
}

// Fallback chain (§3.6): real Shopify image → primary-category BunnyCDN
// placeholder → global medical-supplies placeholder. Never a broken-image
// icon or empty white card — the global placeholder is the floor.
//
// Every branch renders through next/image so all product surfaces get
// responsive srcset, explicit dimensions, and WebP/AVIF. `priority` marks
// above-the-fold images: next 16 deprecated the `priority` prop, so it maps
// to loading="eager" + fetchPriority="high" per the next/image docs.
export function ProductImage({
  src,
  alt,
  categoryHandle,
  className = 'size-full object-contain',
  sizes = '(max-width: 768px) 50vw, 25vw',
  priority = false,
}: Props) {
  const [realImageFailed, setRealImageFailed] = useState(false)
  const [categoryPlaceholderFailed, setCategoryPlaceholderFailed] = useState(false)
  const [globalPlaceholderFailed, setGlobalPlaceholderFailed] = useState(false)

  useEffect(() => {
    if (src) logGifMaster(src)
  }, [src])

  const priorityProps = priority
    ? ({ loading: 'eager', fetchPriority: 'high' } as const)
    : ({ loading: 'lazy' } as const)

  if (src && !realImageFailed) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        {...priorityProps}
        className={className}
        onError={() => setRealImageFailed(true)}
      />
    )
  }

  if (!categoryPlaceholderFailed) {
    return (
      <Image
        src={getProductPlaceholderPath(categoryHandle)}
        alt={alt}
        fill
        sizes={sizes}
        {...priorityProps}
        className={className}
        onError={() => setCategoryPlaceholderFailed(true)}
      />
    )
  }

  if (!globalPlaceholderFailed) {
    return (
      <Image
        src={GLOBAL_PRODUCT_PLACEHOLDER}
        alt={alt}
        fill
        sizes={sizes}
        {...priorityProps}
        className={className}
        onError={() => setGlobalPlaceholderFailed(true)}
      />
    )
  }

  return <div className="absolute inset-0 bg-neutral-50" />
}
