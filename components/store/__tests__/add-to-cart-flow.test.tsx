import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, act, cleanup } from '@testing-library/react'
import { CartProvider, useCart } from '../CartProvider'
import { CartPopup } from '../CartPopup'

// CartProvider imports cart server actions
vi.mock('@/app/actions/cart', () => ({
  addToCart: vi.fn(),
  getCart: vi.fn(async () => null),
  removeFromCart: vi.fn(),
  updateCartLine: vi.fn(),
}))

// Analytics mocks (CartProvider + CartPopup both import these)
vi.mock('@/lib/analytics/track', () => ({ track: vi.fn() }))
vi.mock('@/lib/analytics/events', () => ({
  buildAddToCartEvent: vi.fn(() => ({})),
  buildBeginCheckoutEvent: vi.fn(() => ({})),
}))

// next/link is used inside CartPopup for product links
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string
    children: React.ReactNode
    [key: string]: unknown
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

afterEach(cleanup)

function OpenCartButton() {
  const { openCart } = useCart()
  return (
    <button type="button" onClick={openCart}>
      Open
    </button>
  )
}

describe('cart open/close integration', () => {
  it('opening the cart via context renders the dialog with aria-modal=true', async () => {
    render(
      <CartProvider>
        <OpenCartButton />
        <CartPopup />
      </CartProvider>,
    )

    expect(screen.getByRole('dialog', { hidden: true })).toHaveAttribute('aria-modal', 'false')

    await act(async () => {
      screen.getByText('Open').click()
    })

    expect(screen.getByRole('dialog', { hidden: true })).toHaveAttribute('aria-modal', 'true')
  })
})
