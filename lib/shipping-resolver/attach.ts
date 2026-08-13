import 'server-only'
import type { CollectionProduct } from '@/lib/shopify/types'
import { resolveCardShippingDisplay } from './resolve'
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
  }))
}
