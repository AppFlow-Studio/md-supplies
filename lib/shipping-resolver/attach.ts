import 'server-only'
import type { CollectionProduct } from '@/lib/shopify/types'
import { resolveCardShippingDisplay } from './resolve'
import { isShippingResolverEnabled } from './flag'

export function attachCardShippingDisplay(products: CollectionProduct[]): CollectionProduct[] {
  if (!isShippingResolverEnabled()) return products
  return products.map((product) => ({
    ...product,
    shippingDisplay: resolveCardShippingDisplay(product.id),
  }))
}
