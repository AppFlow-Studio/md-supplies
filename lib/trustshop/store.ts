import 'server-only'
import { revalidateTag } from 'next/cache'
import { trustShopGet, trustShopPost } from './client'
import {
  trustShopStoreSummarySchema,
  trustShopReviewListSchema,
  trustShopMediaListSchema,
  trustShopWriteResponseSchema,
} from './schemas'
import { normalizeMedia, normalizeReview, nextPageFor } from './normalize'
import {
  PRODUCT_REVIEW_FILTERS,
  PRODUCT_REVIEW_SORTS,
  type StoreReviewSummary,
  type StoreReviewPage,
  type StoreReviewMediaPage,
  type ProductReviewFilter,
  type ProductReviewSort,
  type SubmitStoreReviewInput,
  type SubmitStoreReviewResult,
} from './types'

/**
 * Store-review domain service — "How was your experience with MD Supplies?"
 * Deliberately parallel to lib/trustshop/product.ts (same client, same
 * normalize helpers, same never-throws contract) but with NO Shopify
 * product association: no numeric id, one shared cache tag, no per-item
 * scoping. Filter/sort share the exact same TrustShop-documented enum as
 * product reviews (see lib/trustshop/types.ts), so the same allowlist
 * values apply here.
 */

const FILTER_ALLOWLIST = new Set<string>(PRODUCT_REVIEW_FILTERS)
const SORT_ALLOWLIST = new Set<string>(PRODUCT_REVIEW_SORTS)

function allowedFilter(filter: string | undefined): ProductReviewFilter | undefined {
  return filter && FILTER_ALLOWLIST.has(filter) ? (filter as ProductReviewFilter) : undefined
}

function allowedSort(sort: string | undefined): ProductReviewSort | undefined {
  return sort && SORT_ALLOWLIST.has(sort) ? (sort as ProductReviewSort) : undefined
}

const STORE_TAG = 'trustshop:store'
const SUMMARY_TTL_SECONDS = 15 * 60
const REVIEWS_TTL_SECONDS = 12 * 60
const MEDIA_TTL_SECONDS = 30 * 60

function storeTags(): string[] {
  return ['trustshop', STORE_TAG]
}

export async function getStoreReviewSummary(): Promise<StoreReviewSummary | null> {
  try {
    const res = await trustShopGet('/storefront/store/reviews/summary', {
      operation: 'summary',
      schema: trustShopStoreSummarySchema,
      next: { revalidate: SUMMARY_TTL_SECONDS, tags: storeTags() },
    })
    const d = res.data
    return {
      averageRating: d.average_review,
      totalReviews: d.total_review,
      ratingsDistribution: {
        1: d.stars_review.star_1,
        2: d.stars_review.star_2,
        3: d.stars_review.star_3,
        4: d.stars_review.star_4,
        5: d.stars_review.star_5,
      },
    }
  } catch (err) {
    // Every failure mode — never thrown out of the caller (same contract as
    // lib/trustshop/product.ts's getProductReviewSummary).
    void err
    return null
  }
}

export async function listStoreReviews(
  opts: { filter?: string; sort?: string; perPage?: number; currentPage?: number } = {},
): Promise<StoreReviewPage | null> {
  const perPage = opts.perPage && opts.perPage > 0 && opts.perPage <= 50 ? opts.perPage : 10
  const currentPage = opts.currentPage && opts.currentPage > 0 ? opts.currentPage : 1

  try {
    const res = await trustShopGet('/storefront/store/reviews', {
      operation: 'reviews',
      query: {
        filter: allowedFilter(opts.filter),
        sort: allowedSort(opts.sort),
        per_page: perPage,
        current_page: currentPage,
      },
      schema: trustShopReviewListSchema,
      next: { revalidate: REVIEWS_TTL_SECONDS, tags: storeTags() },
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

export async function getStoreReviewMedia(
  opts: { mediaType?: 'all' | 'image' | 'video'; ratingStar?: string; perPage?: number; currentPage?: number } = {},
): Promise<StoreReviewMediaPage | null> {
  const perPage = opts.perPage && opts.perPage > 0 && opts.perPage <= 50 ? opts.perPage : 20
  const currentPage = opts.currentPage && opts.currentPage > 0 ? opts.currentPage : 1

  try {
    const res = await trustShopGet('/storefront/store/reviews/media', {
      operation: 'media',
      query: {
        media_type: opts.mediaType,
        rating_star: opts.ratingStar,
        per_page: perPage,
        current_page: currentPage,
      },
      schema: trustShopMediaListSchema,
      next: { revalidate: MEDIA_TTL_SECONDS, tags: storeTags() },
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
 * The only function allowed to call trustShopPost for a store review. No
 * `product_id` field exists on SubmitStoreReviewInput at all — store and
 * product reviews are never conflated (see WriteStoreReview.tsx /
 * app/api/reviews/store/route.ts, which is deliberately a separate route
 * from the product one rather than a shared route with an optional field).
 */
export async function submitStoreReview(input: SubmitStoreReviewInput): Promise<SubmitStoreReviewResult> {
  try {
    await trustShopPost('/storefront/store/reviews', {
      operation: 'submit',
      schema: trustShopWriteResponseSchema,
      body: {
        star: input.star,
        content: input.content,
        name: input.name,
        email: input.email,
        customer_display_name: 'first_name',
        ...(input.title ? { title: input.title } : {}),
      },
    })
  } catch (err) {
    void err
    return { ok: false, reason: 'provider_error' }
  }

  try {
    revalidateTag(STORE_TAG, 'max')
  } catch (err) {
    void err
  }

  return { ok: true }
}
