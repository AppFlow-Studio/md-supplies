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

  // Only a genuine multi-value color dimension carries "another variant's
  // image would misrepresent this one" risk — an Each/Case selection or a
  // single-color product has no such risk, so the shared gallery remains a
  // safe fallback there (unchanged behavior).
  const isMultiColor = product.options.some(
    (o) => o.name.toLowerCase() === 'color' && o.values.length > 1,
  )

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

  // AeroWalk gap (2026-08-14): a multi-color product with no verified media
  // for the selected color must never show a sibling color's image as if it
  // belonged to this one — the exact defect Bilal reported ("both
  // storefronts continue showing the Blue image" for White/Grey). Empty
  // gallery here means ProductImage's own placeholder chain renders
  // instead (never `product.images.nodes`, which mixes every color).
  const galleryImages: ProductImage[] = selectedVariant.image
    ? [selectedVariant.image, ...product.images.nodes.filter((img) => img.id !== selectedVariant.image!.id)]
    : isMultiColor
      ? []
      : product.images.nodes

  function select(variant: ProductVariant) {
    setSelectedVariant(variant)
    // Shallow update only — no scroll jump, no full navigation. Shareable
    // deep link: `?variant=<id>` rehydrates the same selected state on
    // refresh (resolveInitialVariant, read server-side by both page.tsx routes).
    router.replace(`${pathname}?variant=${encodeURIComponent(variant.id)}`, { scroll: false })
  }

  return { selectedVariant, select, galleryImages, activeImg, setActiveImg, isMultiColor }
}
