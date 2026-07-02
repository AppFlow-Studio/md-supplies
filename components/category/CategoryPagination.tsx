import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  currentPage: number
  hasNext: boolean
  nextCursor: string | null
  prevCursors: string[]
  currentAfter: string | null
  baseUrl: string
  /** Sort/filter params to carry through every page link (e.g. sort, filter[]). */
  persistParams?: URLSearchParams
}

type PageItem =
  | { kind: 'page'; page: number; href: string | null; isCurrent: boolean }
  | { kind: 'ellipsis'; key: string }

function buildPages(
  currentPage: number,
  hasNext: boolean,
  nextHref: string | null,
  page1Url: string,
): PageItem[] {
  const items: PageItem[] = []

  if (currentPage === 1) {
    items.push({ kind: 'page', page: 1, href: null, isCurrent: true })
    if (hasNext) {
      items.push({ kind: 'page', page: 2, href: nextHref, isCurrent: false })
      items.push({ kind: 'ellipsis', key: 'end' })
    }
  } else if (currentPage === 2) {
    items.push({ kind: 'page', page: 1, href: page1Url, isCurrent: false })
    items.push({ kind: 'page', page: 2, href: null, isCurrent: true })
    if (hasNext) {
      items.push({ kind: 'page', page: 3, href: nextHref, isCurrent: false })
      items.push({ kind: 'ellipsis', key: 'end' })
    }
  } else {
    // currentPage >= 3
    items.push({ kind: 'page', page: 1, href: page1Url, isCurrent: false })
    items.push({ kind: 'ellipsis', key: 'start' })
    items.push({ kind: 'page', page: currentPage, href: null, isCurrent: true })
    if (hasNext) {
      items.push({ kind: 'page', page: currentPage + 1, href: nextHref, isCurrent: false })
      items.push({ kind: 'ellipsis', key: 'end' })
    }
  }

  return items
}

function buildNextHref(
  currentPage: number,
  nextCursor: string,
  prevCursors: string[],
  currentAfter: string | null,
  baseUrl: string,
  persistParams: URLSearchParams,
): string {
  const newCursors = currentAfter ? [...prevCursors, currentAfter] : prevCursors
  const p = new URLSearchParams(persistParams)
  p.set('page', String(currentPage + 1))
  p.set('after', nextCursor)
  if (newCursors.length > 0) p.set('cursors', newCursors.join(','))
  return `${baseUrl}?${p.toString()}`
}

function buildPrevHref(
  currentPage: number,
  prevCursors: string[],
  baseUrl: string,
  persistParams: URLSearchParams,
): string {
  const qs = persistParams.toString()
  const page1Url = qs ? `${baseUrl}?${qs}` : baseUrl
  if (currentPage <= 2 || prevCursors.length === 0) return page1Url
  const prevAfter = prevCursors[prevCursors.length - 1]
  const remaining = prevCursors.slice(0, -1)
  const p = new URLSearchParams(persistParams)
  p.set('page', String(currentPage - 1))
  p.set('after', prevAfter)
  if (remaining.length > 0) p.set('cursors', remaining.join(','))
  return `${baseUrl}?${p.toString()}`
}

export function CategoryPagination({
  currentPage,
  hasNext,
  nextCursor,
  prevCursors,
  currentAfter,
  baseUrl,
  persistParams = new URLSearchParams(),
}: Props) {
  const hasPrev = currentPage > 1

  const nextHref =
    hasNext && nextCursor
      ? buildNextHref(currentPage, nextCursor, prevCursors, currentAfter, baseUrl, persistParams)
      : null

  const prevHref = hasPrev
    ? buildPrevHref(currentPage, prevCursors, baseUrl, persistParams)
    : null

  if (!hasPrev && !hasNext) return null

  const qs = persistParams.toString()
  const page1Url = qs ? `${baseUrl}?${qs}` : baseUrl
  const pages = buildPages(currentPage, hasNext, nextHref, page1Url)

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
