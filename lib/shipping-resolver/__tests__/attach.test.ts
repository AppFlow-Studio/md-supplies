import { describe, it, expect, afterEach, vi } from 'vitest'
import { __resetShippingFactsCacheForTests } from '../data'
import { VALID } from './fixtures'
import { attachCardShippingDisplay } from '../attach'
import type { CollectionProduct } from '@/lib/shopify/types'

const VALID_FIXTURE = VALID.path
const VALID_CHECKSUM = VALID.checksum

function stubProduct(id: string): CollectionProduct {
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

  it('attaches a resolved shippingDisplay to each product when the flag is enabled', () => {
    vi.stubEnv('SHIPPING_RESOLVER_ENABLED', 'true')
    vi.stubEnv('SHIPPING_FACTS_PATH', VALID_FIXTURE)
    vi.stubEnv('SHIPPING_FACTS_CHECKSUM_SHA256', VALID_CHECKSUM)
    vi.stubEnv('SHOPIFY_ALLOWED_SHOP_DOMAIN', VALID.store)
    const products = [stubProduct('gid://shopify/Product/8651919917272')]
    const result = attachCardShippingDisplay(products)
    expect(result[0].shippingDisplay?.class).toBe('standard-free')
  })
})
