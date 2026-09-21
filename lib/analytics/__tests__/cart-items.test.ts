import { describe, it, expect } from 'vitest'
import { cartLineToGA4Item, buildAddToCartEvent, buildRemoveFromCartEvent } from '@/lib/analytics/events'
import type { CartLine } from '@/lib/shopify/types'

function line(overrides: Record<string, unknown> = {}): CartLine {
  return {
    id: 'gid://shopify/CartLine/1',
    quantity: 2,
    merchandise: {
      id: 'gid://shopify/ProductVariant/42',
      title: '3.5mm',
      sku: 'B2080C-35',
      price: { amount: '10.00', currencyCode: 'USD' },
      selectedOptions: [],
      product: {
        id: 'gid://shopify/Product/7',
        title: 'Trocar Kit',
        handle: 'trocar-kit',
        vendor: 'Acme Distribution',
        tags: [],
        images: { nodes: [] },
      },
    },
    cost: { totalAmount: { amount: '20.00', currencyCode: 'USD' } },
    ...overrides,
  } as unknown as CartLine
}

describe('cartLineToGA4Item', () => {
  it('derives a per-unit price from the line total Shopify will actually charge', () => {
    expect(cartLineToGA4Item(line())).toMatchObject({
      item_id: 'gid://shopify/ProductVariant/42',
      item_name: 'Trocar Kit',
      item_variant: '3.5mm',
      item_sku: 'B2080C-35',
      price: 10,
      quantity: 2,
    })
  })

  it('reports the quantity just added, not the line’s running total', () => {
    // Adding 2 to a line that now holds 5 is an add_to_cart of 2.
    expect(cartLineToGA4Item(line({ quantity: 5, cost: { totalAmount: { amount: '50.00', currencyCode: 'USD' } } }), 2))
      .toMatchObject({ price: 10, quantity: 2 })
  })

  it('falls back to the variant price when Shopify zeroes an unshippable line', () => {
    // DEV-LAUNCH-09: a line with no rate for the destination has a positive
    // variant price but a zeroed line total. Reporting $0 would understate the
    // funnel against the eventual order.
    const item = cartLineToGA4Item(line({ cost: { totalAmount: { amount: '0.0', currencyCode: 'USD' } } }))
    expect(item.price).toBe(10)
  })

  it('omits Shopify’s "Default Title" placeholder variant name', () => {
    const item = cartLineToGA4Item(line({
      merchandise: { ...line().merchandise, title: 'Default Title' },
    }))
    expect(item.item_variant).toBeUndefined()
  })

  it('omits item_sku entirely when the variant has none', () => {
    const item = cartLineToGA4Item(line({
      merchandise: { ...line().merchandise, sku: null },
    }))
    expect('item_sku' in item).toBe(false)
  })

  it('never reports NaN as a price', () => {
    const item = cartLineToGA4Item(line({
      quantity: 0,
      cost: { totalAmount: { amount: 'not-a-number', currencyCode: 'USD' } },
      merchandise: { ...line().merchandise, price: { amount: 'also-bad', currencyCode: 'USD' } },
    }))
    expect(item.price).toBe(0)
  })
})

describe('event values', () => {
  it('computes add_to_cart value as unit price × quantity', () => {
    const e = buildAddToCartEvent({ currency: 'USD', item: cartLineToGA4Item(line()) })
    expect(e.ecommerce).toMatchObject({ currency: 'USD', value: 20 })
  })

  it('sums remove_from_cart across items', () => {
    const e = buildRemoveFromCartEvent({ currency: 'USD', items: [cartLineToGA4Item(line()), cartLineToGA4Item(line())] })
    expect(e.event).toBe('remove_from_cart')
    expect(e.ecommerce.value).toBe(40)
  })
})
