import { z } from 'zod'

/**
 * Runtime validation for TrustShop's upstream response shapes. Deliberately
 * narrow: each object schema lists only the fields this app actually reads.
 * Zod's default "strip" mode drops everything else — including a
 * `customer.md5_email` field, if TrustShop ever sends one — before it ever
 * reaches a normalizer or a component. Upstream drift on a field we DO read
 * fails `.safeParse()`; callers in lib/trustshop/product.ts treat that as a
 * provider failure and fall back gracefully rather than crashing the PDP.
 */

const starsReviewSchema = z.object({
  star_1: z.number().int().nonnegative(),
  star_2: z.number().int().nonnegative(),
  star_3: z.number().int().nonnegative(),
  star_4: z.number().int().nonnegative(),
  star_5: z.number().int().nonnegative(),
})

// Product and store summaries share one real shape — average_review/
// total_review/stars_review.star_N — confirmed against the live API
// 2026-09-09 (see schemas.test.ts for the verbatim capture). The originally
// assumed product-only field names (average_rating/total_reviews/
// ratings_distribution.N_star) never matched anything TrustShop actually
// sends; every read failed Zod validation until this was caught. The one
// remaining difference is the envelope: product's response is flat, store's
// stays wrapped in `data` (see trustShopStoreSummarySchema below).
const ratingSummaryDataSchema = z.object({
  average_review: z.number(),
  total_review: z.number().int().nonnegative(),
  stars_review: starsReviewSchema,
})

export const trustShopSummarySchema = ratingSummaryDataSchema

const idSchema = z.union([z.string(), z.number()]).transform(String)

export const trustShopMediaItemSchema = z.object({
  url: z.string(),
  width: z.number().int().nonnegative().optional().default(0),
  height: z.number().int().nonnegative().optional().default(0),
  media_type: z.enum(['image', 'video']),
  review_id: idSchema.optional(),
  rating_star: z.number().int().min(1).max(5).nullable().optional(),
})

// customer is intentionally narrow — `name` only. md5_email is never listed
// here, so Zod's default strip mode drops it from the parsed output even if
// TrustShop sends it.
const trustShopCustomerSchema = z.object({
  name: z.string().optional().default(''),
})

export const trustShopReviewSchema = z.object({
  id: idSchema,
  buyer_verification: z.boolean().optional().default(false),
  content: z.string(),
  country_code: z.string().nullable().optional(),
  helpful: z.number().int().nonnegative().optional().default(0),
  created_at: z.string(),
  customer: trustShopCustomerSchema.optional().default({ name: '' }),
  medias: z.array(trustShopMediaItemSchema).optional().default([]),
  reply: z.string().nullable().optional(),
  reply_date: z.string().nullable().optional(),
  star: z.number().int().min(1).max(5),
  title: z.string().nullable().optional(),
  customer_display_name: z.string().nullable().optional(),
  language_code: z.string().nullable().optional(),
})

// Confirmed against the live API 2026-09-09: the reviews-list response never
// echoes back current_page at all (callers must track the page they
// requested themselves) and signals more pages via has_next_page — a real
// boolean, unlike the legacy next_cursor flag also present in the payload
// but unused here. TrustShop also returns an opaque `ref` cursor token
// (stripped — not adopted; page-number pagination stays the contract, per
// 2026-09-09 decision).
export const trustShopReviewListSchema = z.object({
  data: z.array(trustShopReviewSchema),
  has_next_page: z.boolean(),
})

// The media-list response has neither current_page nor has_next_page —
// only next_cursor, confirmed 2026-09-09. Genuinely inconsistent with the
// reviews-list response above; each schema reflects what its own endpoint
// actually returns rather than assuming parity between them.
export const trustShopMediaListSchema = z.object({
  data: z.array(trustShopMediaItemSchema),
  next_cursor: z.boolean(),
})

export const trustShopWriteResponseSchema = z.object({
  data: z.record(z.string(), z.unknown()).optional(),
  status: z.string().optional(),
})

// Store summary shares the same field shape as product summary
// (ratingSummaryDataSchema above) — only confirmed live for product so far;
// store's `data` wrapper is kept as originally assumed pending its own
// verification (not yet captured against the real API).
export const trustShopStoreSummarySchema = z.object({
  data: ratingSummaryDataSchema,
})
