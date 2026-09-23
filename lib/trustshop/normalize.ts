import type { z } from 'zod'
import type { trustShopReviewSchema, trustShopMediaItemSchema } from './schemas'
import type { ProductReview, ProductReviewMedia } from './types'

/**
 * Normalization shared by both the product-review and store-review domains
 * (lib/trustshop/product.ts, lib/trustshop/store.ts) — the underlying
 * TrustShop review/media object shape is identical in both APIs, only the
 * summary endpoint's field names differ (see schemas.ts).
 */

type RawReview = z.infer<typeof trustShopReviewSchema>
type RawMedia = z.infer<typeof trustShopMediaItemSchema>

export function normalizeMedia(raw: RawMedia, fallbackReviewId?: string): ProductReviewMedia {
  return {
    reviewId: raw.review_id ?? fallbackReviewId ?? '',
    url: raw.url,
    width: raw.width ?? 0,
    height: raw.height ?? 0,
    mediaType: raw.media_type,
    ratingStar: raw.rating_star ?? null,
  }
}

// TrustShop resolves the display mode (default 'first_name', set at
// submission time) into `customer_display_name` at write time, so reads
// just show whatever it returns — never a second client-side truncation of
// `customer.name`, and never customer.md5_email, which isn't even a field
// on the parsed schema (schemas.ts strips it).
function resolveCustomerName(raw: RawReview): string {
  return raw.customer_display_name?.trim() || raw.customer.name?.trim() || 'Verified Customer'
}

export function normalizeReview(raw: RawReview): ProductReview {
  return {
    id: raw.id,
    starRating: raw.star,
    title: raw.title ?? null,
    content: raw.content,
    createdAt: raw.created_at,
    countryCode: raw.country_code ?? null,
    buyerVerified: raw.buyer_verification === true,
    helpfulCount: raw.helpful ?? 0,
    customerName: resolveCustomerName(raw),
    reply: raw.reply ?? null,
    replyDate: raw.reply_date ?? null,
    media: raw.medias.map((m) => normalizeMedia(m, raw.id)),
    languageCode: raw.language_code ?? null,
  }
}

/**
 * TrustShop's `next_cursor` is a boolean ("another numbered page exists"),
 * not a real cursor token. Isolated as its own pure function so the rule
 * ("increment current_page only when next_cursor === true") has one obvious,
 * directly testable implementation.
 */
export function nextPageFor(currentPage: number, hasNextCursor: boolean): number | null {
  return hasNextCursor ? currentPage + 1 : null
}
