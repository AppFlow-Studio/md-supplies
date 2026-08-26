import 'server-only'
import type { Cart } from '@/lib/shopify/types'
import { resolveVariantShippingDisplay } from './resolve'
import { isShippingResolverEnabled } from './flag'
import { gateFreeShippingClaim } from './free-shipping-gate'

export function attachCartShippingDisplay(cart: Cart): Cart {
  if (!isShippingResolverEnabled()) return cart
  return {
    ...cart,
    lines: {
      nodes: cart.lines.nodes.map((line) => ({
        ...line,
        // DEV-SHIP-02: same AND-gate as attachCardShippingDisplay, keyed on
        // this line's own product so the cart popup and cart page can never
        // disagree with the card/PDP the shopper added from.
        shippingDisplay: gateFreeShippingClaim(
          resolveVariantShippingDisplay(line.merchandise.product.id, line.merchandise.id),
          line.merchandise.product.freeShipping,
        ),
      })),
    },
  }
}
