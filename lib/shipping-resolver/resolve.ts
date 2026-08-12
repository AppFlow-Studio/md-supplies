import { getShippingFactsData } from './data'
import { SHIPPING_FALLBACK_MESSAGE, SHIPPING_CLASS_COPY } from './copy'
import { isRatesOnlyClaimEnabled } from './flag'
import type { PublicDisplayClass, VariantRecord } from './schema'

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

// RATES_ONLY_SHOWS_CLAIM: a `standard-free` classification is only trusted as
// a Free Shipping claim when the underlying rate math independently confirms
// it. `effective_rate_class` is read here ONLY to gate the claim — it never
// crosses into ShippingDisplay, the type exposed to the UI (see module-level
// comment: "unsafe" fields are deliberately never exposed).
function ratesConfirmFree(variant: VariantRecord): boolean {
  return variant.effective_rate_class === 'FREE'
}

function claimIsRatesGated(publicDisplayClass: PublicDisplayClass): boolean {
  return publicDisplayClass === 'standard-free' && isRatesOnlyClaimEnabled()
}

export function resolveVariantShippingDisplay(productGid: string, variantGid: string): ShippingDisplay {
  const data = getShippingFactsData()
  if (!data.ok || data.duplicateVariantGids.has(variantGid)) return FALLBACK

  const product = data.productsByGid.get(productGid)
  if (!product || product.hold) return FALLBACK

  const variant = product.variants[variantGid]
  if (!variant) return FALLBACK

  if (claimIsRatesGated(variant.public_display_class) && !ratesConfirmFree(variant)) return FALLBACK

  // Variant class pairs with the VARIANT's own copy. 41 variants in the full
  // package carry copy their product does not, so reading copy from the parent
  // would drop approved wording for those and, where the two disagree, could
  // caption one variant with a sibling's terms.
  return buildDisplay(variant.public_display_class, variant.display_copy)
}

export function resolveCardShippingDisplay(productGid: string): ShippingDisplay {
  const data = getShippingFactsData()
  if (!data.ok) return FALLBACK

  const product = data.productsByGid.get(productGid)
  if (!product || product.hold) return FALLBACK

  const variants = Object.values(product.variants)
  const classes = new Set(variants.map((v) => v.public_display_class))
  if (classes.size !== 1) return FALLBACK

  const [sharedClass] = classes
  // Card-level claim requires EVERY variant's rate math to confirm FREE, not
  // just the shared display class — mirrors the existing "all variants must
  // agree" conservatism already in this function.
  if (claimIsRatesGated(sharedClass) && !variants.every(ratesConfirmFree)) return FALLBACK

  return buildDisplay(sharedClass, product.display_copy)
}

export function resolveVariantsForProduct(productGid: string): Record<string, ShippingDisplay> {
  const data = getShippingFactsData()
  const out: Record<string, ShippingDisplay> = {}
  if (!data.ok) return out

  const product = data.productsByGid.get(productGid)
  if (!product) return out

  for (const [variantGid, variant] of Object.entries(product.variants)) {
    const gatedOut =
      product.hold ||
      data.duplicateVariantGids.has(variantGid) ||
      (claimIsRatesGated(variant.public_display_class) && !ratesConfirmFree(variant))
    out[variantGid] = gatedOut ? FALLBACK : buildDisplay(variant.public_display_class, variant.display_copy)
  }
  return out
}
