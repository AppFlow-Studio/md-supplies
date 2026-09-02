import { Stars } from './ProductRating'
import type { StoreReviewSummary } from '@/lib/trustshop/types'

interface Props {
  summary: StoreReviewSummary | null
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Store-review rating — deliberately distinct copy from ProductRating
 * ("customer experiences", not "reviews") so the two domains never read as
 * the same thing on screen or to a screen reader. Renders nothing for a
 * null/zero-review summary — never a fake 0.0.
 */
export function StoreRating({ summary, size = 'md' }: Props) {
  if (!summary || summary.totalReviews === 0) return null

  const rounded = summary.averageRating.toFixed(1)
  const label = `Rated ${rounded} out of 5 from ${summary.totalReviews} customer experience${summary.totalReviews === 1 ? '' : 's'}`

  return (
    <span className="inline-flex items-center gap-1.5">
      <span role="img" aria-label={label}>
        <Stars rating={summary.averageRating} size={size} />
      </span>
      <span className="text-navy-900 text-[13px] font-semibold" aria-hidden="true">{rounded}</span>
      <span className="text-gray-500 text-[13px]" aria-hidden="true">
        · {summary.totalReviews} customer experience{summary.totalReviews === 1 ? '' : 's'}
      </span>
    </span>
  )
}
