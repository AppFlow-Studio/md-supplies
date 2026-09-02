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
  getProductReviewSummary,
  listProductReviews,
  getProductReviewMedia,
  submitProductReview,
  getManyProductReviewSummaries,
  nextPageFor,
} from '../product'

const mockGet = vi.mocked(trustShopGet)
const mockPost = vi.mocked(trustShopPost)
const mockRevalidateTag = vi.mocked(revalidateTag)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('nextPageFor', () => {
  it('increments only when next_cursor is true', () => {
    expect(nextPageFor(1, true)).toBe(2)
    expect(nextPageFor(1, false)).toBeNull()
    expect(nextPageFor(7, true)).toBe(8)
  })
})

describe('getProductReviewSummary', () => {
  it('normalizes a valid summary', async () => {
    mockGet.mockResolvedValue({
      data: {
        average_rating: 4.5,
        total_reviews: 55,
        ratings_distribution: { '1_star': 2, '2_star': 0, '3_star': 3, '4_star': 8, '5_star': 42 },
      },
    })

    const summary = await getProductReviewSummary(123)
    expect(summary).toEqual({
      averageRating: 4.5,
      totalReviews: 55,
      ratingsDistribution: { 1: 2, 2: 0, 3: 3, 4: 8, 5: 42 },
    })
  })

  it('normalizes a zero-review summary without fabricating a rating', async () => {
    mockGet.mockResolvedValue({
      data: {
        average_rating: 0,
        total_reviews: 0,
        ratings_distribution: { '1_star': 0, '2_star': 0, '3_star': 0, '4_star': 0, '5_star': 0 },
      },
    })

    const summary = await getProductReviewSummary(123)
    expect(summary?.totalReviews).toBe(0)
  })

  it('returns null (not a throw) on a 403 config failure', async () => {
    mockGet.mockRejectedValue(new TrustShopError('bad token', 'config', { httpStatus: 403 }))
    await expect(getProductReviewSummary(123)).resolves.toBeNull()
  })

  it('returns null on a 429', async () => {
    mockGet.mockRejectedValue(new TrustShopError('rate limited', 'rate_limited', { httpStatus: 429 }))
    await expect(getProductReviewSummary(123)).resolves.toBeNull()
  })

  it('returns null on a 5xx', async () => {
    mockGet.mockRejectedValue(new TrustShopError('server error', 'server', { httpStatus: 500 }))
    await expect(getProductReviewSummary(123)).resolves.toBeNull()
  })

  it('returns null on a timeout', async () => {
    mockGet.mockRejectedValue(new TrustShopError('timed out', 'timeout'))
    await expect(getProductReviewSummary(123)).resolves.toBeNull()
  })

  it('returns null on malformed upstream JSON rather than crashing', async () => {
    mockGet.mockRejectedValue(new TrustShopError('malformed', 'validation'))
    await expect(getProductReviewSummary(123)).resolves.toBeNull()
  })
})

describe('listProductReviews — review normalization', () => {
  const baseReview = {
    id: 'r1',
    buyer_verification: true,
    content: 'Great product',
    country_code: 'US',
    helpful: 3,
    created_at: '2026-01-01T00:00:00Z',
    customer: { name: 'John Doe' },
    medias: [],
    reply: null,
    reply_date: null,
    star: 5,
    title: 'Great!',
    customer_display_name: 'John',
    language_code: 'en',
  }

  it('marks buyerVerified true when TrustShop returns buyer_verification: true', async () => {
    mockGet.mockResolvedValue({ data: [baseReview], current_page: 1, next_cursor: false })
    const page = await listProductReviews(123)
    expect(page?.reviews[0].buyerVerified).toBe(true)
  })

  it('marks buyerVerified false when TrustShop returns buyer_verification: false', async () => {
    mockGet.mockResolvedValue({ data: [{ ...baseReview, buyer_verification: false }], current_page: 1, next_cursor: false })
    const page = await listProductReviews(123)
    expect(page?.reviews[0].buyerVerified).toBe(false)
  })

  it('surfaces a merchant reply and reply date when present', async () => {
    mockGet.mockResolvedValue({
      data: [{ ...baseReview, reply: 'Thanks!', reply_date: '2026-01-02T00:00:00Z' }],
      current_page: 1,
      next_cursor: false,
    })
    const page = await listProductReviews(123)
    expect(page?.reviews[0].reply).toBe('Thanks!')
    expect(page?.reviews[0].replyDate).toBe('2026-01-02T00:00:00Z')
  })

  it('omits a merchant reply when absent', async () => {
    mockGet.mockResolvedValue({ data: [baseReview], current_page: 1, next_cursor: false })
    const page = await listProductReviews(123)
    expect(page?.reviews[0].reply).toBeNull()
  })

  it('never surfaces a customer.md5_email field, even if upstream sends one', async () => {
    mockGet.mockResolvedValue({
      data: [{ ...baseReview, customer: { name: 'John Doe', md5_email: 'deadbeef' } }],
      current_page: 1,
      next_cursor: false,
    })
    const page = await listProductReviews(123)
    expect(JSON.stringify(page)).not.toContain('deadbeef')
    expect(JSON.stringify(page)).not.toContain('md5_email')
  })

  it('increments current_page only when next_cursor is true', async () => {
    mockGet.mockResolvedValue({ data: [baseReview], current_page: 1, next_cursor: true })
    const page = await listProductReviews(123)
    expect(page?.hasNextPage).toBe(true)
  })

  it('does not indicate a next page when next_cursor is false', async () => {
    mockGet.mockResolvedValue({ data: [baseReview], current_page: 1, next_cursor: false })
    const page = await listProductReviews(123)
    expect(page?.hasNextPage).toBe(false)
  })

  it('returns null gracefully on a provider failure', async () => {
    mockGet.mockRejectedValue(new TrustShopError('server error', 'server'))
    await expect(listProductReviews(123)).resolves.toBeNull()
  })

  it('passes only allowlisted filter/sort values through to the query', async () => {
    mockGet.mockResolvedValue({ data: [], current_page: 1, next_cursor: false })
    await listProductReviews(123, { filter: '5_star', sort: 'newest' })
    const call = mockGet.mock.calls[0][1] as { query: Record<string, unknown> }
    expect(call.query.filter).toBe('5_star')
    expect(call.query.sort).toBe('newest')
  })

  it('drops a filter/sort value that is not in the allowlist', async () => {
    mockGet.mockResolvedValue({ data: [], current_page: 1, next_cursor: false })
    await listProductReviews(123, { filter: 'DROP TABLE reviews', sort: 'sql_injection' })
    const call = mockGet.mock.calls[0][1] as { query: Record<string, unknown> }
    expect(call.query.filter).toBeUndefined()
    expect(call.query.sort).toBeUndefined()
  })
})

