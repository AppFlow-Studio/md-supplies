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
import { SearchBarForm } from '@/components/search/SearchBarForm'
import Image from 'next/image'
import { ROUTES } from '@/lib/routes'
import type { MenuItem } from '@/lib/shopify/types'
import {
  CATEGORY_TREE_L1,
  getCategorySlug,
  getTopSubcategoriesForParent,
  humanizeTag,
  FEATURED_SUBCATEGORIES,
  type L2Node,
} from '@/lib/category-tree'
import { CategoryMegaMenu, type MegaMenuCategory } from '@/components/layout/CategoryMegaMenu'
import { MobileCategoryNav } from '@/components/layout/MobileCategoryNav'
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

/** Cap for the two-stage Categories mega-menu's detail panel.
 *
 * Higher than the shortcut cap above because the two surfaces have opposite
 * constraints. A shortcut dropdown is a small curated list hanging off one
 * header link and every extra row makes it taller. The mega-menu shows exactly
 * ONE department's children at a time beside a fixed-height rail, so six rows
 * cost nothing visually — the panel is still shorter than the rail beside it —
 * while a 3-item cap made the detail column look emptier than the space it
 * occupies. Departments with more than this still get a "All <department>"
 * link to the full list, which the category page's own tabs/footer render in
 * full. */
