import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { CartPageClient } from '../CartPageClient'
import { useCart } from '../CartProvider'
import { getRxGateStatus } from '@/app/actions/rx'
import { track } from '@/lib/analytics/track'
import { buildViewCartEvent, buildBeginCheckoutEvent } from '@/lib/analytics/events'
import { SHIPPING_CLASS_COPY, SHIPPING_FALLBACK_MESSAGE } from '@/lib/shipping-resolver/copy'
import type { PublicDisplayClass } from '@/lib/shipping-resolver/schema'

vi.mock('../CartProvider', () => ({ useCart: vi.fn() }))
vi.mock('../CartToast', () => ({ CartToast: () => null }))
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string
    children: React.ReactNode
    [key: string]: unknown
  }) => <a href={href} {...rest}>{children}</a>,
}))
vi.mock('@/lib/analytics/track', () => ({ track: vi.fn() }))
vi.mock('@/lib/analytics/events', () => ({
  buildViewCartEvent: vi.fn(() => ({})),
  buildBeginCheckoutEvent: vi.fn(() => ({})),
}))
vi.mock('@/app/actions/cart', () => ({ setCartAttribute: vi.fn() }))
vi.mock('@/lib/analytics/clientId', () => ({ clientIdFromGaCookie: vi.fn(() => null) }))
vi.mock('@/app/actions/rx', () => ({ getRxGateStatus: vi.fn(), prepareCheckout: vi.fn() }))

afterEach(cleanup)
beforeEach(() => vi.resetAllMocks())

const mockLine = {
  id: 'line-1',
  quantity: 2,
  merchandise: {
    id: 'variant-1',
    title: 'Size: M',
    sku: 'SKU-001',
    price: { amount: '14.99', currencyCode: 'USD' },
    selectedOptions: [{ name: 'Size', value: 'M' }],
    product: {
      id: 'prod-1',
      title: 'Nitrile Gloves',
      handle: 'nitrile-gloves',
      images: {
        nodes: [
          { id: 'img-1', url: 'https://example.com/glove.jpg', altText: null, width: 400, height: 400 },
        ],
      },
    },
  },
  cost: { totalAmount: { amount: '29.98', currencyCode: 'USD' } },
}

/**
 * A cart line carrying a server-resolved shipping class, shaped exactly as
 * attachCartShippingDisplay produces it (class + the class's copy). The cart
 * summary reads only `class`; `message` is built the same way resolve.ts
 * builds it so the fixture cannot drift from the real resolver output.
 */
function lineWithClass(
  base: typeof mockLine,
  id: string,
  variantId: string,
  cls: PublicDisplayClass,
) {
  return {
    ...base,
    id,
    merchandise: { ...base.merchandise, id: variantId },
    shippingDisplay: {
      class: cls,
      message: SHIPPING_CLASS_COPY[cls] ?? SHIPPING_FALLBACK_MESSAGE,
      displayCopy: null,
    },
  }
}

const mockCart = {
  id: 'cart-1',
  checkoutUrl: 'https://shop.example.com/checkout',
  totalQuantity: 2,
  attributes: [],
  lines: { nodes: [mockLine] },
  cost: {
    subtotalAmount: { amount: '59.96', currencyCode: 'USD' },
    totalAmount: { amount: '59.96', currencyCode: 'USD' },
    totalTaxAmount: null,
  },
}

