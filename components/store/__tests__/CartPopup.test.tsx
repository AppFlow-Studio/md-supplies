import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { CartPopup } from '../CartPopup'
import { useCart } from '../CartProvider'

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

afterEach(cleanup)
beforeEach(() => vi.resetAllMocks())

function mockCart(isOpen: boolean) {
  vi.mocked(useCart).mockReturnValue({
    cart: null,
    isOpen,
    openCart: vi.fn(),
    closeCart: vi.fn(),
    removeItem: vi.fn(),
    updateItem: vi.fn(),
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
})
