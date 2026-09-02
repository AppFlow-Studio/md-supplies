import Link from 'next/link'
import type { ProductReviewFilter, ProductReviewSort } from '@/lib/trustshop/types'

const FILTER_OPTIONS: { value: ProductReviewFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: '5_star', label: '5 Star' },
  { value: '4_star', label: '4 Star' },
  { value: '3_star', label: '3 Star' },
  { value: '2_star', label: '2 Star' },
  { value: '1_star', label: '1 Star' },
  { value: 'review_with_photos', label: 'With Photos' },
  { value: 'review_with_videos', label: 'With Videos' },
]

const SORT_OPTIONS: { value: ProductReviewSort; label: string }[] = [
  { value: 'most_helpful', label: 'Most Helpful' },
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'highest_rating', label: 'Highest Rated' },
  { value: 'lowest_rating', label: 'Lowest Rated' },
  { value: 'media_first', label: 'Photos & Videos First' },
]

function hrefFor(basePath: string, filter: string, sort: string): string {
  const params = new URLSearchParams()
  if (filter !== 'all') params.set('reviewFilter', filter)
  if (sort !== 'most_helpful') params.set('reviewSort', sort)
  const qs = params.toString()
  return `${basePath}${qs ? `?${qs}` : ''}#reviews`
}

interface Props {
  basePath: string
  currentFilter: ProductReviewFilter
  currentSort: ProductReviewSort
}

/**
 * Server-rendered as ordinary links carrying ?reviewFilter=/?reviewSort= —
 * TrustShop-side filtering/sorting happens server-side in page.tsx, never a
 * client-side re-filter of an already-fetched page. No client JS required;
 * every control is a real, keyboard-operable link with a visible label.
 */
export function ProductReviewFilters({ basePath, currentFilter, currentSort }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <nav aria-label="Filter reviews" className="flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((opt) => (
          <Link
            key={opt.value}
            href={hrefFor(basePath, opt.value, currentSort)}
            aria-current={currentFilter === opt.value ? 'true' : undefined}
            className={`px-3 py-1.5 text-[13px] font-medium border transition-colors ${
              currentFilter === opt.value
                ? 'bg-navy-900 text-white border-navy-900'
                : 'bg-white text-navy-900 border-gray-200 hover:border-navy-900'
            }`}
          >
            {opt.label}
          </Link>
        ))}
      </nav>
      <nav aria-label="Sort reviews" className="flex flex-wrap gap-3">
        {SORT_OPTIONS.map((opt) => (
          <Link
            key={opt.value}
            href={hrefFor(basePath, currentFilter, opt.value)}
            aria-current={currentSort === opt.value ? 'true' : undefined}
            className={`text-[13px] font-medium underline-offset-2 transition-colors ${
              currentSort === opt.value ? 'text-teal-500 underline' : 'text-gray-500 hover:text-navy-900'
            }`}
          >
            {opt.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
