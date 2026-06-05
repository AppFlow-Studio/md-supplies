'use client'

import Link from 'next/link'
import { useState, useRef, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import {
  ShieldCheck, Truck, Package, ChevronDown,
  Search, User, ShoppingCart, Menu, X,
} from 'lucide-react'
import { useCart } from '@/components/store/CartProvider'
import Image from 'next/image'

const NAV_ITEMS = [
  { label: 'Categories', href: '#', hasDropdown: true },
  { label: 'OCC', href: '#' },
  { label: 'Home Care', href: '#', hasDropdown: true },
  { label: 'Mobility', href: '#', hasDropdown: true },
  { label: 'Needles/Syringes', href: '#', hasDropdown: true },
  { label: 'Testing', href: '#', hasDropdown: true },
]

const STATS = [
  { label: '99.8%', sublabel: 'Order Accuracy', icon: ShieldCheck },
  { label: 'Same-Day', sublabel: 'Shipping', icon: Truck },
  { label: '50,000+', sublabel: 'Products', icon: Package },
]

export function Header() {
  const { cart, openCart } = useCart()
  const cartCount = cart?.totalQuantity ?? 0

  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

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

  return (
    <header className="sticky top-0 z-40">
      {/* 1 — Dark announcement bar */}
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
        <div className="max-w-360 mx-auto px-8 w-full flex items-center justify-center gap-16">
          {STATS.map(({ label, sublabel, icon: Icon }) => (
            <div key={label} className="flex items-center gap-2 text-sm text-navy-900">
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
      <nav className="bg-white border-b border-blue-50 h-18 flex items-center">
        <div className="max-w-360 mx-auto px-4 md:px-8 w-full flex items-center gap-4">
          {/* Logo */}
          <Link href="/">
            <Image src={'/images/logo.avif'} alt='logo' width={500} height={500} className='w-fit h-10 object-contain'/>
          </Link>

          {/* Nav links */}
          <div className="hidden md:flex flex-1 items-center justify-center gap-5 lg:gap-6">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="text-gray-500 text-sm hover:text-navy-900 transition-colors flex items-center gap-0.5 whitespace-nowrap"
              >
                {item.label}
                {item.hasDropdown && (
                  <ChevronDown size={12} className="mt-0.5 opacity-60" />
                )}
              </Link>
            ))}
          </div>

          {/* Right actions */}
          <div className="flex items-center justify-end gap-3">
            <Link
              href="/b2b"
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
              href="/account"
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

            {/* Mobile toggle */}
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
          <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-blue-50 shadow-lg z-50">
            <div className="grid grid-cols-3 gap-2 px-4 py-3 bg-neutral-50 border-b border-blue-50">
              {STATS.map(({ label, sublabel, icon: Icon }) => (
                <div key={label} className="flex flex-col items-center text-center gap-1 text-xs text-navy-900">
                  <Icon size={16} className="text-teal-500" />
                  <span><strong>{label}</strong> {sublabel}</span>
                </div>
              ))}
            </div>
            <nav className="px-4 py-3 flex flex-col gap-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-gray-500 text-sm py-2.5 border-b border-gray-200 last:border-0 flex items-center justify-between hover:text-navy-900 transition-colors"
                >
                  {item.label}
                  {item.hasDropdown && <ChevronDown size={14} className="opacity-50" />}
                </Link>
              ))}
              <Link
                href="/b2b"
                onClick={() => setMobileOpen(false)}
                className="mt-3 bg-teal-500 text-white text-sm font-semibold px-5 py-3 rounded-full text-center hover:bg-[#006d92] transition-colors"
              >
                Get B2B Quote
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
            <form
              onSubmit={handleSearchSubmit}
              className="max-w-360 mx-auto flex gap-3"
            >
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
