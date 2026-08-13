import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { QuickAddContent } from '../QuickAddContent'
import type { ProductCardData } from '@/types/product'

afterEach(cleanup)

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; sizes?: string }) => {
    const { fill: _fill, sizes: _sizes, ...rest } = props
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...rest} />
  },
}))

const addItem = vi.fn()

vi.mock('@/components/store/CartProvider', () => ({
  useCart: () => ({
    cart: null,
    isOpen: false,
    lastError: null,
    addItem,
    removeItem: vi.fn(),
    updateItem: vi.fn(),
    openCart: vi.fn(),
    closeCart: vi.fn(),
    clearError: vi.fn(),
  }),
}))

const baseProduct: ProductCardData = {
  handle: 'test-product',
  title: 'Test Product',
  image: { url: '/test.jpg', altText: 'Test', width: 64, height: 64 },
  brand: 'Test Brand',
  vendor: 'Test Vendor',
  price: 1999,
  sku: 'SKU-1',
  available: true,
  variants: [
    { id: 'gid://shopify/ProductVariant/1', title: 'Each', price: 1999, available: true },
  ],
}

// DEV-LAUNCH-07: a $0 variant is `availableForSale: true` in Shopify (price
// and stock are independent facts) — the multi-variant case is the one that
// can slip past a trigger-button check done on a different, priced variant.
const multiVariantProduct: ProductCardData = {
  ...baseProduct,
  variants: [
    { id: 'gid://shopify/ProductVariant/1', title: 'Box', price: 1999, available: true },
    { id: 'gid://shopify/ProductVariant/2', title: 'Case', price: 0, available: true },
  ],
}

