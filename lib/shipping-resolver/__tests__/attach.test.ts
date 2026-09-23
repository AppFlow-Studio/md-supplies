import { describe, it, expect, afterEach, vi } from 'vitest'
import { __resetShippingFactsCacheForTests } from '../data'
import { VALID } from './fixtures'
import { attachCardShippingDisplay } from '../attach'
import type { CollectionProduct } from '@/lib/shopify/types'

const VALID_FIXTURE = VALID.path
const VALID_CHECKSUM = VALID.checksum

function stubProduct(
  id: string,
  freeShipping?: { value: string } | null,
  variants: CollectionProduct['variants']['nodes'] = [],
): CollectionProduct {
  return {
    id,
    title: 'Test',
    handle: 'test',
    vendor: 'Test Vendor',
    availableForSale: true,
    tags: [],
    priceRange: { minVariantPrice: { amount: '1.00', currencyCode: 'USD' }, maxVariantPrice: { amount: '10.00', currencyCode: 'USD' } },
    images: { nodes: [] },
    variants: { nodes: variants },
    freeShipping,
  }
}

function stubVariant(id: string, freeShipping?: { value: string } | null): CollectionProduct['variants']['nodes'][number] {
  return {
    id,
    title: id,
    price: { amount: '10.00', currencyCode: 'USD' },
    compareAtPrice: null,
    availableForSale: true,
    quantityAvailable: 10,
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

  // Bilal, 2026-09-14: Quick Add has a real variant picker — the card-level
  // aggregate above collapses to FALLBACK whenever a product's variants
  // disagree on class, which is exactly the B2080C-class case (one variant
  // legitimately ships free, a sibling doesn't). This fixture product is a
  // genuine "multi_mixed" case: one variant resolves `unknown`, the other
  // resolves `standard-free`.
  describe('per-variant shippingDisplay (Quick Add)', () => {
    const MIXED_PRODUCT_ID = 'gid://shopify/Product/8651920310488'
    const UNKNOWN_VARIANT_ID = 'gid://shopify/ProductVariant/46997944238296' // resolves `unknown`
    const FREE_VARIANT_ID = 'gid://shopify/ProductVariant/51930534117592' // resolves `standard-free`

    function setup() {
      vi.stubEnv('SHIPPING_RESOLVER_ENABLED', 'true')
      vi.stubEnv('SHIPPING_FACTS_PATH', VALID_FIXTURE)
      vi.stubEnv('SHIPPING_FACTS_CHECKSUM_SHA256', VALID_CHECKSUM)
      vi.stubEnv('SHOPIFY_ALLOWED_SHOP_DOMAIN', VALID.store)
    }

    it("gives each variant its own resolved class, even though the card aggregate falls back to unknown", () => {
      setup()
      const product = stubProduct(MIXED_PRODUCT_ID, { value: 'true' }, [
        stubVariant(UNKNOWN_VARIANT_ID, { value: 'true' }),
        stubVariant(FREE_VARIANT_ID, { value: 'true' }),
      ])
      const result = attachCardShippingDisplay([product])[0]

      expect(result.shippingDisplay?.class).toBe('unknown') // card aggregate: variants disagree
      const nodes = Object.fromEntries(result.variants.nodes.map((v) => [v.id, v]))
      expect(nodes[UNKNOWN_VARIANT_ID].shippingDisplay?.class).toBe('unknown')
      expect(nodes[FREE_VARIANT_ID].shippingDisplay?.class).toBe('standard-free')
    })

    it("gates a variant's own standard-free claim with that SAME variant's own custom.free_shipping", () => {
      setup()
      const product = stubProduct(MIXED_PRODUCT_ID, { value: 'true' }, [
        stubVariant(FREE_VARIANT_ID, { value: 'false' }),
      ])
      const result = attachCardShippingDisplay([product])[0]
      expect(result.variants.nodes[0].shippingDisplay?.class).toBe('unknown')
    })

    it("falls back to the product-level custom.free_shipping when the variant has none of its own", () => {
      setup()
      const product = stubProduct(MIXED_PRODUCT_ID, { value: 'true' }, [
        stubVariant(FREE_VARIANT_ID), // no freeShipping of its own
      ])
      const result = attachCardShippingDisplay([product])[0]
      expect(result.variants.nodes[0].shippingDisplay?.class).toBe('standard-free')
    })
  })
})
