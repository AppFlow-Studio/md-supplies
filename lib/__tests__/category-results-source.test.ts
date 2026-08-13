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

describe('sanitizeSearchText (DEV-SEARCH-01)', () => {
  it('strips query-syntax characters so input cannot become field filters or booleans', async () => {
    const { sanitizeSearchText } = await import('../category-results-source')
    expect(sanitizeSearchText('tag:"category:occ" OR vendor:evil')).toBe('tag category occ or vendor evil')
    expect(sanitizeSearchText('nitrile (exam) -powder *')).toBe('nitrile exam powder')
    expect(sanitizeSearchText('  BD   Syringe  ')).toBe('bd syringe')
  })

  it('lowercases so AND/OR/NOT are plain words, and caps length', async () => {
    const { sanitizeSearchText } = await import('../category-results-source')
    expect(sanitizeSearchText('gauze AND bandage')).toBe('gauze and bandage')
    expect(sanitizeSearchText('x'.repeat(300)).length).toBeLessThanOrEqual(80)
  })

  it('returns empty string when nothing searchable remains', async () => {
    const { sanitizeSearchText } = await import('../category-results-source')
    expect(sanitizeSearchText('()"":*')).toBe('')
  })
})

describe('scoped text search (DEV-SEARCH-01)', () => {
  const emptySearch = {
    search: { nodes: [], pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null }, productFilters: [] },
  }

  it('combines sanitized text with the tag query for a tag source', async () => {
    mockFetch.mockResolvedValue(emptySearch)
    const { fetchProductConnection } = await import('../category-results-source')
    await fetchProductConnection(
      { kind: 'tag', query: 'tag:"category:gloves" AND tag:"subcategory:exam-gloves"', title: 'Exam Gloves', slug: 'exam-gloves' },
      { first: 10, sortKey: 'COLLECTION_DEFAULT', reverse: false, filters: [], text: 'Nitrile "XL"' },
    )
    const [, variables] = mockFetch.mock.calls[0]
    expect(variables).toMatchObject({
      query: 'nitrile xl AND (tag:"category:gloves" AND tag:"subcategory:exam-gloves")',
    })
  })

  it('scopes a registry-backed collection source by its searchScope tag', async () => {
    mockFetch.mockResolvedValue(emptySearch)
    const { fetchProductConnection } = await import('../category-results-source')
    await fetchProductConnection(
      { kind: 'collection', handle: 'gloves', searchScope: 'tag:"category:gloves"' },
      { first: 10, sortKey: 'COLLECTION_DEFAULT', reverse: false, filters: [], text: 'surgical' },
    )
    const [query, variables] = mockFetch.mock.calls[0]
    expect(query).toContain('SearchProductsByTag')
    expect(variables).toMatchObject({ query: 'surgical AND (tag:"category:gloves")' })
  })

  it('falls back to the normal collection fetch when text sanitizes to empty', async () => {
    mockFetch.mockResolvedValue({ collection: null })
    const { fetchProductConnection } = await import('../category-results-source')
    await fetchProductConnection(
      { kind: 'collection', handle: 'gloves' },
      { first: 10, sortKey: 'COLLECTION_DEFAULT', reverse: false, filters: [], text: '():"' },
    )
    const [query] = mockFetch.mock.calls[0]
    expect(query).toContain('GetCollection')
  })

  it('enforces collection membership by ID intersection for scope-less collections (OCC)', async () => {
    const inMember = { id: 'gid://shopify/Product/1', handle: 'member' }
    const outsider = { id: 'gid://shopify/Product/2', handle: 'outsider' }
    mockFetch.mockImplementation(async (query: string) => {
      if (query.includes('SearchProductsByTag')) {
        return {
          search: {
            nodes: [inMember, outsider],
            pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null },
            productFilters: [],
          },
        }
      }
      // GET_COLLECTION_PRODUCT_IDS
      return {
        collection: {
          products: { nodes: [{ id: 'gid://shopify/Product/1' }], pageInfo: { hasNextPage: false, endCursor: null } },
        },
      }
    })

    const { fetchProductConnection } = await import('../category-results-source')
    const result = await fetchProductConnection(
      { kind: 'collection', handle: 'occ' },
      { first: 10, sortKey: 'COLLECTION_DEFAULT', reverse: false, filters: [], text: 'shoebox' },
    )
    expect(result?.products.nodes).toEqual([inMember])
  })

  it('returns null (treat as unavailable) when the membership collection is missing', async () => {
    mockFetch.mockImplementation(async (query: string) => {
      if (query.includes('SearchProductsByTag')) {
        return {
          search: { nodes: [], pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null }, productFilters: [] },
        }
      }
      return { collection: null }
    })
    const { fetchProductConnection } = await import('../category-results-source')
    const result = await fetchProductConnection(
      { kind: 'collection', handle: 'missing-occ' },
      { first: 10, sortKey: 'COLLECTION_DEFAULT', reverse: false, filters: [], text: 'anything' },
    )
    expect(result).toBeNull()
  })
})
