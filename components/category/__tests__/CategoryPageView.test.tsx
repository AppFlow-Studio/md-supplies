import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within, cleanup } from '@testing-library/react'

vi.mock('@/lib/shopify/storefront', () => ({ storefrontFetch: vi.fn() }))
vi.mock('@/lib/category-tree-data.server', () => ({ fetchProductTagSummaries: vi.fn() }))
vi.mock('next/navigation', () => ({ notFound: vi.fn(() => { throw new Error('NEXT_NOT_FOUND') }), redirect: vi.fn() }))
// getNonce() reads next/headers' headers(), which throws outside a real
// request scope — same pattern as CategoryResults.test.tsx.
vi.mock('@/lib/csp-nonce', () => ({ getNonce: async () => undefined }))
// CategoryResults is itself an async server component; React Testing
// Library's synchronous render() can't resolve a nested async component (see
// CategoryResults.test.tsx, which awaits it directly instead). It isn't under
// test here, so stub it out the same way that suite stubs ProductGrid.
vi.mock('@/components/category/CategoryResults', () => ({
  CategoryResults: () => null,
}))
// FAQSection renders an async FAQSchema (JSON-LD script with a CSP nonce) —
// same async-component-under-sync-render issue as CategoryResults above, and
// not under test in this suite.
vi.mock('@/components/b2b/FAQSection', () => ({
  FAQSection: () => null,
}))

import { storefrontFetch } from '@/lib/shopify/storefront'
import { fetchProductTagSummaries } from '@/lib/category-tree-data.server'
import { CategoryPageView } from '../CategoryPageView'

const mockStorefront = vi.mocked(storefrontFetch)
const mockSummaries = vi.mocked(fetchProductTagSummaries)

beforeEach(() => {
  mockStorefront.mockReset()
  mockSummaries.mockReset()
})

afterEach(cleanup)

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

describe('CategoryPageView — SEO-CATEGORY-01 §8 Needles & Syringes ↔ Trocars cross-sell links', () => {
  function mockEmptyCollection(handle: string, title: string) {
    mockStorefront.mockImplementation(async (query: string) => {
      if (query.includes('GET_COLLECTION_HERO') || query.includes('collection(')) {
        return { collection: { title, handle, description: '', descriptionHtml: '', image: null, seo: {} } }
      }
      return { collection: { title, handle, products: { nodes: [], pageInfo: {}, filters: [] } } }
    })
    mockSummaries.mockResolvedValue([])
  }

  it('renders a Trocars & Trocar Kits link in Shop by Need on the Needles & Syringes page', async () => {
    mockEmptyCollection('needles-syringes', 'Needles & Syringes')

    const element = await CategoryPageView({ slug: 'needles-syringes', sp: {} })
    render(element)

    const link = screen.getByRole('link', { name: 'Trocars & Trocar Kits' })
    expect(link).toHaveAttribute('href', '/category/trocars-trocar-kits')
  })

  it('renders HRT Clinics, Kadara Medical, and Needles & Syringes links in Shop by Need on the Trocars page', async () => {
    mockEmptyCollection('trocars-trocar-kits', 'Trocars & Trocar Kits')

    const element = await CategoryPageView({ slug: 'trocars-trocar-kits', sp: {} })
    render(element)

    // "Needles & Syringes" also appears in the generic "Related Categories"
    // section (an L1 sibling tile), so scope to the "Shop by Need" section
    // specifically to assert the new cross-sell link rather than that one.
    const shopByNeed = screen.getByRole('heading', { name: 'Shop by Need' }).closest('section')!
    const scoped = within(shopByNeed)
    expect(scoped.getByRole('link', { name: 'HRT Clinics' })).toHaveAttribute('href', '/industries/hrt-clinics')
    expect(scoped.getByRole('link', { name: 'Kadara Medical' })).toHaveAttribute('href', '/partners/kadara')
    expect(scoped.getByRole('link', { name: 'Needles & Syringes' })).toHaveAttribute('href', '/category/needles-syringes')
  })
})
