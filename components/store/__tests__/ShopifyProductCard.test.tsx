import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { ShopifyProductCard } from '../ShopifyProductCard'
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

const trackMock = vi.fn()
vi.mock('@/lib/analytics/track', () => ({ track: (...args: unknown[]) => trackMock(...args) }))
vi.mock('@/lib/analytics/events', () => ({
  buildSelectItemEvent: vi.fn(() => ({})),
  toGA4Item: vi.fn(() => ({})),
  currencyOf: vi.fn(() => 'USD'),
}))
vi.mock('@/components/product/QuickAddModal', () => ({
  QuickAddModal: () => <div data-testid="quick-add-modal" />,
}))

afterEach(() => {
  cleanup()
  trackMock.mockClear()
})

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

describe('ShopifyProductCard', () => {
  it('renders the quick-add button outside any anchor element', () => {
    const product = makeProduct()
    render(
      <ShopifyProductCard
        product={product}
        categorySlug="gloves"
        itemListId="list"
        itemListName="Gloves"
      />,
    )

    const button = screen.getByRole('button', { name: `Quick add ${product.title}` })
    expect(button.closest('a')).toBeNull()
  })

  it('renders two links to the product page (image + info) for click-through', () => {
    const product = makeProduct()
    render(
      <ShopifyProductCard
        product={product}
        categorySlug="gloves"
        itemListId="list"
        itemListName="Gloves"
      />,
    )

    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(2)
    links.forEach((link) => {
      expect(link).toHaveAttribute('href', '/category/gloves/nitrile-exam-gloves')
    })
  })

  it('clicking the quick-add button does not fire the card select-item tracking', () => {
    const product = makeProduct()
    render(
      <ShopifyProductCard
        product={product}
        categorySlug="gloves"
        itemListId="list"
        itemListName="Gloves"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: `Quick add ${product.title}` }))
    expect(trackMock).not.toHaveBeenCalled()
    expect(screen.getByTestId('quick-add-modal')).toBeInTheDocument()
  })

  it('clicking a product link fires the card select-item tracking', () => {
    const product = makeProduct()
    render(
      <ShopifyProductCard
        product={product}
        categorySlug="gloves"
        itemListId="list"
        itemListName="Gloves"
      />,
    )

    fireEvent.click(screen.getAllByRole('link')[0])
    expect(trackMock).toHaveBeenCalledOnce()
  })

  it('positions the quick-add button bottom-right and hides it behind a desktop hover reveal', () => {
    const product = makeProduct()
    render(
      <ShopifyProductCard
        product={product}
        categorySlug="gloves"
        itemListId="list"
        itemListName="Gloves"
      />,
    )

    const button = screen.getByRole('button', { name: `Quick add ${product.title}` })
    expect(button.className).toContain('bottom-2')
    expect(button.className).toContain('right-2')
    expect(button.className).not.toContain('top-2')
    // Mobile: visible by default
    expect(button.className).toContain('opacity-100')
    // Desktop (sm:+): hidden until hover
    expect(button.className).toContain('sm:opacity-0')
    expect(button.className).toContain('sm:group-hover:opacity-100')
  })

  it('renders no quick-add button for an unavailable product', () => {
    const product = makeProduct({ availableForSale: false })
    render(
      <ShopifyProductCard
        product={product}
        categorySlug="gloves"
        itemListId="list"
        itemListName="Gloves"
      />,
    )

    expect(screen.queryByRole('button', { name: `Quick add ${product.title}` })).not.toBeInTheDocument()
  })
})
