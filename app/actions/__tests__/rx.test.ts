import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET_CART, CART_BUYER_IDENTITY_UPDATE } from '@/lib/shopify/queries/cart'
import type { Cart } from '@/lib/shopify/types'

/**
 * DEV-LAUNCH-08 — server-side recheck before checkout.
 *
 * lib/rx-gate.ts's pure functions (isRxProduct, resolveGateStatus, …) are
 * covered exhaustively in lib/__tests__/rx-gate.test.ts and
 * rx-compliance-regression.test.ts. This file covers the one thing those
 * cannot: that app/actions/rx.ts's prepareCheckout() ACTUALLY calls that
 * logic server-side before handing back a checkout URL, and never performs
 * the buyer-identity association (the step that lets checkout/the
 * validation app associate the order with the customer) for a blocked cart.
 *
 * SCOPE: this proves our own server code re-checks and refuses to hand out
 * a checkout URL for a blocked cart. It does NOT prove a determined user
 * cannot reach Shopify's raw checkout URL directly — that bypass-resistant
 * control is the companion Shopify validation app (DEV-RX-02, still
 * pending Izzy's selection). See docs/launch/DEV-LAUNCH-08-verification.md.
 */

const cookieStore = { get: vi.fn() }
vi.mock('next/headers', () => ({ cookies: () => Promise.resolve(cookieStore) }))

const storefrontFetch = vi.fn()
vi.mock('@/lib/shopify/storefront', () => ({ storefrontFetch: (...args: unknown[]) => storefrontFetch(...args) }))

const getSession = vi.fn()
vi.mock('@/lib/shopify/session', () => ({ getSession: () => getSession() }))

const customerFetch = vi.fn()
vi.mock('@/lib/shopify/customer', () => ({ customerFetch: (...args: unknown[]) => customerFetch(...args) }))

const getCustomerRxState = vi.fn()
const setCustomerRxDocument = vi.fn()
vi.mock('@/lib/shopify/admin', () => ({
  getCustomerRxState: (...args: unknown[]) => getCustomerRxState(...args),
  setCustomerRxDocument: (...args: unknown[]) => setCustomerRxDocument(...args),
}))

vi.mock('@/lib/rx-storage', () => ({
  buildRxDocumentPath: vi.fn(),
  customerFolderId: vi.fn(),
  deleteRxDocument: vi.fn(),
  putRxDocument: vi.fn(),
  sniffRxContentType: vi.fn(),
  RX_ALLOWED_TYPES: {},
  RX_MAX_FILE_BYTES: 10_000_000,
}))
vi.mock('@/lib/rx-scan', () => ({ isScanRequired: vi.fn(() => false), scanRxDocument: vi.fn() }))

