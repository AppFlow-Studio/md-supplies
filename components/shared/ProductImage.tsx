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

  const placeholderSrc = categoryPlaceholderFailed
    ? GLOBAL_PRODUCT_PLACEHOLDER
    : getProductPlaceholderPath(categoryHandle)

  return (
    <Image
      src={placeholderSrc}
      alt={alt}
      fill
      sizes={sizes}
      className={className}
      onError={() => setCategoryPlaceholderFailed(true)}
    />
  )
}
