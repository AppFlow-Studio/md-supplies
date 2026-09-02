import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../product', () => ({
  getManyProductReviewSummaries: vi.fn(),
}))

import { getManyProductReviewSummaries } from '../product'
import { getReviewSummariesByGid } from '../collection-summaries'

const mockBatch = vi.mocked(getManyProductReviewSummaries)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getReviewSummariesByGid', () => {
  it('re-keys the numeric-id map by Shopify GID', async () => {
    mockBatch.mockResolvedValue(
      new Map([
        [111, { averageRating: 4.5, totalReviews: 10, ratingsDistribution: { 1: 0, 2: 0, 3: 0, 4: 2, 5: 8 } }],
        [222, null],
      ]),
    )

    const result = await getReviewSummariesByGid([
      { id: 'gid://shopify/Product/111' },
      { id: 'gid://shopify/Product/222' },
    ])

    expect(result.get('gid://shopify/Product/111')?.totalReviews).toBe(10)
    expect(result.get('gid://shopify/Product/222')).toBeNull()
  })

  it('skips a malformed GID rather than throwing — that card just gets no rating', async () => {
    mockBatch.mockResolvedValue(new Map([[111, null]]))

    const result = await getReviewSummariesByGid([
      { id: 'gid://shopify/Product/111' },
      { id: 'not-a-gid' },
    ])

    expect(result.get('not-a-gid')).toBeNull()
    expect(mockBatch).toHaveBeenCalledWith([111])
  })

  it('returns an empty map (not a throw) when the whole batch fails', async () => {
    mockBatch.mockRejectedValue(new Error('provider down'))
    const result = await getReviewSummariesByGid([{ id: 'gid://shopify/Product/111' }])
    expect(result.size).toBe(0)
  })

  it('returns an empty map for empty input', async () => {
    mockBatch.mockResolvedValue(new Map())
    const result = await getReviewSummariesByGid([])
    expect(result.size).toBe(0)
    expect(mockBatch).toHaveBeenCalledWith([])
  })
})
