'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'

import {
  ShieldCheck, Truck, Package, ChevronDown,
  Search, User, ShoppingCart, Menu, X, Building2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { useCart } from '@/components/store/CartProvider'
import { SearchDropdown } from '@/components/layout/SearchDropdown'
import Image from 'next/image'
import { ROUTES } from '@/lib/routes'
import type { MenuItem } from '@/lib/shopify/types'
import {
  buildCategoryTreeNav,
  CATEGORY_TREE_L1,
  getCategorySlug,
  getTopSubcategoriesForParent,
  humanizeTag,
  FEATURED_SUBCATEGORIES,
  type L2Node,
} from '@/lib/category-tree'
import { LOGO_PATH } from '@/lib/bunnycdn'
import { approvedClaims, type ClaimKey } from '@/lib/claims'
import { announcementBarClass } from '@/lib/announcement-visibility'

interface HeaderProps {
  menuItems: MenuItem[]
  /** Complete live collection-handle set for nav reconciliation (DEV-NAV-01). */
  collections: { handle: string }[]
  /** Tag-derived L2 subcategory tree (nav remediation) — empty array degrades
   *  every dropdown to a flat tile, same as before this prop existed. */
  l2Nodes: L2Node[]
}

/** Cap on how many tag-derived subcategories a header dropdown cell shows
 *  before pointing shoppers to the full list on the category page itself
 *  (the footer link list + CategoryTabs already show everything).
 *
 * 3, not 4 (2026-08-25 visual verification): with nearly every one of the 25
 * L1 cells now carrying children (nav remediation — previously only one
 * outlier did), a 4-deep cap measured ~1270px tall in the live desktop
 * panel against a ~790px available viewport height even after fixing the
 * `col-start-1` 2-column-grid regression below. 3 brings the common case
 * much closer to fitting; the panel's own max-height/overflow-y-auto (below)
 * is the guaranteed fallback for whatever doesn't. */
const MAX_DROPDOWN_CHILDREN = 3

const ANNOUNCEMENTS = [
  'Serving facilities, organizations & individual customers',
  'Ordering support for clinics, pharmacies & care teams',
  'Shop medical supplies by category, brand, or industry',
]

// Top-bar claims are gated on the approved-claims register (lib/claims.ts).
// All four are BLOCKED pending written client evidence (plan §2.1 /
// IZ-PROD-09), so the stats bars render nothing today rather than showing an
// unsourced number. Approving a claim there brings its tile back automatically.
const STAT_ICONS: Record<ClaimKey, LucideIcon> = {
  facilitiesServed: Building2,
  orderAccuracy: ShieldCheck,
  shippingSpeed: Truck,
  productCount: Package,
}

const STATS = approvedClaims(['facilitiesServed', 'orderAccuracy', 'shippingSpeed', 'productCount'])
  .map(({ key, claim }) => ({
    label: claim.text,
    sublabel: claim.label ?? '',
    icon: STAT_ICONS[key],
  }))

function titleToSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// Focusable elements inside the mobile drawer, for the focus trap (NF9).
const FOCUSABLE = 'a[href], button:not([disabled])'

export function Header({ menuItems, collections, l2Nodes }: HeaderProps) {
  // usePathname() is populated during SSR too, so the announcement bar's
  // visibility class resolves identically on the server and the client — no
  // post-hydration flash of a bar that is about to disappear.
  const pathname = usePathname()
  const { cart, openCart } = useCart()
  const cartCount = cart?.totalQuantity ?? 0
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [openNav, setOpenNav] = useState<string | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hamburgerRef = useRef<HTMLButtonElement>(null)
  const drawerRef = useRef<HTMLDivElement>(null)
  const [msgIdx, setMsgIdx] = useState(0)
  const [annPaused, setAnnPaused] = useState(false)
  const [annVisible, setAnnVisible] = useState(true)

  useEffect(() => {
    if (annPaused) return
    const id = setInterval(() => {
      setAnnVisible(false)
      const t = setTimeout(() => {
        setMsgIdx(i => (i + 1) % ANNOUNCEMENTS.length)
        setAnnVisible(true)
      }, 300)
      return () => clearTimeout(t)
    }, 4000)
    return () => clearInterval(id)
  }, [annPaused])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenNav(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Mobile drawer a11y (NF9): while open, lock body scroll, move focus into
  // the drawer, trap Tab inside it, and close on Escape with focus returned
  // to the hamburger button.
  useEffect(() => {
    if (!mobileOpen) return
    const drawer = drawerRef.current
    if (!drawer) return

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    drawer.querySelector<HTMLElement>(FOCUSABLE)?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileOpen(false)
        hamburgerRef.current?.focus()
        return
      }
      if (e.key !== 'Tab') return
      const focusables = Array.from(drawer.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement
      if (e.shiftKey && (active === first || !drawer.contains(active))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (active === last || !drawer.contains(active))) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [mobileOpen])

  const openDropdown = (key: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setOpenNav(key)
  }

  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => setOpenNav(null), 150)
  }

  // Keyboard support for the desktop disclosure wrappers (NF8): open while
  // focus is anywhere inside (focus-within), close when it leaves, Escape
  // closes and returns focus to the item's trigger button.
  const onNavBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpenNav(null)
  }
  const onNavKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Escape') return
    setOpenNav(null)
    e.currentTarget.querySelector<HTMLButtonElement>('button[aria-haspopup]')?.focus()
  }

  const openSearch = () => setSearchOpen(true)

  const categoriesItem = menuItems.find((item) => item.type === 'CATALOG')
  const otherItems = menuItems.filter((item) => item.type !== 'CATALOG')
  const categoryNav = buildCategoryTreeNav(collections)

  // NF11: menu hrefs are slugified from Shopify menu TITLES with no guarantee
  // the slug is a real collection handle. Reconcile against the live handle
  // list (already in props) and fail closed to /categories instead of
  // shipping a sitewide 404. Skipped when the collections fetch failed
  // (empty list) — degrading every link would be worse than the risk.
  //
  // DEV-NAV-01: the reviewed registry wins over the live-list check. A
  // registry L1 is a validated canonical route, so it must never degrade to
  // /categories — that regression is exactly what sent Needles/Syringes to
  // the generic page when the live list was truncated.
  const validHandles = new Set(collections.map((c) => c.handle))
  const registryHandles = new Set(CATEGORY_TREE_L1.map((c) => c.collectionHandle))
  const categoryHref = (title: string) => {
    const slug = titleToSlug(title)
    if (registryHandles.has(slug)) return ROUTES.category(slug)
    if (validHandles.size > 0 && !validHandles.has(slug)) return ROUTES.categories
    return ROUTES.category(slug)
  }
  const menuItemHref = (item: MenuItem): string => {
    if (item.type === 'CATALOG') return ROUTES.categories
    if (item.title === 'OCC') return ROUTES.solutions.occ
    return categoryHref(item.title)
  }

  // Nav-dropdown children per L1, keyed by the PARENT's nav href so a nav
  // entry can render its own children without re-deriving the registry.
  // Featured subcategories (curated, route-owning — e.g. Trocars) fill first,
  // then remaining slots are backfilled with the top tag-derived L2
  // subcategories (nav remediation) so every category — not just the one
  // with a featured child — gets real nested links.
  const childrenByParentHref = new Map<string, { displayName: string; href: string }[]>()
  for (const l1 of CATEGORY_TREE_L1) {
    const parentHref = ROUTES.category(getCategorySlug(l1))
    const featuredChildren = FEATURED_SUBCATEGORIES
      .filter((sub) => sub.parentTag === l1.tag)
      // Same fail-closed rule the rest of the nav uses: skip when the live
      // handle list is available and does not contain this collection.
      .filter((sub) => validHandles.size === 0 || validHandles.has(sub.collectionHandle))
      .map((sub) => ({ displayName: sub.displayName, href: ROUTES.category(sub.slug) }))

    const remainingSlots = MAX_DROPDOWN_CHILDREN - featuredChildren.length
    const tagChildren = remainingSlots > 0
      ? getTopSubcategoriesForParent(l1.tag, l2Nodes, remainingSlots).map((n) => ({
          displayName: humanizeTag(n.tag),
          href: ROUTES.subcategory(getCategorySlug(l1), n.tag),
        }))
      : []

    const children = [...featuredChildren, ...tagChildren]
    if (children.length > 0) childrenByParentHref.set(parentHref, children)
  }
  const navChildren = (parentHref: string) => childrenByParentHref.get(parentHref) ?? []

  // Registry order — every category can now carry its own children inline
  // (nav remediation), so the "push the one tall cell to the end" special
  // case built for the single pre-existing Surgery & Procedure/Trocars
  // outlier no longer applies to a general N-children-per-cell layout.
  const primaryDesktopOrder = categoryNav.primary

  return (
    <header className="sticky top-0 z-40">
      {/* 1 — Announcement bar */}
      <div
        className={`bg-navy-900 h-13.5 items-center ${announcementBarClass(pathname)}`}
        onMouseEnter={() => setAnnPaused(true)}
        onMouseLeave={() => setAnnPaused(false)}
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="max-w-360 mx-auto px-4 md:px-8 w-full flex items-center justify-center gap-4">
          <span
            className={`text-white text-sm font-medium text-center transition-opacity duration-300 ${annVisible ? 'opacity-100' : 'opacity-0'}`}
          >
            {ANNOUNCEMENTS[msgIdx]}
          </span>
          <div className="hidden sm:flex items-center gap-1.5">
            {ANNOUNCEMENTS.map((_, i) => (
              <span
                key={i}
                className={`rounded-full bg-white transition-all duration-300 ${i === msgIdx ? 'w-5 h-1.5' : 'w-1.5 h-1.5 opacity-40'}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 2 — Stats bar (only when claims are approved; see lib/claims.ts) */}
      {STATS.length > 0 && (
        <div className="hidden md:flex bg-neutral-50 border-b border-blue-50 h-11.5 items-center">
          <div className="max-w-360 mx-auto px-8 w-full flex items-center justify-center gap-12 lg:gap-16">
            {STATS.map(({ label, sublabel, icon: Icon }) => (
              <div key={sublabel} className="flex items-center gap-2 text-sm text-navy-900">
                <Icon size={18} className="text-teal-500 shrink-0" />
                <span>
                  <strong className="font-bold">{label}</strong>{' '}
                  <span className="text-gray-500">{sublabel}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3 — Main nav */}
      <nav className="bg-white border-b border-blue-50 h-18 flex items-center relative">
        <div className="max-w-360 mx-auto px-4 md:px-8 w-full flex items-center gap-4">
          {/* Logo */}
          <Link href="/" className="shrink-0">
            {/* h-8 below sm: at 320px the 40px-tall logo renders 168px wide,
                which with the 150px actions cluster and 32px of gutters made
                the header 350px in a 320px viewport — horizontal page scroll on
                every route, including ones with no other wide content. */}
            <Image src={LOGO_PATH} alt="MDSupplies" width={420} height={100} className="h-8 sm:h-10 w-auto object-contain" />
          </Link>

          {/* Desktop nav links — shown only at xl where all items fit without
              overflowing onto the actions column (see hamburger below xl).
              Dropdown panels are ALWAYS rendered and toggled with CSS (NF7):
              submenu /category/ links must exist in the server HTML so the
              sitewide nav passes internal-link equity to category pages. */}
          <div className="hidden xl:flex flex-1 min-w-0 items-center justify-center gap-5 lg:gap-6">

            {/* Categories — mega-dropdown */}
            {categoriesItem && (
              <div
                className="relative"
                onMouseEnter={() => openDropdown('categories')}
                onMouseLeave={scheduleClose}
                onFocus={() => openDropdown('categories')}
                onBlur={onNavBlur}
                onKeyDown={onNavKeyDown}
              >
                <div className="flex items-center gap-0.5 py-6">
                  <Link
                    href={ROUTES.categories}
                    className="text-gray-500 text-sm hover:text-navy-900 transition-colors whitespace-nowrap"
                  >
                    {categoriesItem.title}
                  </Link>
                  <button
                    type="button"
                    aria-haspopup="true"
                    aria-expanded={openNav === 'categories'}
                    aria-controls="nav-panel-categories"
                    aria-label={`${categoriesItem.title} submenu`}
                    onClick={() => (openNav === 'categories' ? setOpenNav(null) : openDropdown('categories'))}
                    className="text-gray-500 hover:text-navy-900 transition-colors"
                  >
                    <ChevronDown
                      size={12}
                      className={`mt-0.5 opacity-60 transition-transform duration-150 ${openNav === 'categories' ? 'rotate-180' : ''}`}
                    />
                  </button>
                </div>

                <div
                  id="nav-panel-categories"
                  // 680 -> 800, and anchored to the trigger instead of centred.
                  // At 680 the four inner columns were ~150px, narrower than the
                  // longest approved labels ("Housekeeping & Janitorial" needs
                  // 155px + padding), so they truncated mid-word. Widening alone
                  // was not available while the panel was centred with
                  // `left-1/2 -translate-x-1/2`: at 760 it already reached within
                  // 8px of the viewport's left edge, so anything wider clipped
                  // off-screen. `left-0` hangs it from the "Categories" trigger,
                  // which both buys the width and reads as deliberate alignment
                  // rather than a panel drifting far to the left of its opener.
                  //
                  // max-h-[80vh] + overflow-y-auto (2026-08-25, nav
                  // remediation): with nearly every L1 category now carrying
                  // nested children instead of just one outlier, the panel's
                  // natural content height comfortably exceeds common laptop
                  // viewport heights (measured ~1270px tall against a
                  // ~790px-available 1440x900 window before this was added).
                  // A shorter MAX_DROPDOWN_CHILDREN cap (above) shrinks the
                  // common case, but this is the guaranteed fallback — the
                  // panel scrolls internally rather than clipping content
                  // off-screen with no way to reach it, which is what an
                  // un-capped absolute-positioned panel does by default.
                  className={`${openNav === 'categories' ? 'block' : 'hidden'} absolute top-full left-0 mt-0 w-[800px] max-h-[80vh] overflow-y-auto bg-white border border-gray-200 shadow-lg z-50 p-6`}
                  onMouseEnter={() => openDropdown('categories')}
                  onMouseLeave={scheduleClose}
                >
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-[11px] font-bold text-navy-900 tracking-widest uppercase mb-3">
                        Categories
                      </p>
                      {/* One cell per category. A category with subcategories
                          (featured and/or tag-derived, nav remediation)
                          renders them INSIDE its own cell, so the
                          parent/child relationship is structural (a nested
                          <ul> under the parent link) rather than implied by a
                          detached badge at the foot of the panel.
                          NOT forcing a `col-start-1` new-row on childed cells
                          anymore (2026-08-25): that hack was built for the
                          single Surgery & Procedure/Trocars outlier, when
                          every OTHER cell was a single short line — forcing
                          the one tall cell to start a fresh row kept the grid
                          honest. Now that most cells carry children, applying
                          the same rule to nearly every <li> forced nearly
                          every row to hold only one item, silently collapsing
                          the 2-column grid into a de-facto single column and
                          roughly doubling the panel's height. Plain grid
                          auto-flow (row-major, 2 columns) packs cells
                          normally again; the trade-off is a short cell can
                          sit beside a tall one, which reads as ordinary
                          uneven list rows rather than a stray blank tile.
                          `items-start` keeps neighbours top-aligned in a row
                          rather than centring them against its height. */}
                      <ul className="grid grid-cols-2 items-start gap-x-3 gap-y-0.5 list-none m-0 p-0">
                        {primaryDesktopOrder.map((cat) => {
                          const children = navChildren(cat.href)
                          return (
                            <li key={cat.href}>
                              <Link
                                href={cat.href}
                                className="block text-[13px] leading-snug text-gray-500 hover:text-navy-900 hover:bg-neutral-50 px-2 py-1.5 rounded transition-colors"
                              >
                                {cat.displayName}
                              </Link>
                              {children.length > 0 && (
                                <ul className="list-none m-0 mt-0.5 mb-1 p-0 pl-2.5 ml-2 border-l border-gray-200">
                                  {children.map((child) => (
                                    <li key={child.href}>
                                      <Link
                                        href={child.href}
                                        className="block text-[13px] leading-snug text-ink-link hover:text-navy-900 hover:bg-neutral-50 px-2 py-1.5 rounded transition-colors"
                                      >
                                        {child.displayName}
                                      </Link>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-navy-900 tracking-widest uppercase mb-3">
                        More Categories
                      </p>
                      {/* `truncate` dropped here too: at this column width it
                          was clipping real labels mid-word ("Housekeeping &
                          Jani…", "Patient Therapy & Re…"), which is worse than
                          a second line. Wrapping keeps every destination
                          readable. Same nested-<ul> structure as the primary
                          column (nav remediation) — "More" categories (e.g.
                          Home Care) get their own tag-derived children too,
                          not just the primary group. */}
                      <ul className="grid grid-cols-2 items-start gap-x-3 gap-y-0.5 list-none m-0 p-0">
                        {categoryNav.more.map((cat) => {
                          const children = navChildren(cat.href)
                          return (
                            <li key={cat.href}>
                              <Link
                                href={cat.href}
                                className="block text-[13px] leading-snug text-gray-500 hover:text-navy-900 hover:bg-neutral-50 px-2 py-1.5 rounded transition-colors"
                              >
                                {cat.displayName}
                              </Link>
                              {children.length > 0 && (
                                <ul className="list-none m-0 mt-0.5 mb-1 p-0 pl-2.5 ml-2 border-l border-gray-200">
                                  {children.map((child) => (
                                    <li key={child.href}>
                                      <Link
                                        href={child.href}
                                        className="block text-[13px] leading-snug text-ink-link hover:text-navy-900 hover:bg-neutral-50 px-2 py-1.5 rounded transition-colors"
                                      >
                                        {child.displayName}
                                      </Link>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <Link
                      href={ROUTES.categories}
                      className="text-[13px] text-teal-500 font-semibold hover:text-ink-link transition-colors"
                    >
                      Browse all categories →
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Other nav items */}
            {otherItems.map((item) => {
              const href = menuItemHref(item)
              const isOpen = openNav === item.id
              const hasSubs = item.items.length > 0
              const panelId = `nav-panel-${titleToSlug(item.title)}`

              if (!hasSubs) {
                return (
                  <Link
                    key={item.id}
                    href={href}
                    className="text-gray-500 text-sm hover:text-navy-900 transition-colors whitespace-nowrap"
                  >
                    {item.title}
                  </Link>
                )
              }

              return (
                <div
                  key={item.id}
                  className="relative"
                  onMouseEnter={() => openDropdown(item.id)}
                  onMouseLeave={scheduleClose}
                  onFocus={() => openDropdown(item.id)}
                  onBlur={onNavBlur}
                  onKeyDown={onNavKeyDown}
                >
                  <div className="flex items-center gap-0.5 py-6">
                    <Link
                      href={href}
                      className="text-gray-500 text-sm hover:text-navy-900 transition-colors whitespace-nowrap"
                    >
                      {item.title}
                    </Link>
                    <button
                      type="button"
                      aria-haspopup="true"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      aria-label={`${item.title} submenu`}
                      onClick={() => (isOpen ? setOpenNav(null) : openDropdown(item.id))}
                      className="text-gray-500 hover:text-navy-900 transition-colors"
                    >
                      <ChevronDown
                        size={12}
                        className={`mt-0.5 opacity-60 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                  </div>

                  <div
                    id={panelId}
                    className={`${isOpen ? 'block' : 'hidden'} absolute top-full left-0 mt-0 w-[220px] bg-white border border-gray-200 shadow-lg z-50 py-2`}
                    onMouseEnter={() => openDropdown(item.id)}
                    onMouseLeave={scheduleClose}
                  >
                    <Link
                      href={href}
                      className="block px-4 py-2 text-[13px] font-semibold text-navy-900 hover:bg-neutral-50 transition-colors"
                    >
                      All {item.title}
                    </Link>
                    <div className="border-t border-gray-100 my-1" />
                    {item.items.map((sub) => (
                      <Link
                        key={sub.id}
                        href={categoryHref(sub.title)}
                        className="block px-4 py-2 text-[13px] text-gray-500 hover:text-navy-900 hover:bg-neutral-50 transition-colors"
                      >
                        {sub.title}
                      </Link>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Right actions */}
          <div className="flex items-center justify-end gap-3 shrink-0 ml-auto">
            <Link
              href={ROUTES.contact}
              className="hidden sm:flex bg-teal-500 text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-[#00566f] transition-colors"
            >
              Contact Us
            </Link>

            <button
              type="button"
              aria-label="Search"
              onClick={openSearch}
              className="text-gray-500 hover:text-navy-900 transition-colors p-1"
            >
              <Search size={20} />
            </button>

            <Link
              href={ROUTES.account}
              aria-label="Account"
              className="text-gray-500 hover:text-navy-900 transition-colors p-1"
            >
              <User size={20} />
            </Link>

            <button
              type="button"
              aria-label={`Cart (${cartCount} items)`}
              onClick={openCart}
              className="relative text-gray-500 hover:text-navy-900 transition-colors p-1"
            >
              <ShoppingCart size={20} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-teal-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </button>

            <button
              ref={hamburgerRef}
              type="button"
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
              className="xl:hidden text-gray-500 hover:text-navy-900 transition-colors p-1"
              onClick={() => setMobileOpen((v) => !v)}
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile drawer — always in the DOM (CSS-toggled) so its links are
            crawlable too; interactive behavior (trap/lock/Escape) only runs
            while open. */}
        <div
          ref={drawerRef}
          id="mobile-menu"
          className={`${mobileOpen ? 'block' : 'hidden'} xl:hidden absolute top-full left-0 right-0 bg-white border-b border-blue-50 shadow-lg z-50 max-h-[80vh] overflow-y-auto`}
        >
          {STATS.length > 0 && (
            <div className="grid grid-cols-2 gap-2 px-4 py-3 bg-neutral-50 border-b border-blue-50">
              {STATS.map(({ label, sublabel, icon: Icon }) => (
                <div key={sublabel} className="flex items-center gap-1.5 text-xs text-navy-900">
                  <Icon size={14} className="text-teal-500 shrink-0" />
                  <span><strong>{label}</strong> {sublabel}</span>
                </div>
              ))}
            </div>
          )}

          <nav className="px-4 py-3 flex flex-col gap-1">
            {/* Categories mobile */}
            {categoriesItem && (
              <div>
                <button
                  onClick={() => setMobileExpanded((v) => v === 'categories' ? null : 'categories')}
                  aria-expanded={mobileExpanded === 'categories'}
                  aria-controls="mobile-panel-categories"
                  className="w-full text-gray-500 text-sm py-2.5 border-b border-gray-200 flex items-center justify-between hover:text-navy-900 transition-colors"
                >
                  {categoriesItem.title}
                  <ChevronDown
                    size={14}
                    className={`opacity-50 transition-transform duration-150 ${mobileExpanded === 'categories' ? 'rotate-180' : ''}`}
                  />
                </button>
                <div
                  id="mobile-panel-categories"
                  className={`${mobileExpanded === 'categories' ? 'flex' : 'hidden'} py-2 pl-4 flex-col gap-0.5`}
                >
                  {/* Same nesting as the desktop panel: a featured subcategory
                      is indented directly beneath its parent, not appended as a
                      detached badge after the whole primary list. */}
                  {categoryNav.primary.map((cat) => {
                    const children = navChildren(cat.href)
                    if (children.length === 0) {
                      return (
                        <Link
                          key={cat.href}
                          href={cat.href}
                          onClick={() => setMobileOpen(false)}
                          className="text-gray-500 text-sm py-1.5 hover:text-navy-900 transition-colors"
                        >
                          {cat.displayName}
                        </Link>
                      )
                    }
                    return (
                      <div key={cat.href} className="flex flex-col">
                        <Link
                          href={cat.href}
                          onClick={() => setMobileOpen(false)}
                          className="text-gray-500 text-sm py-1.5 hover:text-navy-900 transition-colors"
                        >
                          {cat.displayName}
                        </Link>
                        <ul className="list-none m-0 p-0 pl-3 ml-1 border-l border-gray-200 flex flex-col">
                          {children.map((child) => (
                            <li key={child.href}>
                              <Link
                                href={child.href}
                                onClick={() => setMobileOpen(false)}
                                className="block text-ink-link text-sm py-1.5 hover:text-navy-900 transition-colors"
                              >
                                {child.displayName}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  })}
                  {categoryNav.more.map((cat) => {
                    const children = navChildren(cat.href)
                    if (children.length === 0) {
                      return (
                        <Link
                          key={cat.href}
                          href={cat.href}
                          onClick={() => setMobileOpen(false)}
                          className="text-gray-500 text-sm py-1.5 hover:text-navy-900 transition-colors"
                        >
                          {cat.displayName}
                        </Link>
                      )
                    }
                    return (
                      <div key={cat.href} className="flex flex-col">
                        <Link
                          href={cat.href}
                          onClick={() => setMobileOpen(false)}
                          className="text-gray-500 text-sm py-1.5 hover:text-navy-900 transition-colors"
                        >
                          {cat.displayName}
                        </Link>
                        <ul className="list-none m-0 p-0 pl-3 ml-1 border-l border-gray-200 flex flex-col">
                          {children.map((child) => (
                            <li key={child.href}>
                              <Link
                                href={child.href}
                                onClick={() => setMobileOpen(false)}
                                className="block text-ink-link text-sm py-1.5 hover:text-navy-900 transition-colors"
                              >
                                {child.displayName}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  })}
                  <Link
                    href={ROUTES.categories}
                    onClick={() => setMobileOpen(false)}
                    className="text-teal-500 text-sm py-1.5 font-semibold"
                  >
                    All categories →
                  </Link>
                </div>
              </div>
            )}

            {/* Other nav items mobile */}
            {otherItems.map((item) => {
              const href = menuItemHref(item)
              const hasSubs = item.items.length > 0
              const panelId = `mobile-panel-${titleToSlug(item.title)}`

              if (!hasSubs) {
                return (
                  <Link
                    key={item.id}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className="text-gray-500 text-sm py-2.5 border-b border-gray-200 hover:text-navy-900 transition-colors"
                  >
                    {item.title}
                  </Link>
                )
              }

              return (
                <div key={item.id}>
                  <button
                    onClick={() => setMobileExpanded((v) => v === item.id ? null : item.id)}
                    aria-expanded={mobileExpanded === item.id}
                    aria-controls={panelId}
                    className="w-full text-gray-500 text-sm py-2.5 border-b border-gray-200 flex items-center justify-between hover:text-navy-900 transition-colors"
                  >
                    {item.title}
                    <ChevronDown
                      size={14}
                      className={`opacity-50 transition-transform duration-150 ${mobileExpanded === item.id ? 'rotate-180' : ''}`}
                    />
                  </button>
                  <div
                    id={panelId}
                    className={`${mobileExpanded === item.id ? 'flex' : 'hidden'} py-2 pl-4 flex-col gap-0.5`}
                  >
                    <Link
                      href={href}
                      onClick={() => setMobileOpen(false)}
                      className="text-navy-900 text-sm py-1.5 font-semibold hover:text-teal-500 transition-colors"
                    >
                      All {item.title}
                    </Link>
                    {item.items.map((sub) => (
                      <Link
                        key={sub.id}
                        href={categoryHref(sub.title)}
                        onClick={() => setMobileOpen(false)}
                        className="text-gray-500 text-sm py-1.5 hover:text-navy-900 transition-colors"
                      >
                        {sub.title}
                      </Link>
                    ))}
                  </div>
                </div>
              )
            })}

            <Link
              href={ROUTES.contact}
              onClick={() => setMobileOpen(false)}
              className="mt-3 bg-teal-500 text-white text-sm font-semibold px-5 py-3 rounded-full text-center hover:bg-[#00566f] transition-colors"
            >
              Contact Us
            </Link>
          </nav>
        </div>
      </nav>

      {/* Search overlay with predictive dropdown */}
      {searchOpen && (
        <SearchDropdown onClose={() => setSearchOpen(false)} />
      )}
    </header>
  )
}
