import { describe, it, expect, vi, beforeEach } from 'vitest'

// Final-review fix wave (Fix 4): app/category/[slug]/[product]/page.tsx calls
// getL1ByCollectionHandle(slug) directly, where `slug` is the PUBLIC URL
// slug from the route params. getL1ByCollectionHandle matches against
// collectionHandle (the real Shopify handle), which diverges from the
// public slug for Face Masks (public slug "face-masks", Shopify handle
// "face-coverings") — so a real /category/face-masks/<subcategory> request
// fails to resolve its L1 category at all today.
vi.mock('@/lib/shopify/storefront', () => ({ storefrontFetch: vi.fn() }))
vi.mock('@/lib/category-tree-data.server', () => ({ fetchProductTagSummaries: vi.fn(async () => []) }))
vi.mock('@/lib/csp-nonce', () => ({ getNonce: vi.fn(async () => 'test-nonce') }))
vi.mock('next/navigation', () => ({
  redirect: vi.fn(() => { throw new Error('NEXT_REDIRECT') }),
  notFound: vi.fn(() => { throw new Error('NEXT_NOT_FOUND') }),
}))

import CategoryProductPage, { generateMetadata } from '../[slug]/[product]/page'
import { fetchProductTagSummaries } from '@/lib/category-tree-data.server'

const mockFetchProductTagSummaries = vi.mocked(fetchProductTagSummaries)

beforeEach(() => {
  mockFetchProductTagSummaries.mockReset()
})

describe('L1 resolution off the PUBLIC slug (Face Masks: slug "face-masks", handle "face-coverings")', () => {
  it('renders the L2 subcategory page for /category/face-masks/<subcategory-tag> instead of falling through to a product lookup', async () => {
    mockFetchProductTagSummaries.mockResolvedValue([
      { handle: 'kn95-mask-50-pack', categories: ['face-masks'], subcategories: ['kn95-masks'] },
    ])

    // Today (bug present): getL1ByCollectionHandle('face-masks') returns
    // undefined (collectionHandle for Face Masks is 'face-coverings', not
    // 'face-masks'), so l1 is undefined, l2Nodes is never built, and this
    // falls through to the product-fetch path — where the mocked
    // storefrontFetch (a bare vi.fn() with no implementation) resolves to
    // undefined, and `rawProductData.product` throws a TypeError.
    const result = await CategoryProductPage({
      params: Promise.resolve({ slug: 'face-masks', product: 'kn95-masks' }),
      searchParams: Promise.resolve({}),
    })

    expect(result).toBeTruthy()
  })

  it('generateMetadata resolves subcategory metadata (not the product fallback) for the same URL', async () => {
    mockFetchProductTagSummaries.mockResolvedValue([
      { handle: 'kn95-mask-50-pack', categories: ['face-masks'], subcategories: ['kn95-masks'] },
    ])

    const meta = await generateMetadata({
      params: Promise.resolve({ slug: 'face-masks', product: 'kn95-masks' }),
      searchParams: Promise.resolve({}),
    })

    expect(meta.alternates?.canonical).toBe('https://mdsupplies.com/category/face-masks/kn95-masks')
  })
})
