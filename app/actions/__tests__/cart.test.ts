import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CREATE_CART, ADD_CART_LINES } from '@/lib/shopify/queries/cart'
import type { Cart } from '@/lib/shopify/types'

/**
 * DEV-LAUNCH-09 — cart-line integrity.
 *
 * lib/shopify/__tests__/cart-lines.test.ts covers the pure detection
 * (findMissingMerchandise, findUnshippableLines) exhaustively. This file
 * covers the one thing those cannot: that app/actions/cart.ts's addToCart()
 * actually wires that detection in, and — the defect this pass fixes — that
 * a transient request failure does NOT silently discard the customer's
 * existing cart and start a new one. Only a genuine "cart no longer resolves"
 * signal from Shopify (cart: null, no userErrors) may do that.
 */

const cookieStore = { get: vi.fn(), set: vi.fn(), delete: vi.fn() }
vi.mock('next/headers', () => ({ cookies: () => Promise.resolve(cookieStore) }))

const storefrontFetch = vi.fn()
vi.mock('@/lib/shopify/storefront', () => ({ storefrontFetch: (...args: unknown[]) => storefrontFetch(...args) }))

function cartFixture(overrides: Partial<Cart> = {}): Cart {
  return {
    id: 'gid://shopify/Cart/1',
    checkoutUrl: 'https://shop.example.com/checkout',
    totalQuantity: 2,
    attributes: [],
    lines: {
      nodes: [
        {
          id: 'line-1',
          quantity: 1,
          merchandise: {
            id: 'variant-existing',
            title: 'Default Title',
            sku: 'SKU-1',
            price: { amount: '19.99', currencyCode: 'USD' },
            selectedOptions: [],
            product: {
              id: 'prod-1',
              title: 'Nitrile Gloves',
              handle: 'nitrile-gloves',
              vendor: 'Dukal',
              tags: [],
              images: { nodes: [] },
            },
          },
          cost: { totalAmount: { amount: '19.99', currencyCode: 'USD' } },
        },
        {
          id: 'line-2',
          quantity: 1,
          merchandise: {
            id: 'variant-added',
            title: 'Default Title',
            sku: 'SKU-2',
            price: { amount: '5.00', currencyCode: 'USD' },
            selectedOptions: [],
            product: {
              id: 'prod-2',
              title: 'Wound Care Pads',
              handle: 'wound-care-pads',
              vendor: 'Dukal',
              tags: [],
              images: { nodes: [] },
            },
          },
          cost: { totalAmount: { amount: '5.00', currencyCode: 'USD' } },
        },
      ],
    },
    cost: {
      subtotalAmount: { amount: '24.99', currencyCode: 'USD' },
      totalAmount: { amount: '24.99', currencyCode: 'USD' },
      totalTaxAmount: null,
    },
    ...overrides,
  } as Cart
}

beforeEach(() => {
  vi.resetAllMocks()
  cookieStore.get.mockImplementation((name: string) =>
    name === 'cart_id' ? { value: 'gid://shopify/Cart/1' } : undefined,
  )
})

