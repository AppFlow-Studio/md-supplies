'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import type { MegaMenuCategory } from '@/components/layout/CategoryMegaMenu'

// The mobile half of the same two-stage idea, expressed the way a touch screen
// wants it: a drill-down, not a hover.
//
// Level one is the department list. Tapping a department's NAME navigates to
// its category page (same contract as desktop — navigation never requires
// expanding first). Tapping the chevron opens that department's own panel,
// which replaces the list and carries a "< Categories" control back.
//
// Exactly one department panel is open at a time, by construction: the state is
// a single tag, not a set. Every panel stays mounted and CSS-hidden so the
// drawer's links remain in the server HTML, matching the desktop panel and the
// crawlable-nav rule Header documents.

type Props = {
  categories: MegaMenuCategory[]
  allHref: string
  /** Closes the drawer — called on every terminal navigation link. */
  onNavigate: () => void
  /**
   * Current pathname. A change to it drops back to level one, so reopening the
   * drawer on the new page never starts inside whichever department the
   * shopper drilled into on the last one. Adjusted during render (React's
   * "reset state when a prop changes" pattern) so the reset lands in the same
   * commit as the route change — the same approach Header uses for the drawer
   * itself.
   */
  resetKey: string
}

export function MobileCategoryNav({ categories, allHref, onNavigate, resetKey }: Props) {
  const [openTag, setOpenTag] = useState<string | null>(null)
  const [lastResetKey, setLastResetKey] = useState(resetKey)
  if (resetKey !== lastResetKey) {
    setLastResetKey(resetKey)
    setOpenTag(null)
  }
  const open = openTag ? categories.find((c) => c.tag === openTag) : undefined

  return (
    <div className="flex flex-col">
      {/* ── Level one: departments ─────────────────────────────────────── */}
      <ul className={`${open ? 'hidden' : 'flex'} list-none m-0 p-0 flex-col`}>
        {categories.map((cat) => (
          <li key={cat.tag} className="flex items-center border-b border-gray-100 last:border-b-0">
            <Link
              href={cat.href}
              onClick={onNavigate}
              className="flex-1 min-w-0 text-gray-500 text-sm py-3 pr-2 hover:text-navy-900 transition-colors"
            >
              {cat.displayName}
            </Link>
            {cat.children.length > 0 && (
              <button
                type="button"
                aria-expanded={open?.tag === cat.tag}
                aria-controls={`mobile-cat-${cat.tag}`}
                aria-label={`Show ${cat.displayName} subcategories`}
                onClick={() => setOpenTag(cat.tag)}
                // 44px square: the drawer's one non-link control per row, and
                // the only thing standing between a mis-tap and an unwanted
                // page load.
                className="shrink-0 w-11 h-11 flex items-center justify-center text-gray-400 hover:text-navy-900 transition-colors"
              >
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            )}
          </li>
        ))}
        <li>
          <Link
            href={allHref}
            onClick={onNavigate}
            className="block text-teal-500 text-sm py-3 font-semibold"
          >
            All categories →
          </Link>
        </li>
      </ul>

      {/* ── Level two: one department at a time ────────────────────────── */}
      {categories.map((cat) => {
        const isOpen = open?.tag === cat.tag
        const sortedChildren = [
          ...cat.children.filter((c) => c.featured),
          ...cat.children.filter((c) => !c.featured),
        ]
        return (
          <div
            key={cat.tag}
            id={`mobile-cat-${cat.tag}`}
            className={isOpen ? 'block' : 'hidden'}
          >
            <button
              type="button"
              onClick={() => setOpenTag(null)}
              className="flex items-center gap-1 text-gray-500 text-sm py-3 hover:text-navy-900 transition-colors"
            >
              <ChevronLeft size={16} aria-hidden="true" />
              Categories
            </button>
            <p className="text-navy-900 text-sm font-semibold py-1 m-0">{cat.displayName}</p>
            <ul className="list-none m-0 p-0 flex flex-col">
              <li className="border-b border-gray-100">
                <Link
                  href={cat.href}
                  onClick={onNavigate}
                  className="block text-navy-900 text-sm py-3 font-semibold hover:text-teal-500 transition-colors"
                >
                  All {cat.displayName}
                </Link>
              </li>
              {sortedChildren.map((child) => (
                // Badge outside the anchor — same reason as the desktop panel:
                // it must not change the link's accessible name.
                <li
                  key={child.href}
                  className="flex items-center gap-1 border-b border-gray-100 last:border-b-0"
                >
                  <Link
                    href={child.href}
                    onClick={onNavigate}
                    className="flex-1 min-w-0 text-gray-500 text-sm py-3 hover:text-navy-900 transition-colors"
                  >
                    {child.displayName}
                  </Link>
                  {child.featured && (
                    <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-teal-500 border border-teal-500/40 rounded-full px-1.5 py-px">
                      Popular
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
