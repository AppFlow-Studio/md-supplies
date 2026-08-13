import { describe, it, expect, afterEach, vi } from 'vitest'
import { __resetShippingFactsCacheForTests } from '../data'
import { VALID } from './fixtures'
import { attachCardShippingDisplay } from '../attach'
import type { CollectionProduct } from '@/lib/shopify/types'

const VALID_FIXTURE = VALID.path
const VALID_CHECKSUM = VALID.checksum

function stubProduct(id: string, freeShipping?: { value: string } | null): CollectionProduct {
  return {
    id,
    title: 'Test',
    handle: 'test',
    vendor: 'Test Vendor',
    availableForSale: true,
    tags: [],
    priceRange: { minVariantPrice: { amount: '1.00', currencyCode: 'USD' }, maxVariantPrice: { amount: '10.00', currencyCode: 'USD' } },
    images: { nodes: [] },
    variants: { nodes: [] },
    freeShipping,
  }
}

afterEach(() => {
  vi.unstubAllEnvs()
  __resetShippingFactsCacheForTests()
})

describe('attachCardShippingDisplay', () => {
  it('returns products unchanged when the flag is disabled', () => {
    vi.stubEnv('SHIPPING_RESOLVER_ENABLED', 'false')
    const products = [stubProduct('gid://shopify/Product/8651919917272')]
    const result = attachCardShippingDisplay(products)
    expect(result).toBe(products)
    expect(result[0].shippingDisplay).toBeUndefined()
  })

  it('attaches a resolved shippingDisplay to each product when the flag is enabled and custom.free_shipping is true', () => {
    vi.stubEnv('SHIPPING_RESOLVER_ENABLED', 'true')
    vi.stubEnv('SHIPPING_FACTS_PATH', VALID_FIXTURE)
    vi.stubEnv('SHIPPING_FACTS_CHECKSUM_SHA256', VALID_CHECKSUM)
    vi.stubEnv('SHOPIFY_ALLOWED_SHOP_DOMAIN', VALID.store)
    // DEV-SHIP-02: attachCardShippingDisplay now ANDs the resolver's own
    // confirmation with custom.free_shipping — this fixture product resolves
    // standard-free, so it also needs the metafield true to surface as one.
    const products = [stubProduct('gid://shopify/Product/8651919917272', { value: 'true' })]
    const result = attachCardShippingDisplay(products)
    expect(result[0].shippingDisplay?.class).toBe('standard-free')
  })

  // DEV-SHIP-02: custom.free_shipping ANDs with the resolver's own
  // confirmation. This is the single choke point behind category cards,
  // homepage cards, recommendations, and Quick Add — all four read
  // CollectionProduct.shippingDisplay as attached here, so covering it here
  // covers all four surfaces at the data-mechanism level.
  describe('custom.free_shipping gate', () => {
    const PRODUCT_ID = 'gid://shopify/Product/8651919917272' // resolves standard-free
    const THRESHOLD_PRODUCT_ID = 'gid://shopify/Product/8670729830616' // resolves threshold

    function setup() {
      vi.stubEnv('SHIPPING_RESOLVER_ENABLED', 'true')
      vi.stubEnv('SHIPPING_FACTS_PATH', VALID_FIXTURE)
      vi.stubEnv('SHIPPING_FACTS_CHECKSUM_SHA256', VALID_CHECKSUM)
      vi.stubEnv('SHOPIFY_ALLOWED_SHOP_DOMAIN', VALID.store)
    }

    it('keeps the standard-free claim when custom.free_shipping is true', () => {
      setup()
      const result = attachCardShippingDisplay([stubProduct(PRODUCT_ID, { value: 'true' })])
      expect(result[0].shippingDisplay?.class).toBe('standard-free')
    })

    it('downgrades a resolver-confirmed standard-free product to the fallback when the boolean is false/null/missing', () => {
      setup()
      expect(attachCardShippingDisplay([stubProduct(PRODUCT_ID, { value: 'false' })])[0].shippingDisplay?.class).toBe('unknown')
      expect(attachCardShippingDisplay([stubProduct(PRODUCT_ID, null)])[0].shippingDisplay?.class).toBe('unknown')
      expect(attachCardShippingDisplay([stubProduct(PRODUCT_ID)])[0].shippingDisplay?.class).toBe('unknown')
    })

    it('never overrides a non-standard-free resolver result, in either direction', () => {
      setup()
      expect(attachCardShippingDisplay([stubProduct(THRESHOLD_PRODUCT_ID, { value: 'true' })])[0].shippingDisplay?.class).toBe('threshold')
      expect(attachCardShippingDisplay([stubProduct(THRESHOLD_PRODUCT_ID, { value: 'false' })])[0].shippingDisplay?.class).toBe('threshold')
    })
  })
})
