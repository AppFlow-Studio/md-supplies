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

const ratingsDistributionSchema = z.object({
  '1_star': z.number().int().nonnegative(),
  '2_star': z.number().int().nonnegative(),
  '3_star': z.number().int().nonnegative(),
  '4_star': z.number().int().nonnegative(),
  '5_star': z.number().int().nonnegative(),
})

export const trustShopSummarySchema = z.object({
  data: z.object({
    average_rating: z.number(),
    total_reviews: z.number().int().nonnegative(),
    ratings_distribution: ratingsDistributionSchema,
  }),
})

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

// next_cursor is a boolean flag in TrustShop's contract ("another numbered
// page exists"), not an actual cursor token — never treat it as one.
export const trustShopReviewListSchema = z.object({
  data: z.array(trustShopReviewSchema),
  current_page: z.number().int().positive(),
  next_cursor: z.boolean(),
})

export const trustShopMediaListSchema = z.object({
  data: z.array(trustShopMediaItemSchema),
  current_page: z.number().int().positive(),
  next_cursor: z.boolean(),
})

export const trustShopWriteResponseSchema = z.object({
  data: z.record(z.string(), z.unknown()).optional(),
  status: z.string().optional(),
})

// Store-review summary uses different field names than product-review
// summary (total_review vs total_reviews, average_review vs average_rating,
// stars_review.star_N vs ratings_distribution.N_star) — TrustShop's own
// inconsistency between the two domains. Normalized to the identical
// internal ProductReviewSummary/StoreReviewSummary shape in
// lib/trustshop/store.ts so the same UI primitives can render either.
const storeStarsSchema = z.object({
  star_1: z.number().int().nonnegative(),
  star_2: z.number().int().nonnegative(),
  star_3: z.number().int().nonnegative(),
  star_4: z.number().int().nonnegative(),
  star_5: z.number().int().nonnegative(),
})

export const trustShopStoreSummarySchema = z.object({
  data: z.object({
    average_review: z.number(),
    total_review: z.number().int().nonnegative(),
    stars_review: storeStarsSchema,
  }),
})
