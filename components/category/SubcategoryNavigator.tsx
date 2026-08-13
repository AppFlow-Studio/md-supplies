'use client'

import { useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, ChevronDown, Search, X } from 'lucide-react'

/**
 * Phase 7 — compact, crawlable subcategory navigation.
 *
 * The previous pattern was a flex-wrap row of 52px-tall buttons. The catalog
 * audit (2026-08-02) measured how badly that scales: 97 distinct active
 * subcategories under exam-room, 72 home-care, 56 hygiene, 51 needles-syringes,
 * 47 testing. Rendering 40-50 full-width chips before the grid pushed products
 * far below the fold on every device.
 *
 * Desktop: ONE row that never wraps, with arrow controls and an overflow menu.
 * Mobile/tablet: a single full-width disclosure with 44px targets and, for long
 * lists, a filter box — no hidden swipe gesture required.
 *
 * Every entry is a real <a> inside <nav>/<ul> and is present in the
 * server-rendered HTML, so crawlability is unchanged.
 */

export type SubcategoryLink = {
  label: string
  href: string
  /** Marks the currently-viewed subcategory. */
  active?: boolean
}

/** Lists longer than this get a filter box in the mobile panel. */
const SEARCHABLE_THRESHOLD = 15

interface Props {
  items: SubcategoryLink[]
  /** "All <category>" link shown first. */
  allHref: string
  allLabel: string
  /** True when the "All" entry is the current page. */
  allActive?: boolean
  /** Accessible name for the nav landmark, e.g. "Gloves subcategories". */
  ariaLabel: string
}

