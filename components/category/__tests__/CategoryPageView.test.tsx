import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/shopify/storefront', () => ({ storefrontFetch: vi.fn() }))
vi.mock('@/lib/category-tree-data.server', () => ({ fetchProductTagSummaries: vi.fn() }))
vi.mock('next/navigation', () => ({ notFound: vi.fn(() => { throw new Error('NEXT_NOT_FOUND') }), redirect: vi.fn() }))
// getNonce() reads next/headers' headers(), which throws outside a real
// request scope — same pattern as CategoryResults.test.tsx.
vi.mock('@/lib/csp-nonce', () => ({ getNonce: async () => undefined }))

import { storefrontFetch } from '@/lib/shopify/storefront'
import { fetchProductTagSummaries } from '@/lib/category-tree-data.server'
import { CategoryPageView } from '../CategoryPageView'

const mockStorefront = vi.mocked(storefrontFetch)
const mockSummaries = vi.mocked(fetchProductTagSummaries)

beforeEach(() => {
  mockStorefront.mockReset()
  mockSummaries.mockReset()
})

describe('CategoryPageView — subcategory-scan resilience', () => {
  it('still renders the category when the subcategory tag scan fails', async () => {
    mockStorefront.mockImplementation(async (query: string) => {
      if (query.includes('GET_COLLECTION_HERO') || query.includes('collection(')) {
        return { collection: { title: 'Mobility', handle: 'mobility', description: '', descriptionHtml: '', image: null, seo: {} } }
      }
      return { collection: { title: 'Mobility', handle: 'mobility', products: { nodes: [], pageInfo: {}, filters: [] } } }
    })
    mockSummaries.mockRejectedValue(new Error('storefront timeout'))

    const result = await CategoryPageView({ slug: 'mobility', sp: {} })
    // A React element tree came back rather than the function throwing —
    // the page rendered even though the tag scan failed.
    expect(result).toBeTruthy()
  })

  it('still propagates a hero-fetch rejection to the caller (error boundary), unlike the isolated tag-scan failure above', async () => {
    // The hero/product fetch stays on the critical path by design (see the
    // comment above the Promise.all in CategoryPageView.tsx) — only the tag
    // scan's failure is isolated via .catch(). This guards against a future
    // accidental .catch() being added to the hero fetch, which would silently
    // degrade a real Storefront outage into a broken page instead of the
    // error boundary.
    mockStorefront.mockImplementation(async (query: string) => {
      if (query.includes('GET_COLLECTION_HERO') || query.includes('collection(')) {
        throw new Error('storefront hero fetch failed')
      }
      return { collection: { title: 'Mobility', handle: 'mobility', products: { nodes: [], pageInfo: {}, filters: [] } } }
    })
    mockSummaries.mockResolvedValue([])

    await expect(CategoryPageView({ slug: 'mobility', sp: {} })).rejects.toThrow('storefront hero fetch failed')
  })
})
