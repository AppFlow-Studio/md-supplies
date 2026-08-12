import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { PopularProducts } from '../PopularProducts'
import type { CollectionProduct } from '@/lib/shopify/types'

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

vi.mock('@/components/product/QuickAddModal', () => ({
  QuickAddModal: () => <div data-testid="quick-add-modal" />,
}))

afterEach(cleanup)

function makeProduct(overrides: Partial<CollectionProduct> = {}): CollectionProduct {
  return {
    id: 'gid://shopify/Product/1',
    title: 'Nitrile Exam Gloves',
    handle: 'nitrile-exam-gloves',
    vendor: 'MedSupply Co',
    availableForSale: true,
    tags: [],
    priceRange: {
      minVariantPrice: { amount: '12.99', currencyCode: 'USD' },
      maxVariantPrice: { amount: '12.99', currencyCode: 'USD' },
    },
    images: {
      nodes: [
        { id: 'img1', url: 'https://example.com/gloves.jpg', altText: 'Gloves', width: 800, height: 800 },
      ],
    },
    variants: {
      nodes: [
        {
          id: 'gid://shopify/ProductVariant/1',
          title: 'Default',
          price: { amount: '12.99', currencyCode: 'USD' },
          compareAtPrice: null,
          availableForSale: true,
          quantityAvailable: 10,
        },
      ],
    },
    ...overrides,
  }
}

describe('PopularProducts', () => {
  // DEF-02/QA-135: the image link has no visible text of its own (the title
  // sits in a separate block below it), so it needs its own accessible name.
  it('gives the image-only product link an accessible name via aria-label', () => {
    const product = makeProduct()
    render(<PopularProducts products={[product]} />)

    const links = screen.getAllByRole('link')
    const imageLink = links.find((link) => link.querySelector('img'))
    expect(imageLink).toHaveAttribute('aria-label', product.title)
    expect(imageLink).toHaveAccessibleName(product.title)
  })
})
