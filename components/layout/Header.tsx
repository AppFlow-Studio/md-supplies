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
import type { MenuItem } from '@/lib/shopify/types'

interface HeaderProps {
  menuItems: MenuItem[]
}

const STATS = [
  { label: '12,000+', sublabel: 'Facilities', icon: Building2 },
  { label: '99.8%', sublabel: 'Order Accuracy', icon: ShieldCheck },
  { label: 'Fast', sublabel: 'Shipping', icon: Truck },
  { label: '50,000+', sublabel: 'Products', icon: Package },
]

function titleToSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function menuItemHref(item: MenuItem): string {
  if (item.type === 'CATALOG') return ROUTES.categories
  if (item.title === 'OCC') return ROUTES.solutions.occ
  return ROUTES.category(titleToSlug(item.title))
}

export function Header({ menuItems }: HeaderProps) {
  const { cart, openCart } = useCart()
  const cartCount = cart?.totalQuantity ?? 0
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [openNav, setOpenNav] = useState<string | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  const openSearch = () => setSearchOpen(true)

  const categoriesItem = menuItems.find((item) => item.type === 'CATALOG')
  const otherItems = menuItems.filter((item) => item.type !== 'CATALOG')

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
        <div className="max-w-360 mx-auto px-4 md:px-8 w-full grid grid-cols-[auto_1fr_auto] md:grid-cols-3 items-center gap-4">
          {/* Logo */}
          <Link href="/">
            <Image src={'/images/logo.avif'} alt='logo' width={500} height={500} className='w-fit h-10 object-contain'/>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center justify-center gap-5 lg:gap-6">

            {/* Categories — mega-dropdown */}
            {categoriesItem && (
              <div
                className="relative"
                onMouseEnter={() => openDropdown('categories')}
                onMouseLeave={scheduleClose}
              >
                <Link
                  href={ROUTES.categories}
                  className="text-gray-500 text-sm hover:text-navy-900 transition-colors flex items-center gap-0.5 whitespace-nowrap py-6"
                >
                  {categoriesItem.title}
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
                      {categoriesItem.items.map((col) => (
                        <Link
                          key={col.id}
                          href={ROUTES.category(titleToSlug(col.title))}
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
            )}

            {/* Other nav items */}
            {otherItems.map((item) => {
              const href = menuItemHref(item)
              const isOpen = openNav === item.id
              const hasSubs = item.items.length > 0

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
                >
                  <Link
                    href={href}
                    className="text-gray-500 text-sm hover:text-navy-900 transition-colors flex items-center gap-0.5 whitespace-nowrap py-6"
                  >
                    {item.title}
                    <ChevronDown
                      size={12}
                      className={`mt-0.5 opacity-60 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </Link>

                  {isOpen && (
                    <div
                      className="absolute top-full left-0 mt-0 w-[220px] bg-white border border-gray-200 shadow-lg z-50 py-2"
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
                          href={ROUTES.subcategory(titleToSlug(item.title), titleToSlug(sub.title))}
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
              {categoriesItem && (
                <div>
                  <button
                    onClick={() => setMobileExpanded((v) => v === 'categories' ? null : 'categories')}
                    className="w-full text-gray-500 text-sm py-2.5 border-b border-gray-200 flex items-center justify-between hover:text-navy-900 transition-colors"
                  >
                    {categoriesItem.title}
                    <ChevronDown
                      size={14}
                      className={`opacity-50 transition-transform duration-150 ${mobileExpanded === 'categories' ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {mobileExpanded === 'categories' && (
                    <div className="py-2 pl-4 flex flex-col gap-0.5">
                      {categoriesItem.items.map((col) => (
                        <Link
                          key={col.id}
                          href={ROUTES.category(titleToSlug(col.title))}
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
              )}

              {/* Other nav items mobile */}
              {otherItems.map((item) => {
                const href = menuItemHref(item)
                const hasSubs = item.items.length > 0

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
                      className="w-full text-gray-500 text-sm py-2.5 border-b border-gray-200 flex items-center justify-between hover:text-navy-900 transition-colors"
                    >
                      {item.title}
                      <ChevronDown
                        size={14}
                        className={`opacity-50 transition-transform duration-150 ${mobileExpanded === item.id ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {mobileExpanded === item.id && (
                      <div className="py-2 pl-4 flex flex-col gap-0.5">
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
                            href={ROUTES.subcategory(titleToSlug(item.title), titleToSlug(sub.title))}
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

      {/* Search overlay with predictive dropdown */}
      {searchOpen && (
        <SearchDropdown onClose={() => setSearchOpen(false)} />
      )}
    </header>
  )
}
