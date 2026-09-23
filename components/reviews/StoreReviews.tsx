import Link from 'next/link'
import { StoreRating } from './StoreRating'
import { ProductReviewDistribution } from './ProductReviewDistribution'
import { ProductReviewFilters } from './ProductReviewFilters'
import { ProductReviewMedia } from './ProductReviewMedia'
import { StoreReviewCard } from './StoreReviewCard'
import { WriteStoreReview } from './WriteStoreReview'
import type {
  StoreReviewSummary,
  StoreReview,
  StoreReviewMedia as MediaItem,
  ProductReviewFilter,
  ProductReviewSort,
} from '@/lib/trustshop/types'

function loadMoreHref(basePath: string, filter: ProductReviewFilter, sort: ProductReviewSort, page: number): string {
  const params = new URLSearchParams()
  if (filter !== 'all') params.set('reviewFilter', filter)
  if (sort !== 'most_helpful') params.set('reviewSort', sort)
  params.set('reviewPage', String(page))
  return `${basePath}?${params.toString()}`
}

interface Props {
  basePath: string
  summary: StoreReviewSummary | null
  reviews: StoreReview[] | null
  media: MediaItem[]
  currentFilter: ProductReviewFilter
  currentSort: ProductReviewSort
  currentPage: number
  hasNextPage: boolean
}

/**
 * The /reviews page's main section — "How was your experience with MD
 * Supplies?", clearly distinct from a product's #reviews section (different
 * copy throughout, StoreRating/StoreReviewCard instead of
 * ProductRating/ProductReviewCard). Reuses ProductReviewDistribution/
 * ProductReviewFilters/ProductReviewMedia as-is: those are already
 * product-agnostic (they operate on the normalized summary/filter/media
 * shapes, not on a Shopify product).
 */
export function StoreReviews({
  basePath,
  summary,
  reviews,
  media,
  currentFilter,
  currentSort,
  currentPage,
  hasNextPage,
}: Props) {
  const totalReviews = summary?.totalReviews ?? 0

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col sm:flex-row gap-8 sm:gap-14">
        <div className="flex flex-col gap-3 sm:w-[220px] shrink-0">
          {summary && totalReviews > 0 ? (
            <>
              <span className="text-navy-900 text-[40px] font-bold leading-none">
                {summary.averageRating.toFixed(1)}
              </span>
              <StoreRating summary={summary} size="md" />
            </>
          ) : (
            <p className="text-gray-500 text-[15px]">No customer reviews yet.</p>
          )}
          <Link
            href="#write-a-store-review"
            className="mt-2 inline-flex w-fit bg-navy-900 text-white text-[13px] font-semibold px-4 py-2.5 hover:bg-navy-950 transition-colors"
          >
            Write a Store Review
          </Link>
        </div>

        {summary && totalReviews > 0 && (
          <ProductReviewDistribution distribution={summary.ratingsDistribution} total={totalReviews} />
        )}
      </div>

      {media.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-navy-900 text-[15px] font-semibold">Customer Photos &amp; Videos</h2>
          <ProductReviewMedia media={media} />
        </div>
      )}

      {totalReviews > 0 && (
        <ProductReviewFilters basePath={basePath} currentFilter={currentFilter} currentSort={currentSort} />
      )}

      <div>
        {reviews === null && (
          <p role="alert" className="text-gray-500 text-[14px]">
            Reviews are temporarily unavailable. Please check back shortly.
          </p>
        )}

        {reviews !== null && reviews.length === 0 && (
          <p role="status" className="text-gray-500 text-[14px]">
            {totalReviews > 0 ? 'No reviews match this filter.' : 'Be the first to share your experience.'}
          </p>
        )}

        {reviews !== null && reviews.length > 0 && (
          <div className="flex flex-col" role="list" aria-label="Customer store reviews">
            {reviews.map((review) => (
              <div role="listitem" key={review.id}>
                <StoreReviewCard review={review} />
              </div>
            ))}
          </div>
        )}

        {hasNextPage && (
          <div className="pt-6 flex justify-center">
            <Link
              href={loadMoreHref(basePath, currentFilter, currentSort, currentPage + 1)}
              className="border border-navy-900 text-navy-900 text-[14px] font-semibold px-6 py-2.5 hover:bg-navy-900 hover:text-white transition-colors"
            >
              Load More
            </Link>
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 pt-10">
        <WriteStoreReview />
      </div>
    </div>
  )
}