function cartFixture(overrides: Partial<Cart> = {}): Cart {
  return {
    id: 'gid://shopify/Cart/1',
    checkoutUrl: 'https://shop.example.com/checkout',
    totalQuantity: 1,
    attributes: [],
    lines: {
      nodes: [{
        id: 'line-1',
        quantity: 1,
        merchandise: {
          id: 'variant-1',
          title: 'Default Title',
          sku: 'SKU-1',
          selectedOptions: [],
          product: {
            id: 'prod-1',
            title: 'Xylocaine Injection',
            handle: 'xylocaine',
            vendor: 'Exel',
            tags: ['compliance:rx-only'],
            images: { nodes: [] },
          },
        },
        cost: { totalAmount: { amount: '19.99', currencyCode: 'USD' } },
      }],
    },
    cost: {
      subtotalAmount: { amount: '19.99', currencyCode: 'USD' },
      totalAmount: { amount: '19.99', currencyCode: 'USD' },
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

describe('prepareCheckout — server-side RX recheck', () => {
  it('blocks a signed-out RX cart and never runs cartBuyerIdentityUpdate', async () => {
    storefrontFetch.mockImplementation((query: string) => {
      if (query === GET_CART) return Promise.resolve({ cart: cartFixture() })
      throw new Error(`unexpected storefrontFetch call: ${query.slice(0, 40)}`)
    })
    getSession.mockResolvedValue(null)

    const { prepareCheckout } = await import('../rx')
    const result = await prepareCheckout()

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.status.blocked).toBe(true)
    // The identity association is the hinge the validation app reads —
    // it must never run for a cart the gate just blocked.
    expect(storefrontFetch).not.toHaveBeenCalledWith(
      CART_BUYER_IDENTITY_UPDATE,
      expect.anything(),
      expect.anything(),
    )
  })

  it('blocks a signed-in RX cart with no document on file', async () => {
    storefrontFetch.mockImplementation((query: string) => {
      if (query === GET_CART) return Promise.resolve({ cart: cartFixture() })
      throw new Error(`unexpected storefrontFetch call: ${query.slice(0, 40)}`)
    })
    getSession.mockResolvedValue({ accessToken: 'tok', refreshToken: 'rtok' })
    customerFetch.mockResolvedValue({ customer: { id: 'gid://shopify/Customer/1' } })
    getCustomerRxState.mockResolvedValue({ documentPath: null, verified: false, verifiedFlagSet: false })

    const { prepareCheckout } = await import('../rx')
    const result = await prepareCheckout()

    expect(result.ok).toBe(false)
    expect(storefrontFetch).not.toHaveBeenCalledWith(
      CART_BUYER_IDENTITY_UPDATE,
      expect.anything(),
      expect.anything(),
    )
  })

  it('blocks a metafield-only RX product with no tag — the easiest case to miss', async () => {
    const metafieldOnlyCart = cartFixture({
      lines: {
        nodes: [{
          id: 'line-1',
          quantity: 1,
          merchandise: {
            id: 'variant-1',
            title: 'Default Title',
            sku: 'SKU-1',
            selectedOptions: [],
            product: {
              id: 'prod-1',
              title: 'Bacteriostatic Water',
              handle: 'bacteriostatic-water',
              vendor: 'Modern Medical Products',
              tags: [],
              isRxOnly: { value: 'true' },
              images: { nodes: [] },
            },
          },
          cost: { totalAmount: { amount: '19.99', currencyCode: 'USD' } },
        }],
      },
    } as unknown as Partial<Cart>)
    storefrontFetch.mockImplementation((query: string) => {
      if (query === GET_CART) return Promise.resolve({ cart: metafieldOnlyCart })
      throw new Error(`unexpected storefrontFetch call: ${query.slice(0, 40)}`)
    })
    getSession.mockResolvedValue(null)

    const { prepareCheckout } = await import('../rx')
    const result = await prepareCheckout()

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.status.cartHasRx).toBe(true)
  })

  it('proceeds and associates the customer once a document is on file', async () => {
    const cart = cartFixture()
    storefrontFetch.mockImplementation((query: string) => {
      if (query === GET_CART) return Promise.resolve({ cart })
      if (query === CART_BUYER_IDENTITY_UPDATE) {
        return Promise.resolve({ cartBuyerIdentityUpdate: { cart, userErrors: [] } })
      }
      throw new Error(`unexpected storefrontFetch call: ${query.slice(0, 40)}`)
    })
    getSession.mockResolvedValue({ accessToken: 'tok', refreshToken: 'rtok' })
    customerFetch.mockResolvedValue({ customer: { id: 'gid://shopify/Customer/1' } })
    getCustomerRxState.mockResolvedValue({ documentPath: '/rx/1/doc.pdf', verified: false, verifiedFlagSet: true })

    const { prepareCheckout } = await import('../rx')
    const result = await prepareCheckout()

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.checkoutUrl).toBe(cart.checkoutUrl)
    expect(storefrontFetch).toHaveBeenCalledWith(
      CART_BUYER_IDENTITY_UPDATE,
      expect.objectContaining({ cartId: cart.id }),
      expect.anything(),
    )
  })

  it('never blocks a non-RX cart, signed out', async () => {
    const plainCart = cartFixture({
      lines: {
        nodes: [{
          id: 'line-1',
          quantity: 1,
          merchandise: {
            id: 'variant-1',
            title: 'Default Title',
            sku: 'SKU-1',
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
        }],
      },
    } as unknown as Partial<Cart>)
    storefrontFetch.mockImplementation((query: string) => {
      if (query === GET_CART) return Promise.resolve({ cart: plainCart })
      throw new Error(`unexpected storefrontFetch call: ${query.slice(0, 40)}`)
    })
    getSession.mockResolvedValue(null)

    const { prepareCheckout } = await import('../rx')
    const result = await prepareCheckout()

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.checkoutUrl).toBe(plainCart.checkoutUrl)
  })
})
