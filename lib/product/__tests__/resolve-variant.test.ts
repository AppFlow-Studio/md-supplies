import { describe, it, expect } from 'vitest'
import { resolveInitialVariant } from '../resolve-variant'

const variants = [
  { id: 'gid://shopify/ProductVariant/1', price: { amount: '9.99' }, availableForSale: true },
  { id: 'gid://shopify/ProductVariant/2', price: { amount: '12.99' }, availableForSale: true },
]

describe('resolveInitialVariant (LG-03)', () => {
  it('resolves the variant matching a valid ?variant= id', () => {
    expect(resolveInitialVariant(variants, 'gid://shopify/ProductVariant/2').id).toBe(
      'gid://shopify/ProductVariant/2',
    )
  })

  it('falls back to the default variant when the id does not match any variant', () => {
    expect(resolveInitialVariant(variants, 'gid://shopify/ProductVariant/does-not-exist').id).toBe(
      variants[0].id,
    )
  })

  it('falls back to the default variant when no id is given', () => {
    expect(resolveInitialVariant(variants).id).toBe(variants[0].id)
  })

  it('falls back to the default variant for an empty-string id', () => {
    expect(resolveInitialVariant(variants, '').id).toBe(variants[0].id)
  })

  // getDefaultVariant (lib/purchasability.ts) prefers a purchasable variant —
  // confirms resolveInitialVariant's fallback actually delegates to it rather
  // than just returning variants[0].
  it('fallback still prefers a purchasable variant over a $0/quote-only variants[0]', () => {
    const withUnpriced = [
      { id: 'unpriced', price: { amount: '0' }, availableForSale: true },
      { id: 'purchasable', price: { amount: '5.00' }, availableForSale: true },
    ]
    expect(resolveInitialVariant(withUnpriced, undefined).id).toBe('purchasable')
  })
})
