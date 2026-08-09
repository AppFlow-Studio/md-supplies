import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { CartPopup } from '../CartPopup'
import { useCart } from '../CartProvider'
import { getRxGateStatus } from '@/app/actions/rx'

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

  // DEV-LAUNCH-08: RX state must be visible in the cart popup, not just
  // inferred from the blocking panel — same union the checkout gate uses.
  describe('RX badge', () => {
    const rxCart = (product: Record<string, unknown>) => ({
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

    it('shows an RX Only badge for a tag-only RX line', () => {
      vi.mocked(getRxGateStatus).mockResolvedValue({
        cartHasRx: true, signedIn: false, hasDocument: false, verified: false, blocked: true,
      })
      mockCart(true, { cart: rxCart({ tags: ['compliance:rx-only'] }) })
      render(<CartPopup />)
      expect(screen.getByText('RX Only')).toBeInTheDocument()
    })

    it('shows an RX Only badge for a metafield-only RX line (no tag)', () => {
      vi.mocked(getRxGateStatus).mockResolvedValue({
        cartHasRx: true, signedIn: false, hasDocument: false, verified: false, blocked: true,
      })
      mockCart(true, { cart: rxCart({ tags: [], isRxOnly: { value: 'true' } }) })
      render(<CartPopup />)
      expect(screen.getByText('RX Only')).toBeInTheDocument()
    })

    it('shows no RX badge for a non-RX line', () => {
      mockCart(true, { cart: rxCart({ tags: [] }) })
      render(<CartPopup />)
      expect(screen.queryByText('RX Only')).not.toBeInTheDocument()
    })
  })
})
