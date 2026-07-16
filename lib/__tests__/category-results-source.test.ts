import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/shopify/storefront', () => ({ storefrontFetch: vi.fn() }))
import { storefrontFetch } from '@/lib/shopify/storefront'
const mockFetch = vi.mocked(storefrontFetch)

beforeEach(() => {
  mockFetch.mockReset()
})

describe('fetchProductConnection', () => {
  it('fetches via GET_COLLECTION for a collection source and returns its products/title/handle', async () => {
    mockFetch.mockResolvedValue({
      collection: {
        id: '1',
        title: 'Gloves',
        handle: 'gloves',
        description: '',
        descriptionHtml: '',
        image: null,
        seo: { title: null, description: null },
        products: { nodes: [], pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null }, filters: [] },
      },
    })

    const { fetchProductConnection } = await import('../category-results-source')
    const result = await fetchProductConnection(
      { kind: 'collection', handle: 'gloves' },
      { first: 10, sortKey: 'COLLECTION_DEFAULT', reverse: false, filters: [] },
    )

    expect(result?.title).toBe('Gloves')
    expect(result?.handle).toBe('gloves')
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [query, variables] = mockFetch.mock.calls[0]
    expect(query).toContain('GetCollection')
    expect(variables).toMatchObject({ handle: 'gloves', sortKey: 'COLLECTION_DEFAULT' })
  })

  it('returns null when the collection source resolves to no collection', async () => {
    mockFetch.mockResolvedValue({ collection: null })
    const { fetchProductConnection } = await import('../category-results-source')
    const result = await fetchProductConnection(
      { kind: 'collection', handle: 'does-not-exist' },
      { first: 10, sortKey: 'COLLECTION_DEFAULT', reverse: false, filters: [] },
    )
    expect(result).toBeNull()
  })

  it('fetches via SEARCH_PRODUCTS_BY_TAG for a tag source, using the source\'s title/slug, and reshapes search.productFilters into products.filters', async () => {
    const mockFilters = [{ id: 'filter.p.m.custom.type', label: 'Type', type: 'LIST', values: [] }]
    mockFetch.mockResolvedValue({
      search: { nodes: [], pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null }, productFilters: mockFilters },
    })

    const { fetchProductConnection } = await import('../category-results-source')
    const result = await fetchProductConnection(
      { kind: 'tag', query: 'tag:"category:gloves" AND tag:"subcategory:exam-gloves"', title: 'Exam Gloves', slug: 'exam-gloves' },
      { first: 10, sortKey: 'COLLECTION_DEFAULT', reverse: false, filters: [] },
    )

    expect(result?.title).toBe('Exam Gloves')
    expect(result?.handle).toBe('exam-gloves')
    expect(result?.products.filters).toEqual(mockFilters)
    const [query, variables] = mockFetch.mock.calls[0]
    expect(query).toContain('SearchProductsByTag')
    expect(variables).toMatchObject({ query: 'tag:"category:gloves" AND tag:"subcategory:exam-gloves"' })
  })

  it('maps the COLLECTION_DEFAULT sort key to RELEVANCE for a tag source, since SearchSortKeys only accepts RELEVANCE and PRICE', async () => {
    mockFetch.mockResolvedValue({
      search: { nodes: [], pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null }, productFilters: [] },
    })

    const { fetchProductConnection } = await import('../category-results-source')
    await fetchProductConnection(
      { kind: 'tag', query: 'tag:"category:gloves"', title: 'Gloves', slug: 'gloves' },
      { first: 10, sortKey: 'COLLECTION_DEFAULT', reverse: false, filters: [] },
    )

    const [, variables] = mockFetch.mock.calls[0]
    expect(variables).toMatchObject({ sortKey: 'RELEVANCE' })
  })

  it('maps the CREATED sort key to RELEVANCE for a tag source, since SearchSortKeys has no created-date sort', async () => {
    mockFetch.mockResolvedValue({
      search: { nodes: [], pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null }, productFilters: [] },
    })

    const { fetchProductConnection } = await import('../category-results-source')
    await fetchProductConnection(
      { kind: 'tag', query: 'tag:"category:gloves"', title: 'Gloves', slug: 'gloves' },
      { first: 10, sortKey: 'CREATED', reverse: true, filters: [] },
    )

    const [, variables] = mockFetch.mock.calls[0]
    expect(variables).toMatchObject({ sortKey: 'RELEVANCE' })
  })

  it('passes the PRICE sort key through unchanged for a tag source', async () => {
    mockFetch.mockResolvedValue({
      search: { nodes: [], pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null }, productFilters: [] },
    })

    const { fetchProductConnection } = await import('../category-results-source')
    await fetchProductConnection(
      { kind: 'tag', query: 'tag:"category:gloves"', title: 'Gloves', slug: 'gloves' },
      { first: 10, sortKey: 'PRICE', reverse: true, filters: [] },
    )

    const [, variables] = mockFetch.mock.calls[0]
    expect(variables).toMatchObject({ sortKey: 'PRICE', reverse: true })
  })
})
