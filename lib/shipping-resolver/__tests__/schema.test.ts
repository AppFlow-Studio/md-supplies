import { describe, it, expect } from 'vitest'
import { shippingFactsSchema } from '../schema'

function validProduct(overrides: Record<string, unknown> = {}) {
  return {
    handle: 'test',
    title: 'Test',
    diagnostic_status: 'clean_free',
    public_display_class: 'standard-free',
    display_copy: null,
    hold: false,
    hold_reason: null,
    canada_status: 'n/a',
    variants: {
      'gid://shopify/ProductVariant/1': {
        sku: 'SKU1',
        effective_rate_class: 'FREE',
        diagnostic_status: 'clean_free',
        public_display_class: 'standard-free',
        display_copy: null,
      },
    },
    ...overrides,
  }
}

function payload(products: Record<string, unknown>) {
  return {
    _meta: { schema_version: 'v3.0' },
    delivery_profiles: [],
    products,
  }
}

describe('shippingFactsSchema', () => {
  it('accepts a minimal valid payload', () => {
    const result = shippingFactsSchema.safeParse(
      payload({ 'gid://shopify/Product/1': validProduct() }),
    )
    expect(result.success).toBe(true)
  })

  it('accepts every documented public_display_class value', () => {
    for (const cls of ['standard-free', 'threshold', 'standard-paid', 'manual-quote', 'unknown']) {
      const result = shippingFactsSchema.safeParse(
        payload({ 'gid://shopify/Product/1': validProduct({ public_display_class: cls }) }),
      )
      expect(result.success, `class ${cls} should be valid`).toBe(true)
    }
  })

  it('rejects an invalid public_display_class value', () => {
    const result = shippingFactsSchema.safeParse(
      payload({ 'gid://shopify/Product/1': validProduct({ public_display_class: 'totally-free-no-catch' }) }),
    )
    expect(result.success).toBe(false)
  })

  it('rejects a payload missing required product fields', () => {
    const result = shippingFactsSchema.safeParse(
      payload({ 'gid://shopify/Product/1': { handle: 'test' } }),
    )
    expect(result.success).toBe(false)
  })

  it('rejects a payload missing the top-level products key', () => {
    const result = shippingFactsSchema.safeParse({
      _meta: { schema_version: 'v3.0' },
      delivery_profiles: [],
    })
    expect(result.success).toBe(false)
  })

  it('allows unknown extra fields on product and variant records (passthrough)', () => {
    const result = shippingFactsSchema.safeParse(
      payload({
        'gid://shopify/Product/1': validProduct({ some_future_field: 'x' }),
      }),
    )
    expect(result.success).toBe(true)
  })
})
