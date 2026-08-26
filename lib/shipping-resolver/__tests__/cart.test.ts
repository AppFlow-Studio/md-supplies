import { describe, it, expect, afterEach, vi } from 'vitest'
import { __resetShippingFactsCacheForTests } from '../data'
import { VALID } from './fixtures'
import { attachCartShippingDisplay } from '../cart'
import type { Cart } from '@/lib/shopify/types'

const VALID_FIXTURE = VALID.path
const VALID_CHECKSUM = VALID.checksum

function stubCart(productId: string, variantId: string, freeShipping?: { value: string } | null): Cart {
  return {
    id: 'gid://shopify/Cart/1',
    checkoutUrl: 'https://example.com/checkout',
    totalQuantity: 1,
    attributes: [],
    buyerIdentity: null,
    lines: {
      nodes: [
        {
          id: 'gid://shopify/CartLine/1',
          quantity: 1,
          merchandise: {
            id: variantId,
            title: 'Default Title',
            sku: 'SKU',
            price: { amount: '1.00', currencyCode: 'USD' },
            selectedOptions: [],
            product: {
              id: productId,
              title: 'Test',
              handle: 'test',
              vendor: 'Test Vendor',
              tags: [],
              images: { nodes: [] },
              freeShipping,
            },
          },
          cost: { totalAmount: { amount: '1.00', currencyCode: 'USD' } },
        },
      ],
    },
    cost: {
      subtotalAmount: { amount: '1.00', currencyCode: 'USD' },
      totalAmount: { amount: '1.00', currencyCode: 'USD' },
      totalTaxAmount: null,
    },
  }
}

afterEach(() => {
  vi.unstubAllEnvs()
  __resetShippingFactsCacheForTests()
})

describe('attachCartShippingDisplay', () => {
  it('returns the cart unchanged when the flag is disabled', () => {
    vi.stubEnv('SHIPPING_RESOLVER_ENABLED', 'false')
    const cart = stubCart('gid://shopify/Product/8651919917272', 'gid://shopify/ProductVariant/46997871591640')
    const result = attachCartShippingDisplay(cart)
    expect(result).toBe(cart)
    expect(result.lines.nodes[0].shippingDisplay).toBeUndefined()
  })

  it('attaches a resolved shippingDisplay to each line when the flag is enabled and custom.free_shipping is true', () => {
    vi.stubEnv('SHIPPING_RESOLVER_ENABLED', 'true')
    vi.stubEnv('SHIPPING_FACTS_PATH', VALID_FIXTURE)
    vi.stubEnv('SHIPPING_FACTS_CHECKSUM_SHA256', VALID_CHECKSUM)
    vi.stubEnv('SHOPIFY_ALLOWED_SHOP_DOMAIN', VALID.store)
    // DEV-SHIP-02: attachCartShippingDisplay now ANDs the resolver's own
    // confirmation with custom.free_shipping — this fixture product resolves
    // standard-free, so it also needs the metafield true to surface as one.
    const cart = stubCart('gid://shopify/Product/8651919917272', 'gid://shopify/ProductVariant/46997871591640', { value: 'true' })
    const result = attachCartShippingDisplay(cart)
    expect(result.lines.nodes[0].shippingDisplay?.class).toBe('standard-free')
  })

  // DEV-SHIP-02: custom.free_shipping ANDs with the resolver's own
  // confirmation. This is the single choke point behind both the cart
  // popup and the cart page — both read CartLine.shippingDisplay as
  // attached here.
  describe('custom.free_shipping gate', () => {
    const PRODUCT_ID = 'gid://shopify/Product/8651919917272' // resolves standard-free
    const VARIANT_ID = 'gid://shopify/ProductVariant/46997871591640'
    const THRESHOLD_PRODUCT_ID = 'gid://shopify/Product/8670729830616' // resolves threshold
    const THRESHOLD_VARIANT_ID = 'gid://shopify/ProductVariant/48197143396568'

    function setup() {
      vi.stubEnv('SHIPPING_RESOLVER_ENABLED', 'true')
      vi.stubEnv('SHIPPING_FACTS_PATH', VALID_FIXTURE)
      vi.stubEnv('SHIPPING_FACTS_CHECKSUM_SHA256', VALID_CHECKSUM)
      vi.stubEnv('SHOPIFY_ALLOWED_SHOP_DOMAIN', VALID.store)
    }

    it('keeps the standard-free claim on a cart line when custom.free_shipping is true', () => {
      setup()
      const cart = stubCart(PRODUCT_ID, VARIANT_ID, { value: 'true' })
      expect(attachCartShippingDisplay(cart).lines.nodes[0].shippingDisplay?.class).toBe('standard-free')
    })

    it('downgrades a resolver-confirmed standard-free line to the fallback when the boolean is false/null/missing', () => {
      setup()
      expect(attachCartShippingDisplay(stubCart(PRODUCT_ID, VARIANT_ID, { value: 'false' })).lines.nodes[0].shippingDisplay?.class).toBe('unknown')
      expect(attachCartShippingDisplay(stubCart(PRODUCT_ID, VARIANT_ID, null)).lines.nodes[0].shippingDisplay?.class).toBe('unknown')
      expect(attachCartShippingDisplay(stubCart(PRODUCT_ID, VARIANT_ID)).lines.nodes[0].shippingDisplay?.class).toBe('unknown')
    })

    it('never overrides a non-standard-free resolver result on a cart line, in either direction', () => {
      setup()
      const trueLine = stubCart(THRESHOLD_PRODUCT_ID, THRESHOLD_VARIANT_ID, { value: 'true' })
      expect(attachCartShippingDisplay(trueLine).lines.nodes[0].shippingDisplay?.class).toBe('threshold')
      const falseLine = stubCart(THRESHOLD_PRODUCT_ID, THRESHOLD_VARIANT_ID, { value: 'false' })
      expect(attachCartShippingDisplay(falseLine).lines.nodes[0].shippingDisplay?.class).toBe('threshold')
    })
  })
})
