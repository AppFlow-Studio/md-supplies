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

const buildRxDocumentPath = vi.fn()
const customerFolderId = vi.fn((gid: string) => gid.split('/').pop())
const deleteRxDocument = vi.fn()
const putRxDocument = vi.fn()
const sniffRxContentType = vi.fn()
vi.mock('@/lib/rx-storage', () => ({
  buildRxDocumentPath: (...args: unknown[]) => buildRxDocumentPath(...args),
  customerFolderId: (...args: unknown[]) => customerFolderId(...args),
  deleteRxDocument: (...args: unknown[]) => deleteRxDocument(...args),
  putRxDocument: (...args: unknown[]) => putRxDocument(...args),
  sniffRxContentType: (...args: unknown[]) => sniffRxContentType(...args),
  RX_ALLOWED_TYPES: { 'application/pdf': 'pdf' },
  RX_MAX_FILE_BYTES: 10_000_000,
}))

const scanRxDocument = vi.fn()
vi.mock('@/lib/rx-scan', () => ({
  isScanRequired: vi.fn(() => false),
  scanRxDocument: (...args: unknown[]) => scanRxDocument(...args),
}))

const sendFormEmail = vi.fn()
vi.mock('@/lib/forms/email', () => ({ sendFormEmail: (...args: unknown[]) => sendFormEmail(...args) }))
vi.mock('@/lib/resend', () => ({ TO_EMAIL: 'support@mdsupplies.com' }))

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

/**
 * uploadRxDocument — staff notification email.
 *
 * The Bunny storage write + Shopify customer metafield write (mocked below,
 * already covered by lib/__tests__/rx-storage.test.ts and
 * lib/shopify/__tests__/admin-rx.test.ts) stay the system of record; these
 * tests cover the new courtesy copy to the review inbox: that it fires with
 * the actual file attached plus the customer's name/email/Shopify id/
 * timestamp, and that its failure never fails an upload that already
 * succeeded.
 */
describe('uploadRxDocument — RX upload notification email', () => {
  function pdfFormData(): FormData {
    const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34])
    const file = new File([bytes], 'script.pdf', { type: 'application/pdf' })
    const fd = new FormData()
    fd.set('rx-document', file)
    return fd
  }

  beforeEach(() => {
    getSession.mockResolvedValue({ accessToken: 'tok', refreshToken: 'rtok' })
    customerFetch.mockResolvedValue({
      customer: {
        id: 'gid://shopify/Customer/42',
        firstName: 'Jane',
        lastName: 'Doe',
        emailAddress: { emailAddress: 'jane@clinic.com' },
      },
    })
    getCustomerRxState.mockResolvedValue({ documentPath: null, verified: false, verifiedFlagSet: false })
    setCustomerRxDocument.mockResolvedValue(undefined)
    buildRxDocumentPath.mockReturnValue('rx-documents/42/uuid.pdf')
    putRxDocument.mockResolvedValue(undefined)
    sniffRxContentType.mockReturnValue('application/pdf')
    deleteRxDocument.mockResolvedValue(true)
    scanRxDocument.mockResolvedValue({ status: 'clean' })
    sendFormEmail.mockResolvedValue({ ok: true, id: 'email_1' })
  })

  it('emails the review inbox with the file attached and the customer/timestamp details', async () => {
    const { uploadRxDocument } = await import('../rx')
    const result = await uploadRxDocument(pdfFormData())

    expect(result.ok).toBe(true)
    expect(sendFormEmail).toHaveBeenCalledOnce()
    const call = sendFormEmail.mock.calls[0][0]
    expect(call.to).toBe('support@mdsupplies.com')
    expect(call.replyTo).toBe('jane@clinic.com')
    expect(call.text).toContain('Jane Doe')
    expect(call.text).toContain('jane@clinic.com')
    expect(call.text).toContain('gid://shopify/Customer/42')
    expect(call.attachments).toHaveLength(1)
    expect(call.attachments[0].filename).toBe('rx-document-42.pdf')
    expect(Buffer.isBuffer(call.attachments[0].content)).toBe(true)
    expect(call.attachments[0].contentType).toBe('application/pdf')
  })

  it('still reports a successful upload when the notification email fails to send', async () => {
    sendFormEmail.mockResolvedValue({ ok: false })
    const { uploadRxDocument } = await import('../rx')

    const result = await uploadRxDocument(pdfFormData())

    expect(result.ok).toBe(true)
  })
})
