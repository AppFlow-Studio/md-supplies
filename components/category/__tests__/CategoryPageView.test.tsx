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
})
