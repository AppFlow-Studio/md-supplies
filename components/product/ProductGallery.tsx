'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { ProductImage } from '@/types/product'

interface Props {
  images: ProductImage[]
  alt: string
}

export function ProductGallery({ images, alt }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  if (images.length === 0) return null

  const selected = images[selectedIndex]

  return (
    <div className="flex flex-col gap-3">
      <div className="relative w-full aspect-square bg-neutral-50 rounded-xl overflow-hidden border border-gray-200">
        <Image
          src={selected.url}
          alt={selected.altText || alt}
          fill
          sizes="(max-width: 1024px) 100vw, 52vw"
          priority
          className="object-contain"
        />
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setSelectedIndex(i)}
              aria-label={`View image ${i + 1}`}
              aria-pressed={i === selectedIndex}
              className={`relative w-16 h-16 shrink-0 rounded-lg overflow-hidden border-2 bg-neutral-50 transition-colors ${
                i === selectedIndex
                  ? 'border-teal-500'
                  : 'border-gray-200 hover:border-gray-400'
              }`}
            >
              <Image
                src={img.url}
                alt={img.altText || `Product image ${i + 1}`}
                fill
                sizes="64px"
                className="object-contain"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