export function SubcategoryNavigator({ items, allHref, allLabel, allActive, ariaLabel }: Props) {
  const railRef = useRef<HTMLUListElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [query, setQuery] = useState('')
  const panelId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)

  const updateArrows = () => {
    const el = railRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }

  useEffect(() => {
    updateArrows()
    const el = railRef.current
    if (!el) return
    const onResize = () => updateArrows()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [items.length])

  const scrollByPage = (dir: -1 | 1) => {
    const el = railRef.current
    if (!el) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    el.scrollBy({ left: dir * Math.max(240, el.clientWidth * 0.8), behavior: reduce ? 'auto' : 'smooth' })
  }

  const closeMobile = () => {
    setMobileOpen(false)
    setQuery('')
    // Focus returns to the trigger, not the top of the document.
    triggerRef.current?.focus()
  }

  // Escape closes the mobile panel from anywhere inside it.
  useEffect(() => {
    if (!mobileOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMobile()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [mobileOpen])

  const current = items.find((i) => i.active)
  const filtered = query.trim()
    ? items.filter((i) => i.label.toLowerCase().includes(query.trim().toLowerCase()))
    : items

  const linkBase =
    'inline-flex items-center whitespace-nowrap rounded-full border px-4 min-h-[44px] text-[15px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-900'
  const linkIdle = 'border-gray-200 bg-white text-navy-900 hover:border-navy-900'
  const linkActive = 'border-navy-900 bg-navy-900 text-white font-semibold'

  if (items.length === 0) return null

  return (
    <nav aria-label={ariaLabel} className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 mb-4">
      {/* ── Desktop: single non-wrapping row ── */}
      <div className="hidden lg:flex items-center gap-2">
        <button
          type="button"
          onClick={() => scrollByPage(-1)}
          disabled={!canScrollLeft}
          aria-label="Scroll subcategories left"
          className="shrink-0 flex items-center justify-center size-[44px] rounded-full border border-gray-200 bg-white text-navy-900 disabled:opacity-30 disabled:cursor-not-allowed hover:border-navy-900 transition-colors"
        >
          <ChevronLeft size={18} />
        </button>

        <ul
          ref={railRef}
          onScroll={updateArrows}
          className="flex items-center gap-2 overflow-x-auto scrollbar-hide list-none m-0 p-0 flex-1 min-w-0"
        >
          <li>
            <Link
              href={allHref}
              aria-current={allActive ? 'page' : undefined}
              className={`${linkBase} ${allActive ? linkActive : linkIdle}`}
            >
              {allLabel}
            </Link>
          </li>
          {items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={item.active ? 'page' : undefined}
                className={`${linkBase} ${item.active ? linkActive : linkIdle}`}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => scrollByPage(1)}
          disabled={!canScrollRight}
          aria-label="Scroll subcategories right"
          className="shrink-0 flex items-center justify-center size-[44px] rounded-full border border-gray-200 bg-white text-navy-900 disabled:opacity-30 disabled:cursor-not-allowed hover:border-navy-900 transition-colors"
        >
          <ChevronRight size={18} />
        </button>

        {/* Overflow menu: reaches any subcategory without scrolling the rail. */}
        <details className="relative shrink-0 group">
          <summary
            className="list-none cursor-pointer inline-flex items-center gap-1 min-h-[44px] px-4 rounded-full border border-gray-200 bg-white text-navy-900 text-[15px] hover:border-navy-900 transition-colors"
            aria-label={`All ${items.length} subcategories`}
          >
            More
            <ChevronDown size={16} className="transition-transform group-open:rotate-180" />
          </summary>
          <div className="absolute right-0 top-[calc(100%+8px)] z-30 w-[420px] max-h-[60vh] overflow-y-auto bg-white border border-gray-200 shadow-lg p-3">
            <ul className="grid grid-cols-2 gap-1 list-none m-0 p-0">
              {items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={item.active ? 'page' : undefined}
                    className={`block px-3 py-2 text-[14px] rounded hover:bg-neutral-100 ${
                      item.active ? 'font-semibold text-navy-900' : 'text-gray-600'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </details>
      </div>

      {/* ── Mobile / tablet: one full-width disclosure ── */}
      <div className="lg:hidden">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => (mobileOpen ? closeMobile() : setMobileOpen(true))}
          aria-expanded={mobileOpen}
          aria-controls={panelId}
          className="w-full min-h-[52px] flex items-center justify-between gap-3 px-4 bg-white border border-gray-200 text-navy-900 text-[16px] font-semibold"
        >
          <span className="truncate">
            Browse subcategories
            <span className="font-normal text-gray-500"> ({items.length})</span>
          </span>
          <span className="flex items-center gap-2 shrink-0">
            {current && (
              <span className="max-w-[45vw] truncate text-[14px] font-normal text-teal-500">
                {current.label}
              </span>
            )}
            <ChevronDown size={18} className={mobileOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
          </span>
        </button>

        {mobileOpen && (
          <>
            {/* Backdrop: tapping outside closes, matching drawer expectations. */}
            <div
              className="fixed inset-0 z-30 bg-black/20 lg:hidden"
              onClick={closeMobile}
              aria-hidden
            />
            <div
              id={panelId}
              className="relative z-40 border border-t-0 border-gray-200 bg-white max-h-[60vh] overflow-y-auto"
            >
              {items.length > SEARCHABLE_THRESHOLD && (
                <div className="sticky top-0 bg-white p-3 border-b border-gray-100">
                  <div className="relative">
                    <Search size={16} aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Find a subcategory"
                      aria-label="Find a subcategory"
                      className="w-full min-h-[44px] pl-9 pr-9 border border-gray-200 text-[16px] text-navy-900 focus:outline-none focus:border-navy-900"
                    />
                    {query && (
                      <button
                        type="button"
                        onClick={() => setQuery('')}
                        aria-label="Clear subcategory search"
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>
              )}

              <ul className="list-none m-0 p-0 divide-y divide-gray-100">
                <li>
                  <Link
                    href={allHref}
                    onClick={closeMobile}
                    aria-current={allActive ? 'page' : undefined}
                    className={`flex items-center min-h-[52px] px-4 text-[16px] ${
                      allActive ? 'font-semibold text-navy-900 bg-neutral-50' : 'text-navy-900'
                    }`}
                  >
                    {allLabel}
                  </Link>
                </li>
                {filtered.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={closeMobile}
                      aria-current={item.active ? 'page' : undefined}
                      className={`flex items-center min-h-[52px] px-4 text-[16px] ${
                        item.active ? 'font-semibold text-navy-900 bg-neutral-50' : 'text-navy-900'
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
                {filtered.length === 0 && (
                  <li className="px-4 py-4 text-[15px] text-gray-500">
                    No subcategories match “{query}”.
                  </li>
                )}
              </ul>
            </div>
          </>
        )}
      </div>
    </nav>
  )
}
