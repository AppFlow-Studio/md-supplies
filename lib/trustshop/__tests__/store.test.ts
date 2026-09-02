import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }))
vi.mock('../client', async () => {
  const actual = await vi.importActual<typeof import('../client')>('../client')
  return {
    ...actual,
    trustShopGet: vi.fn(),
    trustShopPost: vi.fn(),
  }
})

import { revalidateTag } from 'next/cache'
import { trustShopGet, trustShopPost, TrustShopError } from '../client'
import {
  getStoreReviewSummary,
  listStoreReviews,
  getStoreReviewMedia,
  submitStoreReview,
} from '../store'

const mockGet = vi.mocked(trustShopGet)
const mockPost = vi.mocked(trustShopPost)
const mockRevalidateTag = vi.mocked(revalidateTag)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getStoreReviewSummary', () => {
  it('normalizes the store-specific field names (total_review/average_review/stars_review) into the shared summary shape', async () => {
    mockGet.mockResolvedValue({
      data: {
        average_review: 4.6,
        total_review: 128,
        stars_review: { star_1: 3, star_2: 1, star_3: 5, star_4: 40, star_5: 79 },
      },
    })

    const summary = await getStoreReviewSummary()
    expect(summary).toEqual({
      averageRating: 4.6,
      totalReviews: 128,
      ratingsDistribution: { 1: 3, 2: 1, 3: 5, 4: 40, 5: 79 },
    })
  })

  it('normalizes a zero-review summary without fabricating a rating', async () => {
    mockGet.mockResolvedValue({
      data: { average_review: 0, total_review: 0, stars_review: { star_1: 0, star_2: 0, star_3: 0, star_4: 0, star_5: 0 } },
    })
    const summary = await getStoreReviewSummary()
    expect(summary?.totalReviews).toBe(0)
  })

  it('returns null gracefully on any provider failure', async () => {
    mockGet.mockRejectedValue(new TrustShopError('server error', 'server'))
    await expect(getStoreReviewSummary()).resolves.toBeNull()
  })

  it('never scopes the request to a Shopify product id', async () => {
    mockGet.mockResolvedValue({
      data: { average_review: 4, total_review: 1, stars_review: { star_1: 0, star_2: 0, star_3: 0, star_4: 0, star_5: 1 } },
    })
    await getStoreReviewSummary()
    const call = mockGet.mock.calls[0][1] as { shopifyProductId?: number; query?: Record<string, unknown> }
    expect(call.shopifyProductId).toBeUndefined()
    expect(call.query).toBeUndefined()
  })
})

describe('listStoreReviews', () => {
  const baseReview = {
    id: 's1',
    buyer_verification: true,
    content: 'Great experience shopping here',
    country_code: 'US',
    helpful: 2,
    created_at: '2026-02-01T00:00:00Z',
    customer: { name: 'Alex' },
    medias: [],
    reply: null,
    reply_date: null,
    star: 5,
    title: 'Smooth ordering',
    customer_display_name: 'Alex',
    language_code: 'en',
  }

  it('normalizes reviews using the same shape as product reviews', async () => {
    mockGet.mockResolvedValue({ data: [baseReview], current_page: 1, next_cursor: false })
    const page = await listStoreReviews()
    expect(page?.reviews[0]).toMatchObject({ id: 's1', starRating: 5, buyerVerified: true })
  })

  it('increments current_page only when next_cursor is true', async () => {
    mockGet.mockResolvedValue({ data: [baseReview], current_page: 2, next_cursor: true })
    const page = await listStoreReviews({ currentPage: 2 })
    expect(page?.hasNextPage).toBe(true)
  })

  it('drops a filter/sort value that is not in the allowlist', async () => {
    mockGet.mockResolvedValue({ data: [], current_page: 1, next_cursor: false })
    await listStoreReviews({ filter: 'nonsense', sort: 'nonsense' })
    const call = mockGet.mock.calls[0][1] as { query: Record<string, unknown> }
    expect(call.query.filter).toBeUndefined()
    expect(call.query.sort).toBeUndefined()
  })

  it('returns null gracefully on a provider failure', async () => {
    mockGet.mockRejectedValue(new TrustShopError('server error', 'server'))
    await expect(listStoreReviews()).resolves.toBeNull()
  })
})

describe('getStoreReviewMedia', () => {
  it('normalizes media entries', async () => {
    mockGet.mockResolvedValue({
      data: [{ url: 'https://cdn.example.com/store-a.jpg', width: 640, height: 480, media_type: 'image', review_id: 's1', rating_star: 5 }],
      current_page: 1,
      next_cursor: false,
    })
    const page = await getStoreReviewMedia()
    expect(page?.media[0]).toMatchObject({ url: 'https://cdn.example.com/store-a.jpg', mediaType: 'image' })
  })

  it('returns null gracefully on failure', async () => {
    mockGet.mockRejectedValue(new TrustShopError('server error', 'server'))
    await expect(getStoreReviewMedia()).resolves.toBeNull()
  })
})

describe('submitStoreReview', () => {
  it('never includes a product_id or buyer_verification field in the outgoing body', async () => {
    mockPost.mockResolvedValue({})
    await submitStoreReview({ star: 5, content: 'Great service', name: 'Alex', email: 'alex@example.com' })

    const call = mockPost.mock.calls[0][1] as { body: Record<string, unknown> }
    expect(call.body).not.toHaveProperty('product_id')
    expect(call.body).not.toHaveProperty('buyer_verification')
    expect(call.body.customer_display_name).toBe('first_name')
  })

  it('does not retry automatically — calls trustShopPost exactly once', async () => {
    mockPost.mockRejectedValue(new TrustShopError('server error', 'server'))
    await submitStoreReview({ star: 5, content: 'Great service', name: 'Alex', email: 'alex@example.com' })
    expect(mockPost).toHaveBeenCalledTimes(1)
  })

  it('returns a safe failure result on provider error rather than throwing', async () => {
    mockPost.mockRejectedValue(new TrustShopError('server error', 'server'))
    const result = await submitStoreReview({ star: 5, content: 'Great service', name: 'Alex', email: 'alex@example.com' })
    expect(result).toEqual({ ok: false, reason: 'provider_error' })
  })

  it('revalidates the single store-wide cache tag on success (not a per-product tag)', async () => {
    mockPost.mockResolvedValue({})
    await submitStoreReview({ star: 5, content: 'Great service', name: 'Alex', email: 'alex@example.com' })
    expect(mockRevalidateTag).toHaveBeenCalledWith('trustshop:store', 'max')
  })
})
