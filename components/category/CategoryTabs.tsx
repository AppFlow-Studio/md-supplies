'use client'

import { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, ChevronDown, Search, X } from 'lucide-react'
import type { CollectionFilter } from '@/lib/shopify/types'
import { withTrackingParams } from '@/lib/analytics/tracking-params'
import { useCatalogTransition } from '@/components/category/CatalogTransition'
import { needsFacetSearch, facetValueMatches } from '@/lib/catalog/facet-order'
import { DEFAULT_PAGE_SIZE, type PageSize } from '@/lib/catalog/page-size'

/**
 * The subcategory pill row beneath the hero — a SECOND VIEW over the Category
 * facet, not a separately maintained list.
 *
 * It receives the same `CollectionFilter` object the rail's Category group
 * renders, so label, query value, count, selected state and result semantics
 * are identical by construction: there is no second array to drift. The values
 * arrive already ordered count-descending with alphabetical tie-breaks (from
 * getAllowedFacets → orderFacetValues), and "All …" is pinned first here.
 *
 * Clicking a pill builds exactly the URL its matching checkbox would build —
 * same `?filter=` JSON, same preserved sort/search/per-page state, same page
 * reset — so the two controls cannot disagree about what is selected.
 *
 * What this replaced: a row driven by `subcategory:` product tags pointing at
 * separate /category/<cat>/<sub> routes. Those pills navigated away from the
 * page instead of filtering it, carried tag-derived counts that never matched
 * the Category facet's, and had no relationship to the checkbox the shopper
 * would otherwise use. The L2 routes still exist and stay crawlable — see the
 * subcategory link list further down the category page.
 */

/** Values beyond this collapse behind the More control on desktop. */
const DESKTOP_VISIBLE_HINT = 12

function Pill({
  href,
  active,
  label,
  count,
  onNavigate,
}: {
  href: string
  active: boolean
  label: string
  count?: number
  onNavigate: (e: React.MouseEvent<HTMLAnchorElement>, href: string) => void
}) {
  // `relative` is load-bearing, not cosmetic. The screen-reader count span
  // below uses `sr-only`, which is `position: absolute`. An absolutely
  // positioned element is laid out against its nearest POSITIONED ancestor and
  // is not clipped by an unpositioned scroll container — so without this, each
  // pill's hidden span escaped the rail's `overflow-x-auto` and sat at its
  // static offset in the document, several thousand pixels to the right.
  // Measured: /category/gloves reported a 1681px document in a 375px viewport,
  // /category/testing-screening 7758px, /industries/urgent-care 17624px — real
  // horizontal page scroll at every breakpoint. Anchoring the span to its own
  // pill puts it back inside the scroller, where the overflow rule clips it.
  const base =
    'relative inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-4 min-h-[44px] text-[15px] transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-900'
  const idle = 'border-gray-200 bg-white text-navy-900 hover:border-navy-900 hover:bg-surface-hover'
  const on = 'border-navy-900 bg-navy-900 text-white font-semibold'
  return (
    <Link
      href={href}
      onClick={(e) => onNavigate(e, href)}
      aria-current={active ? 'true' : undefined}
      className={`${base} ${active ? on : idle}`}
    >
      <span>{label}</span>
      {count !== undefined && (
        <>
          <span aria-hidden className={active ? 'text-white/70' : 'text-gray-500'}>
            {count}
          </span>
          <span className="sr-only">{count === 1 ? '1 product' : `${count} products`}</span>
        </>
      )}
    </Link>
  )
}

interface Props {
  /** The gated, count-ordered Category facet, or undefined when absent. */
  facet: CollectionFilter | undefined
  /** Currently-applied filter inputs (all facets). */
  activeFilters: string[]
  /** "All Gloves" / "All Urgent Care". */
  allLabel: string
  /** Accessible name for the nav landmark. */
  ariaLabel: string
  currentSort?: string
  q?: string
  pageSize: PageSize
  /**
   * Route links pinned between the "All …" pill and the facet pills — featured
   * subcategories that have their OWN collection page (Trocars & Trocar Kits
   * under Surgery & Procedure).
   *
   * They are deliberately not facet values: they navigate to a different route
   * rather than filtering this one, so they get an ordinary <Link> with no
   * click interception and never participate in selected-state maths. Pinned
   * ahead of the values so the most important child category is reachable
   * without scrolling the rail or opening More.
   */
  leadingLinks?: { label: string; href: string }[]
}

