import { describe, it, expect } from 'vitest'
import {
  hasUsablePrice,
  resolvePurchasable,
  purchasabilityLabel,
  purchasabilityCta,
  blockedCartLines,
  blockedCheckoutMessage,
  type CartLineLike,
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
    cost: amount === undefined ? undefined : { totalAmount: amount === null ? null : { amount } },
    merchandise: { id: `gid://v/${title}`, title, product: { title } },
  })

  it('passes a normally priced cart', () => {
    expect(blockedCartLines([line('19.99'), line('5.00')])).toEqual([])
  })

  it('blocks zero-total and missing-total lines and names them', () => {
    const blocked = blockedCartLines([line('19.99', 'Gloves'), line('0.00', 'Xylocaine'), line(null, 'Mystery')])
    expect(blocked.map((b) => b.title)).toEqual(['Xylocaine', 'Mystery'])
    expect(blocked.every((b) => b.reason === 'price-unavailable')).toBe(true)
  })

  it('blocks an unparseable amount rather than treating it as free', () => {
    expect(blockedCartLines([line('not-a-number')])).toHaveLength(1)
  })

  it('handles a completely absent cost object', () => {
    expect(blockedCartLines([line(undefined)])).toHaveLength(1)
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
