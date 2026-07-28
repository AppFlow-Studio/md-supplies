import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { ProductGrid } from '../ProductGrid'
import type { CollectionProduct } from '@/lib/shopify/types'

// The empty state is what a customer sees when their filter combination matches
// nothing. Getting it wrong looks like a broken page rather than a narrow
// search, and it is the one place a dead end must offer a way out. Covers the
// "empty states" half of Bilal's "empty states and mobile filters" bullet.

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}))
vi.mock('@/components/store/ShopifyProductCard', () => ({
  ShopifyProductCard: ({ product }: { product: CollectionProduct }) => <div>{product.title}</div>,
}))
vi.mock('../ViewItemListTracker', () => ({ ViewItemListTracker: () => null }))

function product(id: string, title: string): CollectionProduct {
  return {
    id, title, handle: title.toLowerCase().replace(/\s+/g, '-'),
    vendor: 'Test', availableForSale: true, tags: [],
    priceRange: {
      minVariantPrice: { amount: '1.00', currencyCode: 'USD' },
      maxVariantPrice: { amount: '2.00', currencyCode: 'USD' },
    },
    images: { nodes: [] }, variants: { nodes: [] },
  } as unknown as CollectionProduct
}

const BASE = { emptyStateHref: '/category/gloves', itemListId: 'gloves', itemListName: 'Gloves' }

afterEach(cleanup)

describe('ProductGrid empty state', () => {
  it('explains that nothing matched rather than rendering a blank area', () => {
    render(<ProductGrid products={[]} {...BASE} />)
    expect(screen.getByText('No products found.')).toBeInTheDocument()
  })

  it('tells the customer what to do about it', () => {
    render(<ProductGrid products={[]} {...BASE} />)
    expect(screen.getByText('Try adjusting or clearing your filters.')).toBeInTheDocument()
  })

  it('offers a way out, pointing back at the unfiltered collection', () => {
    // Without this a customer who over-filters has no escape but the back button.
    render(<ProductGrid products={[]} {...BASE} />)
    const reset = screen.getByRole('link', { name: 'Clear all filters' })
    expect(reset).toHaveAttribute('href', '/category/gloves')
  })

  it('accepts a collection-specific message', () => {
    render(
      <ProductGrid products={[]} {...BASE} emptyStateMessage="No gloves match those filters." />,
    )
    expect(screen.getByText('No gloves match those filters.')).toBeInTheDocument()
    expect(screen.queryByText('No products found.')).not.toBeInTheDocument()
  })

  it('shows no empty state once there are products', () => {
    render(<ProductGrid products={[product('1', 'Nitrile Glove')]} {...BASE} />)
    expect(screen.queryByText('No products found.')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Clear all filters' })).not.toBeInTheDocument()
    expect(screen.getByText('Nitrile Glove')).toBeInTheDocument()
  })

  it('does not treat a single product as empty (off-by-one guard)', () => {
    render(<ProductGrid products={[product('1', 'Solo Item')]} {...BASE} />)
    expect(screen.getByText('Solo Item')).toBeInTheDocument()
    expect(screen.queryByText('No products found.')).not.toBeInTheDocument()
  })
})
