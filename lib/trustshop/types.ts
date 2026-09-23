/**
 * Normalized internal review models. Components and JSON-LD consume these —
 * never the raw TrustShop response shapes in lib/trustshop/schemas.ts.
 */

export interface ProductReviewSummary {
  averageRating: number
  totalReviews: number
  ratingsDistribution: {
    1: number
    2: number
    3: number
    4: number
    5: number
  }
}

export interface ProductReviewMedia {
  reviewId: string
  url: string
  width: number
  height: number
  mediaType: 'image' | 'video'
  ratingStar: number | null
}

export interface ProductReview {
  id: string
  starRating: number
  title: string | null
  content: string
  createdAt: string
  countryCode: string | null
  buyerVerified: boolean
  helpfulCount: number
  /** Already resolved per customer_display_name (default 'first_name') — never md5_email. */
  customerName: string
  reply: string | null
  replyDate: string | null
  media: ProductReviewMedia[]
  languageCode: string | null
}

export interface ProductReviewPage {
  reviews: ProductReview[]
  currentPage: number
  hasNextPage: boolean
}

export interface ProductReviewMediaPage {
  media: ProductReviewMedia[]
  currentPage: number
  hasNextPage: boolean
}

// Exact TrustShop-documented enum values — the allowlist in lib/trustshop/product.ts
// is built from these unions, so an unsupported value is never forwarded upstream.
export const PRODUCT_REVIEW_FILTERS = [
  'all',
  'review_with_photos',
  'review_with_videos',
  '1_star',
  '2_star',
  '3_star',
  '4_star',
  '5_star',
] as const
export type ProductReviewFilter = (typeof PRODUCT_REVIEW_FILTERS)[number]

export const PRODUCT_REVIEW_SORTS = [
  'most_helpful',
  'highest_rating',
  'lowest_rating',
  'oldest',
  'newest',
  'media_first',
] as const
export type ProductReviewSort = (typeof PRODUCT_REVIEW_SORTS)[number]

export interface SubmitProductReviewInput {
  shopifyProductId: number
  star: number
  title?: string
  content: string
  name: string
  email: string
}

export type SubmitProductReviewResult =
  | { ok: true }
  | { ok: false; reason: 'provider_error' }

/**
 * Store reviews ("How was your experience with MD Supplies?") are a
 * distinct TrustShop domain from product reviews ("How was this product?")
 * but share the exact same normalized shape, so the same UI primitives
 * (ProductRating's Stars, ProductReviewDistribution, ProductReviewFilters,
 * ProductReviewMedia, ReviewMediaModal) work for both without duplication —
 * only the store-specific components (StoreRating, StoreReviews,
 * StoreReviewCard, WriteStoreReview) carry the distinct copy/labeling.
 */
export type StoreReviewSummary = ProductReviewSummary
export type StoreReviewMedia = ProductReviewMedia
export type StoreReview = Omit<ProductReview, 'media'> & { media: StoreReviewMedia[] }

export interface StoreReviewPage {
  reviews: StoreReview[]
  currentPage: number
  hasNextPage: boolean
}

export interface StoreReviewMediaPage {
  media: StoreReviewMedia[]
  currentPage: number
  hasNextPage: boolean
}

export interface SubmitStoreReviewInput {
  star: number
  title?: string
  content: string
  name: string
  email: string
}

export type SubmitStoreReviewResult =
  | { ok: true }
  | { ok: false; reason: 'provider_error' }
