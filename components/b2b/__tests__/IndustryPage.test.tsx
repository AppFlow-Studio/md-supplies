import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import type { CollectionProduct } from '@/lib/shopify/types'
import type { Industry } from '@/types/industry'

vi.mock('@/components/store/ShopifyProductCard', () => ({
  ShopifyProductCard: ({
    product,
    categorySlug,
    itemListId,
    itemListName,
    index,
  }: {
    product: CollectionProduct
    categorySlug?: string
    itemListId?: string
    itemListName?: string
    index?: number
  }) => (
    <div
      data-testid="card"
      data-category-slug={categorySlug ?? ''}
      data-item-list-id={itemListId}
      data-item-list-name={itemListName}
      data-index={index}
    >
      {product.title}
    </div>
  ),
}))

vi.mock('@/components/category/ViewItemListTracker', () => ({
  ViewItemListTracker: () => null,
}))

// WebPageSchema/BreadcrumbSchema are async Server Components (they `await
// getNonce()`). React's client renderer (used by RTL here) cannot render
// async function components at all — an unmocked render produces an empty
// tree regardless of what IndustryPage does with its products. This is a
// pre-existing condition unrelated to Task 3's products-section change, so
// both are stubbed out to let the test actually exercise product rendering.
vi.mock('@/components/schema/WebPageSchema', () => ({
  WebPageSchema: () => null,
}))
vi.mock('@/components/schema/BreadcrumbSchema', () => ({
  BreadcrumbSchema: () => null,
}))

import { IndustryPage } from '../IndustryPage'

function mockProduct(handle: string): CollectionProduct {
  return {
    id: `gid://shopify/Product/${handle}`,
    title: handle,
    handle,
    vendor: 'Acme',
    availableForSale: true,
    tags: [],
    priceRange: {
      minVariantPrice: { amount: '10.00', currencyCode: 'USD' },
      maxVariantPrice: { amount: '10.00', currencyCode: 'USD' },
    },
    images: { nodes: [] },
    variants: { nodes: [] },
  }
}

function baseIndustry(overrides: Partial<Industry> = {}): Industry {
  return {
    slug: 'urgent-care',
    name: 'Urgent Care',
    isPopulated: true,
    intro: 'Intro copy.',
    relevantCategories: [],
    relevantSubcategories: [],
    relevantProducts: [mockProduct('p1'), mockProduct('p2')],
    relatedGuides: [],
    ctaText: 'Browse',
    ctaLink: '/category/urgent-care',
    ...overrides,
  }
}

afterEach(cleanup)

describe('IndustryPage products section', () => {
  it('renders one ShopifyProductCard per relevant product', () => {
    render(<IndustryPage industry={baseIndustry()} />)

    expect(screen.getAllByTestId('card')).toHaveLength(2)
    expect(screen.getByText('p1')).toBeInTheDocument()
    expect(screen.getByText('p2')).toBeInTheDocument()
  })

  it('does not pass a categorySlug (tag-matched products can span categories)', () => {
    render(<IndustryPage industry={baseIndustry()} />)

    for (const card of screen.getAllByTestId('card')) {
      expect(card.dataset.categorySlug).toBe('')
    }
  })

  it('passes an industry-scoped itemListId and itemListName', () => {
    render(<IndustryPage industry={baseIndustry()} />)

    const [card] = screen.getAllByTestId('card')
    expect(card.dataset.itemListId).toBe('industry-urgent-care-featured')
    expect(card.dataset.itemListName).toBe('Urgent Care Featured Products')
  })

  it('renders nothing in the products section when there are no relevant products', () => {
    render(<IndustryPage industry={baseIndustry({ relevantProducts: [] })} />)

    expect(screen.queryByTestId('card')).toBeNull()
    expect(screen.queryByText('Popular Products')).toBeNull()
  })
})
