'use client'

import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'

import {
  ShieldCheck, Truck, Package, ChevronDown,
  Search, User, ShoppingCart, Menu, X, Building2,
} from 'lucide-react'

import { useCart } from '@/components/store/CartProvider'
import { SearchDropdown } from '@/components/layout/SearchDropdown'
import Image from 'next/image'
import { ROUTES } from '@/lib/routes'
import type { MenuItem, SlimCollection } from '@/lib/shopify/types'
import { buildCategoryNav } from '@/lib/category-nav'

interface HeaderProps {
  menuItems: MenuItem[]
  collections: SlimCollection[]
}

const ANNOUNCEMENTS = [
  'Serving facilities, organizations & individual customers',
  'Ordering support for clinics, pharmacies & care teams',
  'Shop medical supplies by category, brand, or industry',
]

const STATS = [
  { label: '12,000+', sublabel: 'Facilities', icon: Building2 },
  { label: '99.8%', sublabel: 'Order Accuracy', icon: ShieldCheck },
  { label: 'Fast', sublabel: 'Shipping', icon: Truck },
  { label: '8,000+', sublabel: 'Products', icon: Package },
]

function titleToSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// Focusable elements inside the mobile drawer, for the focus trap (NF9).
const FOCUSABLE = 'a[href], button:not([disabled])'

export function Header({ menuItems, collections }: HeaderProps) {
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
  const categoryNav = buildCategoryNav(collections)

  // NF11: menu hrefs are slugified from Shopify menu TITLES with no guarantee
  // the slug is a real collection handle. Reconcile against the live handle
  // list (already in props) and fail closed to /categories instead of
  // shipping a sitewide 404. Skipped when the collections fetch failed
  // (empty list) — degrading every link would be worse than the risk.
  const validHandles = new Set(collections.map((c) => c.handle))
  const categoryHref = (title: string) => {
    const slug = titleToSlug(title)
    if (validHandles.size > 0 && !validHandles.has(slug)) return ROUTES.categories
    return ROUTES.category(slug)
  }
  const menuItemHref = (item: MenuItem): string => {
    if (item.type === 'CATALOG') return ROUTES.categories
    if (item.title === 'OCC') return ROUTES.solutions.occ
    return categoryHref(item.title)
  }

  return (
    <header className="sticky top-0 z-40">
      {/* 1 — Announcement bar */}
      <div
        className="bg-navy-900 h-13.5 flex items-center"
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

      {/* 2 — Stats bar */}
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

      {/* 3 — Main nav */}
      <nav className="bg-white border-b border-blue-50 h-18 flex items-center relative">
        <div className="max-w-360 mx-auto px-4 md:px-8 w-full flex items-center gap-4">
          {/* Logo */}
          <Link href="/" className="shrink-0">
            <Image src={'/images/logo.avif'} alt='MDSupplies' width={500} height={500} className='w-fit h-10 object-contain'/>
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
                  className={`${openNav === 'categories' ? 'block' : 'hidden'} absolute top-full left-1/2 -translate-x-1/2 mt-0 w-[680px] bg-white border border-gray-200 shadow-lg z-50 p-6`}
                  onMouseEnter={() => openDropdown('categories')}
                  onMouseLeave={scheduleClose}
                >
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-[11px] font-bold text-navy-900 tracking-widest uppercase mb-3">
                        Categories
                      </p>
                      <div className="grid grid-cols-2 gap-1">
                        {categoryNav.primary.map((cat) => (
                          <Link
                            key={cat.href}
                            href={cat.href}
                            className="text-[13px] text-gray-500 hover:text-navy-900 hover:bg-neutral-50 px-2 py-1.5 rounded transition-colors truncate"
                          >
                            {cat.displayName}
                          </Link>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-navy-900 tracking-widest uppercase mb-3">
                        More Categories
                      </p>
                      <div className="grid grid-cols-2 gap-1">
                        {categoryNav.more.map((cat) => (
                          <Link
                            key={cat.href}
                            href={cat.href}
                            className="text-[13px] text-gray-500 hover:text-navy-900 hover:bg-neutral-50 px-2 py-1.5 rounded transition-colors truncate"
                          >
                            {cat.displayName}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <Link
                      href={ROUTES.categories}
                      className="text-[13px] text-teal-500 font-semibold hover:text-teal-600 transition-colors"
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
              className="hidden sm:flex bg-teal-500 text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-[#006d92] transition-colors"
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
          <div className="grid grid-cols-2 gap-2 px-4 py-3 bg-neutral-50 border-b border-blue-50">
            {STATS.map(({ label, sublabel, icon: Icon }) => (
              <div key={sublabel} className="flex items-center gap-1.5 text-xs text-navy-900">
                <Icon size={14} className="text-teal-500 shrink-0" />
                <span><strong>{label}</strong> {sublabel}</span>
              </div>
            ))}
          </div>

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
                  {categoryNav.primary.map((cat) => (
                    <Link
                      key={cat.href}
                      href={cat.href}
                      onClick={() => setMobileOpen(false)}
                      className="text-gray-500 text-sm py-1.5 hover:text-navy-900 transition-colors"
                    >
                      {cat.displayName}
                    </Link>
                  ))}
                  {categoryNav.more.map((cat) => (
                    <Link
                      key={cat.href}
                      href={cat.href}
                      onClick={() => setMobileOpen(false)}
                      className="text-gray-500 text-sm py-1.5 hover:text-navy-900 transition-colors"
                    >
                      {cat.displayName}
                    </Link>
                  ))}
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
              className="mt-3 bg-teal-500 text-white text-sm font-semibold px-5 py-3 rounded-full text-center hover:bg-[#006d92] transition-colors"
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
