import Link from 'next/link'
import { Search } from 'lucide-react'
import { ProductGrid } from '@/components/category/ProductGrid'
import type { CollectionProduct } from '@/lib/shopify/types'
import type { ProductReviewSummary } from '@/lib/trustshop/types'

const SUGGESTED = [
  { label: 'Exam Gloves', href: '/category/exam-gloves' },
  { label: 'Face Masks', href: '/category/face-masks' },
  { label: 'Wound Care', href: '/category/wound-care' },
  { label: 'Syringes', href: '/category/syringes' },
]

interface Props {
  products: CollectionProduct[]
  q: string
  clearFiltersUrl: string
  isFiltered: boolean
  reviewSummaries?: Map<string, ProductReviewSummary | null>
  /** Favorites (DEV-FAV-01) — see ProductGrid's own prop comment. */
  isSignedIn?: boolean
  favoritedProductIds?: ReadonlySet<string>
}

// Plain results grid + empty state. Pagination moved to page.tsx
// (DEV-LAUNCH-06 — deterministic page-N via CategoryPagination, same model
// as category/OCC/industry, replacing the cursor-based "Load More" this
// component used to own), so nothing here needs client-side state anymore.
export function SearchResultsSection({ products, q, clearFiltersUrl, isFiltered, reviewSummaries, isSignedIn, favoritedProductIds }: Props) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-6">
        <Search size={48} aria-hidden className="text-gray-300" />
        <div className="text-center">
          <p className="text-navy-900 text-[20px] font-semibold mb-2">
            No results for &ldquo;{q}&rdquo;
          </p>
          <p className="text-gray-500 text-[15px]">
            {isFiltered
              ? 'Try removing some filters or adjusting your search.'
              : 'Try a different search term or browse our categories below.'}
          </p>
        </div>
        {isFiltered ? (
          <Link
            href={clearFiltersUrl}
            className="border border-navy-900 text-navy-900 text-[14px] font-semibold px-5 h-[40px] flex items-center hover:bg-neutral-50 transition-colors"
          >
            Clear filters
          </Link>
        ) : (
          <div className="flex flex-wrap gap-3 justify-center">
            {SUGGESTED.map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                className="border border-navy-900 text-navy-900 text-[14px] font-semibold px-5 h-[40px] flex items-center hover:bg-neutral-50 transition-colors"
              >
                {label}
              </Link>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <ProductGrid
      products={products}
      emptyStateHref={clearFiltersUrl}
      emptyStateMessage={`No results for "${q}"`}
      itemListId="search-results"
      itemListName={`Search results for "${q}"`}
      reviewSummaries={reviewSummaries}
      isSignedIn={isSignedIn}
      favoritedProductIds={favoritedProductIds}
    />
  )
}
