import Link from 'next/link'
import { ProductRating } from './ProductRating'
import type { ProductReviewSummary } from '@/lib/trustshop/types'

/**
 * The compact, clickable "★★★★★ 4.5 · 55 Reviews" row near the PDP title/
 * price. A plain next/link anchor to #reviews — no client JS needed for the
 * "scroll without a full reload" requirement. Zero-review products get a
 * clean "No reviews yet · Write a review" affordance instead of a fake
 * 0.0/empty-star row.
 */
export function ProductReviewSummaryLink({ summary }: { summary: ProductReviewSummary | null }) {
  if (!summary || summary.totalReviews === 0) {
    return (
      <Link
        href="#reviews"
        className="w-fit text-gray-500 text-[13px] tracking-[0.26px] underline-offset-2 hover:text-teal-500 hover:underline transition-colors"
      >
        No reviews yet · Write a review
      </Link>
    )
  }

  return (
    <Link href="#reviews" className="w-fit hover:opacity-80 transition-opacity">
      <ProductRating summary={summary} variant="compact" />
    </Link>
  )
}
