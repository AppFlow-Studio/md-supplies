import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  currentPage: number
  hasNext: boolean
  nextCursor: string | null
  baseUrl: string
}

type PageItem =
  | { kind: 'page'; page: number; href: string | null; isCurrent: boolean }
  | { kind: 'ellipsis'; key: string }

function buildPages(
  currentPage: number,
  hasNext: boolean,
  nextHref: string | null,
  baseUrl: string,
): PageItem[] {
  const items: PageItem[] = []

  if (currentPage === 1) {
    items.push({ kind: 'page', page: 1, href: null, isCurrent: true })
    if (hasNext) {
      items.push({ kind: 'page', page: 2, href: nextHref, isCurrent: false })
      items.push({ kind: 'ellipsis', key: 'end' })
    }
  } else if (currentPage === 2) {
    items.push({ kind: 'page', page: 1, href: baseUrl, isCurrent: false })
    items.push({ kind: 'page', page: 2, href: null, isCurrent: true })
    if (hasNext) {
      items.push({ kind: 'page', page: 3, href: nextHref, isCurrent: false })
      items.push({ kind: 'ellipsis', key: 'end' })
    }
  } else {
    // currentPage >= 3
    items.push({ kind: 'page', page: 1, href: baseUrl, isCurrent: false })
    items.push({ kind: 'ellipsis', key: 'start' })
    items.push({ kind: 'page', page: currentPage, href: null, isCurrent: true })
    if (hasNext) {
      items.push({ kind: 'page', page: currentPage + 1, href: nextHref, isCurrent: false })
      items.push({ kind: 'ellipsis', key: 'end' })
    }
  }

  return items
}

export function CategoryPagination({
  currentPage,
  hasNext,
  nextCursor,
  baseUrl,
}: Props) {
  const hasPrev = currentPage > 1

  const nextHref =
    hasNext && nextCursor
      ? `${baseUrl}?page=${currentPage + 1}&after=${encodeURIComponent(nextCursor)}`
      : null

  const prevHref = hasPrev ? baseUrl : null

  if (!hasPrev && !hasNext) return null

  const pages = buildPages(currentPage, hasNext, nextHref, baseUrl)

  return (
    <div className="flex items-center justify-center gap-2 pt-12">
      {/* Prev arrow */}
      {prevHref ? (
        <Link
          href={prevHref}
          aria-label="Previous page"
          className="flex size-[35px] items-center justify-center text-navy-900 hover:text-navy-950 transition-colors"
        >
          <ChevronLeft size={16} strokeWidth={2} />
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className="flex size-[35px] items-center justify-center text-gray-200 cursor-not-allowed"
        >
          <ChevronLeft size={16} strokeWidth={2} />
        </span>
      )}

      {/* Page numbers */}
      <div className="flex items-center gap-1">
        {pages.map((item) => {
          if (item.kind === 'ellipsis') {
            return (
              <div key={item.key}  className="flex items-center gap-1">
                <span

                    className="flex size-[35px] items-center justify-center text-[13px] font-semibold tracking-[0.26px] text-black"
                >
                ...
              </span>
                <span
                    aria-current="page"
                    className="flex size-[35px] items-center justify-center  text-[13px] font-semibold tracking-[0.26px]"
                >
                10
              </span>
              </div>
            )
          }



          if (item.isCurrent) {
            return (
              <span
                key={item.page}
                aria-current="page"
                className="flex size-[35px] items-center justify-center rounded-full bg-navy-900 text-[13px] font-semibold tracking-[0.26px] text-white"
              >
                {item.page}
              </span>
            )
          }

          return item.href ? (
            <Link
              key={item.page}
              href={item.href}
              className="flex size-[35px] items-center justify-center text-[13px] font-semibold tracking-[0.26px] text-black hover:text-navy-900 transition-colors"
            >
              {item.page}
            </Link>
          ) : (
            <span
              key={item.page}
              className="flex size-[35px] items-center justify-center text-[13px] font-semibold tracking-[0.26px] text-black"
            >
              {item.page}
            </span>
          )
        })}
      </div>

      {/* Next arrow */}
      {nextHref ? (
        <Link
          href={nextHref}
          aria-label="Next page"
          className="flex size-[35px] items-center justify-center text-navy-900 hover:text-navy-950 transition-colors"
        >
          <ChevronRight size={16} strokeWidth={2} />
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className="flex size-[35px] items-center justify-center text-gray-200 cursor-not-allowed"
        >
          <ChevronRight size={16} strokeWidth={2} />
        </span>
      )}
    </div>
  )
}
