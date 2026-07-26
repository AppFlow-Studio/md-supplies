import 'server-only'
import type { Cart } from '@/lib/shopify/types'
import { resolveVariantShippingDisplay } from './resolve'
import { isShippingResolverEnabled } from './flag'

export function attachCartShippingDisplay(cart: Cart): Cart {
  if (!isShippingResolverEnabled()) return cart
  return {
    ...cart,
    lines: {
      nodes: cart.lines.nodes.map((line) => ({
        ...line,
        shippingDisplay: resolveVariantShippingDisplay(line.merchandise.product.id, line.merchandise.id),
      })),
    },
  }
}
