import { describe, it, expect, vi, afterEach } from 'vitest'
import { findMissingMerchandise, CART_LINE_MISSING_MESSAGE } from '../cart-lines'
import type { Cart } from '../types'

const VARIANT_A = 'gid://shopify/ProductVariant/1'
const VARIANT_B = 'gid://shopify/ProductVariant/2'

/** A cart holding the given merchandise GIDs, one line each. */
function cartWith(lines: Array<{ id: string; quantity: number }>): Cart {
  return {
    id: 'gid://shopify/Cart/1',
    checkoutUrl: 'https://example.com/checkout',
    totalQuantity: lines.reduce((n, l) => n + l.quantity, 0),
    attributes: [],
    buyerIdentity: null,
    cost: {
      subtotalAmount: { amount: '10.00', currencyCode: 'USD' },
      totalAmount: { amount: '10.00', currencyCode: 'USD' },
    },
    lines: {
      nodes: lines.map((l, i) => ({
        id: `gid://shopify/CartLine/${i + 1}`,
        quantity: l.quantity,
        merchandise: {
          id: l.id,
          title: 'Default Title',
          sku: 'SKU',
          selectedOptions: [],
          product: {
            id: 'gid://shopify/Product/1',
            title: 'Test',
            handle: 'test',
            images: { nodes: [] },
          },
        },
        cost: { totalAmount: { amount: '10.00', currencyCode: 'USD' } },
      })),
    },
  } as unknown as Cart
}

afterEach(() => vi.restoreAllMocks())

describe('findMissingMerchandise', () => {
  it('reports nothing when the requested line came back', () => {
    const cart = cartWith([{ id: VARIANT_A, quantity: 1 }])
    expect(findMissingMerchandise(cart, [{ merchandiseId: VARIANT_A, quantity: 1 }], 't')).toEqual([])
  })

  it('reports the merchandise GID that Shopify silently dropped', () => {
    // The exact observed failure: a valid response, no userError, no line.
    const cart = cartWith([])
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(findMissingMerchandise(cart, [{ merchandiseId: VARIANT_A, quantity: 1 }], 't')).toEqual([
      VARIANT_A,
    ])
  })

  it('reports only the missing one when a mixed request is partly fulfilled', () => {
    const cart = cartWith([{ id: VARIANT_A, quantity: 1 }])
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const missing = findMissingMerchandise(
      cart,
      [
        { merchandiseId: VARIANT_A, quantity: 1 },
        { merchandiseId: VARIANT_B, quantity: 1 },
      ],
      't',
    )
    expect(missing).toEqual([VARIANT_B])
  })

  it('does not report a false miss when Shopify merges a repeat add into one line', () => {
    // Adding a variant already in the cart raises the existing line's quantity
    // instead of adding a second line. Counting lines would call this a drop.
    const cart = cartWith([{ id: VARIANT_A, quantity: 3 }])
    const missing = findMissingMerchandise(
      cart,
      [{ merchandiseId: VARIANT_A, quantity: 2 }],
      't',
    )
    expect(missing).toEqual([])
  })

  it('logs the requested and returned shape so a drop can be investigated', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const cart = cartWith([{ id: VARIANT_A, quantity: 1 }])
    findMissingMerchandise(
      cart,
      [
        { merchandiseId: VARIANT_A, quantity: 1 },
        { merchandiseId: VARIANT_B, quantity: 4 },
      ],
      'cartLinesAdd',
    )
    expect(spy).toHaveBeenCalledOnce()
    expect(spy.mock.calls[0][0]).toContain('cartLinesAdd')
    const logged = JSON.parse(spy.mock.calls[0][1] as string)
    expect(logged.requestedCount).toBe(2)
    expect(logged.returnedLineCount).toBe(1)
    expect(logged.missingMerchandiseIds).toEqual([VARIANT_B])
    expect(logged.requested).toContainEqual({ merchandiseId: VARIANT_B, quantity: 4 })
  })

  it('stays silent when nothing is missing', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    findMissingMerchandise(
      cartWith([{ id: VARIANT_A, quantity: 1 }]),
      [{ merchandiseId: VARIANT_A, quantity: 1 }],
      't',
    )
    expect(spy).not.toHaveBeenCalled()
  })
})

describe('CART_LINE_MISSING_MESSAGE', () => {
  it('claims no cause, because the response does not prove one', () => {
    for (const forbidden of [/out of stock/i, /unavailable/i, /sold out/i, /shipping/i, /inventory/i]) {
      expect(CART_LINE_MISSING_MESSAGE).not.toMatch(forbidden)
    }
  })

  it('does not invite a retry, since a dropped line is usually persistent', () => {
    expect(CART_LINE_MISSING_MESSAGE).not.toMatch(/try again/i)
  })

  it('tells the customer to check the cart before checkout', () => {
    expect(CART_LINE_MISSING_MESSAGE).toMatch(/review your cart/i)
  })
})