describe('QuickAddContent — purchasability (DEV-LAUNCH-07)', () => {
  it('defaults to a priced variant even when a zero-price variant is listed first', () => {
    const zeroFirst: ProductCardData = {
      ...baseProduct,
      variants: [
        { id: 'gid://shopify/ProductVariant/2', title: 'Case', price: 0, available: true },
        { id: 'gid://shopify/ProductVariant/1', title: 'Box', price: 1999, available: true },
      ],
    }
    render(<QuickAddContent product={zeroFirst} titleId="t" />)
    // Priced-variant text appears twice: the price row and the "Box" swatch.
    expect(screen.getAllByText('$19.99').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Add to Cart' })).toBeEnabled()
  })

  it('renders "Contact for pricing" and disables Add to Cart for a zero-price variant', () => {
    const zeroPriceOnly: ProductCardData = {
      ...baseProduct,
      variants: [{ id: 'gid://shopify/ProductVariant/9', title: 'Each', price: 0, available: true }],
    }
    render(<QuickAddContent product={zeroPriceOnly} titleId="t" />)

    expect(screen.getByText('Contact for pricing')).toBeInTheDocument()
    const cta = screen.getByRole('button', { name: 'Request pricing' })
    expect(cta).toBeDisabled()
  })

  it('blocks the add once a shopper switches to a zero-price variant', () => {
    render(<QuickAddContent product={multiVariantProduct} titleId="t" />)

    // Starts on the priced variant.
    expect(screen.getByRole('button', { name: 'Add to Cart' })).toBeEnabled()

    // The zero-price "Case" swatch is disabled — cannot even be selected —
    // exactly like an out-of-stock swatch.
    const caseSwatch = screen.getByRole('button', { name: /Case/ })
    expect(caseSwatch).toBeDisabled()
    expect(screen.getByText('Contact for pricing')).toBeInTheDocument()
  })

  it('never shows "Added to Cart" when Shopify silently drops the line', async () => {
    addItem.mockResolvedValueOnce(false)
    render(<QuickAddContent product={baseProduct} titleId="t" />)

    fireEvent.click(screen.getByRole('button', { name: 'Add to Cart' }))

    await waitFor(() => expect(addItem).toHaveBeenCalledWith('gid://shopify/ProductVariant/1', 1))
    expect(screen.queryByText(/Added to Cart/)).not.toBeInTheDocument()
  })

  it('shows "Added to Cart" when Shopify confirms the line', async () => {
    addItem.mockResolvedValueOnce(true)
    render(<QuickAddContent product={baseProduct} titleId="t" />)

    fireEvent.click(screen.getByRole('button', { name: 'Add to Cart' }))

    await waitFor(() => expect(screen.getByText(/Added to Cart/)).toBeInTheDocument())
  })
})

// DEV-LAUNCH-08: quick add previously showed no RX indicator at all, even
// though `product.isRx` was already computed by ShopifyQuickAddButton's
// toCardData() via the same tag ∪ custom.is_rx_only union the card/PDP use.
describe('QuickAddContent — RX state (DEV-LAUNCH-08)', () => {
  it('shows an Rx Only badge when the product is RX', () => {
    render(<QuickAddContent product={{ ...baseProduct, isRx: true }} titleId="t" />)
    expect(screen.getByText('Rx Only')).toBeInTheDocument()
  })

  it('shows no RX badge for a non-RX product', () => {
    render(<QuickAddContent product={{ ...baseProduct, isRx: false }} titleId="t" />)
    expect(screen.queryByText('Rx Only')).not.toBeInTheDocument()
  })
})

// DEV-LABEL-01: Quick Add reads custom.backorder through the same
// resolveBackorderLabel() the PDP and card use (product.isBackordered /
// product.backorderRestockDate are pre-flattened by ShopifyQuickAddButton's
// toCardData()), so all three surfaces must agree on a given product.
describe('QuickAddContent — Backorder state', () => {
  it('shows the Backorder badge when isBackordered is true', () => {
    render(<QuickAddContent product={{ ...baseProduct, isBackordered: true }} titleId="t" />)
    expect(screen.getByText('Backorder')).toBeInTheDocument()
  })

  it('shows no Backorder badge when isBackordered is false, even with a future ETA', () => {
    render(
      <QuickAddContent
        product={{ ...baseProduct, isBackordered: false, backorderRestockDate: '2099-01-01' }}
        titleId="t"
      />,
    )
    expect(screen.queryByText(/Backorder/)).not.toBeInTheDocument()
  })

  // DEV-SHIP-04 (final business rule): the ETA must never be appended —
  // the label is always exactly "Backorder", regardless of ETA.
  it('shows exactly "Backorder" with no date, even with a valid future ETA', () => {
    render(
      <QuickAddContent
        product={{ ...baseProduct, isBackordered: true, backorderRestockDate: '2099-01-01' }}
        titleId="t"
      />,
    )
    expect(screen.getByText('Backorder')).toBeInTheDocument()
    expect(screen.queryByText(/2099-01-01/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Backorder, ships/)).not.toBeInTheDocument()
  })
})

// DEV-SHIP-02: Quick Add reads product.shippingDisplay as attached upstream
// by attachCardShippingDisplay (custom.free_shipping ANDed with the
// resolver's own confirmation) — never re-derives a claim itself.
describe('QuickAddContent — Free Shipping badge', () => {
  it('shows a Free Shipping badge when shippingDisplay is standard-free', () => {
    render(
      <QuickAddContent
        product={{ ...baseProduct, shippingDisplay: { class: 'standard-free', message: 'Free shipping', displayCopy: null } }}
        titleId="t"
      />,
    )
    expect(screen.getByText('Free Shipping')).toBeInTheDocument()
  })

  it('shows no Free Shipping badge when the gate did not confirm it (unknown class)', () => {
    render(
      <QuickAddContent
        product={{ ...baseProduct, shippingDisplay: { class: 'unknown', message: 'Shipping calculated at checkout.', displayCopy: null } }}
        titleId="t"
      />,
    )
    expect(screen.queryByText('Free Shipping')).not.toBeInTheDocument()
  })

  it('shows no Free Shipping badge when shippingDisplay was never attached', () => {
    render(<QuickAddContent product={{ ...baseProduct, shippingDisplay: null }} titleId="t" />)
    expect(screen.queryByText('Free Shipping')).not.toBeInTheDocument()
  })
})
