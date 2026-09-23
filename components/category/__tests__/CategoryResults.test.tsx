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

// CategoryResults now stamps a CSP nonce on its ItemList <script> (DEV-LAUNCH-12,
// consistency with every other JSON-LD emitter) — getNonce() reads next/headers'
// headers(), which throws outside a real request scope.
vi.mock('@/lib/csp-nonce', () => ({ getNonce: async () => undefined }))

// DEV-FAV-01: CategoryResults now checks getSession() (favorites heart
// hydration) — same next/headers-outside-a-request-scope issue as
// getNonce() above. Not under test in this suite; a plain "signed out" stub.
vi.mock('@/lib/shopify/session', () => ({ getSession: async () => null }))

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
import { DEFAULT_PAGE_SIZE } from '@/lib/catalog/page-size'

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
  // Approved on every route, so it proves the rail is gated rather than empty.
  {
    id: 'filter.p.m.custom.order_size',
    label: 'Order Size',
    type: 'LIST',
    values: [{ id: 'os.case', label: 'Case', count: 4, input: '{"productMetafield":{"namespace":"custom","key":"order_size","value":"Case"}}' }],
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


// ── Query-aware Storefront mock ─────────────────────────────────────────────
// CategoryResults now issues TWO kinds of query per render: the cursor/total
// index (CatalogCollectionIndex, edges+cursors only) and the display page
// (GetCollection, full product payloads). A single mockResolvedValue can no
// longer serve both, so the mock dispatches on the operation name.
function mockCatalog(slug: string, nodes: CollectionProduct[], pageSize = DEFAULT_PAGE_SIZE) {
  mockFetch.mockImplementation(async (query: string, variables: Record<string, unknown> = {}) => {
    if (String(query).includes('CatalogCollectionIndex')) {
      return {
        collection: {
          products: {
            edges: nodes.map((n) => ({ cursor: `cursor:${n.handle}` })),
            pageInfo: { hasNextPage: false, endCursor: null },
          },
        },
      }
    }
    // Display page: honour `after` + `first` exactly as Shopify would, so the
    // assertions below exercise real cursor slicing rather than a fixture.
    const after = variables.after as string | null
    const start = after ? nodes.findIndex((n) => `cursor:${n.handle}` === after) + 1 : 0
    const first = (variables.first as number) ?? pageSize
    return { collection: mockCollection(slug, nodes.slice(start, start + first)) }
  })
}

afterEach(cleanup)
beforeEach(() => {
  mockFetch.mockReset()
  mockRedirect.mockReset()
})

describe('CategoryResults filter rail is registry-gated', () => {
  it('never renders the raw-tag facet or blocked tag values, even when the Storefront response includes them', async () => {
    mockCatalog('occ', [])

    const element = await CategoryResults(baseProps('occ'))
    render(element)

    expect(screen.queryByText('compliance:fda-510k')).toBeNull()
    expect(screen.queryByText('discontinued')).toBeNull()
    expect(screen.queryByText('consolidation-duplicate')).toBeNull()
    expect(screen.queryByText('brand:acme')).toBeNull()
  })

  it('drops facets not on the OCC allowlist (e.g. glove size) even though the Storefront response includes them', async () => {
    mockCatalog('occ', [])

    const element = await CategoryResults(baseProps('occ'))
    render(element)

    expect(screen.queryByText('Glove size')).toBeNull()
    // Availability is NOT in the approved Search & Discovery table, so it is
    // dropped on every route now — it used to be part of the universal set.
    expect(screen.queryByText('Availability')).toBeNull()
    // Order Size is approved and still renders, proving the rail is gated
    // rather than simply empty.
    expect(screen.getByText('Order Size')).toBeInTheDocument()
  })

  it('renders the glove-size facet on the gloves collection, where it is allowlisted', async () => {
    mockCatalog('gloves', [])

    const element = await CategoryResults(baseProps('gloves'))
    render(element)

    expect(screen.getByText('Glove size')).toBeInTheDocument()
    expect(screen.queryByText('compliance:fda-510k')).toBeNull()
  })
})

describe('CategoryResults deterministic page-N pagination', () => {
  it('fetches exactly one page, positioned by cursor rather than over-fetching', async () => {
    const nodes = Array.from({ length: 55 }, (_, i) => mockProduct(`p${i}`))
    mockCatalog('gloves', nodes)

    await CategoryResults({ ...baseProps('gloves'), currentPage: 3 })

    // Page 3 at 20 per page starts after item 40 (0-based offset 40), and asks
    // for 20 products — not 3 * 20 + 1 = 61 as the pre-cursor version did.
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('GetCollection'),
      expect.objectContaining({ first: 20, after: 'cursor:p39' }),
      expect.objectContaining({ next: expect.objectContaining({ tags: expect.arrayContaining(['collection:gloves']) }) }),
    )
  })

  it("shows only page 2's products and reports the exact matching total", async () => {
    const nodes = Array.from({ length: 55 }, (_, i) => mockProduct(`p${i}`))
    mockCatalog('gloves', nodes)

    const element = await CategoryResults({ ...baseProps('gloves'), currentPage: 2 })
    render(element)

    // 20 rendered on this page, 55 matching overall — the denominator is the
    // authoritative total, never the page size or the DOM count.
    expect(screen.getByText('Showing 20 products of 55')).toBeInTheDocument()
    expect(screen.getByText('p20')).toBeInTheDocument()
    expect(screen.queryByText('p0')).toBeNull()
    expect(screen.queryByText('p40')).toBeNull()
  })

  it('renders the exact remainder on the last page, not a full page size', async () => {
    const nodes = Array.from({ length: 47 }, (_, i) => mockProduct(`p${i}`))
    mockCatalog('gloves', nodes)

    const element = await CategoryResults({ ...baseProps('gloves'), currentPage: 3 })
    render(element)

    expect(screen.getByText('Showing 7 products of 47')).toBeInTheDocument()
  })

  it('uses singular grammar for a single result', async () => {
    mockCatalog('gloves', [mockProduct('only')])

    const element = await CategoryResults(baseProps('gloves'))
    render(element)

    expect(screen.getByText('Showing 1 product of 1')).toBeInTheDocument()
  })

  it('honours a non-default page size and carries it through pagination links', async () => {
    const nodes = Array.from({ length: 55 }, (_, i) => mockProduct(`p${i}`))
    mockCatalog('gloves', nodes, 10)

    const element = await CategoryResults({ ...baseProps('gloves'), pageSize: 10 })
    render(element)

    expect(screen.getByText('Showing 10 products of 55')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Next page' })).toHaveAttribute(
      'href',
      '/category/gloves?per_page=10&page=2',
    )
  })

  it('renders a real next-page anchor for a deep page, not a page-1 duplicate', async () => {
    const nodes = Array.from({ length: 55 }, (_, i) => mockProduct(`p${i}`))
    mockCatalog('gloves', nodes)

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
