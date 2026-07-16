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

  it('fetches via GET_PRODUCTS_BY_TAG_FILTERED for a tag source, using the source\'s title/slug', async () => {
    mockFetch.mockResolvedValue({
      products: { nodes: [], pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null }, filters: [] },
    })

    const { fetchProductConnection } = await import('../category-results-source')
    const result = await fetchProductConnection(
      { kind: 'tag', query: 'tag:"category:gloves" AND tag:"subcategory:exam-gloves"', title: 'Exam Gloves', slug: 'exam-gloves' },
      { first: 10, sortKey: 'COLLECTION_DEFAULT', reverse: false, filters: [] },
    )

    expect(result?.title).toBe('Exam Gloves')
    expect(result?.handle).toBe('exam-gloves')
    const [query, variables] = mockFetch.mock.calls[0]
    expect(query).toContain('GetProductsByTagFiltered')
    expect(variables).toMatchObject({ query: 'tag:"category:gloves" AND tag:"subcategory:exam-gloves"' })
  })

  it('maps the COLLECTION_DEFAULT sort key to BEST_SELLING for a tag source, since the root products() query has no such sort key', async () => {
    mockFetch.mockResolvedValue({
      products: { nodes: [], pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null }, filters: [] },
    })

    const { fetchProductConnection } = await import('../category-results-source')
    await fetchProductConnection(
      { kind: 'tag', query: 'tag:"category:gloves"', title: 'Gloves', slug: 'gloves' },
      { first: 10, sortKey: 'COLLECTION_DEFAULT', reverse: false, filters: [] },
    )

    const [, variables] = mockFetch.mock.calls[0]
    expect(variables).toMatchObject({ sortKey: 'BEST_SELLING' })
  })

  it('maps the CREATED sort key to CREATED_AT for a tag source, since the root products() query uses a different enum name for that value', async () => {
    mockFetch.mockResolvedValue({
      products: { nodes: [], pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null }, filters: [] },
    })

    const { fetchProductConnection } = await import('../category-results-source')
    await fetchProductConnection(
      { kind: 'tag', query: 'tag:"category:gloves"', title: 'Gloves', slug: 'gloves' },
      { first: 10, sortKey: 'CREATED', reverse: true, filters: [] },
    )

    const [, variables] = mockFetch.mock.calls[0]
    expect(variables).toMatchObject({ sortKey: 'CREATED_AT' })
  })

  it('passes non-default sort keys through unchanged for a tag source', async () => {
    mockFetch.mockResolvedValue({
      products: { nodes: [], pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null }, filters: [] },
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
