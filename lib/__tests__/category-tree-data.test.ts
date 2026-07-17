import { vi, beforeEach } from 'vitest'

vi.mock('@/lib/shopify/storefront', () => ({ storefrontFetch: vi.fn() }))
import { storefrontFetch } from '@/lib/shopify/storefront'
const mockFetch = vi.mocked(storefrontFetch)

beforeEach(() => {
  mockFetch.mockReset()
})

import { describe, it, expect } from 'vitest'

describe('fetchProductTagSummaries', () => {
  it('paginates through every page and parses tags into summaries', async () => {
    mockFetch
      .mockResolvedValueOnce({
        products: {
          nodes: [{ handle: 'a', tags: ['category:gloves'] }],
          pageInfo: { hasNextPage: true, endCursor: 'cursor-1' },
        },
      })
      .mockResolvedValueOnce({
        products: {
          nodes: [{ handle: 'b', tags: ['category:dental', 'subcategory:suction'] }],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      })

    const { fetchProductTagSummaries } = await import('../category-tree-data.server')
    const summaries = await fetchProductTagSummaries()

    expect(summaries).toEqual([
      { handle: 'a', categories: ['gloves'], subcategories: [] },
      { handle: 'b', categories: ['dental'], subcategories: ['suction'] },
    ])
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('stops instead of looping forever if the API returns a stale cursor', async () => {
    mockFetch.mockResolvedValue({
      products: {
        nodes: [{ handle: 'a', tags: [] }],
        pageInfo: { hasNextPage: true, endCursor: null },
      },
    })
    const { fetchProductTagSummaries } = await import('../category-tree-data.server')
    const summaries = await fetchProductTagSummaries()
    expect(summaries).toHaveLength(1)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})
