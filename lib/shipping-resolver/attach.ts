import 'server-only'
import type { CollectionProduct } from '@/lib/shopify/types'
import { resolveCardShippingDisplay, resolveVariantShippingDisplay } from './resolve'
import { isShippingResolverEnabled } from './flag'
import { gateFreeShippingClaim } from './free-shipping-gate'

export function attachCardShippingDisplay(products: CollectionProduct[]): CollectionProduct[] {
  if (!isShippingResolverEnabled()) return products
  return products.map((product) => ({
    ...product,
    // DEV-SHIP-02: custom.free_shipping ANDs with the resolver's own
    // standard-free confirmation — it can only narrow, never widen, so this
    // is safe to apply unconditionally to every card surface (category,
    // OCC, search, industry, partner, homepage, recs, Quick Add all read
    // this same attached field).
    shippingDisplay: gateFreeShippingClaim(resolveCardShippingDisplay(product.id), product.freeShipping),
    // Bilal, 2026-09-14: the aggregate above collapses to FALLBACK whenever a
    // product's variants disagree on class (resolveCardShippingDisplay's own
    // "every variant must agree" conservatism) — exactly the B2080C-class
    // case where one variant legitimately ships free and a sibling doesn't.
    // Quick Add has a real variant picker, so it gets each variant's own
    // resolver-confirmed class, gated by that SAME variant's own
    // custom.free_shipping (falling back to the product-level value when the
    // variant has none of its own — same rule as backorder).
    variants: {
      nodes: product.variants.nodes.map((v) => ({
        ...v,
        shippingDisplay: gateFreeShippingClaim(
          resolveVariantShippingDisplay(product.id, v.id),
          v.freeShipping ?? product.freeShipping,
        ),
      })),
    },
  }))
}