export function CategoryTabs({
  facet,
  activeFilters,
  allLabel,
  ariaLabel,
  currentSort,
  q,
  pageSize,
  leadingLinks = [],
}: Props) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { navigate } = useCatalogTransition()
  const railRef = useRef<HTMLUListElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [query, setQuery] = useState('')
  const [moreOpen, setMoreOpen] = useState(false)

  const updateArrows = () => {
    const el = railRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }

  useEffect(() => {
    updateArrows()
    const onResize = () => updateArrows()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [facet?.values.length])

  // The row still earns its place when the Category facet is absent but this
  // route has featured subcategory links to offer.
  if (!facet && leadingLinks.length === 0) return null

  const facetValues = facet?.values ?? []
  // The More panel below is gated on facetValues being non-empty, so a facet
  // necessarily exists wherever this label is read — but that is a runtime
  // invariant TypeScript cannot see through, and a fallback is cheaper than
  // threading a non-null assertion through the JSX.
  const facetLabel = facet?.label ?? 'Category'
  const categoryInputs = new Set(facetValues.map((v) => v.input))
  const selectedCategoryInputs = activeFilters.filter((f) => categoryInputs.has(f))
  const allActive = selectedCategoryInputs.length === 0

  /**
   * The URL for toggling one Category value — byte-identical to what
   * CategoryFilters' checkbox produces for the same input, including which
   * params survive. `page` is deliberately dropped: a new filter is a new
   * result set, so page 4 of the old one is meaningless.
   */
  const buildUrl = (nextCategoryInputs: string[]) => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (currentSort) params.set('sort', currentSort)
    // Non-category filters keep their position; category ones are replaced.
    activeFilters.filter((f) => !categoryInputs.has(f)).forEach((f) => params.append('filter', f))
    nextCategoryInputs.forEach((f) => params.append('filter', f))
    if (pageSize !== DEFAULT_PAGE_SIZE) params.set('per_page', String(pageSize))
    withTrackingParams(params, searchParams)
    const qs = params.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }

  const toggleUrl = (input: string) =>
    buildUrl(
      selectedCategoryInputs.includes(input)
        ? selectedCategoryInputs.filter((f) => f !== input)
        : [...selectedCategoryInputs, input],
    )

  const allHref = buildUrl([])

  // A zero-count value is noise unless it is currently selected, in which case
  // hiding it would strand the shopper with no way to remove it.
  const visible = facetValues.filter((v) => v.count > 0 || selectedCategoryInputs.includes(v.input))
  const searchable = needsFacetSearch(visible.length)
  const filtered = query.trim() ? visible.filter((v) => facetValueMatches(v.label, query)) : visible

  const onPill = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    // Plain left-click filters in place (keeping products on screen via the
    // catalog transition); modified clicks keep native open-in-new-tab.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
    e.preventDefault()
    navigate(href)
  }

  return (
    <nav aria-label={ariaLabel} className="mb-5">
      {/* One scroller for every breakpoint. On phones it is the compact chip
          row the spec asks for; on desktop the arrow controls appear beside it.
          No hidden-only-on-mobile duplicate markup, so the DOM order and the
          reading order match at every width. */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => railRef.current?.scrollBy({ left: -Math.max(240, (railRef.current?.clientWidth ?? 0) * 0.8), behavior: 'smooth' })}
          disabled={!canScrollLeft}
          aria-label="Scroll categories left"
          className="hidden lg:flex shrink-0 items-center justify-center size-[44px] rounded-full border border-gray-200 bg-white text-navy-900 disabled:opacity-30 disabled:cursor-not-allowed hover:border-navy-900 transition-colors"
        >
          <ChevronLeft size={18} />
        </button>

        <ul
          ref={railRef}
          onScroll={updateArrows}
          className="flex items-center gap-2 overflow-x-auto scrollbar-hide list-none m-0 p-0 flex-1 min-w-0 py-1 -my-1"
        >
          <li className="shrink-0">
            <Pill href={allHref} active={allActive} label={allLabel} onNavigate={onPill} />
          </li>
          {/* Featured subcategory routes, pinned ahead of the facet values.
              Plain <Link> — no onPill interception and no aria-current, because
              activating one LEAVES this page for another category rather than
              changing this page's filter state. Given the teal treatment so it
              reads as a destination rather than a filter toggle. `teal-500` is
              the AA-corrected token (#006d92 — 5.8:1 on white, 4.8:1 on the
              light-blue chips), NOT the 3.1:1 cyan it replaced sitewide, so
              this pairing clears 4.5:1 on teal-50. */}
          {leadingLinks.map((link) => (
            <li key={link.href} className="shrink-0">
              <Link
                href={link.href}
                className="relative inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-teal-500 bg-teal-50 px-4 min-h-[44px] text-[15px] font-semibold text-teal-500 transition-colors motion-reduce:transition-none hover:bg-teal-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-900"
              >
                {link.label}
              </Link>
            </li>
          ))}
          {visible.map((value) => (
            <li key={value.input} className="shrink-0">
              <Pill
                href={toggleUrl(value.input)}
                active={selectedCategoryInputs.includes(value.input)}
                label={value.label}
                count={value.count}
                onNavigate={onPill}
              />
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => railRef.current?.scrollBy({ left: Math.max(240, (railRef.current?.clientWidth ?? 0) * 0.8), behavior: 'smooth' })}
          disabled={!canScrollRight}
          aria-label="Scroll categories right"
          className="hidden lg:flex shrink-0 items-center justify-center size-[44px] rounded-full border border-gray-200 bg-white text-navy-900 disabled:opacity-30 disabled:cursor-not-allowed hover:border-navy-900 transition-colors"
        >
          <ChevronRight size={18} />
        </button>

        {/* Overflow panel — reaches any value without scrolling the rail, and
            gives phone users the subcategories without opening the Filters
            drawer. Rendered at every width for exactly that reason. */}
        {visible.length > DESKTOP_VISIBLE_HINT && (
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMoreOpen((o) => !o)}
              aria-expanded={moreOpen}
              className="inline-flex items-center gap-1 min-h-[44px] px-4 rounded-full border border-gray-200 bg-white text-navy-900 text-[15px] hover:border-navy-900 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-900"
            >
              More
              <ChevronDown size={16} className={moreOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
            </button>
            {moreOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMoreOpen(false)} aria-hidden />
                <div className="absolute right-0 top-[calc(100%+8px)] z-40 w-[min(420px,90vw)] max-h-[60vh] overflow-y-auto bg-white border border-gray-200 shadow-lg p-3">
                  {searchable && (
                    <div className="relative mb-2">
                      <Search size={16} aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={`Search ${facetLabel.toLowerCase()}`}
                        aria-label={`Search ${facetLabel} options`}
                        className="w-full min-h-[44px] pl-9 pr-9 border border-gray-200 text-[16px] text-navy-900 focus:outline-none focus:border-navy-900"
                      />
                      {query && (
                        <button
                          type="button"
                          onClick={() => setQuery('')}
                          aria-label="Clear category search"
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  )}
                  <ul className="list-none m-0 p-0">
                    {filtered.map((value) => (
                      <li key={value.input}>
                        <Link
                          href={toggleUrl(value.input)}
                          onClick={(e) => {
                            setMoreOpen(false)
                            onPill(e, toggleUrl(value.input))
                          }}
                          className={`flex items-center justify-between gap-3 min-h-[44px] px-3 text-[15px] hover:bg-neutral-100 ${
                            selectedCategoryInputs.includes(value.input) ? 'font-semibold text-navy-900' : 'text-gray-600'
                          }`}
                        >
                          <span>{value.label}</span>
                          <span className="text-gray-500">{value.count}</span>
                        </Link>
                      </li>
                    ))}
                    {filtered.length === 0 && (
                      <li className="px-3 py-3 text-[15px] text-gray-500">
                        No categories match “{query}”.
                      </li>
                    )}
                  </ul>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
