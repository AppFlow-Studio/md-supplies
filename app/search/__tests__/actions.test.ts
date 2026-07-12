import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/shopify/storefront', () => ({
  storefrontFetch: vi.fn(),
}))

import { storefrontFetch } from '@/lib/shopify/storefront'
import { loadMoreSearchProducts } from '../actions'

const mockFetch = vi.mocked(storefrontFetch)

beforeEach(() => {
  mockFetch.mockReset()
  mockFetch.mockResolvedValue({
    search: {
      nodes: [],
      pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null },
    },
  })
})

describe('loadMoreSearchProducts filter/sort/query hardening', () => {
  it('strips a crafted internal-tag filter before forwarding to Shopify', async () => {
    await loadMoreSearchProducts({
      q: 'gloves',
      after: 'cursor1',
      sortKey: 'RELEVANCE',
      reverse: false,
      filters: [{ tag: 'consolidation-duplicate' }, { available: true }],
    })

    const forwarded = mockFetch.mock.calls[0][1] as { filters: Record<string, unknown>[] }
    expect(forwarded.filters).toEqual([{ available: true }])
  })

  it('falls back to RELEVANCE when sortKey is outside the approved set', async () => {
    await loadMoreSearchProducts({
      q: 'gloves',
      after: 'cursor1',
      sortKey: 'CREATED_AT; DROP TABLE products',
      reverse: false,
      filters: [],
    })

    const forwarded = mockFetch.mock.calls[0][1] as { sortKey: string }
    expect(forwarded.sortKey).toBe('RELEVANCE')
  })

  it('caps an oversized q before forwarding', async () => {
    await loadMoreSearchProducts({
      q: 'a'.repeat(500),
      after: 'cursor1',
      sortKey: 'RELEVANCE',
      reverse: false,
      filters: [],
    })

    const forwarded = mockFetch.mock.calls[0][1] as { query: string }
    expect(forwarded.query.length).toBeLessThanOrEqual(200)
  })
})
