'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { track } from '@/lib/analytics/track'
import { buildPageViewEvent } from '@/lib/analytics/events'

export function PageViewTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    const search = searchParams.toString()
    const path = search ? `${pathname}?${search}` : pathname
    track({
      ...buildPageViewEvent({
        path,
        location: `${window.location.origin}${path}`,
        title: document.title,
      }),
    })
  }, [pathname, searchParams])

  return null
}
