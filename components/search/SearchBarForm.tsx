'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'

/**
 * `page`   — the /search results page bar: bounded width, 48px controls,
 *            full-word submit button.
 * `header` — the always-visible mobile header bar: full bleed, 44px controls
 *            (still above the 44px touch-target floor) so the extra header row
 *            costs as little vertical space as possible on a 360–430px screen.
 */
type Variant = 'page' | 'header'

interface Props {
  defaultQuery?: string
  variant?: Variant
  /** Accessible name. Both variants get one — a placeholder is not a label. */
  label?: string
}

export function SearchBarForm({
  defaultQuery = '',
  variant = 'page',
  label = 'Search medical supplies',
}: Props) {
  const [value, setValue] = useState(defaultQuery)
  const isHeader = variant === 'header'

  // A plain GET form to the real /search route — the same endpoint the header
  // dropdown and the WebSite SearchAction schema use. Deliberately NOT a second
  // search system: no client fetch, no router push, so it still submits if
  // hydration is slow or fails, and the mobile keyboard's Search/Go key works
  // for free.
  return (
    // Distinct landmark names: on /search BOTH bars are in the DOM (this one
    // and the header's), and two unnamed `search` landmarks on one page is an
    // axe `landmark-unique` failure as well as a screen-reader ambiguity.
    <form
      method="GET"
      action="/search"
      role="search"
      aria-label={isHeader ? 'Site search' : 'Search products'}
    >
      <div className={`flex ${isHeader ? 'gap-2' : 'gap-3 max-w-[600px]'}`}>
        <div className="flex-1 min-w-0 flex items-center border border-gray-200 focus-within:border-navy-900 transition-colors px-4 gap-3 bg-white">
          <Search size={18} className="text-gray-500 shrink-0" />
          <input
            type="search"
            name="q"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-label={label}
            placeholder="Search medical supplies…"
            className={`flex-1 min-w-0 ${isHeader ? 'h-[44px]' : 'h-[48px]'} text-[15px] text-navy-900 placeholder:text-gray-500 outline-none bg-transparent`}
            // DEV-LAUNCH-13: autoFocus stole initial focus from the page's
            // skip link, which every other route relies on being the first
            // Tab stop (WCAG 2.4.1 Bypass Blocks) — see
            // e2e/keyboard-nav.spec.ts's skip-link suite.
          />
        </div>
        <button
          type="submit"
          className={`bg-navy-900 text-white ${isHeader ? 'h-[44px] px-4 text-[13px]' : 'h-[48px] px-6 text-[14px]'} font-semibold tracking-[0.28px] uppercase hover:bg-navy-950 transition-colors shrink-0`}
        >
          Search
        </button>
      </div>
    </form>
  )
}
