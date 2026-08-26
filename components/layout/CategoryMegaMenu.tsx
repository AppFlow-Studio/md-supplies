'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

// The desktop "Categories" panel.
//
// What it replaces: a single 800px-wide sheet that rendered all 25 departments
// AND every department's subcategories at once. With nearly every department
// carrying children, that measured ~1270px tall against a ~790px-available
// 1440x900 viewport and only stayed on screen because of an internal
// `max-h-[80vh] overflow-y-auto` — a scrolling wall of ~100 links, which is
// the "visually huge / hard to scan" complaint.
//
// What it does instead: progressive disclosure in two stages. Stage one is the
// department rail (two columns, no scrolling at laptop height). Stage two is a
// detail panel that shows ONE department's subcategories at a time, driven by
// hover or focus.
//
// Every link still exists in the server HTML — panels are CSS-hidden, never
// unmounted. That is deliberate and load-bearing: the sitewide nav is how
// category pages receive internal link equity (see the NF7 note and test in
// Header). "Progressive disclosure" here means what the shopper SEES on open
// drops from ~100 links to ~30, not that links are withheld from crawlers.
//
// Navigation never depends on hover: a department's name is a plain link to
// its own category page, and the chevron beside it is a separate control that
// only changes which panel is showing.

export type MegaMenuChild = {
  displayName: string
  href: string
  /** Curated, route-owning child (e.g. Trocars) — pinned first and badged. */
  featured?: boolean
}

export type MegaMenuCategory = {
  /** Registry tag — the stable key for panel ids and active state. */
  tag: string
  displayName: string
  href: string
  children: MegaMenuChild[]
}

type Props = {
  categories: MegaMenuCategory[]
  /** /categories — the "browse everything" escape hatch. */
  allHref: string
  /**
   * Commercially important route kept one interaction from the menu opening,
   * regardless of which department is showing. Trocars & Trocar Kits is a
   * subcategory of Surgery & Procedure, not a 26th department, so without this
   * it would only be reachable by first landing on the right panel.
   */
  featuredLink?: { displayName: string; href: string; parentName: string }
}

function panelId(tag: string) {
  return `mega-panel-${tag}`
}

function railItemId(tag: string) {
  return `mega-rail-${tag}`
}

