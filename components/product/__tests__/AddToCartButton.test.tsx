import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { AddToCartButton } from '../AddToCartButton'

afterEach(cleanup)

vi.mock('@/components/store/CartProvider', () => ({
  useCart: () => ({
    cart: null,
    isOpen: false,
    lastError: null,
    addItem: vi.fn(),
    removeItem: vi.fn(),
    updateItem: vi.fn(),
    openCart: vi.fn(),
    closeCart: vi.fn(),
    clearError: vi.fn(),
  }),
}))

// H-04: "Backordered products remain purchasable when Shopify permits the
// selected variant" -- AddToCartButton has no backorder parameter at all
// (components/product/AddToCartButton.tsx), so this is really proving the
// negative: Backorder status structurally cannot gate purchasability, only
// price/availableForSale can (lib/purchasability.ts).
describe('AddToCartButton — Backorder never gates purchasability (H-04)', () => {
  it('is enabled for an available, priced variant regardless of Backorder status', () => {
    render(<AddToCartButton variantId="gid://shopify/ProductVariant/1" quantity={1} availableForSale price={9.99} />)
    expect(screen.getByRole('button', { name: /Add to Cart/i })).toBeEnabled()
  })

  it('is disabled only for real purchasability reasons (out of stock), never a backorder flag it never receives', () => {
    render(<AddToCartButton variantId="gid://shopify/ProductVariant/1" quantity={1} availableForSale={false} price={9.99} />)
    expect(screen.getByRole('button', { name: /Out of Stock/i })).toBeDisabled()
  })

  it('is disabled for an unpriced (quote-only) variant, reading "Request pricing" rather than a stock claim', () => {
    render(<AddToCartButton variantId="gid://shopify/ProductVariant/1" quantity={1} availableForSale price={0} />)
    expect(screen.getByRole('button', { name: /Request pricing/i })).toBeDisabled()
  })
})
