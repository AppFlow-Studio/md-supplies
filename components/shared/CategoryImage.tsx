'use client'

import { useState } from 'react'
import Image from 'next/image'

interface Props {
  bannerPath: string
  fallbackUrl?: string | null
  alt: string
}

// Hero/banner fallback (§3.3): curated BunnyCDN banner first, Shopify
// collection.image second, neutral panel last — never an empty/broken slot.
export function CategoryImage({ bannerPath, fallbackUrl, alt }: Props) {
  const [bannerFailed, setBannerFailed] = useState(false)
  const [fallbackFailed, setFallbackFailed] = useState(false)

  if (!bannerFailed) {
    return (
      <Image
        src={bannerPath}
        alt={alt}
        fill
        sizes="55vw"
        className="object-cover"
        onError={() => setBannerFailed(true)}
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
        onError={() => setFallbackFailed(true)}
      />
    )
  }

  return <div className="absolute inset-0 bg-navy-900/5" />
}
