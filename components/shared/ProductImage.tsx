'use client'

import { useState } from 'react'
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

// Fallback chain (§3.6): real Shopify image → primary-category BunnyCDN
// placeholder → global medical-supplies placeholder. Never a broken-image
// icon or empty white card — the global placeholder is the floor.
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

  if (src && !realImageFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
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
        className={className}
        onError={() => setGlobalPlaceholderFailed(true)}
      />
    )
  }

  return <div className="absolute inset-0 bg-neutral-50" />
}
