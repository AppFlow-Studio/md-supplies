'use client'

import Link from 'next/link'
import { useState, useRef, useEffect, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import {
  ShieldCheck, Truck, Package, ChevronDown,
  Search, User, ShoppingCart, Menu, X, Building2,
} from 'lucide-react'
import { useCart } from '@/components/store/CartProvider'
import { ROUTES } from '@/lib/routes'
import type { SlimCollection } from '@/lib/shopify/types'

interface HeaderProps {
  collections: SlimCollection[]
}

const STATS = [
  { label: '12,000+', sublabel: 'Facilities', icon: Building2 },
  { label: '99.8%', sublabel: 'Order Accuracy', icon: ShieldCheck },
  { label: 'Fast', sublabel: 'Shipping', icon: Truck },
  { label: '50,000+', sublabel: 'Products', icon: Package },
]

const DROPDOWN_NAV_ITEMS = [
  { label: 'Home Care', href: '/category/home-care', prefix: 'home-care' },
  { label: 'Mobility', href: '/category/mobility', prefix: 'mobility' },
  { label: 'Needles/Syringes', href: '/category/needles-syringes', prefix: 'needles-syringes' },
  { label: 'Testing', href: '/category/testing', prefix: 'testing' },
] as const

function getSubsFromCollections(collections: SlimCollection[], prefix: string): SlimCollection[] {
  const fullPrefix = `${prefix}-`
  return collections.filter((c) => c.handle.startsWith(fullPrefix))
}

export function Header({ collections }: HeaderProps) {
  const { cart, openCart } = useCart()
  const cartCount = cart?.totalQuantity ?? 0
  const router = useRouter()

  const [mobileOpen, setMobileOpen] = useState(false)
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [openNav, setOpenNav] = useState<string | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenNav(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const openDropdown = (key: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setOpenNav(key)
  }

  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => setOpenNav(null), 150)
  }

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault()
    const q = searchQuery.trim()
    if (!q) return
    router.push(`/search?q=${encodeURIComponent(q)}`)
    setSearchOpen(false)
    setSearchQuery('')
  }

  const openSearch = () => {
    setSearchOpen(true)
    setTimeout(() => searchInputRef.current?.focus(), 50)
  }

  const megaCategories = collections.slice(0, 24)

  return (
    <header className="sticky top-0 z-40">
      {/* 1 — Announcement bar */}
      <div className="bg-navy-900 h-13.5 flex items-center">
        <div className="max-w-360 mx-auto px-4 md:px-8 w-full flex items-center justify-center gap-4">
          <span className="text-white text-sm font-medium text-center">
            FREE SHIPPING on Orders $150 +
          </span>
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="w-5 h-1.5 rounded-full bg-white" />
            <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
            <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
          </div>
        </div>
      </div>

      {/* 2 — Stats bar (4 items) */}
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
        <div className="max-w-360 mx-auto px-4 md:px-8 w-full grid grid-cols-[auto_1fr_auto] md:grid-cols-3 items-center gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center shrink-0">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 2v12M2 8h12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
            <span className="font-bold text-[18px] leading-none">
              <span className="text-navy-900">MD</span>
              <span className="text-teal-500">Supplies</span>
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center justify-center gap-5 lg:gap-6">

            {/* Categories — mega-dropdown */}
            <div
              className="relative"
              onMouseEnter={() => openDropdown('categories')}
              onMouseLeave={scheduleClose}
            >
              <Link
                href={ROUTES.categories}
                className="text-gray-500 text-sm hover:text-navy-900 transition-colors flex items-center gap-0.5 whitespace-nowrap py-6"
              >
                Categories
                <ChevronDown
                  size={12}
                  className={`mt-0.5 opacity-60 transition-transform duration-150 ${openNav === 'categories' ? 'rotate-180' : ''}`}
                />
              </Link>

              {openNav === 'categories' && (
                <div
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-0 w-[680px] bg-white border border-gray-200 shadow-lg z-50 p-6"
                  onMouseEnter={() => openDropdown('categories')}
                  onMouseLeave={scheduleClose}
                >
                  <div className="grid grid-cols-4 gap-1">
                    {megaCategories.map((col) => (
                      <Link
                        key={col.handle}
                        href={ROUTES.category(col.handle)}
                        className="text-[13px] text-gray-500 hover:text-navy-900 hover:bg-neutral-50 px-2 py-1.5 rounded transition-colors truncate"
                      >
                        {col.title}
                      </Link>
                    ))}
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
              )}
            </div>

            {/* OCC — simple link */}
            <Link
              href={ROUTES.solutions.occ}
              className="text-gray-500 text-sm hover:text-navy-900 transition-colors whitespace-nowrap"
            >
              OCC
            </Link>

            {/* Subcategory dropdown items */}
            {DROPDOWN_NAV_ITEMS.map((item) => {
              const subs = getSubsFromCollections(collections, item.prefix)
              const isOpen = openNav === item.prefix

              if (subs.length === 0) {
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="text-gray-500 text-sm hover:text-navy-900 transition-colors whitespace-nowrap"
                  >
                    {item.label}
                  </Link>
                )
              }

              return (
                <div
                  key={item.label}
                  className="relative"
                  onMouseEnter={() => openDropdown(item.prefix)}
                  onMouseLeave={scheduleClose}
                >
                  <Link
                    href={item.href}
                    className="text-gray-500 text-sm hover:text-navy-900 transition-colors flex items-center gap-0.5 whitespace-nowrap py-6"
                  >
                    {item.label}
                    <ChevronDown
                      size={12}
                      className={`mt-0.5 opacity-60 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </Link>

                  {isOpen && (
                    <div
                      className="absolute top-full left-0 mt-0 w-[220px] bg-white border border-gray-200 shadow-lg z-50 py-2"
                      onMouseEnter={() => openDropdown(item.prefix)}
                      onMouseLeave={scheduleClose}
                    >
                      <Link
                        href={item.href}
                        className="block px-4 py-2 text-[13px] font-semibold text-navy-900 hover:bg-neutral-50 transition-colors"
                      >
                        All {item.label}
                      </Link>
                      <div className="border-t border-gray-100 my-1" />
                      {subs.map((sub) => (
                        <Link
                          key={sub.handle}
                          href={ROUTES.subcategory(item.prefix, sub.handle.slice(item.prefix.length + 1))}
                          className="block px-4 py-2 text-[13px] text-gray-500 hover:text-navy-900 hover:bg-neutral-50 transition-colors"
                        >
                          {sub.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Right actions */}
          <div className="flex items-center justify-end gap-3">
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
              type="button"
              aria-label="Toggle menu"
              className="md:hidden text-gray-500 hover:text-navy-900 transition-colors p-1"
              onClick={() => setMobileOpen((v) => !v)}
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-blue-50 shadow-lg z-50 max-h-[80vh] overflow-y-auto">
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
              <div>
                <button
                  onClick={() => setMobileExpanded((v) => v === 'categories' ? null : 'categories')}
                  className="w-full text-gray-500 text-sm py-2.5 border-b border-gray-200 flex items-center justify-between hover:text-navy-900 transition-colors"
                >
                  Categories
                  <ChevronDown
                    size={14}
                    className={`opacity-50 transition-transform duration-150 ${mobileExpanded === 'categories' ? 'rotate-180' : ''}`}
                  />
                </button>
                {mobileExpanded === 'categories' && (
                  <div className="py-2 pl-4 flex flex-col gap-0.5">
                    {collections.slice(0, 24).map((col) => (
                      <Link
                        key={col.handle}
                        href={ROUTES.category(col.handle)}
                        onClick={() => setMobileOpen(false)}
                        className="text-gray-500 text-sm py-1.5 hover:text-navy-900 transition-colors"
                      >
                        {col.title}
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
                )}
              </div>

              {/* OCC mobile */}
              <Link
                href={ROUTES.solutions.occ}
                onClick={() => setMobileOpen(false)}
                className="text-gray-500 text-sm py-2.5 border-b border-gray-200 hover:text-navy-900 transition-colors"
              >
                OCC
              </Link>

              {/* Subcategory dropdown items mobile */}
              {DROPDOWN_NAV_ITEMS.map((item) => {
                const subs = getSubsFromCollections(collections, item.prefix)

                if (subs.length === 0) {
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className="text-gray-500 text-sm py-2.5 border-b border-gray-200 hover:text-navy-900 transition-colors"
                    >
                      {item.label}
                    </Link>
                  )
                }

                return (
                  <div key={item.label}>
                    <button
                      onClick={() => setMobileExpanded((v) => v === item.prefix ? null : item.prefix)}
                      className="w-full text-gray-500 text-sm py-2.5 border-b border-gray-200 flex items-center justify-between hover:text-navy-900 transition-colors"
                    >
                      {item.label}
                      <ChevronDown
                        size={14}
                        className={`opacity-50 transition-transform duration-150 ${mobileExpanded === item.prefix ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {mobileExpanded === item.prefix && (
                      <div className="py-2 pl-4 flex flex-col gap-0.5">
                        <Link
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          className="text-navy-900 text-sm py-1.5 font-semibold hover:text-teal-500 transition-colors"
                        >
                          All {item.label}
                        </Link>
                        {subs.map((sub) => (
                          <Link
                            key={sub.handle}
                            href={ROUTES.subcategory(item.prefix, sub.handle.slice(item.prefix.length + 1))}
                            onClick={() => setMobileOpen(false)}
                            className="text-gray-500 text-sm py-1.5 hover:text-navy-900 transition-colors"
                          >
                            {sub.title}
                          </Link>
                        ))}
                      </div>
                    )}
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
        )}
      </nav>

      {/* Search overlay */}
      {searchOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-50"
            onClick={() => setSearchOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-md z-50 px-4 md:px-8 py-4">
            <form onSubmit={handleSearchSubmit} className="max-w-360 mx-auto flex gap-3">
              <input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products…"
                className="flex-1 h-[48px] border border-gray-200 px-4 text-[15px] text-navy-900 placeholder:text-gray-500 outline-none focus:border-navy-900 transition-colors"
              />
              <button
                type="submit"
                className="bg-navy-900 text-white h-[48px] px-6 text-[14px] font-semibold tracking-[0.28px] uppercase hover:bg-navy-950 transition-colors"
              >
                Search
              </button>
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="text-gray-500 hover:text-navy-900 transition-colors px-2"
                aria-label="Close search"
              >
                <X size={20} />
              </button>
            </form>
          </div>
        </>
      )}
    </header>
  )
}
