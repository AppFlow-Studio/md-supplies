import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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

/**
 * DEV-TRACK-01 — cart attributes must MERGE.
 *
 * Shopify's `cartAttributesUpdate` replaces the whole attributes array rather
 * than merging into it. The previous single-key implementation sent only its
 * own pair, so every other attribute on the cart was silently dropped. That
 * was invisible while `ga_client_id` was the only attribute in existence and
 * becomes data loss the moment campaign attribution is stamped alongside it.
 */
describe('setCartAttribute', () => {
  beforeEach(() => {
    cookieStore.get.mockReturnValue({ value: 'gid://shopify/Cart/1' })
  })

  it('preserves attributes already on the cart instead of replacing them', async () => {
    const { setCartAttribute } = await import('@/app/actions/cart')
    const existing = cartFixture({
      attributes: [
        { key: 'md_utm_source', value: 'jant' },
        { key: 'md_utm_campaign', value: 'h_pylori_gi_clinics_q4_2026' },
      ],
    })
    storefrontFetch.mockReset()
    storefrontFetch
      .mockResolvedValueOnce({ cart: existing })
      .mockResolvedValueOnce({ cartAttributesUpdate: { cart: existing, userErrors: [] } })

    await setCartAttribute('ga_client_id', '555.666')

    const sent = storefrontFetch.mock.calls[1][1] as {
      attributes: { key: string; value: string }[]
    }
    const keys = sent.attributes.map((a) => a.key).sort()
    expect(keys).toEqual(['ga_client_id', 'md_utm_campaign', 'md_utm_source'])
  })

  it('overwrites a key that is already present rather than duplicating it', async () => {
    const { setCartAttribute } = await import('@/app/actions/cart')
    const existing = cartFixture({ attributes: [{ key: 'ga_client_id', value: 'old' }] })
    storefrontFetch.mockReset()
    storefrontFetch
      .mockResolvedValueOnce({ cart: existing })
      .mockResolvedValueOnce({ cartAttributesUpdate: { cart: existing, userErrors: [] } })

    await setCartAttribute('ga_client_id', 'new')

    const sent = storefrontFetch.mock.calls[1][1] as {
      attributes: { key: string; value: string }[]
    }
    expect(sent.attributes).toEqual([{ key: 'ga_client_id', value: 'new' }])
  })
})

/**
 * Commercial scope gate — ENABLE_PERSISTENT_VENDOR_ATTRIBUTION.
 *
 * The Shopify order-attribution layer is out of the agreed MDSupplies scope
 * and must not run until that scope is funded. What must KEEP working while it
 * is off: the read-merge-write safety (a general correctness fix) and the
 * ga_client_id / ga_session attributes (core GA4 purchase continuity — without
 * them a purchase starts a fresh session and resolves to Direct).
 */
describe('persistent vendor attribution scope gate', () => {
  const VAR = 'ENABLE_PERSISTENT_VENDOR_ATTRIBUTION'
  const original = process.env[VAR]

  beforeEach(() => {
    cookieStore.get.mockReturnValue({ value: 'gid://shopify/Cart/1' })
    storefrontFetch.mockReset()
  })
  afterEach(() => {
    if (original === undefined) delete process.env[VAR]
    else process.env[VAR] = original
  })

  it('DISABLED (unset): stampCartAttribution is inert — no Shopify call at all', async () => {
    delete process.env[VAR]
    const { stampCartAttribution } = await import('@/app/actions/cart')
    await stampCartAttribution()
    expect(storefrontFetch).not.toHaveBeenCalled()
  })

  it.each(['false', '0', '', 'TRUE'])('DISABLED for %j: still inert', async (value) => {
    process.env[VAR] = value
    const { stampCartAttribution } = await import('@/app/actions/cart')
    await stampCartAttribution()
    expect(storefrontFetch).not.toHaveBeenCalled()
  })

  it('DISABLED: ga_client_id is still written — standard GA4 continuity is not gated', async () => {
    delete process.env[VAR]
    const { setCartAttribute } = await import('@/app/actions/cart')
    const existing = cartFixture({ attributes: [] })
    storefrontFetch
      .mockResolvedValueOnce({ cart: existing })
      .mockResolvedValueOnce({ cartAttributesUpdate: { cart: existing, userErrors: [] } })

    await setCartAttribute('ga_client_id', '555.666')

    const sent = storefrontFetch.mock.calls[1][1] as { attributes: { key: string; value: string }[] }
    expect(sent.attributes).toEqual([{ key: 'ga_client_id', value: '555.666' }])
  })

  it('DISABLED: read-merge-write safety still preserves unrelated attributes', async () => {
    delete process.env[VAR]
    const { setCartAttribute } = await import('@/app/actions/cart')
    const existing = cartFixture({
      attributes: [{ key: 'some_other_app_attribute', value: 'keep-me' }],
    })
    storefrontFetch
      .mockResolvedValueOnce({ cart: existing })
      .mockResolvedValueOnce({ cartAttributesUpdate: { cart: existing, userErrors: [] } })

    await setCartAttribute('ga_session', 'cid=1&sid=2&sct=3')

    const sent = storefrontFetch.mock.calls[1][1] as { attributes: { key: string; value: string }[] }
    const keys = sent.attributes.map((a) => a.key).sort()
    expect(keys).toEqual(['ga_session', 'some_other_app_attribute'])
  })

  it('ENABLED: stamps md_* campaign attributes onto the cart', async () => {
    process.env[VAR] = 'true'
    cookieStore.get.mockImplementation((name: string) => {
      if (name === 'cart_id') return { value: 'gid://shopify/Cart/1' }
      if (name === 'md_attr') return { value: JSON.stringify({ utm_source: 'jant', utm_content: 'email_1_main_cta' }) }
      if (name === 'md_attr_last') return { value: JSON.stringify({ utm_source: 'jant', utm_content: 'email_2_follow_up' }) }
      return undefined
    })
    const existing = cartFixture({ attributes: [{ key: 'ga_client_id', value: '555.666' }] })
    storefrontFetch
      .mockResolvedValueOnce({ cart: existing })
      .mockResolvedValueOnce({ cartAttributesUpdate: { cart: existing, userErrors: [] } })

    const { stampCartAttribution } = await import('@/app/actions/cart')
    await stampCartAttribution()

    const sent = storefrontFetch.mock.calls[1][1] as { attributes: { key: string; value: string }[] }
    const map = Object.fromEntries(sent.attributes.map((a) => [a.key, a.value]))
    expect(map.md_utm_source).toBe('jant')
    expect(map.md_utm_content).toBe('email_2_follow_up')       // last touch
    expect(map.md_first_utm_content).toBe('email_1_main_cta')  // first touch
    // and the pre-existing attribute is never clobbered
    expect(map.ga_client_id).toBe('555.666')
  })
})
