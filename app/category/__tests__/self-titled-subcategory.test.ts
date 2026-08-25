import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/shopify/storefront', () => ({ storefrontFetch: vi.fn() }))
vi.mock('@/lib/category-tree-data.server', () => ({ fetchProductTagSummaries: vi.fn(async () => []) }))
vi.mock('@/lib/csp-nonce', () => ({ getNonce: vi.fn(async () => 'test-nonce') }))
vi.mock('next/navigation', () => ({
  redirect: vi.fn(() => { throw new Error('NEXT_REDIRECT') }),
  notFound: vi.fn(() => { throw new Error('NEXT_NOT_FOUND') }),
}))

import { redirect } from 'next/navigation'
import CategoryProductPage, { generateMetadata } from '../[slug]/[product]/page'

const mockRedirect = vi.mocked(redirect)

beforeEach(() => {
  mockRedirect.mockClear()
})

describe('self-titled duplicate category page (/category/<x>/<x>, MASTER-PLAN §10)', () => {
  it('redirects the page component to the parent category instead of falling through to a 404', async () => {
    await expect(
      CategoryProductPage({
        params: Promise.resolve({ slug: 'hygiene', product: 'hygiene' }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow('NEXT_REDIRECT')
    expect(mockRedirect).toHaveBeenCalledWith('/category/hygiene')
  })

  it('generateMetadata returns a noindex canonical to the parent category, without fetching a nonexistent product', async () => {
    const meta = await generateMetadata({
      params: Promise.resolve({ slug: 'hygiene', product: 'hygiene' }),
      searchParams: Promise.resolve({}),
    })
    expect(meta.alternates?.canonical).toBe('https://mdsupplies.com/category/hygiene')
    expect(meta.robots).toBe('noindex,follow')
  })

  it('does not redirect a real subcategory (control case, e.g. hygiene/toothbrushes must still work)', async () => {
    // getL1ByCollectionHandle('hygiene') resolves via the real
    // CATEGORY_TREE_L1 registry (no mock needed) — 'toothbrushes' !== the L1
    // tag 'hygiene', so this must NOT hit the new self-titled guard. It will
    // still throw (fetchProductTagSummaries is mocked to return [], so no L2
    // node matches 'toothbrushes' either, and it falls through to the mocked
    // storefrontFetch, which rejects for an unmocked query) — the assertion
    // that matters is what it does NOT do.
    await expect(
      CategoryProductPage({
        params: Promise.resolve({ slug: 'hygiene', product: 'toothbrushes' }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow()
    expect(mockRedirect).not.toHaveBeenCalledWith('/category/hygiene')
  })
})
