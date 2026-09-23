import type { Metadata } from 'next'
import { buildMetadata } from '@/lib/seo'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { StoreReviews } from '@/components/reviews/StoreReviews'
import { getStoreReviewSummary, listStoreReviews, getStoreReviewMedia } from '@/lib/trustshop/store'
import type { ProductReviewFilter, ProductReviewSort } from '@/lib/trustshop/types'

// Dedicated store-review experience — deliberately separate from any
// product's #reviews section (different question: "How was your experience
// with MD Supplies?" vs "How was this product?"). Per the ticket's explicit
// non-goal, MD Supplies' own store-review average is never fed into
// Organization/LocalBusiness JSON-LD, so this route emits no structured
// data of its own — genuine per-product review schema stays scoped to PDPs.

export const metadata: Metadata = buildMetadata({
  pageType: 'static',
  title: 'Customer Reviews',
  description: 'See what customers say about shopping with MD Supplies, and share your own experience.',
  slug: 'reviews',
})

interface Props {
  searchParams: Promise<{
    reviewFilter?: string
    reviewSort?: string
    reviewPage?: string
  }>
}

export default async function StoreReviewsPage({ searchParams }: Props) {
  const sp = await searchParams
  const reviewFilter = sp.reviewFilter as ProductReviewFilter | undefined
  const reviewSort = sp.reviewSort as ProductReviewSort | undefined
  const reviewPage = Number(sp.reviewPage) > 0 ? Number(sp.reviewPage) : 1

  // TrustShop is never allowed to break this route either — every read
  // already resolves to null on failure (lib/trustshop/store.ts); the outer
  // .catch is belt-and-suspenders, matching every other TrustShop call site.
  const [summary, reviewsPage, mediaPage] = await Promise.all([
    getStoreReviewSummary().catch(() => null),
    listStoreReviews({ filter: reviewFilter, sort: reviewSort, currentPage: reviewPage }).catch(() => null),
    getStoreReviewMedia({ perPage: 20 }).catch(() => null),
  ])

  return (
    <main id="main-content" className="bg-[#f9fafc] min-h-screen">
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-4">
        <Breadcrumb items={[{ label: 'Customer Reviews' }]} />
      </div>

      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 pb-16">
        <h1 className="text-navy-900 text-[32px] sm:text-[40px] font-semibold leading-[1.2] tracking-[-0.01em] mb-2">
          Customer Reviews
        </h1>
        <p className="text-gray-500 text-[15px] leading-[1.75] mb-8 max-w-[640px]">
          Real feedback from customers who&apos;ve shopped with MD Supplies — separate from individual
          product reviews, which live on each product page.
        </p>

        <div className="bg-white px-6 sm:px-10 py-8 sm:py-10">
          <StoreReviews
            basePath="/reviews"
            summary={summary}
            reviews={reviewsPage?.reviews ?? null}
            media={mediaPage?.media ?? []}
            currentFilter={reviewFilter ?? 'all'}
            currentSort={reviewSort ?? 'most_helpful'}
            currentPage={reviewsPage?.currentPage ?? reviewPage}
            hasNextPage={reviewsPage?.hasNextPage ?? false}
          />
        </div>
      </div>
    </main>
  )
}
