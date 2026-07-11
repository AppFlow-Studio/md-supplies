import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  currentPage: number
  hasNext: boolean
  baseUrl: string
  /** Sort/filter params to carry through every page link (e.g. sort, filter[]). */
  persistParams?: URLSearchParams
}

type PageItem =
  | { kind: 'page'; page: number; href: string | null; isCurrent: boolean }
  | { kind: 'ellipsis'; key: string }

function pageHref(baseUrl: string, persistParams: URLSearchParams, page: number): string {
  const p = new URLSearchParams(persistParams)
  if (page > 1) p.set('page', String(page))
  else p.delete('page')
  const qs = p.toString()
  return qs ? `${baseUrl}?${qs}` : baseUrl
}

function buildPages(
  currentPage: number,
  hasNext: boolean,
  baseUrl: string,
  persistParams: URLSearchParams,
): PageItem[] {
  const items: PageItem[] = []
  const href = (page: number) => pageHref(baseUrl, persistParams, page)

  if (currentPage === 1) {
    items.push({ kind: 'page', page: 1, href: null, isCurrent: true })
    if (hasNext) {
      items.push({ kind: 'page', page: 2, href: href(2), isCurrent: false })
      items.push({ kind: 'ellipsis', key: 'end' })
    }
  } else if (currentPage === 2) {
    items.push({ kind: 'page', page: 1, href: href(1), isCurrent: false })
    items.push({ kind: 'page', page: 2, href: null, isCurrent: true })
    if (hasNext) {
      items.push({ kind: 'page', page: 3, href: href(3), isCurrent: false })
      items.push({ kind: 'ellipsis', key: 'end' })
    }
  } else {
    // currentPage >= 3
    items.push({ kind: 'page', page: 1, href: href(1), isCurrent: false })
    items.push({ kind: 'ellipsis', key: 'start' })
    items.push({ kind: 'page', page: currentPage, href: null, isCurrent: true })
    if (hasNext) {
      items.push({ kind: 'page', page: currentPage + 1, href: href(currentPage + 1), isCurrent: false })
      items.push({ kind: 'ellipsis', key: 'end' })
    }
  }

  return items
}

export function CategoryPagination({
  currentPage,
  hasNext,
  baseUrl,
  persistParams = new URLSearchParams(),
}: Props) {
  const hasPrev = currentPage > 1

  if (!hasPrev && !hasNext) return null

  const nextHref = hasNext ? pageHref(baseUrl, persistParams, currentPage + 1) : null
  const prevHref = hasPrev ? pageHref(baseUrl, persistParams, currentPage - 1) : null
  const pages = buildPages(currentPage, hasNext, baseUrl, persistParams)

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-2 pt-12">
      {/* Prev arrow */}
      {prevHref ? (
        <Link
          href={prevHref}
          scroll={false}
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
              <span
                key={item.key}
                aria-hidden="true"
                className="flex size-[35px] items-center justify-center text-[13px] font-semibold tracking-[0.26px] text-black"
              >
                …
              </span>
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
              scroll={false}
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
          scroll={false}
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
    </nav>
  )
}
