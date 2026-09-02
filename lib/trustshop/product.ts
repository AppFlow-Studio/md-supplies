import 'server-only'
import { revalidateTag } from 'next/cache'
import { trustShopGet, trustShopPost, TrustShopError } from './client'
import {
  trustShopSummarySchema,
  trustShopReviewListSchema,
  trustShopMediaListSchema,
  trustShopWriteResponseSchema,
} from './schemas'
import { normalizeMedia, normalizeReview, nextPageFor } from './normalize'
import {
  PRODUCT_REVIEW_FILTERS,
  PRODUCT_REVIEW_SORTS,
  type ProductReviewSummary,
  type ProductReviewPage,
  type ProductReviewMediaPage,
  type ProductReviewFilter,
  type ProductReviewSort,
  type SubmitProductReviewInput,
  type SubmitProductReviewResult,
} from './types'

export { nextPageFor }

const FILTER_ALLOWLIST = new Set<string>(PRODUCT_REVIEW_FILTERS)
const SORT_ALLOWLIST = new Set<string>(PRODUCT_REVIEW_SORTS)

function allowedFilter(filter: string | undefined): ProductReviewFilter | undefined {
  return filter && FILTER_ALLOWLIST.has(filter) ? (filter as ProductReviewFilter) : undefined
}

function allowedSort(sort: string | undefined): ProductReviewSort | undefined {
  return sort && SORT_ALLOWLIST.has(sort) ? (sort as ProductReviewSort) : undefined
}

function productTag(numericId: number): string {
  return `trustshop:product:${numericId}`
}

const SUMMARY_TTL_SECONDS = 15 * 60
const REVIEWS_TTL_SECONDS = 7 * 60
const MEDIA_TTL_SECONDS = 25 * 60

function tagsFor(numericId: number): string[] {
  return ['trustshop', productTag(numericId)]
}

export async function getProductReviewSummary(numericId: number): Promise<ProductReviewSummary | null> {
  try {
    const res = await trustShopGet('/storefront/product/reviews/summary', {
      operation: 'summary',
      shopifyProductId: numericId,
      query: { product_id: numericId },
      schema: trustShopSummarySchema,
      next: { revalidate: SUMMARY_TTL_SECONDS, tags: tagsFor(numericId) },
    })
    const d = res.data
    return {
      averageRating: d.average_rating,
      totalReviews: d.total_reviews,
      ratingsDistribution: {
        1: d.ratings_distribution['1_star'],
        2: d.ratings_distribution['2_star'],
        3: d.ratings_distribution['3_star'],
        4: d.ratings_distribution['4_star'],
        5: d.ratings_distribution['5_star'],
      },
    }
  } catch (err) {
    // Every failure mode (config/timeout/rate-limit/server/validation) —
    // this function never throws out of the PDP render path.
    void err
    return null
  }
}

export async function listProductReviews(
  numericId: number,
  opts: { filter?: string; sort?: string; perPage?: number; currentPage?: number } = {},
): Promise<ProductReviewPage | null> {
  const perPage = opts.perPage && opts.perPage > 0 && opts.perPage <= 50 ? opts.perPage : 10
  const currentPage = opts.currentPage && opts.currentPage > 0 ? opts.currentPage : 1

  try {
    const res = await trustShopGet('/storefront/product/reviews', {
      operation: 'reviews',
      shopifyProductId: numericId,
      query: {
        product_id: numericId,
        filter: allowedFilter(opts.filter),
        sort: allowedSort(opts.sort),
        per_page: perPage,
        current_page: currentPage,
      },
      schema: trustShopReviewListSchema,
      next: { revalidate: REVIEWS_TTL_SECONDS, tags: tagsFor(numericId) },
    })

    return {
      reviews: res.data.map(normalizeReview),
      currentPage: res.current_page,
      hasNextPage: nextPageFor(res.current_page, res.next_cursor) !== null,
    }
  } catch (err) {
    void err
    return null
  }
}

export async function getProductReviewMedia(
  numericId: number,
  opts: { mediaType?: 'all' | 'image' | 'video'; ratingStar?: string; perPage?: number; currentPage?: number } = {},
): Promise<ProductReviewMediaPage | null> {
  const perPage = opts.perPage && opts.perPage > 0 && opts.perPage <= 50 ? opts.perPage : 20
  const currentPage = opts.currentPage && opts.currentPage > 0 ? opts.currentPage : 1

  try {
    const res = await trustShopGet('/storefront/product/reviews/media', {
      operation: 'media',
      shopifyProductId: numericId,
      query: {
        product_id: numericId,
        media_type: opts.mediaType,
        rating_star: opts.ratingStar,
        per_page: perPage,
        current_page: currentPage,
      },
      schema: trustShopMediaListSchema,
      next: { revalidate: MEDIA_TTL_SECONDS, tags: tagsFor(numericId) },
    })

    return {
      media: res.data.map((m) => normalizeMedia(m)),
      currentPage: res.current_page,
      hasNextPage: nextPageFor(res.current_page, res.next_cursor) !== null,
    }
  } catch (err) {
    void err
    return null
  }
}

/**
 * The only function in the codebase allowed to call trustShopPost for a
 * product review. `buyer_verification` is not a field on
 * SubmitProductReviewInput at all — this constructs the outgoing body
 * explicitly, field by field, never by spreading caller-supplied data, so
 * there is no way for a forged extra field to reach TrustShop.
 */
export async function submitProductReview(input: SubmitProductReviewInput): Promise<SubmitProductReviewResult> {
  try {
    await trustShopPost('/storefront/product/reviews', {
      operation: 'submit',
      shopifyProductId: input.shopifyProductId,
      schema: trustShopWriteResponseSchema,
      body: {
        product_id: input.shopifyProductId,
        star: input.star,
        content: input.content,
        name: input.name,
        email: input.email,
        // Privacy default per the ticket — never a client override.
        customer_display_name: 'first_name',
        ...(input.title ? { title: input.title } : {}),
      },
    })
  } catch (err) {
    void err
    return { ok: false, reason: 'provider_error' }
  }

  // Best-effort — a stale cache for a few minutes on a failed revalidate is
  // far cheaper than blocking the caller's success response on it.
  try {
    revalidateTag(productTag(input.shopifyProductId), 'max')
  } catch (err) {
    void err
  }

  return { ok: true }
}

const SUMMARY_BATCH_CONCURRENCY = 6

/**
 * Bounded-concurrency batch summary fetch for collection/search cards — the
 * N+1 guard. A shared-cursor worker pool (not fixed-size chunking) keeps all
 * workers busy until the whole list drains, which matters most on a mixed
 * warm/cold-cache page. getProductReviewSummary already never throws, so no
 * per-item try/catch is needed here — a failed lookup just becomes `null` in
 * the returned map, and the caller renders that card with no rating row.
 */
export async function getManyProductReviewSummaries(
  numericIds: number[],
): Promise<Map<number, ProductReviewSummary | null>> {
  const uniqueIds = Array.from(new Set(numericIds))
  const results = new Map<number, ProductReviewSummary | null>()
  let cursor = 0

  async function worker(): Promise<void> {
    while (cursor < uniqueIds.length) {
      const id = uniqueIds[cursor]
      cursor += 1
      results.set(id, await getProductReviewSummary(id))
    }
  }

  const workerCount = Math.min(SUMMARY_BATCH_CONCURRENCY, uniqueIds.length)
  await Promise.all(Array.from({ length: workerCount }, () => worker()))

  return results
}

export { TrustShopError }
