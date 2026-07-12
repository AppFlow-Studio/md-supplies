import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/shopify/storefront', () => ({
  storefrontFetch: vi.fn(),
}))

import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET } from '../route'

const mockFetch = vi.mocked(storefrontFetch)

beforeEach(() => {
  mockFetch.mockReset()
})

describe('predictive search collection filtering (NF4)', () => {
  it('drops collections whose handle is not in the nav registry', async () => {
    mockFetch.mockResolvedValue({
      predictiveSearch: {
        products: [],
        queries: [],
        collections: [
          { id: 'gid://1', title: 'Gloves', handle: 'gloves' },
          { id: 'gid://2', title: 'Internal Ops', handle: 'consolidation-duplicate' },
        ],
      },
    })

    const req = new NextRequest('http://localhost/api/search/predictive?q=gl')
    const res = await GET(req)
    const body = await res.json()

    expect(body.collections.map((c: { handle: string }) => c.handle)).toEqual(['gloves'])
  })
})

describe('predictive search q cap (NF15)', () => {
  it('caps an oversized q before forwarding to Shopify', async () => {
    mockFetch.mockResolvedValue({
      predictiveSearch: { products: [], queries: [], collections: [] },
    })

    const req = new NextRequest(`http://localhost/api/search/predictive?q=${'a'.repeat(500)}`)
    await GET(req)

    const forwarded = mockFetch.mock.calls[0][1] as { q: string }
    expect(forwarded.q.length).toBeLessThanOrEqual(100)
  })
})
