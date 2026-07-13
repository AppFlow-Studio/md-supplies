import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ReactElement } from 'react'
import type { CollectionProduct } from '@/lib/shopify/types'
import type { Industry } from '@/types/industry'

vi.mock('@/lib/shopify/storefront', () => ({
  storefrontFetch: vi.fn(),
}))
vi.mock('@/lib/category-utils', () => ({
  getSubcategories: vi.fn().mockResolvedValue([]),
}))

import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_PRODUCTS_BY_TAG } from '@/lib/shopify/queries/products'
import { GET_COLLECTION } from '@/lib/shopify/queries/collections'
import IndustryDetailPage from '../[industry-slug]/page'

const mockFetch = vi.mocked(storefrontFetch)

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

function industryOf(element: ReactElement): Industry {
  return (element.props as { industry: Industry }).industry
}

beforeEach(() => {
  mockFetch.mockReset()
})

describe('industry detail page product fetch', () => {
  it('fetches by Storefront tag query for a tag-mapped industry (urgent-care)', async () => {
    mockFetch.mockResolvedValue({ products: { nodes: [mockProduct('p1')] } })

    const element = await IndustryDetailPage({
      params: Promise.resolve({ 'industry-slug': 'urgent-care' }),
    })

    expect(mockFetch).toHaveBeenCalledWith(
      GET_PRODUCTS_BY_TAG,
      expect.objectContaining({
        query: 'tag:"industry:urgent-care"',
        first: 6,
        sortKey: 'BEST_SELLING',
        reverse: false,
      }),
    )
    expect(industryOf(element).relevantProducts).toEqual([mockProduct('p1')])
  })

  it('falls back to the collection fetch for an untagged industry (dental)', async () => {
    mockFetch.mockResolvedValue({ collection: { products: { nodes: [mockProduct('p2')] } } })

    const element = await IndustryDetailPage({
      params: Promise.resolve({ 'industry-slug': 'dental' }),
    })

    expect(mockFetch).toHaveBeenCalledWith(
      GET_COLLECTION,
      expect.objectContaining({
        handle: 'dental',
        first: 6,
        sortKey: 'BEST_SELLING',
        reverse: false,
      }),
    )
    expect(industryOf(element).relevantProducts).toEqual([mockProduct('p2')])
  })

  it('returns an empty array (not a throw) when the collection fetch resolves null', async () => {
    mockFetch.mockResolvedValue({ collection: null })

    const element = await IndustryDetailPage({
      params: Promise.resolve({ 'industry-slug': 'dental' }),
    })

    expect(industryOf(element).relevantProducts).toEqual([])
  })
})
