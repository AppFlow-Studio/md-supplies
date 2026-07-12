import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import { ProductView } from '../ProductView'
import type { Product } from '@/lib/shopify/types'

afterEach(cleanup)

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; sizes?: string; priority?: boolean }) => {
    const { fill: _fill, sizes: _sizes, priority: _priority, ...rest } = props
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...rest} />
  },
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}))

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

const product: Product = {
  id: 'gid://shopify/Product/1',
  title: 'Nitrile Exam Gloves',
  handle: 'nitrile-exam-gloves',
  description: 'Durable exam gloves.',
  descriptionHtml: '<p>Durable exam gloves.</p>',
  vendor: 'AcmeMed',
  availableForSale: true,
  tags: [],
  priceRange: {
    minVariantPrice: { amount: '9.99', currencyCode: 'USD' },
    maxVariantPrice: { amount: '9.99', currencyCode: 'USD' },
  },
  images: { nodes: [{ id: 'img1', url: '/gloves.jpg', altText: 'Gloves', width: 800, height: 800 }] },
  variants: {
    nodes: [{
      id: 'gid://shopify/ProductVariant/1',
      title: 'Default',
      sku: 'SKU-123',
      availableForSale: true,
      quantityAvailable: 10,
      selectedOptions: [],
      price: { amount: '9.99', currencyCode: 'USD' },
      compareAtPrice: null,
    }],
  },
  options: [],
  seo: { title: null, description: null },
  brandName: 'AcmeMed',
  unitsPerOrder: null,
  quantityOfUnits: null,
  orderSize: null,
  material: 'Nitrile',
  use: null,
  features: null,
  color: 'Blue',
  sterility: null,
  thickness: null,
  gloveSize: 'Medium',
  needleGauge: null,
  needleLength: null,
  sizeLength: null,
  estimatedRestockDate: null,
  testsFor: null,
  detectableDrugs: null,
  adulterants: null,
  otherFeatures: null,
  typeList: null,
  customBadge1: null,
  customBadge2: null,
  customBadge3: null,
}

describe('ProductView PDP semantic markup (Audit M13)', () => {
  it('exposes Item Number, Brand Name, Description, and Specifications as headings', () => {
    render(<ProductView product={product} relatedProducts={[]} complementaryProducts={[]} />)

    expect(screen.getByRole('heading', { name: 'Item Number' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Brand Name' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Description' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Specifications' })).toBeInTheDocument()
  })

  it('exposes spec-table label cells as row headers', () => {
    render(<ProductView product={product} relatedProducts={[]} complementaryProducts={[]} />)

    const table = screen.getByRole('table')
    const rowHeader = within(table).getByRole('rowheader', { name: 'Material' })
    expect(rowHeader.tagName).toBe('TH')
    expect(rowHeader).toHaveAttribute('scope', 'row')
  })
})
