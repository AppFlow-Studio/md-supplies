import { getShippingFactsData } from './data'
import { SHIPPING_FALLBACK_MESSAGE, SHIPPING_CLASS_COPY } from './copy'
import type { PublicDisplayClass } from './schema'

export interface ShippingDisplay {
  class: PublicDisplayClass
  message: string
  displayCopy: string | null
}

const FALLBACK: ShippingDisplay = {
  class: 'unknown',
  message: SHIPPING_FALLBACK_MESSAGE,
  displayCopy: null,
}

function buildDisplay(publicDisplayClass: PublicDisplayClass, displayCopy: string | null): ShippingDisplay {
  return {
    class: publicDisplayClass,
    message: SHIPPING_CLASS_COPY[publicDisplayClass] ?? SHIPPING_FALLBACK_MESSAGE,
    displayCopy,
  }
}

export function resolveVariantShippingDisplay(productGid: string, variantGid: string): ShippingDisplay {
  const data = getShippingFactsData()
  if (!data.ok || data.duplicateVariantGids.has(variantGid)) return FALLBACK

  const product = data.productsByGid.get(productGid)
  if (!product || product.hold) return FALLBACK

  const variant = product.variants[variantGid]
  if (!variant) return FALLBACK

  return buildDisplay(variant.public_display_class, product.display_copy)
}

export function resolveCardShippingDisplay(productGid: string): ShippingDisplay {
  const data = getShippingFactsData()
  if (!data.ok) return FALLBACK

  const product = data.productsByGid.get(productGid)
  if (!product || product.hold) return FALLBACK

  const classes = new Set(Object.values(product.variants).map((v) => v.public_display_class))
  if (classes.size !== 1) return FALLBACK

  const [sharedClass] = classes
  return buildDisplay(sharedClass, product.display_copy)
}

export function resolveVariantsForProduct(productGid: string): Record<string, ShippingDisplay> {
  const data = getShippingFactsData()
  const out: Record<string, ShippingDisplay> = {}
  if (!data.ok) return out

  const product = data.productsByGid.get(productGid)
  if (!product) return out

  for (const [variantGid, variant] of Object.entries(product.variants)) {
    out[variantGid] =
      product.hold || data.duplicateVariantGids.has(variantGid)
        ? FALLBACK
        : buildDisplay(variant.public_display_class, product.display_copy)
  }
  return out
}
