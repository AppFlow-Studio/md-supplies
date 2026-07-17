import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import type { Collection, CollectionProduct } from '@/lib/shopify/types'

const mockRedirect = vi.fn()

vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
  redirect: (url: string) => {
    mockRedirect(url)
    throw new Error(`REDIRECT:${url}`)
  },
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/category/occ',
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@/lib/shopify/storefront', () => ({
  storefrontFetch: vi.fn(),
}))

// Isolate this suite from ShopifyProductCard/ShopifyQuickAddButton/cart
// context — CategoryResults' own slicing/fetch logic is what's under test.
vi.mock('@/components/category/ProductGrid', () => ({
  ProductGrid: ({ products }: { products: CollectionProduct[] }) => (
    <ul>
      {products.map((p) => (
        <li key={p.id}>{p.title}</li>
      ))}
    </ul>
  ),
}))

import { storefrontFetch } from '@/lib/shopify/storefront'
import { CategoryResults } from '../CategoryResults'

const mockFetch = vi.mocked(storefrontFetch)

// A hostile Storefront `filters` response: the raw-tag facet with internal
// taxonomy/ops values, plus a mix of approved and unapproved sources.
const HOSTILE_FILTERS: Collection['products']['filters'] = [
  {
    id: 'filter.p.tag',
    label: 'Tag',
    type: 'LIST',
    values: [
      'compliance:fda-510k',
      'discontinued',
      'consolidation-duplicate',
      'brand:acme',
    ].map((tag) => ({ id: `filter.p.tag.${tag}`, label: tag, count: 3, input: `{"tag":"${tag}"}` })),
  },
  {
    id: 'filter.v.availability',
    label: 'Availability',
    type: 'LIST',
    values: [{ id: 'avail.true', label: 'In stock', count: 5, input: '{"available":true}' }],
  },
  {
    id: 'filter.p.m.custom.glove_size',
    label: 'Glove size',
    type: 'LIST',
    values: [{ id: 'gs.m', label: 'Medium', count: 2, input: '{"productMetafield":{"namespace":"custom","key":"glove_size","value":"M"}}' }],
  },
]

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

function mockCollection(slug: string, nodes: CollectionProduct[] = []): Collection {
  return {
    id: 'gid://shopify/Collection/1',
    title: 'Test collection',
    handle: slug,
    description: '',
    descriptionHtml: '',
    image: null,
    seo: { title: null, description: null },
    products: {
      nodes,
      pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null },
      filters: HOSTILE_FILTERS,
    },
  }
}

function baseProps(slug: string) {
  return {
    source: { kind: 'collection' as const, handle: slug },
    baseUrl: `/category/${slug}`,
    facetKey: slug,
    sortKey: 'COLLECTION_DEFAULT',
    reverse: false,
    sortParam: undefined,
    activeFilterStrings: [],
    currentPage: 1,
    trackingParamsSource: new URLSearchParams(),
  }
}

afterEach(cleanup)
beforeEach(() => {
  mockFetch.mockReset()
  mockRedirect.mockReset()
})

describe('CategoryResults filter rail is registry-gated', () => {
  it('never renders the raw-tag facet or blocked tag values, even when the Storefront response includes them', async () => {
    mockFetch.mockResolvedValue({ collection: mockCollection('occ') })

    const element = await CategoryResults(baseProps('occ'))
    render(element)

    expect(screen.queryByText('compliance:fda-510k')).toBeNull()
    expect(screen.queryByText('discontinued')).toBeNull()
    expect(screen.queryByText('consolidation-duplicate')).toBeNull()
    expect(screen.queryByText('brand:acme')).toBeNull()
  })

  it('drops facets not on the OCC allowlist (e.g. glove size) even though the Storefront response includes them', async () => {
    mockFetch.mockResolvedValue({ collection: mockCollection('occ') })

    const element = await CategoryResults(baseProps('occ'))
    render(element)

    expect(screen.queryByText('Glove size')).toBeNull()
    expect(screen.getByText('Availability')).toBeInTheDocument()
  })

  it('renders the glove-size facet on the gloves collection, where it is allowlisted', async () => {
    mockFetch.mockResolvedValue({ collection: mockCollection('gloves') })

    const element = await CategoryResults(baseProps('gloves'))
    render(element)

    expect(screen.getByText('Glove size')).toBeInTheDocument()
    expect(screen.queryByText('compliance:fda-510k')).toBeNull()
  })
})

describe('CategoryResults deterministic page-N pagination', () => {
  it('requests first = currentPage * pageSize + 1 with no cursor, for a direct deep-page visit', async () => {
    mockFetch.mockResolvedValue({ collection: mockCollection('gloves', []) })

    await CategoryResults({ ...baseProps('gloves'), currentPage: 3 })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ first: 28, after: null }),
      expect.objectContaining({ next: expect.objectContaining({ tags: expect.arrayContaining(['collection:gloves']) }) }),
    )
  })

  it("slices out only page 2's products and reports the real count", async () => {
    const nodes = Array.from({ length: 19 }, (_, i) => mockProduct(`p${i}`))
    mockFetch.mockResolvedValue({ collection: mockCollection('gloves', nodes) })

    const element = await CategoryResults({ ...baseProps('gloves'), currentPage: 2 })
    render(element)

    expect(screen.getByText('Showing 9 products')).toBeInTheDocument()
    expect(screen.getByText('p9')).toBeInTheDocument()
    expect(screen.queryByText('p0')).toBeNull()
    expect(screen.queryByText('p18')).toBeNull()
  })

  it('renders a real next-page anchor for a deep page, not a page-1 duplicate', async () => {
    const nodes = Array.from({ length: 19 }, (_, i) => mockProduct(`p${i}`))
    mockFetch.mockResolvedValue({ collection: mockCollection('gloves', nodes) })

    const element = await CategoryResults({ ...baseProps('gloves'), currentPage: 2 })
    render(element)

    expect(screen.getByRole('link', { name: 'Next page' })).toHaveAttribute(
      'href',
      '/category/gloves?page=3',
    )
  })
})

describe('CategoryResults error handling', () => {
  it('redirects to page 1 (filters preserved) when the Storefront fetch fails on a deep page', async () => {
    mockFetch.mockRejectedValue(new Error('Storefront API HTTP 500'))

    await expect(
      CategoryResults({
        ...baseProps('gloves'),
        currentPage: 4,
        sortParam: 'PRICE_ASC',
        activeFilterStrings: ['{"v":"latex"}'],
      }),
    ).rejects.toThrow('REDIRECT:')

    expect(mockRedirect).toHaveBeenCalledTimes(1)
    const [url] = mockRedirect.mock.calls[0]
    expect(url).toContain('/category/gloves')
    expect(url).toContain('sort=PRICE_ASC')
    expect(url).toContain('filter=')
    expect(url).not.toContain('page=')
  })

  it('lets the error surface (no redirect) when the failure happens on page 1', async () => {
    mockFetch.mockRejectedValue(new Error('Storefront API HTTP 500'))

    await expect(CategoryResults(baseProps('gloves'))).rejects.toThrow('Storefront API HTTP 500')
    expect(mockRedirect).not.toHaveBeenCalled()
  })
})