describe('getProductReviewMedia', () => {
  it('normalizes media entries', async () => {
    mockGet.mockResolvedValue({
      data: [{ url: 'https://cdn.example.com/a.jpg', width: 800, height: 600, media_type: 'image', review_id: 'r1', rating_star: 5 }],
      current_page: 1,
      next_cursor: false,
    })
    const page = await getProductReviewMedia(123)
    expect(page?.media[0]).toEqual({
      reviewId: 'r1',
      url: 'https://cdn.example.com/a.jpg',
      width: 800,
      height: 600,
      mediaType: 'image',
      ratingStar: 5,
    })
  })

  it('returns null gracefully on failure', async () => {
    mockGet.mockRejectedValue(new TrustShopError('server error', 'server'))
    await expect(getProductReviewMedia(123)).resolves.toBeNull()
  })
})

describe('submitProductReview', () => {
  it('never forwards a buyer_verification field, even if present on a spread-style caller mistake', async () => {
    mockPost.mockResolvedValue({})
    await submitProductReview({
      shopifyProductId: 123,
      star: 5,
      content: 'Nice',
      name: 'Jane',
      email: 'jane@example.com',
    })

    const call = mockPost.mock.calls[0][1] as { body: Record<string, unknown> }
    expect(call.body).not.toHaveProperty('buyer_verification')
    expect(call.body.customer_display_name).toBe('first_name')
  })

  it('does not retry automatically — calls trustShopPost exactly once', async () => {
    mockPost.mockRejectedValue(new TrustShopError('server error', 'server'))
    await submitProductReview({ shopifyProductId: 123, star: 5, content: 'Nice', name: 'Jane', email: 'jane@example.com' })
    expect(mockPost).toHaveBeenCalledTimes(1)
  })

  it('returns a safe failure result on provider error rather than throwing', async () => {
    mockPost.mockRejectedValue(new TrustShopError('server error', 'server'))
    const result = await submitProductReview({ shopifyProductId: 123, star: 5, content: 'Nice', name: 'Jane', email: 'jane@example.com' })
    expect(result).toEqual({ ok: false, reason: 'provider_error' })
  })

  it('revalidates the product cache tag on success', async () => {
    mockPost.mockResolvedValue({})
    await submitProductReview({ shopifyProductId: 123, star: 5, content: 'Nice', name: 'Jane', email: 'jane@example.com' })
    expect(mockRevalidateTag).toHaveBeenCalledWith('trustshop:product:123', 'max')
  })
})

describe('getManyProductReviewSummaries', () => {
  it('returns an empty map for empty input', async () => {
    const result = await getManyProductReviewSummaries([])
    expect(result.size).toBe(0)
  })

  it('deduplicates repeated ids', async () => {
    mockGet.mockResolvedValue({
      data: { average_rating: 5, total_reviews: 1, ratings_distribution: { '1_star': 0, '2_star': 0, '3_star': 0, '4_star': 0, '5_star': 1 } },
    })
    await getManyProductReviewSummaries([1, 1, 1])
    expect(mockGet).toHaveBeenCalledTimes(1)
  })

  it('one failing item does not fail the batch — others still resolve', async () => {
    mockGet.mockImplementation(async (_path, opts: { shopifyProductId?: number }) => {
      if (opts.shopifyProductId === 2) throw new TrustShopError('server error', 'server')
      return { data: { average_rating: 4, total_reviews: 10, ratings_distribution: { '1_star': 0, '2_star': 0, '3_star': 0, '4_star': 0, '5_star': 10 } } }
    })
    const result = await getManyProductReviewSummaries([1, 2, 3])
    expect(result.get(1)).not.toBeNull()
    expect(result.get(2)).toBeNull()
    expect(result.get(3)).not.toBeNull()
  })

  it('respects a bounded concurrency cap on a large cold batch', async () => {
    let inFlight = 0
    let maxInFlight = 0
    mockGet.mockImplementation(async () => {
      inFlight += 1
      maxInFlight = Math.max(maxInFlight, inFlight)
      await new Promise((r) => setTimeout(r, 10))
      inFlight -= 1
      return { data: { average_rating: 4, total_reviews: 1, ratings_distribution: { '1_star': 0, '2_star': 0, '3_star': 0, '4_star': 0, '5_star': 1 } } }
    })

    const ids = Array.from({ length: 48 }, (_, i) => i + 1)
    await getManyProductReviewSummaries(ids)

    expect(maxInFlight).toBeLessThanOrEqual(6)
    expect(mockGet).toHaveBeenCalledTimes(48)
  })
})
