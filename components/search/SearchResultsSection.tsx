'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { ProductGrid } from '@/components/category/ProductGrid'
import { loadMoreSearchProducts } from '@/app/search/actions'
import type { CollectionProduct, PageInfo } from '@/lib/shopify/types'

const SUGGESTED = [
  { label: 'Exam Gloves', href: '/category/exam-gloves' },
  { label: 'Face Masks', href: '/category/face-masks' },
  { label: 'Wound Care', href: '/category/wound-care' },
  { label: 'Syringes', href: '/category/syringes' },
]

interface Props {
  initialProducts: CollectionProduct[]
  initialPageInfo: PageInfo
  q: string
  sortKey: string
  reverse: boolean
  filters: Record<string, unknown>[]
  clearFiltersUrl: string
  isFiltered: boolean
}

export function SearchResultsSection({
  initialProducts,
  initialPageInfo,
  q,
  sortKey,
  reverse,
  filters,
  clearFiltersUrl,
  isFiltered,
}: Props) {
  const [products, setProducts] = useState(initialProducts)
  const [pageInfo, setPageInfo] = useState(initialPageInfo)
  const [isPending, startTransition] = useTransition()

  function loadMore() {
    if (!pageInfo.endCursor) return
    startTransition(async () => {
      const result = await loadMoreSearchProducts({
        q,
        after: pageInfo.endCursor!,
        sortKey,
        reverse,
        filters,
      })
      setProducts((prev) => [...prev, ...result.products])
      setPageInfo(result.pageInfo)
    })
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-6">
        <Search size={48} className="text-gray-300" />
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
    <>
      <ProductGrid
        products={products}
        emptyStateHref={clearFiltersUrl}
        emptyStateMessage={`No results for "${q}"`}
        itemListId="search-results"
        itemListName={`Search results for "${q}"`}
      />
      {pageInfo.hasNextPage && (
        <div className="flex items-center justify-center pt-12">
          <button
            onClick={loadMore}
            disabled={isPending}
            className="border border-navy-900 text-navy-900 text-[14px] font-semibold px-5 h-[44px] hover:bg-neutral-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? 'Loading…' : 'Load More'}
          </button>
        </div>
      )}
    </>
  )
}
