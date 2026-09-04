'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'

import { AnimatedArrow } from '@/components/ui/AnimatedArrow'

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
// detail panel showing ONE department's subcategories at a time.
//
// ── ONE MEANING PER CONTROL, NOT PER ROW (2026-09-04 P0 nav-defect fix) ────
//
// The rail SELECTS/OPENS. The panel NAVIGATES. That much never changed. What
// changed is where "goes to the category page" lives.
//
// An earlier version of this file put a link (the department name) and a
// disclosure arrow side by side in one dense 26px row, found that shoppers
// could not tell which half did what, and removed the link entirely — a
// department row became a single button, and the ONLY route to the category
// page was "All <Department> →" at the top of the panel it opened. That
// shipped, and in the 2026-09-01 client meeting a shopper clicking "Wound
// Care" read the click as doing nothing, because from their side only the
// (easy to miss) side panel changed — they expected the name itself to go
// somewhere, and it didn't.
//
// So the split control is back, but not the thing that made the first attempt
// fail. Two real, separate controls per row, each with its own hit area and
// its own accessible name — not two guesses crammed into one 26px strip:
//   · the department NAME is a real `<Link>` to its category page.
//   · a dedicated chevron `<button>` (ChevronDown, the disclosure glyph used
//     everywhere else in this header — see Header.tsx's own top-level
//     "Categories"/"<X> submenu" triggers, which this row now matches
//     exactly) opens/selects the side panel.
// `AnimatedArrow`'s ArrowRight glyph stays OUT of the disclosure control on
// purpose — it is this site's "go somewhere" glyph, and doubling it as a
// disclosure icon is exactly the ambiguity the first attempt's postmortem
// flagged. It still marks every real navigation link inside the panel.
//
// Every category still has a real crawlable <a href="/category/…"> in the
// server HTML — now from BOTH the rail row's name and the panel's "Browse All
// …" link. Panels are CSS-hidden, never unmounted, because the sitewide nav is
// how category pages receive internal link equity (see the NF7 note and test
// in Header).
//
// Opening the panel is still a click (or focus), never a hover. The rail is
// two columns and the panel sits to the RIGHT of both, so reaching a
// column-one department's panel means dragging the pointer across column two.
// Bare mouseenter handed the panel to whatever row was crossed; a fixed delay
// could not separate a slow sweep from a deliberate rest; a direction guard
// fixed straight lines and still mis-fired on real, wandering paths. All three
// were heuristics guessing at intent. A click is not a guess — and now that
// the row is two controls, hovering EITHER of them must still leave the
// active panel alone; only clicking (or focusing) the chevron opens one.
// Keyboard focus and the arrow keys still move the selection, because that is
// the keyboard's equivalent of pointing.

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

const ROW_CLASS =
  'group w-full flex items-center gap-2 text-left text-[13px] leading-snug px-2 py-1.5 rounded transition-colors'

