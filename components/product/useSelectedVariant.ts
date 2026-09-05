'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import type { Product, ProductImage, ProductVariant } from '@/lib/shopify/types'
import { resolveInitialVariant } from '@/lib/product/resolve-variant'

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

  // Deep-link reconciliation (Phase 3): both PDP routes now render the DEFAULT
  // variant server-side (they no longer read `?variant=` on the server — that's
  // what lets /product/[slug] be ISR-cacheable, and keeps /category/[slug]/[product]
  // free of a per-variant render). To keep shareable deep links working, the
  // client corrects to the URL's `?variant=` AFTER hydration. This MUST run in
  // an effect (never during render): the server-rendered default and the
  // client's first render must match, or React reports a hydration mismatch.
  // A brief default→variant correction on deep-links is acceptable. Reading
  // `window.location.search` (not useSearchParams) avoids the static-generation
  // bailout and the Suspense requirement useSearchParams would impose.
  useEffect(() => {
    const urlVariantId = new URLSearchParams(window.location.search).get('variant')
    if (!urlVariantId) return
    // resolveInitialVariant validates the id against real variants and falls
    // back to the default for an unknown id — so an invalid `?variant=` is a
    // no-op here (it resolves back to the already-selected default).
    const resolved = resolveInitialVariant(product.variants.nodes, urlVariantId)
    if (resolved.id !== selectedVariant.id) {
      setSelectedVariant(resolved)
    }
    // Re-run only when the URL variant or the variant set changes; the default
    // (no-`?variant`) path is untouched (the early return above).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.variants.nodes])

  function select(variant: ProductVariant) {
    setSelectedVariant(variant)
    // Shallow update only — no scroll jump, no full navigation. Shareable
    // deep link: `?variant=<id>` rehydrates the same selected state on
    // refresh (reconciled by the useEffect above on the client — the server
    // now renders the default variant, so it no longer needs to read `?variant`).
    router.replace(`${pathname}?variant=${encodeURIComponent(variant.id)}`, { scroll: false })
  }

  return { selectedVariant, select, galleryImages, activeImg, setActiveImg, isMultiColor }
}