export function CategoryMegaMenu({ categories, allHref, featuredLink }: Props) {
  // The department whose panel is showing. Seeded with the first department so
  // the panel is never an empty column on open.
  const [activeTag, setActiveTag] = useState(categories[0]?.tag ?? '')
  const railRef = useRef<HTMLUListElement>(null)

  const active = categories.find((c) => c.tag === activeTag) ?? categories[0]

  // Roving arrow-key movement over the rail's department links. Deliberately
  // NOT an ARIA menu: these are ordinary links, so Tab, Enter, middle-click and
  // "open in new tab" all keep working, and the arrow keys are an addition
  // rather than a replacement for them.
  const onRailKeyDown = (e: React.KeyboardEvent<HTMLUListElement>) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End', 'ArrowRight'].includes(e.key)) return
    const rail = railRef.current
    if (!rail) return
    const links = Array.from(rail.querySelectorAll<HTMLAnchorElement>('a[data-rail-link]'))
    if (links.length === 0) return
    const current = links.findIndex((el) => el === document.activeElement)

    if (e.key === 'ArrowRight') {
      // Step into the open panel rather than moving along the rail.
      const panel = document.getElementById(panelId(activeTag))
      const first = panel?.querySelector<HTMLAnchorElement>('a')
      if (first) {
        e.preventDefault()
        first.focus()
      }
      return
    }

    e.preventDefault()
    const next =
      e.key === 'Home' ? 0
      : e.key === 'End' ? links.length - 1
      : e.key === 'ArrowDown' ? (current + 1 + links.length) % links.length
      : (current - 1 + links.length) % links.length
    links[next]?.focus()
    setActiveTag(links[next]?.dataset.tag ?? activeTag)
  }

  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-[400px_260px]">
        {/* ── Stage one: the department rail ────────────────────────────── */}
        <div className="pr-5 border-r border-gray-100">
          <p className="text-[11px] font-bold text-navy-900 tracking-widest uppercase mb-2">
            Categories
          </p>
          {/* Two columns filled top-to-bottom (grid-flow-col over a fixed row
              count), so DOM order and reading order match and ArrowDown moves
              to the item visually below. 13 rows keeps all 25 departments on
              screen at laptop height without an internal scrollbar. */}
          <ul
            ref={railRef}
            onKeyDown={onRailKeyDown}
            className="grid [grid-template-rows:repeat(13,auto)] grid-flow-col gap-x-2 list-none m-0 p-0"
          >
            {categories.map((cat) => {
              const isActive = cat.tag === active?.tag
              const hasChildren = cat.children.length > 0
              return (
                <li
                  key={cat.tag}
                  className="min-w-0"
                  onMouseEnter={() => setActiveTag(cat.tag)}
                >
                  <div
                    className={`flex items-center gap-1 rounded transition-colors ${
                      isActive ? 'bg-neutral-50' : ''
                    }`}
                  >
                    <Link
                      id={railItemId(cat.tag)}
                      href={cat.href}
                      data-rail-link
                      data-tag={cat.tag}
                      onFocus={() => setActiveTag(cat.tag)}
                      className={`flex-1 min-w-0 block text-[13px] leading-snug px-2 py-1.5 rounded transition-colors ${
                        isActive ? 'text-navy-900 font-medium' : 'text-gray-500'
                      } hover:text-navy-900`}
                    >
                      {cat.displayName}
                    </Link>
                    {hasChildren && (
                      <button
                        type="button"
                        aria-expanded={isActive}
                        aria-controls={panelId(cat.tag)}
                        aria-label={`Show ${cat.displayName} subcategories`}
                        onClick={() => setActiveTag(cat.tag)}
                        onFocus={() => setActiveTag(cat.tag)}
                        className="shrink-0 p-1 text-gray-400 hover:text-navy-900 transition-colors"
                      >
                        <ChevronRight size={12} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>

        {/* ── Stage two: the detail panel ───────────────────────────────── */}
        {/* Every department's panel is rendered; only the active one is shown.
            The column has a fixed width so switching departments never resizes
            the sheet or shifts the rail sideways under the cursor. */}
        <div className="pl-5">
          {categories.map((cat) => {
            const isActive = cat.tag === active?.tag
            const sortedChildren = [
              ...cat.children.filter((c) => c.featured),
              ...cat.children.filter((c) => !c.featured),
            ]
            return (
              <div
                key={cat.tag}
                id={panelId(cat.tag)}
                role="group"
                aria-labelledby={railItemId(cat.tag)}
                className={isActive ? 'block' : 'hidden'}
              >
                <p className="text-[11px] font-bold text-navy-900 tracking-widest uppercase mb-2">
                  {cat.displayName}
                </p>
                <ul className="list-none m-0 p-0 flex flex-col">
                  <li>
                    <Link
                      href={cat.href}
                      className="block text-[13px] leading-snug font-semibold text-navy-900 hover:bg-neutral-50 px-2 py-1.5 rounded transition-colors"
                    >
                      All {cat.displayName}
                    </Link>
                  </li>
                  {sortedChildren.map((child) => (
                    // The badge is a SIBLING of the link, not a child of it:
                    // inside the anchor it became part of the accessible name
                    // ("Trocars & Trocar Kits Popular"), so the same
                    // destination announced differently depending on whether
                    // it happened to be badged. Outside it, the link is named
                    // by its destination and the word is still read as
                    // adjacent text.
                    <li key={child.href} className="flex items-center gap-1">
                      <Link
                        href={child.href}
                        className="flex-1 min-w-0 text-[13px] leading-snug text-ink-link hover:text-navy-900 hover:bg-neutral-50 px-2 py-1.5 rounded transition-colors"
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
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-4">
        <Link
          href={allHref}
          className="text-[13px] text-teal-500 font-semibold hover:text-ink-link transition-colors"
        >
          Browse all categories →
        </Link>
        {featuredLink && (
          <p className="text-[12px] text-gray-500 m-0">
            <span className="uppercase tracking-wide text-[10px] font-semibold text-gray-400 mr-2">
              Featured
            </span>
            <Link
              href={featuredLink.href}
              className="text-navy-900 font-semibold hover:text-teal-500 transition-colors"
            >
              {featuredLink.displayName}
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
