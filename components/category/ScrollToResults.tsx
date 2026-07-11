'use client'

import { useEffect, useRef, type ReactNode } from 'react'

interface Props {
  page: number
  children: ReactNode
}

// Category pagination links use `scroll={false}` (see CategoryPagination) so
// Next.js doesn't jump to the top of the page on every click. Without this,
// nothing brings the new results into view — the shopper stays scrolled at
// wherever they clicked (often the pagination controls near the footer).
export function ScrollToResults({ page, children }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [page])

  return <div ref={ref}>{children}</div>
}