describe('addToCart', () => {
  it('adds the line and returns no warning on a clean add', async () => {
    const cart = cartFixture()
    storefrontFetch.mockImplementation((query: string) => {
      if (query === ADD_CART_LINES) return Promise.resolve({ cartLinesAdd: { cart, userErrors: [] } })
      throw new Error(`unexpected storefrontFetch call: ${query.slice(0, 40)}`)
    })

    const { addToCart } = await import('../cart')
    const result = await addToCart('variant-added', 1)

    expect(result.warning).toBeNull()
    expect(result.cart.lines.nodes).toHaveLength(2)
  })

  it('preserves the existing cart when the request fails for a transient reason (not proof the cart is gone)', async () => {
    storefrontFetch.mockImplementation((query: string) => {
      if (query === ADD_CART_LINES) return Promise.reject(new Error('Storefront API HTTP 502: Bad Gateway'))
      throw new Error(`unexpected storefrontFetch call: ${query.slice(0, 40)}`)
    })

    const { addToCart } = await import('../cart')

    // The failure must propagate (so the caller's existing cart state is left
    // untouched) rather than being swallowed into a fresh, line-dropping cart.
    await expect(addToCart('variant-added', 1)).rejects.toThrow('502')

    // The old cart's cookie must still be intact — nothing was recreated.
    expect(cookieStore.delete).not.toHaveBeenCalled()
    expect(storefrontFetch).not.toHaveBeenCalledWith(CREATE_CART, expect.anything(), expect.anything())
  })

  it('starts a fresh cart only when Shopify explicitly signals the cart id no longer resolves (cart: null)', async () => {
    const freshCart = cartFixture({ id: 'gid://shopify/Cart/2', totalQuantity: 1 })
    storefrontFetch.mockImplementation((query: string) => {
      if (query === ADD_CART_LINES) return Promise.resolve({ cartLinesAdd: { cart: null, userErrors: [] } })
      if (query === CREATE_CART) return Promise.resolve({ cartCreate: { cart: freshCart, userErrors: [] } })
      throw new Error(`unexpected storefrontFetch call: ${query.slice(0, 40)}`)
    })

    const { addToCart } = await import('../cart')
    const result = await addToCart('variant-added', 1)

    expect(cookieStore.delete).toHaveBeenCalledWith('cart_id')
    expect(storefrontFetch).toHaveBeenCalledWith(CREATE_CART, expect.anything(), expect.anything())
    expect(result.cart.id).toBe('gid://shopify/Cart/2')
  })

  it('reports a missing line without discarding the rest of the cart', async () => {
    // Shopify returned a valid cart, just without the line that was requested.
    const cart = cartFixture()
    storefrontFetch.mockImplementation((query: string) => {
      if (query === ADD_CART_LINES) return Promise.resolve({ cartLinesAdd: { cart, userErrors: [] } })
      throw new Error(`unexpected storefrontFetch call: ${query.slice(0, 40)}`)
    })

    const { addToCart } = await import('../cart')
    const result = await addToCart('variant-never-arrived', 1)

    expect(result.warning).toMatch(/could not add that item/i)
    // The cart handed back is still the real, full cart -- nothing dropped.
    expect(result.cart.lines.nodes).toHaveLength(2)
  })

  it('reports an unshippable line distinctly from a missing one', async () => {
    const cart = cartFixture({
      lines: {
        nodes: [
          {
            id: 'line-1',
            quantity: 1,
            merchandise: {
              id: 'variant-added',
              title: 'Default Title',
              sku: 'SKU-1',
              price: { amount: '9.99', currencyCode: 'USD' },
              selectedOptions: [],
              product: {
                id: 'prod-1',
                title: 'No Rate Product',
                handle: 'no-rate',
                vendor: 'Dukal',
                tags: [],
                images: { nodes: [] },
              },
            },
            cost: { totalAmount: { amount: '0.00', currencyCode: 'USD' } },
          },
        ],
      },
    } as unknown as Partial<Cart>)
    storefrontFetch.mockImplementation((query: string) => {
      if (query === ADD_CART_LINES) return Promise.resolve({ cartLinesAdd: { cart, userErrors: [] } })
      throw new Error(`unexpected storefrontFetch call: ${query.slice(0, 40)}`)
    })

    const { addToCart } = await import('../cart')
    const result = await addToCart('variant-added', 1)

    expect(result.warning).toMatch(/cannot be shipped to your address/i)
  })

  it('surfaces a userErrors failure without touching the cart cookie', async () => {
    storefrontFetch.mockImplementation((query: string) => {
      if (query === ADD_CART_LINES) {
        return Promise.resolve({ cartLinesAdd: { cart: null, userErrors: [{ message: 'Variant not found' }] } })
      }
      throw new Error(`unexpected storefrontFetch call: ${query.slice(0, 40)}`)
    })

    const { addToCart } = await import('../cart')

    await expect(addToCart('variant-added', 1)).rejects.toThrow('Variant not found')
    expect(cookieStore.delete).not.toHaveBeenCalled()
  })
})
