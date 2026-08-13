import { describe, it, expect } from 'vitest'
import {
  hasUsablePrice,
  resolvePurchasable,
  purchasabilityLabel,
  purchasabilityCta,
  blockedCartLines,
  blockedCheckoutMessage,
  getDefaultVariant,
  type CartLineLike,
  type VariantForDefault,
} from '../purchasability'

/**
 * Phase 11. Catalog audit 2026-08-02: 41 ACTIVE variants have price <= 0
 * (55 across all statuses), several titled "… Order For Pricing". A zero-price
 * line must never reach checkout, and it must NOT be reported as an
 * out-of-stock or no-rate problem — those are different states.
 */

describe('hasUsablePrice', () => {
  it('accepts only positive finite numbers', () => {
    expect(hasUsablePrice(19.99)).toBe(true)
    expect(hasUsablePrice(0.01)).toBe(true)
  })

  it('rejects zero, negative, missing and non-finite prices', () => {
    for (const v of [0, -0, -5, null, undefined, NaN, Infinity, -Infinity]) {
      expect(hasUsablePrice(v as number | null | undefined), `value ${String(v)}`).toBe(false)
    }
  })
})

describe('resolvePurchasable', () => {
  it('is purchasable when priced and available', () => {
    expect(resolvePurchasable({ price: 12.5, availableForSale: true })).toEqual({ purchasable: true })
  })

  it('blocks a zero-price variant as price-unavailable, NOT out-of-stock', () => {
    const state = resolvePurchasable({ price: 0, availableForSale: true })
    expect(state).toEqual({ purchasable: false, reason: 'price-unavailable' })
  })

  it('reports price-unavailable even when the item is also out of stock', () => {
    // Price is checked first so the shopper sees the actionable reason.
    const state = resolvePurchasable({ price: 0, availableForSale: false })
    expect(state).toEqual({ purchasable: false, reason: 'price-unavailable' })
  })

  it('blocks an out-of-stock variant that has a real price', () => {
    expect(resolvePurchasable({ price: 12.5, availableForSale: false }))
      .toEqual({ purchasable: false, reason: 'out-of-stock' })
  })

  it('fails closed when price is missing entirely', () => {
    expect(resolvePurchasable({ availableForSale: true }).purchasable).toBe(false)
  })
})

describe('labels keep the states distinct', () => {
  it('never labels a pricing problem as a stock problem', () => {
    expect(purchasabilityLabel('price-unavailable')).toBe('Contact for pricing')
    expect(purchasabilityCta('price-unavailable')).toBe('Request pricing')
    expect(purchasabilityLabel('out-of-stock')).toBe('Out of Stock')
    expect(purchasabilityCta('out-of-stock')).toBe('Out of Stock')
  })
})

describe('blockedCartLines', () => {
  const line = (amount: string | null | undefined, title = 'Item'): CartLineLike => ({
    quantity: 1,
    merchandise: {
      id: `gid://v/${title}`,
      title,
      price: amount === undefined ? undefined : amount === null ? null : { amount },
      product: { title },
    },
  })

  it('passes a normally priced cart', () => {
    expect(blockedCartLines([line('19.99'), line('5.00')])).toEqual([])
  })

  it('blocks zero-price and missing-price lines and names them', () => {
    const blocked = blockedCartLines([line('19.99', 'Gloves'), line('0.00', 'Xylocaine'), line(null, 'Mystery')])
    expect(blocked.map((b) => b.title)).toEqual(['Xylocaine', 'Mystery'])
    expect(blocked.every((b) => b.reason === 'price-unavailable')).toBe(true)
  })

  it('blocks an unparseable amount rather than treating it as free', () => {
    expect(blockedCartLines([line('not-a-number')])).toHaveLength(1)
  })

  it('handles a completely absent price object', () => {
    expect(blockedCartLines([line(undefined)])).toHaveLength(1)
  })

  // DEV-LAUNCH-09: a line Shopify can't ship to the destination also zeroes
  // out its cost.totalAmount while the variant's own price stays positive.
  // blockedCartLines must not catch that case and mislabel it a pricing
  // problem — that's lib/shopify/cart-lines.ts#unshippableCartLines' job.
  it('does not block a priced line whose cost happens to be zero (that is a shipping problem, not a pricing one)', () => {
    const priced: CartLineLike = {
      quantity: 1,
      merchandise: { id: 'gid://v/NoRate', title: 'No Rate', price: { amount: '9.99' }, product: { title: 'No Rate' } },
    }
    expect(blockedCartLines([priced])).toEqual([])
  })
})

describe('blockedCheckoutMessage', () => {
  it('is empty when nothing is blocked', () => {
    expect(blockedCheckoutMessage([])).toBe('')
  })

  it('names the single offending item and says what to do', () => {
    const msg = blockedCheckoutMessage([{ id: '1', title: 'Xylocaine', reason: 'price-unavailable' }])
    expect(msg).toContain('Xylocaine')
    expect(msg).toContain('priced on request')
    // Never implies a stock or shipping problem.
    expect(msg.toLowerCase()).not.toContain('out of stock')
    expect(msg.toLowerCase()).not.toContain('shipping')
  })

  it('lists every offending item when several are blocked', () => {
    const msg = blockedCheckoutMessage([
      { id: '1', title: 'Xylocaine', reason: 'price-unavailable' },
      { id: '2', title: 'Bupivacaine', reason: 'price-unavailable' },
    ])
    expect(msg).toContain('Xylocaine')
    expect(msg).toContain('Bupivacaine')
  })
})

describe('getDefaultVariant', () => {
  // DEV-LAUNCH-12: this is the single source both the rendered PDP
  // (ProductView) and its Product structured data (app/product/[slug]/page.tsx)
  // must build from, or the two can disagree on price/SKU/availability for
  // the same page.
  function variant(overrides: Partial<VariantForDefault> = {}): VariantForDefault {
    return { price: { amount: '19.99' }, availableForSale: true, ...overrides }
  }

  it('skips a leading $0/quote-only variant in favor of a purchasable one', () => {
    const zero = variant({ price: { amount: '0' } })
    const purchasable = variant({ price: { amount: '25' } })
    expect(getDefaultVariant([zero, purchasable])).toBe(purchasable)
  })

  it('skips a leading out-of-stock variant in favor of a purchasable one', () => {
    const oos = variant({ availableForSale: false })
    const purchasable = variant()
    expect(getDefaultVariant([oos, purchasable])).toBe(purchasable)
  })

  it('falls back to the first available (but unpurchasable) variant when none is purchasable', () => {
    const unpricedAndOos = variant({ price: { amount: '0' }, availableForSale: false })
    const unpricedButAvailable = variant({ price: { amount: '0' }, availableForSale: true })
    expect(getDefaultVariant([unpricedAndOos, unpricedButAvailable])).toBe(unpricedButAvailable)
  })

  it('falls back to variants[0] when nothing is purchasable or available', () => {
    const first = variant({ price: { amount: '0' }, availableForSale: false })
    const second = variant({ price: { amount: '0' }, availableForSale: false })
    expect(getDefaultVariant([first, second])).toBe(first)
  })

  it('returns the sole variant unchanged when it is already purchasable', () => {
    const only = variant()
    expect(getDefaultVariant([only])).toBe(only)
  })
})