export function CategoryMegaMenu({ categories, allHref, featuredLink }: Props) {
  // The department whose panel is showing. Seeded with the first department so
  // the panel is never an empty column on open.
  const [activeTag, setActiveTag] = useState(categories[0]?.tag ?? '')
  const railRef = useRef<HTMLUListElement>(null)

  const active = categories.find((c) => c.tag === activeTag) ?? categories[0]

  const activate = (tag: string) => setActiveTag(tag)

  // Roving arrow-key movement over the rail. Deliberately NOT an ARIA menu —
  // these stay ordinary buttons and links, so Tab and Enter behave the way they
  // do everywhere else and the arrow keys are an addition rather than a
  // replacement.
  const onRailKeyDown = (e: React.KeyboardEvent<HTMLUListElement>) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End', 'ArrowRight'].includes(e.key)) return
    const rail = railRef.current
    if (!rail) return
    const items = Array.from(rail.querySelectorAll<HTMLElement>('[data-rail-item]'))
    if (items.length === 0) return
    const current = items.findIndex((el) => el === document.activeElement)

    if (e.key === 'ArrowRight') {
      // Step into the open panel rather than moving along the rail.
      const first = document.getElementById(panelId(activeTag))?.querySelector<HTMLAnchorElement>('a')
      if (first) {
        e.preventDefault()
        first.focus()
      }
      return
    }

    e.preventDefault()
    const next =
      e.key === 'Home' ? 0
      : e.key === 'End' ? items.length - 1
      : e.key === 'ArrowDown' ? (current + 1 + items.length) % items.length
      : (current - 1 + items.length) % items.length
    items[next]?.focus()
    activate(items[next]?.dataset.tag ?? activeTag)
  }

  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-[400px_260px]">
        {/* ── Stage one: the department rail (selects, never navigates) ──── */}
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
              const stateClass = isActive
                ? 'bg-neutral-50 text-navy-900 font-medium'
                : 'text-gray-500 hover:bg-neutral-50/60 hover:text-navy-900'
              const arrowClass = isActive
                ? 'translate-x-1 text-navy-900'
                : 'text-gray-400 group-hover:text-navy-900'

              // A department with nothing to disclose has no panel worth
              // opening, so its row goes straight to the category page. An edge
              // case rather than a second convention: every department carries
              // children on the live catalogue, and this is what the sparser QA
              // store hits.
              if (cat.children.length === 0) {
                return (
                  <li key={cat.tag} className="min-w-0">
                    <Link
                      id={railItemId(cat.tag)}
                      href={cat.href}
                      data-rail-item
                      data-tag={cat.tag}
                      className={`${ROW_CLASS} ${stateClass}`}
                    >
                      <span className="flex-1 min-w-0">{cat.displayName}</span>
                      <AnimatedArrow size={14} className={arrowClass} />
                    </Link>
                  </li>
                )
              }

              // Split control (2026-09-04 P0 nav-defect fix): the name is a
              // real link to the category page; the chevron is the ONLY
              // control that opens/selects the side panel. `onFocus` sits on
              // the wrapper (not either child individually) so tabbing onto
              // EITHER control previews the panel — React's synthetic focus
              // event bubbles, so this is one handler, not two. Hovering
              // either control must never call `activate` — there is no
              // `onMouseEnter` anywhere in this row on purpose.
              return (
                <li key={cat.tag} className="min-w-0">
                  <div
                    className={`group w-full flex items-center gap-1 rounded transition-colors ${stateClass}`}
                    onFocus={() => activate(cat.tag)}
                  >
                    <Link
                      id={railItemId(cat.tag)}
                      href={cat.href}
                      className="flex-1 min-w-0 text-left text-[13px] leading-snug px-2 py-1.5 rounded truncate"
                    >
                      {cat.displayName}
                    </Link>
                    {/* No padding on the chevron, matching Header.tsx's own
                        top-level submenu chevron convention — this
                        two-column rail is ~182px per item at laptop width,
                        and the longest labels ("Patient Therapy & Rehab",
                        "Housekeeping & Janitorial") clip if the chevron
                        carries its own hit padding on top of the name
                        link's (verified live, 2026-09-04). Desktop-only,
                        mouse-driven control, so a tight icon-sized target is
                        acceptable — the mobile equivalent
                        (MobileCategoryNav) keeps generous touch padding
                        instead. */}
                    <button
                      type="button"
                      data-rail-item
                      data-tag={cat.tag}
                      aria-expanded={isActive}
                      aria-controls={panelId(cat.tag)}
                      aria-label={`${cat.displayName} subcategories`}
                      onClick={() => activate(cat.tag)}
                      className="shrink-0 flex items-center"
                    >
                      {/* ChevronDown, not AnimatedArrow's ArrowRight — this
                          site's "go somewhere" glyph must not double as the
                          disclosure icon (see the file-header comment). Same
                          rotate-on-open convention as Header.tsx's own
                          top-level submenu triggers. */}
                      <ChevronDown
                        size={14}
                        className={`transition-transform duration-150 ${isActive ? 'rotate-180 text-navy-900' : 'text-gray-400 group-hover:text-navy-900'}`}
                      />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>

        {/* ── Stage two: the detail panel (navigates, never selects) ─────── */}
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
                  {/* The panel's primary action — full width, named, separated
                      from the subcategories beneath it. A second, unmissable
                      route to the category page alongside the rail's own name
                      link, worded to read as an obvious CTA rather than a
                      quiet "All X" label — the wording the 2026-09-04 nav
                      ticket's client demo specifically asked for. */}
                  <li className="mb-1 pb-1 border-b border-gray-100">
                    <Link
                      href={cat.href}
                      className="group flex items-center gap-2 text-[13px] leading-snug font-semibold text-navy-900 hover:text-teal-500 hover:bg-neutral-50 px-2 py-1.5 rounded transition-colors"
                    >
                      <span className="flex-1 min-w-0">Browse All {cat.displayName}</span>
                      <AnimatedArrow size={14} />
                    </Link>
                  </li>
                  {sortedChildren.map((child) => (
                    // The badge is a SIBLING of the link, not a child of it:
                    // inside the anchor it became part of the accessible name
                    // ("Trocars & Trocar Kits Popular"), so the same
                    // destination announced differently depending on whether it
                    // happened to be badged. Outside it, the link is named by
                    // its destination and the word is still read as adjacent
                    // text.
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
          className="group inline-flex items-center gap-1 text-[13px] text-teal-500 font-semibold hover:text-ink-link transition-colors"
        >
          Browse all categories <AnimatedArrow size={13} />
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
