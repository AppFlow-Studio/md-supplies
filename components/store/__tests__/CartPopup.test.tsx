import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { CartPopup } from '../CartPopup'
import { CartToast } from '../CartToast'
import { useCart } from '../CartProvider'
import { getRxGateStatus, prepareCheckout } from '@/app/actions/rx'
import { track } from '@/lib/analytics/track'

vi.mock('../CartProvider', () => ({
  useCart: vi.fn(),
}))

// next/link is used inside CartPopup for product links
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}))

// Mock analytics so CartPopup renders without side effects
vi.mock('@/lib/analytics/track', () => ({ track: vi.fn() }))
vi.mock('@/lib/analytics/events', () => ({ buildBeginCheckoutEvent: vi.fn(() => ({})) }))
vi.mock('@/app/actions/cart', () => ({ setCartAttribute: vi.fn() }))
vi.mock('@/app/actions/rx', () => ({ getRxGateStatus: vi.fn(), prepareCheckout: vi.fn() }))

afterEach(cleanup)
beforeEach(() => vi.resetAllMocks())

function mockCart(isOpen: boolean, overrides: Record<string, unknown> = {}) {
  vi.mocked(useCart).mockReturnValue({
    cart: null,
    isOpen,
    openCart: vi.fn(),
    closeCart: vi.fn(),
    removeItem: vi.fn(),
    updateItem: vi.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useCart>)
}

describe('CartPopup', () => {
  it('exposes dialog semantics when open', () => {
    mockCart(true)
    render(<CartPopup />)

    const dialog = screen.getByRole('dialog', { hidden: true })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  it('is inert (not focusable) when closed', () => {
    mockCart(false)
    render(<CartPopup />)

    const dialog = screen.getByRole('dialog', { hidden: true })
    expect(dialog).toHaveAttribute('aria-hidden', 'true')
  })

  it('calls closeCart on Escape when open', () => {
    mockCart(true)
    const { rerender } = render(<CartPopup />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(vi.mocked(useCart)().closeCart).toHaveBeenCalled()
    rerender(<CartPopup />)
  })

  // Shared by the RX and Backorder badge suites below: a single-line cart
  // whose line product accepts arbitrary metafield/tag overrides, so both
  // suites build fixtures the same way instead of drifting apart.
  const cartWithLineProduct = (product: Record<string, unknown>) => ({
    id: 'cart-1',
    checkoutUrl: 'https://shop.example.com/checkout',
    totalQuantity: 1,
    lines: {
      nodes: [{
        id: 'line-1',
        quantity: 1,
        merchandise: {
          id: 'variant-1',
          title: 'Default Title',
          sku: 'SKU-001',
          price: { amount: '19.99', currencyCode: 'USD' },
          selectedOptions: [],
          product: { id: 'prod-1', title: 'Xylocaine Injection', handle: 'xylocaine', images: { nodes: [] }, ...product },
        },
        cost: { totalAmount: { amount: '19.99', currencyCode: 'USD' } },
      }],
    },
    cost: {
      subtotalAmount: { amount: '19.99', currencyCode: 'USD' },
      totalAmount: { amount: '19.99', currencyCode: 'USD' },
      totalTaxAmount: null,
    },
  })

  // DEV-LAUNCH-08: RX state must be visible in the cart popup, not just
  // inferred from the blocking panel — same union the checkout gate uses.
  describe('RX badge', () => {
    it('shows an RX Only badge for a tag-only RX line', () => {
      vi.mocked(getRxGateStatus).mockResolvedValue({
        cartHasRx: true, signedIn: false, hasDocument: false, verified: false, blocked: true,
      })
      mockCart(true, { cart: cartWithLineProduct({ tags: ['compliance:rx-only'] }) })
      render(<CartPopup />)
      expect(screen.getByText('RX Only')).toBeInTheDocument()
    })

    it('shows an RX Only badge for a metafield-only RX line (no tag)', () => {
      vi.mocked(getRxGateStatus).mockResolvedValue({
        cartHasRx: true, signedIn: false, hasDocument: false, verified: false, blocked: true,
      })
      mockCart(true, { cart: cartWithLineProduct({ tags: [], isRxOnly: { value: 'true' } }) })
      render(<CartPopup />)
      expect(screen.getByText('RX Only')).toBeInTheDocument()
    })

    it('shows no RX badge for a non-RX line', () => {
      mockCart(true, { cart: cartWithLineProduct({ tags: [] }) })
      render(<CartPopup />)
      expect(screen.queryByText('RX Only')).not.toBeInTheDocument()
    })
  })

  // DEV-LABEL-01: the cart popup reads custom.backorder off the line's
  // product via the same resolveProductLabels() contract as the PDP/card/
  // quick add, so a backordered line must agree with every other surface.
  describe('Backorder badge', () => {
    it('shows the Backorder badge when the line product has custom.backorder=true', () => {
      mockCart(true, { cart: cartWithLineProduct({ tags: [], backorder: { value: 'true' } }) })
      render(<CartPopup />)
      expect(screen.getByText('Backorder')).toBeInTheDocument()
    })

    it('shows no Backorder badge when custom.backorder is absent, even with a future ETA', () => {
      mockCart(true, {
        cart: cartWithLineProduct({ tags: [], estimatedRestockDate: { value: '2099-01-01' } }),
      })
      render(<CartPopup />)
      expect(screen.queryByText(/Backorder/)).not.toBeInTheDocument()
    })
  })

  // DEV-LAUNCH-13: the cart popup must show the selected variant's own
  // image, not the product's first image — a Blue AeroWalk line showed
  // whichever color happened to be the product's first image regardless of
  // which color was actually added.
  describe('line item image', () => {
    function cartWithVariantAndProductImages() {
      return {
        id: 'cart-1',
        checkoutUrl: 'https://shop.example.com/checkout',
        totalQuantity: 1,
        lines: {
          nodes: [{
            id: 'line-1',
            quantity: 1,
            merchandise: {
              id: 'variant-1',
              title: 'Blue',
              sku: 'SKU-1',
              image: {
                id: 'img-variant',
                url: 'https://example.com/blue.jpg',
                altText: 'Blue variant',
                width: 100,
                height: 100,
              },
              price: { amount: '19.99', currencyCode: 'USD' },
              selectedOptions: [{ name: 'Color', value: 'Blue' }],
              product: {
                id: 'prod-1',
                title: 'Xylocaine Injection',
                handle: 'xylocaine',
                images: {
                  nodes: [{
                    id: 'img-product',
                    url: 'https://example.com/grey.jpg',
                    altText: 'Grey (product default)',
                    width: 100,
                    height: 100,
                  }],
                },
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
      }
    }

    it("shows the selected variant's own image, not the product's first image", () => {
      mockCart(true, { cart: cartWithVariantAndProductImages() })
      render(<CartPopup />)
      const img = screen.getByAltText('Blue variant')
      expect(img).toHaveAttribute('src', expect.stringContaining('blue.jpg'))
      expect(screen.queryByAltText('Grey (product default)')).not.toBeInTheDocument()
    })
  })

  // DEV-SHIP-02: the cart popup reads line.shippingDisplay exactly as
  // attachCartShippingDisplay attached it (custom.free_shipping ANDed with
  // the resolver's own confirmation) — the popup never re-derives a claim.
  describe('Free Shipping badge', () => {
    function cartWithLineShipping(shippingDisplay: Record<string, unknown> | null) {
      const cart = cartWithLineProduct({ tags: [] })
      return { ...cart, lines: { nodes: [{ ...cart.lines.nodes[0], shippingDisplay }] } }
    }

    it('shows a Free Shipping badge when the line shippingDisplay is standard-free', () => {
      mockCart(true, {
        cart: cartWithLineShipping({ class: 'standard-free', message: 'Free shipping', displayCopy: null }),
      })
      render(<CartPopup />)
      expect(screen.getByText('Free Shipping')).toBeInTheDocument()
    })

    it('shows no Free Shipping badge when the gate did not confirm it (unknown class)', () => {
      mockCart(true, {
        cart: cartWithLineShipping({ class: 'unknown', message: 'Shipping calculated at checkout.', displayCopy: null }),
      })
      render(<CartPopup />)
      expect(screen.queryByText('Free Shipping')).not.toBeInTheDocument()
    })
  })

  // shows the selected variant's own image, not the product's first image
  it('shows the selected variant\'s own image, not the product\'s first image', () => {
    const lineWithVariantImage = {
      id: 'line-1',
      quantity: 1,
      merchandise: {
        id: 'variant-1',
        title: 'Blue',
        sku: 'SKU-1',
        image: { id: 'img-variant', url: 'https://example.com/blue.jpg', altText: 'Blue variant', width: 100, height: 100 },
        price: { amount: '19.99', currencyCode: 'USD' },
        selectedOptions: [{ name: 'Color', value: 'Blue' }],
        product: {
          id: 'prod-1', title: 'Xylocaine Injection', handle: 'xylocaine',
          images: { nodes: [{ id: 'img-product', url: 'https://example.com/grey.jpg', altText: 'Grey (product default)', width: 100, height: 100 }] },
        },
      },
      cost: { totalAmount: { amount: '19.99', currencyCode: 'USD' } },
    }

    mockCart(true, { cart: { id: 'cart-1', checkoutUrl: 'https://shop.example.com/checkout', totalQuantity: 1, lines: { nodes: [lineWithVariantImage] }, cost: { subtotalAmount: { amount: '19.99', currencyCode: 'USD' }, totalAmount: { amount: '19.99', currencyCode: 'USD' }, totalTaxAmount: null } } })
    render(<CartPopup />)
    const img = screen.getByAltText('Blue variant')
    expect(img).toHaveAttribute('src', expect.stringContaining('blue.jpg'))
    expect(screen.queryByAltText('Grey (product default)')).not.toBeInTheDocument()
  })

  // DEV-LAUNCH-09: a line Shopify can't ship to the destination must block
  // checkout with its own accurate message, distinct from (and possibly
  // alongside) a price-unavailable line.
  describe('checkout blocking', () => {
    function cartWithLines(lines: Array<{ id: string; price: string; lineTotal: string; title?: string }>) {
      return {
        id: 'cart-1',
        checkoutUrl: 'https://shop.example.com/checkout',
        totalQuantity: lines.length,
        lines: {
          nodes: lines.map((l, i) => ({
            id: `line-${i + 1}`,
            quantity: 1,
            merchandise: {
              id: l.id,
              title: 'Default Title',
              sku: `SKU-${i + 1}`,
              price: { amount: l.price, currencyCode: 'USD' },
              selectedOptions: [],
              product: { id: `prod-${i + 1}`, title: l.title ?? `Item ${i + 1}`, handle: 'item', images: { nodes: [] } },
            },
            cost: { totalAmount: { amount: l.lineTotal, currencyCode: 'USD' } },
          })),
        },
        cost: {
          subtotalAmount: { amount: '0.00', currencyCode: 'USD' },
          totalAmount: { amount: '0.00', currencyCode: 'USD' },
          totalTaxAmount: null,
        },
      }
    }

    it('blocks checkout with the shipping message for an unshippable (priced, zero-cost) line, not a pricing message', () => {
      mockCart(true, { cart: cartWithLines([{ id: 'v1', price: '9.99', lineTotal: '0.00', title: 'No Rate' }]) })
      render(<CartPopup />)
      expect(screen.getByText('Shipping unavailable for one or more items')).toBeInTheDocument()
      expect(screen.getByText(/cannot be shipped to your address/i)).toBeInTheDocument()
      expect(screen.queryByText(/priced on request/i)).not.toBeInTheDocument()
      expect(screen.getByText('Proceed to Checkout')).toHaveAttribute('aria-disabled', 'true')
    })

    it('blocks checkout with the pricing message for a genuinely zero-price line, not a shipping message', () => {
      mockCart(true, { cart: cartWithLines([{ id: 'v1', price: '0.00', lineTotal: '0.00', title: 'Xylocaine' }]) })
      render(<CartPopup />)
      expect(screen.getByText('Pricing needed before checkout')).toBeInTheDocument()
      expect(screen.getByText(/priced on request/i)).toBeInTheDocument()
      expect(screen.queryByText(/cannot be shipped to your address/i)).not.toBeInTheDocument()
    })

    it('shows both messages for a mixed cart holding one of each', () => {
      mockCart(true, {
        cart: cartWithLines([
          { id: 'v1', price: '0.00', lineTotal: '0.00', title: 'Xylocaine' },
          { id: 'v2', price: '9.99', lineTotal: '0.00', title: 'No Rate' },
        ]),
      })
      render(<CartPopup />)
      expect(screen.getByText('Action needed before checkout')).toBeInTheDocument()
      expect(screen.getByText(/priced on request/i)).toBeInTheDocument()
      expect(screen.getByText(/cannot be shipped to your address/i)).toBeInTheDocument()
    })

    it('does not block checkout for a normally priced, normally shippable cart', () => {
      mockCart(true, { cart: cartWithLines([{ id: 'v1', price: '9.99', lineTotal: '9.99' }]) })
      render(<CartPopup />)
      expect(screen.queryByText('Pricing needed before checkout')).not.toBeInTheDocument()
      expect(screen.queryByText('Shipping unavailable for one or more items')).not.toBeInTheDocument()
      expect(screen.getByRole('link', { name: /proceed to checkout/i })).toBeInTheDocument()
    })

    // DEV-LAUNCH-12 (A3) regression: handleCheckoutClick referenced
    // checkoutInFlightRef without a matching useRef declaration — a
    // ReferenceError on every click that `npx tsc --noEmit` catches but the
    // pre-existing test suite never exercised (no test here clicked
    // "Proceed to Checkout" at all). This block clicks it.
    it('fires begin_checkout exactly once on click, and does not double-fire on a rapid double-click', async () => {
      vi.mocked(prepareCheckout).mockResolvedValue({ ok: true, checkoutUrl: 'https://shop.example.com/checkout' })
      mockCart(true, { cart: cartWithLines([{ id: 'v1', price: '9.99', lineTotal: '9.99' }]) })
      render(<CartPopup />)

      const checkoutLink = screen.getByRole('link', { name: /proceed to checkout/i })
      fireEvent.click(checkoutLink)
      fireEvent.click(checkoutLink)
      await vi.waitFor(() => expect(prepareCheckout).toHaveBeenCalled())

      expect(track).toHaveBeenCalledOnce()
      expect(prepareCheckout).toHaveBeenCalledOnce()
    })

    // DEF-08/QA-092: a cart change Shopify refuses (e.g. a quantity update
    // rejected via userErrors) set CartProvider's `lastError`, but nothing
    // ever rendered it outside the dedicated /cart page — CartToast lived
    // only in CartPageClient, not alongside the globally-mounted CartPopup.
    // Fixed by mounting CartToast in app/layout.tsx next to CartPopup. This
    // proves the popup surface: when both share the same cart context, a
    // refusal is visible, not silent.
    it('surfaces a refused cart change via the shared toast while the popup is open (DEF-08/QA-092)', () => {
      mockCart(true, {
        cart: cartWithLines([{ id: 'v1', price: '9.99', lineTotal: '9.99' }]),
        lastError: 'Failed to update quantity. Please try again.',
        clearError: vi.fn(),
      })
      render(
        <>
          <CartPopup />
          <CartToast />
        </>,
      )

      expect(screen.getByRole('dialog', { hidden: true })).toHaveAttribute('aria-hidden', 'false')
      const alert = screen.getByRole('alert')
      expect(alert.className).not.toContain('opacity-0')
      expect(screen.getByText('Failed to update quantity. Please try again.')).toBeInTheDocument()
    })
  })
})