function setupUseCart(overrides: Record<string, unknown> = {}) {
  vi.mocked(useCart).mockReturnValue({
    cart: mockCart,
    isOpen: false,
    lastError: null,
    addItem: vi.fn(),
    removeItem: vi.fn(),
    updateItem: vi.fn(),
    openCart: vi.fn(),
    closeCart: vi.fn(),
    clearError: vi.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useCart>)
}

describe('CartPageClient', () => {
  it('renders empty state when cart is null', () => {
    vi.mocked(useCart).mockReturnValue({
      cart: null,
      isOpen: false,
      lastError: null,
      addItem: vi.fn(),
      removeItem: vi.fn(),
      updateItem: vi.fn(),
      openCart: vi.fn(),
      closeCart: vi.fn(),
      clearError: vi.fn(),
    } as unknown as ReturnType<typeof useCart>)
    render(<CartPageClient />)
    expect(screen.getByText('Your cart is empty')).toBeInTheDocument()
  })

  it('renders empty state when cart has no lines', () => {
    vi.mocked(useCart).mockReturnValue({
      cart: { ...mockCart, lines: { nodes: [] }, totalQuantity: 0 },
      isOpen: false,
      lastError: null,
      addItem: vi.fn(),
      removeItem: vi.fn(),
      updateItem: vi.fn(),
      openCart: vi.fn(),
      closeCart: vi.fn(),
      clearError: vi.fn(),
    } as unknown as ReturnType<typeof useCart>)
    render(<CartPageClient />)
    expect(screen.getByText('Your cart is empty')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Continue Shopping' })).toHaveAttribute('href', '/')
  })

  it('renders product title, variant, SKU and line price', () => {
    setupUseCart()
    render(<CartPageClient />)
    expect(screen.getByText('Nitrile Gloves')).toBeInTheDocument()
    expect(screen.getByText('Size: M')).toBeInTheDocument()
    expect(screen.getByText('SKU: SKU-001')).toBeInTheDocument()
    expect(screen.getByText('$29.98')).toBeInTheDocument()
  })

  it('does not render SKU row when sku is null', () => {
    const lineNoSku = { ...mockLine, merchandise: { ...mockLine.merchandise, sku: null } }
    setupUseCart({ cart: { ...mockCart, lines: { nodes: [lineNoSku] } } })
    render(<CartPageClient />)
    expect(screen.queryByText(/SKU:/)).toBeNull()
  })

  it('does not render variant title when it is "Default Title"', () => {
    const lineDefault = {
      ...mockLine,
      merchandise: { ...mockLine.merchandise, title: 'Default Title' },
    }
    setupUseCart({ cart: { ...mockCart, lines: { nodes: [lineDefault] } } })
    render(<CartPageClient />)
    expect(screen.queryByText('Default Title')).toBeNull()
  })

  it('calls removeItem when remove button is clicked', () => {
    const removeItem = vi.fn()
    setupUseCart({ removeItem })
    render(<CartPageClient />)
    fireEvent.click(screen.getByRole('button', { name: 'Remove Nitrile Gloves' }))
    expect(removeItem).toHaveBeenCalledWith('line-1')
  })

  it('calls updateItem with qty+1 when + button is clicked', () => {
    const updateItem = vi.fn()
    setupUseCart({ updateItem })
    render(<CartPageClient />)
    fireEvent.click(screen.getByRole('button', { name: 'Increase quantity' }))
    expect(updateItem).toHaveBeenCalledWith('line-1', 3)
  })

  it('calls removeItem when − is clicked at qty 1', () => {
    const removeItem = vi.fn()
    const lineQty1 = { ...mockLine, quantity: 1 }
    setupUseCart({ removeItem, cart: { ...mockCart, lines: { nodes: [lineQty1] } } })
    render(<CartPageClient />)
    fireEvent.click(screen.getByRole('button', { name: 'Decrease quantity' }))
    expect(removeItem).toHaveBeenCalledWith('line-1')
  })

  it('renders subtotal and shipping note in order summary', () => {
    setupUseCart()
    render(<CartPageClient />)
    expect(screen.getByText('Subtotal')).toBeInTheDocument()
    // Exact required copy for unresolved shipping (with trailing period).
    expect(screen.getByText('Shipping calculated at checkout.')).toBeInTheDocument()
  })

  it('claims free shipping only when the resolver classified every line standard-free', () => {
    const freeLine = lineWithClass(mockLine, 'line-1', 'variant-1', 'standard-free')
    setupUseCart({ cart: { ...mockCart, lines: { nodes: [freeLine] } } })
    render(<CartPageClient />)
    expect(screen.getByText('Free shipping')).toBeInTheDocument()
  })

  it('drops the whole-cart claim to neutral copy when one line is not free', () => {
    const freeLine = lineWithClass(mockLine, 'line-1', 'variant-1', 'standard-free')
    const paidLine = lineWithClass(mockLine, 'line-2', 'variant-2', 'standard-paid')
    setupUseCart({ cart: { ...mockCart, lines: { nodes: [freeLine, paidLine] } } })
    render(<CartPageClient />)
    expect(screen.getByText('Shipping calculated at checkout.')).toBeInTheDocument()
    expect(screen.queryByText('Free shipping')).not.toBeInTheDocument()
  })

  it('treats an unresolved line as not-free rather than skipping it', () => {
    const freeLine = lineWithClass(mockLine, 'line-1', 'variant-1', 'standard-free')
    // No shippingDisplay at all: the resolver is off, or the GID did not match.
    const unresolved = { ...mockLine, id: 'line-2' }
    setupUseCart({ cart: { ...mockCart, lines: { nodes: [freeLine, unresolved] } } })
    render(<CartPageClient />)
    expect(screen.getByText('Shipping calculated at checkout.')).toBeInTheDocument()
    expect(screen.queryByText('Free shipping')).not.toBeInTheDocument()
  })

  // Regression guard: a `free-shipping` product tag is an uncurated catalog
  // signal, not an approved source for a customer-facing shipping promise.
  // The cart summary must ignore it entirely.
  it('never claims free shipping from a free-shipping product tag alone', () => {
    const taggedLine = {
      ...mockLine,
      merchandise: {
        ...mockLine.merchandise,
        product: { ...mockLine.merchandise.product, tags: ['free-shipping'] },
      },
    }
    setupUseCart({ cart: { ...mockCart, lines: { nodes: [taggedLine] } } })
    render(<CartPageClient />)
    expect(screen.getByText('Shipping calculated at checkout.')).toBeInTheDocument()
    expect(screen.queryByText('Free shipping')).not.toBeInTheDocument()
  })

  it('checkout link href is checkoutUrl', () => {
    setupUseCart()
    render(<CartPageClient />)
    expect(
      screen.getByRole('link', { name: /proceed to checkout/i }),
    ).toHaveAttribute('href', 'https://shop.example.com/checkout')
  })

  it('fires view_cart analytics event on mount when cart is populated', () => {
    setupUseCart()
    render(<CartPageClient />)
    expect(vi.mocked(buildViewCartEvent)).toHaveBeenCalledOnce()
    expect(vi.mocked(track)).toHaveBeenCalledOnce()
  })

  it('fires begin_checkout analytics event when checkout link is clicked', async () => {
    setupUseCart()
    render(<CartPageClient />)
    fireEvent.click(screen.getByRole('link', { name: /proceed to checkout/i }))
    expect(vi.mocked(buildBeginCheckoutEvent)).toHaveBeenCalledOnce()
  })

  // DEV-LAUNCH-08: RX state must be visible on the cart page, not just
  // inferred from the blocking panel — same union the checkout gate uses.
  it('shows an Rx Only badge on a line whose product carries the RX tag', () => {
    vi.mocked(getRxGateStatus).mockResolvedValue({
      cartHasRx: true, signedIn: false, hasDocument: false, verified: false, blocked: true,
    })
    const rxLine = {
      ...mockLine,
      merchandise: {
        ...mockLine.merchandise,
        product: { ...mockLine.merchandise.product, tags: ['compliance:rx-only'] },
      },
    }
    setupUseCart({ cart: { ...mockCart, lines: { nodes: [rxLine] } } })
    render(<CartPageClient />)
    expect(screen.getByText('Rx Only')).toBeInTheDocument()
  })

  it('shows an Rx Only badge for a metafield-only RX product (no tag)', () => {
    vi.mocked(getRxGateStatus).mockResolvedValue({
      cartHasRx: true, signedIn: false, hasDocument: false, verified: false, blocked: true,
    })
    const rxLine = {
      ...mockLine,
      merchandise: {
        ...mockLine.merchandise,
        product: { ...mockLine.merchandise.product, tags: [], isRxOnly: { value: 'true' } },
      },
    }
    setupUseCart({ cart: { ...mockCart, lines: { nodes: [rxLine] } } })
    render(<CartPageClient />)
    expect(screen.getByText('Rx Only')).toBeInTheDocument()
  })

  it('shows no RX badge for a non-RX line', () => {
    setupUseCart()
    render(<CartPageClient />)
    expect(screen.queryByText('Rx Only')).not.toBeInTheDocument()
  })

  // DEV-LABEL-01: the /cart page reads custom.backorder off the line's
  // product via the same resolveProductLabels() contract as the PDP/card/
  // quick add/cart popup, so a backordered line must agree with every
  // other surface.
  it('shows the Backorder badge on a line whose product carries custom.backorder=true', () => {
    const backorderedLine = {
      ...mockLine,
      merchandise: {
        ...mockLine.merchandise,
        product: { ...mockLine.merchandise.product, backorder: { value: 'true' } },
      },
    }
    setupUseCart({ cart: { ...mockCart, lines: { nodes: [backorderedLine] } } })
    render(<CartPageClient />)
    expect(screen.getByText('Backorder')).toBeInTheDocument()
  })

  it('shows no Backorder badge when custom.backorder is absent, even with a future ETA', () => {
    const line = {
      ...mockLine,
      merchandise: {
        ...mockLine.merchandise,
        product: {
          ...mockLine.merchandise.product,
          estimatedRestockDate: { value: '2099-01-01' },
        },
      },
    }
    setupUseCart({ cart: { ...mockCart, lines: { nodes: [line] } } })
    render(<CartPageClient />)
    expect(screen.queryByText(/Backorder/)).not.toBeInTheDocument()
  })

  // DEV-SHIP-02: the /cart page reads line.shippingDisplay exactly as
  // attachCartShippingDisplay attached it (custom.free_shipping ANDed with
  // the resolver's own confirmation) — the page never re-derives a claim.
  it('shows a Free Shipping badge when the line shippingDisplay is standard-free', () => {
    const line = { ...mockLine, shippingDisplay: { class: 'standard-free' as const, message: 'Free shipping', displayCopy: null } }
    setupUseCart({ cart: { ...mockCart, lines: { nodes: [line] } } })
    render(<CartPageClient />)
    expect(screen.getByText('Free Shipping')).toBeInTheDocument()
  })

  it('shows no Free Shipping badge when the gate did not confirm it (unknown class)', () => {
    const line = { ...mockLine, shippingDisplay: { class: 'unknown' as const, message: 'Shipping calculated at checkout.', displayCopy: null } }
    setupUseCart({ cart: { ...mockCart, lines: { nodes: [line] } } })
    render(<CartPageClient />)
    expect(screen.queryByText('Free Shipping')).not.toBeInTheDocument()
  })

  // DEV-LAUNCH-09: a line Shopify can't ship to the destination must block
  // checkout with its own accurate message, distinct from (and possibly
  // alongside) a price-unavailable line.
  describe('checkout blocking', () => {
    function cartWithLines(lines: Array<{ id: string; price: string; lineTotal: string; title?: string }>) {
      return {
        ...mockCart,
        totalQuantity: lines.length,
        lines: {
          nodes: lines.map((l, i) => ({
            ...mockLine,
            id: `line-${i + 1}`,
            merchandise: {
              ...mockLine.merchandise,
              id: l.id,
              price: { amount: l.price, currencyCode: 'USD' },
              product: { ...mockLine.merchandise.product, title: l.title ?? `Item ${i + 1}` },
            },
            cost: { totalAmount: { amount: l.lineTotal, currencyCode: 'USD' } },
          })),
        },
      }
    }

    it('blocks checkout with the shipping message for an unshippable (priced, zero-cost) line, not a pricing message', () => {
      setupUseCart({ cart: cartWithLines([{ id: 'v1', price: '9.99', lineTotal: '0.00', title: 'No Rate' }]) })
      render(<CartPageClient />)
      expect(screen.getByText('Shipping unavailable for one or more items')).toBeInTheDocument()
      expect(screen.getByText(/cannot be shipped to your address/i)).toBeInTheDocument()
      expect(screen.queryByText(/priced on request/i)).not.toBeInTheDocument()
      expect(screen.getByText('Proceed to Checkout')).toHaveAttribute('aria-disabled', 'true')
    })

    it('blocks checkout with the pricing message for a genuinely zero-price line, not a shipping message', () => {
      setupUseCart({ cart: cartWithLines([{ id: 'v1', price: '0.00', lineTotal: '0.00', title: 'Xylocaine' }]) })
      render(<CartPageClient />)
      expect(screen.getByText('Pricing needed before checkout')).toBeInTheDocument()
      expect(screen.getByText(/priced on request/i)).toBeInTheDocument()
      expect(screen.queryByText(/cannot be shipped to your address/i)).not.toBeInTheDocument()
    })

    it('shows both messages for a mixed cart holding one of each', () => {
      setupUseCart({
        cart: cartWithLines([
          { id: 'v1', price: '0.00', lineTotal: '0.00', title: 'Xylocaine' },
          { id: 'v2', price: '9.99', lineTotal: '0.00', title: 'No Rate' },
        ]),
      })
      render(<CartPageClient />)
      expect(screen.getByText('Action needed before checkout')).toBeInTheDocument()
      expect(screen.getByText(/priced on request/i)).toBeInTheDocument()
      expect(screen.getByText(/cannot be shipped to your address/i)).toBeInTheDocument()
    })

    it('does not block checkout for a normally priced, normally shippable cart', () => {
      setupUseCart()
      render(<CartPageClient />)
      expect(screen.queryByText('Pricing needed before checkout')).not.toBeInTheDocument()
      expect(screen.queryByText('Shipping unavailable for one or more items')).not.toBeInTheDocument()
      expect(screen.getByRole('link', { name: /proceed to checkout/i })).toBeInTheDocument()
    })
  })
})
