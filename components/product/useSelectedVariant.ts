'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import type { Product, ProductImage, ProductVariant } from '@/lib/shopify/types'

/**
 * The single selected-variant view model for both PDP routes (LG-03).
 * Owns the variant selection, the derived gallery (variant media first,
 * falling back to the shared product gallery), and keeps the URL's
 * `?variant=` in sync so the selected state is shareable and survives a
 * refresh — without a full page reload on selection.
 */
export function useSelectedVariant(product: Product, initialVariant: ProductVariant) {
  const router = useRouter()
  const pathname = usePathname()
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant>(initialVariant)
  const [activeImg, setActiveImg] = useState(0)

  // Reset the active gallery image whenever the selected variant changes —
  // otherwise a shopper who scrolled to thumbnail 3 on Blue lands on the
  // wrong image the instant they switch to Red. Adjusted during render
  // (React's documented pattern for resetting state when something else
  // changes) rather than in an effect, which would cascade an extra render.
  const [lastVariantId, setLastVariantId] = useState(selectedVariant.id)
  if (selectedVariant.id !== lastVariantId) {
    setLastVariantId(selectedVariant.id)
    setActiveImg(0)
  }

  const galleryImages: ProductImage[] = selectedVariant.image
    ? [selectedVariant.image, ...product.images.nodes.filter((img) => img.id !== selectedVariant.image!.id)]
    : product.images.nodes

  function select(variant: ProductVariant) {
    setSelectedVariant(variant)
    // Shallow update only — no scroll jump, no full navigation. Shareable
    // deep link: `?variant=<id>` rehydrates the same selected state on
    // refresh (resolveInitialVariant, read server-side by both page.tsx routes).
    router.replace(`${pathname}?variant=${encodeURIComponent(variant.id)}`, { scroll: false })
  }

  return { selectedVariant, select, galleryImages, activeImg, setActiveImg }
}
