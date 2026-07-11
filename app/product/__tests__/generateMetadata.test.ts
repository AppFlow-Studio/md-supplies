import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/shopify/storefront', () => ({
  storefrontFetch: vi.fn(),
}))

import { storefrontFetch } from '@/lib/shopify/storefront'
import { generateMetadata } from '../[slug]/page'

const mockFetch = vi.mocked(storefrontFetch)

const rawProduct = {
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
  images: { nodes: [{ id: 'img1', url: 'https://cdn.shopify.com/gloves.jpg', altText: 'Gloves', width: 1600, height: 900 }] },
  variants: { nodes: [] },
  options: [],
  seo: { title: null, description: null },
  brandName: null,
  unitsPerOrder: null,
  quantityOfUnits: null,
  orderSize: null,
  material: null,
  use: null,
  features: null,
  color: null,
  sterility: null,
  thickness: null,
  gloveSize: null,
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

beforeEach(() => {
  mockFetch.mockReset()
})

describe('product generateMetadata — OG image dimensions', () => {
  it('emits the true pixel dimensions from the Shopify image', async () => {
    mockFetch.mockResolvedValue({ product: rawProduct })
    const m = await generateMetadata({ params: Promise.resolve({ slug: 'nitrile-exam-gloves' }) })
    const images = (m.openGraph as { images?: { url: string; width: number; height: number }[] })?.images
    expect(images![0].url).toBe('https://cdn.shopify.com/gloves.jpg')
    expect(images![0].width).toBe(1600)
    expect(images![0].height).toBe(900)
  })

  it('falls back to the 1200x630 default when the product has no image', async () => {
    mockFetch.mockResolvedValue({ product: { ...rawProduct, images: { nodes: [] } } })
    const m = await generateMetadata({ params: Promise.resolve({ slug: 'nitrile-exam-gloves' }) })
    const images = (m.openGraph as { images?: { width: number; height: number }[] })?.images
    expect(images![0].width).toBe(1200)
    expect(images![0].height).toBe(630)
  })
})
