import { describe, it, expect, afterEach, vi } from 'vitest'
import { join } from 'node:path'
import { __resetShippingFactsCacheForTests } from '../data'
import { attachCartShippingDisplay } from '../cart'
import type { Cart } from '@/lib/shopify/types'

const VALID_FIXTURE = join(__dirname, 'fixtures/valid-payload.json')
const VALID_CHECKSUM = '802f0070e6c122f26afd465d2058f4de6b29dcdd4ec6e0e29e418e2474c47d53'

function stubCart(productId: string, variantId: string): Cart {
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
            selectedOptions: [],
            product: {
              id: productId,
              title: 'Test',
              handle: 'test',
              vendor: 'Test Vendor',
              tags: [],
              images: { nodes: [] },
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

  it('attaches a resolved shippingDisplay to each line when the flag is enabled', () => {
    vi.stubEnv('SHIPPING_RESOLVER_ENABLED', 'true')
    vi.stubEnv('SHIPPING_FACTS_PATH', VALID_FIXTURE)
    vi.stubEnv('SHIPPING_FACTS_CHECKSUM_SHA256', VALID_CHECKSUM)
    const cart = stubCart('gid://shopify/Product/8651919917272', 'gid://shopify/ProductVariant/46997871591640')
    const result = attachCartShippingDisplay(cart)
    expect(result.lines.nodes[0].shippingDisplay?.class).toBe('standard-free')
  })
})
