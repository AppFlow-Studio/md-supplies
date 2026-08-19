'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'

interface Props {
  defaultQuery: string
}

export function SearchBarForm({ defaultQuery }: Props) {
  const [value, setValue] = useState(defaultQuery)

  return (
    <form method="GET" action="/search">
      <div className="flex gap-3 max-w-[600px]">
        <div className="flex-1 min-w-0 flex items-center border border-gray-200 focus-within:border-navy-900 transition-colors px-4 gap-3 bg-white">
          <Search size={18} className="text-gray-500 shrink-0" />
          <input
            type="search"
            name="q"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Search medical supplies…"
            className="flex-1 min-w-0 h-[48px] text-[15px] text-navy-900 placeholder:text-gray-500 outline-none bg-transparent"
            // DEV-LAUNCH-13: autoFocus stole initial focus from the page's
            // skip link, which every other route relies on being the first
            // Tab stop (WCAG 2.4.1 Bypass Blocks) — see
            // e2e/keyboard-nav.spec.ts's skip-link suite.
          />
        </div>
        <button
          type="submit"
          className="bg-navy-900 text-white h-[48px] px-6 text-[14px] font-semibold tracking-[0.28px] uppercase hover:bg-navy-950 transition-colors shrink-0"
        >
          Search
        </button>
      </div>
    </form>
  )
}
