import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  currentPage: number
  hasNext: boolean
  nextCursor: string | null
  baseUrl: string   // e.g. /category/exam-gloves (no query string)
}

export function CategoryPagination({
  currentPage,
  hasNext,
  nextCursor,
  baseUrl,
}: Props) {
  const hasPrev = currentPage > 1

  // Next href: embed cursor + page number so the server can fetch efficiently.
  // encodeURIComponent keeps cursor characters safe in the URL.
  const nextHref =
    hasNext && nextCursor
      ? `${baseUrl}?page=${currentPage + 1}&after=${encodeURIComponent(nextCursor)}`
      : null

  // Prev always goes to page 1 (the clean base URL) — we don't store older
  // cursors, so we can't reconstruct page N-1 for N > 2.
  const prevHref = hasPrev ? baseUrl : null

  if (!hasPrev && !hasNext) return null

  return (
    <div className="flex items-center justify-center gap-6 pt-12">
      {prevHref ? (
        <Link
          href={prevHref}
          className="flex items-center gap-2 border border-navy-900 text-navy-900 text-[14px] font-semibold px-5 h-[44px] hover:bg-neutral-50 transition-colors"
        >
          <ChevronLeft size={16} />
          Previous
        </Link>
      ) : (
        <span className="w-[107px]" />
      )}

      <span className="text-navy-900 text-[14px] font-medium min-w-[60px] text-center">
        Page {currentPage}
      </span>

      {nextHref ? (
        <Link
          href={nextHref}
          className="flex items-center gap-2 border border-navy-900 text-navy-900 text-[14px] font-semibold px-5 h-[44px] hover:bg-neutral-50 transition-colors"
        >
          Next
          <ChevronRight size={16} />
        </Link>
      ) : (
        <span className="w-[107px]" />
      )}
    </div>
  )
}