const MAX_MEGA_MENU_CHILDREN = 6

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
  // Drives the drawer/overlay reset below. usePathname() is populated during
  // SSR too, so nothing here depends on a client-only first paint.
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

  // Close every header overlay whenever the route actually changes.
  //
  // The per-link `onClick={() => setMobileOpen(false)}` handlers below only
  // cover links that carry one. The LOGO did not, so tapping it with the drawer
  // open navigated home and left the drawer mounted over the new page — and,
  // because the body-scroll lock is released by the `mobileOpen` effect's
  // cleanup, left `body { overflow: hidden }` in place too. The shopper landed
  // on a page they could not scroll with a menu they had not opened.
  //
  // Adjusted during render rather than in an effect: this is React's
  // "adjust state when a prop changes" pattern, so the reset lands in the SAME
  // commit as the route change — the drawer is never painted over the new page
  // for a frame — and it does not trip react-hooks/set-state-in-effect.
  //
  // Keyed on `pathname` (not searchParams) on purpose: catalog filter, sort and
  // pagination controls change only the query string on the SAME pathname and
  // navigate with `scroll: false` deliberately, so they must not be treated as
  // "left the page".
  const [lastPathname, setLastPathname] = useState(pathname)
  if (pathname !== lastPathname) {
    setLastPathname(pathname)
    setMobileOpen(false)
    setMobileExpanded(null)
    setSearchOpen(false)
    setOpenNav(null)
  }

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

  // The Categories mega-menu's own model: every live department, each with its
  // OWN children, resolved from the same tag-derived registry the shortcut
  // dropdowns use. Built separately from `childrenByParentHref` only because
  // the two surfaces cap children differently (see MAX_MEGA_MENU_CHILDREN) —
  // there is still exactly one source of truth for what the children ARE.
  const megaMenuCategories: MegaMenuCategory[] = CATEGORY_TREE_L1
    // Live-handle reconciliation (DEV-NAV-01), with the same fail-OPEN rule
    // `categoryHref` above already applies: when the collections fetch failed
    // and the list is empty, the reviewed registry wins and every department
    // still renders. A registry L1 is a validated canonical route, so an
    // upstream fetch failure must not empty the whole Categories menu — the
    // previous buildCategoryTreeNav-driven panel did exactly that.
    .filter((l1) => validHandles.size === 0 || validHandles.has(l1.collectionHandle))
    .map((l1) => {
      const featuredChildren = FEATURED_SUBCATEGORIES
        .filter((sub) => sub.parentTag === l1.tag)
        .filter((sub) => validHandles.size === 0 || validHandles.has(sub.collectionHandle))
        .map((sub) => ({ displayName: sub.displayName, href: ROUTES.category(sub.slug), featured: true }))
      const remainingSlots = MAX_MEGA_MENU_CHILDREN - featuredChildren.length
      const tagChildren = remainingSlots > 0
        ? getTopSubcategoriesForParent(l1.tag, l2Nodes, remainingSlots).map((n) => ({
            displayName: humanizeTag(n.tag),
            href: ROUTES.subcategory(getCategorySlug(l1), n.tag),
          }))
        : []
      return {
        tag: l1.tag,
        displayName: l1.displayName,
        href: ROUTES.category(getCategorySlug(l1)),
        children: [...featuredChildren, ...tagChildren],
      }
    })

  // Trocars & Trocar Kits is commercially important and is a SUBCATEGORY of
  // Surgery & Procedure, so under progressive disclosure it would otherwise
  // only appear once that department's panel is showing. Surfacing it in the
  // menu footer keeps it visible the moment Categories opens, in addition to
  // its badged place inside its parent's panel. Resolved from the registry
  // rather than hardcoding a URL.
  const featuredMenuLink = (() => {
    const sub = FEATURED_SUBCATEGORIES.find(
      (s) => validHandles.size === 0 || validHandles.has(s.collectionHandle),
    )
    if (!sub) return undefined
    const parent = CATEGORY_TREE_L1.find((c) => c.tag === sub.parentTag)
    return {
      displayName: sub.displayName,
      href: ROUTES.category(sub.slug),
      parentName: parent?.displayName ?? '',
    }
  })()

  return (
    <header className="sticky top-0 z-40">
      {/* 1 — Announcement bar */}
      <div
        className={`bg-navy-900 h-13.5 items-center ${announcementBarClass()}`}
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
                  // Two-stage layout (2026-08-26): a 400px department rail plus
                  // a fixed 260px detail column, ~700px wide against the old
                  // 800px, and — the point of the change — roughly 440px tall
                  // against a measured ~1270px. The old sheet rendered all 25
                  // departments AND every department's children simultaneously
                  // and needed `max-h-[80vh] overflow-y-auto` to stay on
                  // screen at all; this one fits a laptop viewport outright, so
                  // the internal scrollbar is a safety net rather than the
                  // normal experience.
                  //
                  // `left-0` still hangs the panel off the "Categories"
                  // trigger rather than centring it — see the width history
                  // that rule was written for; a centred panel could not be
                  // widened past ~760px without clipping off-screen.
                  //
                  // The detail column's fixed width is what stops the sheet
                  // resizing (and the rail sliding under the cursor) as
                  // departments with different numbers of children take turns
                  // being shown.
                  className={`${openNav === 'categories' ? 'block' : 'hidden'} absolute top-full left-0 mt-0 max-h-[80vh] overflow-y-auto bg-white border border-gray-200 shadow-lg z-50 p-6`}
                  onMouseEnter={() => openDropdown('categories')}
                  onMouseLeave={scheduleClose}
                >
                  <CategoryMegaMenu
                    categories={megaMenuCategories}
                    allHref={ROUTES.categories}
                    featuredLink={featuredMenuLink}
                  />
                </div>
              </div>
            )}

            {/* Other nav items — dropdown content is the SAME tag-derived
                tree the Categories mega-menu uses (navChildren), not this
                Shopify main-menu item's own `items` array. The main-menu
                only decides which shortcuts appear up here and in what
                order/label; whether a shortcut like Mobility gets a
                dropdown must not depend on a content editor separately
                nesting links under it in Shopify Navigation — that's the
                second, untested data source that left Mobility's dropdown
                missing here while the mega-menu's copy of it was already
                fixed (nav remediation, category-data-source-mismatch). */}
            {otherItems.map((item) => {
              const href = menuItemHref(item)
              const isOpen = openNav === item.id
              const children = navChildren(href)
              const hasSubs = children.length > 0
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
                    {children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className="block px-4 py-2 text-[13px] text-gray-500 hover:text-navy-900 hover:bg-neutral-50 transition-colors"
                      >
                        {child.displayName}
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

            {/* md+ only: below md the always-visible search row does this job,
                and keeping both put two competing search affordances in a
                header row that has ~40px of slack at 360px. */}
            <button
              type="button"
              aria-label="Search"
              onClick={openSearch}
              className="hidden md:inline-flex text-gray-500 hover:text-navy-900 transition-colors p-1"
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
                  className={`${mobileExpanded === 'categories' ? 'block' : 'hidden'} py-2 pl-4`}
                >
                  {/* Drill-down, not a wall: the old panel listed all 25
                      departments with every department's children indented
                      underneath, in one scroll. */}
                  <MobileCategoryNav
                    categories={megaMenuCategories}
                    allHref={ROUTES.categories}
                    onNavigate={() => setMobileOpen(false)}
                    resetKey={pathname}
                  />
                </div>
              </div>
            )}

            {/* Other nav items mobile — same tag-derived source as desktop
                (see the desktop "Other nav items" comment above). */}
            {otherItems.map((item) => {
              const href = menuItemHref(item)
              const children = navChildren(href)
              const hasSubs = children.length > 0
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
                    {children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={() => setMobileOpen(false)}
                        className="text-gray-500 text-sm py-1.5 hover:text-navy-900 transition-colors"
                      >
                        {child.displayName}
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

      {/* 4 — Mobile search row.
          Phones only (<md): from md up the header keeps the search ICON plus
          the predictive SearchDropdown, so desktop is untouched. Below md the
          icon alone hid the single most valuable control on a catalog site
          behind a discovery step, so the real field is on screen at all times.
          Reuses the /search page's own form component — same route, same query
          param, same wording — rather than introducing a parallel search. */}
      <div className="md:hidden bg-white border-b border-blue-50 px-4 py-2.5">
        <SearchBarForm variant="header" />
      </div>

      {/* Search overlay with predictive dropdown */}
      {searchOpen && (
        <SearchDropdown onClose={() => setSearchOpen(false)} />
      )}
    </header>
  )
}
