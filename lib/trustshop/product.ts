import 'server-only'
import { revalidateTag, cacheLife } from 'next/cache'
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
    const d = await trustShopGet('/storefront/product/reviews/summary', {
      operation: 'summary',
      shopifyProductId: numericId,
      query: { product_id: numericId },
      schema: trustShopSummarySchema,
      next: { revalidate: SUMMARY_TTL_SECONDS, tags: tagsFor(numericId) },
    })
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
    // Every failure mode (config/timeout/rate-limit/server/validation) —
    // this function never throws out of the PDP render path.
    void err
    return null
  }
}

/**
 * `getProductReviewSummary` wrapped in `use cache` for the two PDP routes'
 * top-level (non-Suspense-deferred) call, which feeds ProductSchema's
 * aggregateRating and must stay part of the static/ISR shell those routes
 * prerender for their generateStaticParams handle sample.
 *
 * Without this, the underlying TrustShop client's retry-timer `Date.now()`
 * read (lib/trustshop/client.ts) happens before any access Next recognizes as
 * establishing dynamism, and the build fails with "used Date.now() before
 * accessing... uncached data" (next-prerender-current-time) — a `use cache`
 * scope sidesteps that check entirely by caching the whole call as a unit.
 * `hours` (not `minutes`): a cache profile under 5 minutes' revalidate
 * becomes a dynamic hole excluded from the prerender, which would reintroduce
 * the same problem one level up.
 */
export async function getCachedProductReviewSummary(numericId: number): Promise<ProductReviewSummary | null> {
  'use cache'
  cacheLife('hours')
  return getProductReviewSummary(numericId)
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
      currentPage,
      hasNextPage: res.has_next_page,
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
      currentPage,
      hasNextPage: nextPageFor(currentPage, res.next_cursor) !== null,
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
  'use cache'
  // Same reason as getCachedProductReviewSummary above: the underlying
  // TrustShop client's Date.now() retry-timer read happens before any access
  // Next recognizes as establishing dynamism, which fails the build for the
  // category default-grid prerender (components/category/CategoryResults.tsx
  // -> lib/catalog/resolve-catalog-view.ts -> this function, via
  // getReviewSummariesByGid). `hours`, not `minutes`: a cache profile under 5
  // minutes' revalidate becomes a dynamic hole excluded from the prerender,
  // reintroducing the same problem one level up. The cache key is the
  // (deduplicated, order-independent-in-effect) numericIds array; each
  // distinct product set gets its own entry.
  cacheLife('hours')
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
