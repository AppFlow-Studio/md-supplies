import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { CartPageClient } from '../CartPageClient'
import { useCart } from '../CartProvider'
import { track } from '@/lib/analytics/track'
import { buildViewCartEvent, buildBeginCheckoutEvent } from '@/lib/analytics/events'

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

afterEach(cleanup)
beforeEach(() => vi.resetAllMocks())

const mockLine = {
  id: 'line-1',
  quantity: 2,
  merchandise: {
    id: 'variant-1',
    title: 'Size: M',
    sku: 'SKU-001',
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
    expect(screen.getByText('Shipping calculated at checkout')).toBeInTheDocument()
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
})
