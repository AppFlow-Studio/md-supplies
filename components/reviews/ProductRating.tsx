import { Star } from 'lucide-react'
import type { ProductReviewSummary } from '@/lib/trustshop/types'

const STAR_PX: Record<'sm' | 'md' | 'lg', number> = { sm: 14, md: 16, lg: 20 }

/**
 * Partial-fill star row via a clipped overlay (no half-star icon needed):
 * five empty stars underneath, five filled stars on top clipped to
 * (rating/5)*100% width. aria-hidden — the accessible label lives on the
 * wrapping element in ProductRating/ProductReviewCard.
 */
export function Stars({ rating, size = 'md' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
  const px = STAR_PX[size]
  const pct = Math.max(0, Math.min(100, (rating / 5) * 100))
  return (
    <span className="relative inline-flex shrink-0" aria-hidden="true">
      <span className="flex gap-0.5 text-gray-200">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} size={px} fill="currentColor" strokeWidth={0} />
        ))}
      </span>
      <span
        className="absolute inset-0 flex gap-0.5 text-amber-400 overflow-hidden"
        style={{ width: `${pct}%` }}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} size={px} fill="currentColor" strokeWidth={0} />
        ))}
      </span>
    </span>
  )
}

interface ProductRatingProps {
  summary: ProductReviewSummary | null
  size?: 'sm' | 'md' | 'lg'
  /** 'compact' → "4.5 · 55 Reviews" (PDP). 'card' → "4.8 (47)" (collection cards). */
  variant?: 'compact' | 'card'
}

/**
 * Renders nothing for a zero-review or unavailable summary — never a fake
 * 0.0 or empty-star row, per the ticket. Callers that want a "No reviews
 * yet" affordance instead use ProductReviewSummaryLink.
 */
export function ProductRating({ summary, size = 'md', variant = 'card' }: ProductRatingProps) {
  if (!summary || summary.totalReviews === 0) return null

  const rounded = summary.averageRating.toFixed(1)
  const label = `Rated ${rounded} out of 5 based on ${summary.totalReviews} review${summary.totalReviews === 1 ? '' : 's'}`

  return (
    <span className="inline-flex items-center gap-1.5">
      <span role="img" aria-label={label}>
        <Stars rating={summary.averageRating} size={size} />
      </span>
      <span className="text-navy-900 text-[13px] font-semibold" aria-hidden="true">{rounded}</span>
      <span className="text-gray-500 text-[13px]" aria-hidden="true">
        {variant === 'compact'
          ? `· ${summary.totalReviews} Review${summary.totalReviews === 1 ? '' : 's'}`
          : `(${summary.totalReviews})`}
      </span>
    </span>
  )
}
