import Link from 'next/link'
import { ProductRating } from './ProductRating'
import { ProductReviewDistribution } from './ProductReviewDistribution'
import { ProductReviewFilters } from './ProductReviewFilters'
import { ProductReviewMedia } from './ProductReviewMedia'
import { ProductReviewCard } from './ProductReviewCard'
import { WriteProductReview } from './WriteProductReview'
import type {
  ProductReviewSummary,
  ProductReview,
  ProductReviewMedia as MediaItem,
  ProductReviewFilter,
  ProductReviewSort,
} from '@/lib/trustshop/types'

function loadMoreHref(basePath: string, filter: ProductReviewFilter, sort: ProductReviewSort, page: number): string {
  const params = new URLSearchParams()
  if (filter !== 'all') params.set('reviewFilter', filter)
  if (sort !== 'most_helpful') params.set('reviewSort', sort)
  params.set('reviewPage', String(page))
  return `${basePath}?${params.toString()}#reviews`
}

interface Props {
  basePath: string
  productGid: string
  summary: ProductReviewSummary | null
  /** null only on a genuine provider failure — [] is a real empty result. */
  reviews: ProductReview[] | null
  media: MediaItem[]
  currentFilter: ProductReviewFilter
  currentSort: ProductReviewSort
  currentPage: number
  hasNextPage: boolean
}

/**
 * The full #reviews section. All data is resolved server-side in
 * app/product/[slug]/page.tsx and handed down as props — this component
 * itself never calls TrustShop and never throws, so a provider failure
 * degrades to the `reviews === null` branch below rather than breaking the
 * PDP render.
 */
export function ProductReviews({
  basePath,
  productGid,
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
    <div id="reviews" className="flex flex-col gap-10 scroll-mt-[140px]">
      <div className="flex flex-col sm:flex-row gap-8 sm:gap-14">
        <div className="flex flex-col gap-3 sm:w-[220px] shrink-0">
          {summary && totalReviews > 0 ? (
            <>
              <span className="text-navy-900 text-[40px] font-bold leading-none">
                {summary.averageRating.toFixed(1)}
              </span>
              <ProductRating summary={summary} variant="compact" size="md" />
            </>
          ) : (
            <p className="text-gray-500 text-[15px]">No reviews yet.</p>
          )}
          <Link
            href="#write-a-review"
            className="mt-2 inline-flex w-fit bg-navy-900 text-white text-[13px] font-semibold px-4 py-2.5 hover:bg-navy-950 transition-colors"
          >
            Write a Review
          </Link>
        </div>

        {summary && totalReviews > 0 && (
          <ProductReviewDistribution distribution={summary.ratingsDistribution} total={totalReviews} />
        )}
      </div>

      {media.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-navy-900 text-[15px] font-semibold">Customer Photos &amp; Videos</h3>
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
            {totalReviews > 0 ? 'No reviews match this filter.' : 'Be the first to review this product.'}
          </p>
        )}

        {reviews !== null && reviews.length > 0 && (
          <div className="flex flex-col" role="list" aria-label="Customer reviews">
            {reviews.map((review) => (
              <div role="listitem" key={review.id}>
                <ProductReviewCard review={review} />
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
        <WriteProductReview productGid={productGid} />
      </div>
    </div>
  )
}
