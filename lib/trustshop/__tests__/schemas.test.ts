import { describe, it, expect } from 'vitest'
import { trustShopSummarySchema, trustShopReviewListSchema, trustShopMediaListSchema } from '../schemas'

/**
 * Regression guard against the 2026-09-09 contract mismatch: these three
 * schemas were built against an assumed shape that didn't match the real
 * TrustShop API. Every field/body below is a verbatim capture from
 * https://integrations.trustshop.io (product_id 9368798265577, zero-review
 * state) — not synthesized — taken right after TRUSTSHOP_API_BASE_URL was
 * first provisioned, when every one of these three endpoints was failing
 * Zod validation on a 200 response.
 */
describe('TrustShop schemas — real API shape (captured 2026-09-09)', () => {
  it('parses the real product review summary response (flat, no data wrapper)', () => {
    const real = {
      total_review: 0,
      average_review: 0,
      recommended_review: 0,
      stars_review: { star_5: 0, star_4: 0, star_3: 0, star_2: 0, star_1: 0 },
    }
    const result = trustShopSummarySchema.safeParse(real)
    expect(result.success).toBe(true)
  })

  it('parses the real product reviews-list response (no current_page, has has_next_page + ref)', () => {
    const real = {
      data: [],
      next_cursor: false,
      has_next_page: false,
      ref: 'eyJ2IjoxLCJwbCI6ImJveCIsImsiOiJwcm9kdWN0Iiwic2giOiI3MTE2NzM3NzYyNCIsInAiOlsiOTM2ODc5ODI2NTU3NyJdLCJmIjoiYWxsIiwibyI6Im1vc3RfaGVscGZ1bCJ9',
    }
    const result = trustShopReviewListSchema.safeParse(real)
    expect(result.success).toBe(true)
  })

  it('parses the real product media-list response (no current_page, no has_next_page)', () => {
    const real = { data: [], next_cursor: false }
    const result = trustShopMediaListSchema.safeParse(real)
    expect(result.success).toBe(true)
  })
})
