# A3 — Categories Hub + Header/Footer/Nav + Breadcrumbs + Internal-Linking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire live Shopify collections into the header nav (mega-dropdown + subcategory dropdowns), footer category columns, and redesigned categories hub; extract a reusable Breadcrumb component; audit internal-link modules for canonical URLs.

**Architecture:** Root layout fetches slim collections once via `Promise.all` and passes the array as props to Header and Footer — no child fetches needed for nav. The categories hub page keeps its own full-collection fetch for card images. Header stays `'use client'`; Footer stays a server component.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, Shopify Storefront API (existing `storefrontFetch`), Lucide icons, `next/link`.

**Spec:** `docs/superpowers/specs/2026-06-02-a3-categories-hub-nav-design.md`

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Modify | `lib/shopify/types.ts` | Add `SlimCollection` export |
| Modify | `lib/shopify/queries/collections.ts` | Add `GET_COLLECTIONS_SLIM` query |
| Modify | `lib/shopify/storefront.ts` | Add optional 3rd `fetchOptions: RequestInit` param |
| Modify | `app/layout.tsx` | Fetch slim collections, pass to Header + Footer |
| **Create** | `components/layout/Breadcrumb.tsx` | Reusable accessible breadcrumb |
| Modify | `components/layout/Header.tsx` | 4-stat bar, live nav dropdowns (mega + subcategory) |
| Modify | `components/layout/Footer.tsx` | Dynamic TOP / MORE CATEGORIES from Shopify |
| Modify | `app/categories/page.tsx` | Redesigned hub: hero + popular strip + grid + industry |
| Modify | `app/category/[slug]/page.tsx` | Replace inline breadcrumb with `<Breadcrumb>` |
| Modify | `app/category/[slug]/[sub]/page.tsx` | Replace inline breadcrumb with `<Breadcrumb>` |
| Modify | `components/home/ShopByIndustry.tsx` | Fix duplicate-import bug; use `ROUTES.industry()` |
| Modify | `components/product/RelatedCategories.tsx` | Use `ROUTES.category()` |
| Modify | `components/home/PopularCategories.tsx` | Fix "Browse all" href to `/categories` via `ROUTES` |

---

## Task 1: Add `SlimCollection` type + `GET_COLLECTIONS_SLIM` query

**Files:**
- Modify: `lib/shopify/types.ts`
- Modify: `lib/shopify/queries/collections.ts`

- [ ] **Step 1: Add `SlimCollection` to shared types**

Open `lib/shopify/types.ts` and append at the bottom:

```ts
export type SlimCollection = {
  handle: string
  title: string
}
```

- [ ] **Step 2: Add slim query to collections queries**

Open `lib/shopify/queries/collections.ts` and append at the bottom:

```ts
export const GET_COLLECTIONS_SLIM = `#graphql
  query GetCollectionsSlim($first: Int!) {
    collections(first: $first) {
      nodes {
        handle
        title
      }
    }
  }
`
```

- [ ] **Step 3: Commit**

```bash
git add lib/shopify/types.ts lib/shopify/queries/collections.ts
git commit -m "feat(a3): add SlimCollection type + GET_COLLECTIONS_SLIM query"
```

---

## Task 2: Extend `storefrontFetch` with optional fetch options

**Files:**
- Modify: `lib/shopify/storefront.ts`

- [ ] **Step 1: Add optional third parameter**

Replace the function signature and the inner `fetch()` call. The full file becomes:

```ts
import { cookies } from 'next/headers';
import type { ShopifyResponse } from './types';

const STOREFRONT_API_URL = `https://${process.env.SHOPIFY_STORE_DOMAIN}/api/2026-04/graphql.json`;

export async function storefrontFetch<T>(
  query: string,
  variables?: Record<string, unknown>,
  fetchOptions?: RequestInit,
): Promise<T> {
  let country = 'US';
  try {
    const cookieStore = await cookies();
    country = cookieStore.get('market_country')?.value ?? 'US';
  } catch {
    // Outside a request context (e.g. generateStaticParams at build time)
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Shopify-Storefront-Access-Token': process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN!,
  };
  if (country && country !== 'US') {
    headers['Shopify-Storefront-Buyer-Country'] = country;
  }

  const res = await fetch(STOREFRONT_API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
    ...fetchOptions,
  });

  if (!res.ok) {
    throw new Error(`Storefront API HTTP ${res.status}: ${res.statusText}`);
  }

  const json: ShopifyResponse<T> = await res.json();

  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join('\n'));
  }

  return json.data;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/shopify/storefront.ts
git commit -m "feat(a3): extend storefrontFetch with optional fetchOptions param"
```

---

## Task 3: Fetch slim collections in root layout + pass to Header/Footer

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Update layout to fetch collections**

Replace the full contents of `app/layout.tsx`:

```tsx
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { Manrope } from 'next/font/google'
import './globals.css'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { CartProvider } from '@/components/store/CartProvider'
import { CartPopup } from '@/components/store/CartPopup'
import { getCart } from '@/app/actions/cart'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_LOCALIZATION } from '@/lib/shopify/queries/markets'
import { GET_COLLECTIONS_SLIM } from '@/lib/shopify/queries/collections'
import type { LocalizationData, AvailableCountry, SlimCollection } from '@/lib/shopify/types'

const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'MD Supplies',
  description: 'Medical-Grade Supplies at Wholesale Prices',
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies()
  const currentCountry = cookieStore.get('market_country')?.value ?? 'US'

  const [initialCart, localization, collectionsData] = await Promise.all([
    getCart(),
    storefrontFetch<{ localization: LocalizationData }>(GET_LOCALIZATION).catch(() => null),
    storefrontFetch<{ collections: { nodes: SlimCollection[] } }>(
      GET_COLLECTIONS_SLIM,
      { first: 50 },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { next: { revalidate: 3600 } } as any,
    ).catch(() => ({ collections: { nodes: [] as SlimCollection[] } })),
  ])

  const availableCountries: AvailableCountry[] = localization?.localization.availableCountries ?? []
  const collections: SlimCollection[] = collectionsData.collections.nodes

  return (
    <html lang="en" className={`${manrope.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <CartProvider initialCart={initialCart}>
          <Header collections={collections} />
          {children}
          <Footer
            collections={collections}
            availableCountries={availableCountries}
            currentCountry={currentCountry}
          />
          <CartPopup />
        </CartProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: errors on `Header` and `Footer` because they don't accept `collections` yet — that's expected, fixed in Tasks 4 and 5.

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "feat(a3): fetch slim collections in root layout, pass to Header/Footer"
```

---

## Task 4: Create `Breadcrumb` component

**Files:**
- Create: `components/layout/Breadcrumb.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { Fragment } from 'react'
import Link from 'next/link'

type BreadcrumbItem = { label: string; href?: string }

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center gap-2 flex-wrap text-[15px] tracking-[0.3px]">
        <li>
          <Link href="/" className="text-gray-500 hover:text-navy-900 transition-colors">
            Home
          </Link>
        </li>
        {items.map((item) => (
          <Fragment key={item.label}>
            <li aria-hidden="true" className="text-gray-500">›</li>
            <li>
              {item.href ? (
                <Link href={item.href} className="text-gray-500 hover:text-navy-900 transition-colors">
                  {item.label}
                </Link>
              ) : (
                <span aria-current="page" className="text-navy-900 font-semibold">
                  {item.label}
                </span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no new errors from this file.

- [ ] **Step 3: Commit**

```bash
git add components/layout/Breadcrumb.tsx
git commit -m "feat(a3): add reusable Breadcrumb component"
```

---

## Task 5: Update `Header` — stats, nav links, mega-dropdown, subcategory dropdowns

**Files:**
- Modify: `components/layout/Header.tsx`

- [ ] **Step 1: Replace the full file**

```tsx
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors from Header.

- [ ] **Step 3: Commit**

```bash
git add components/layout/Header.tsx
git commit -m "feat(a3): update Header — 4-stat bar, mega-dropdown Categories, subcategory dropdowns"
```

---

## Task 6: Update `Footer` — dynamic category columns from Shopify

**Files:**
- Modify: `components/layout/Footer.tsx`

- [ ] **Step 1: Replace the full file**

```tsx
import Link from 'next/link'
import { CurrencySwitcher } from './CurrencySwitcher'
import type { AvailableCountry, SlimCollection } from '@/lib/shopify/types'
import { ROUTES } from '@/lib/routes'

const COMPANY_HELP = [
  { label: 'About Us', href: ROUTES.about },
  { label: 'Blog', href: ROUTES.blog },
  { label: 'FAQ', href: ROUTES.faq },
  { label: 'Contact Us', href: ROUTES.contact },
  { label: 'Wholesale / B2B', href: '/b2b' },
  { label: 'My Account', href: ROUTES.account },
  { label: 'Order Tracking', href: '/tracking' },
  { label: 'Privacy Policy', href: ROUTES.policy('privacy') },
  { label: 'Terms of Service', href: ROUTES.policy('terms') },
  { label: 'Shipping Policy', href: ROUTES.policy('shipping') },
]

const SOCIAL = [
  {
    label: 'Facebook',
    href: '#',
    svg: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
      </svg>
    ),
  },
  {
    label: 'Instagram',
    href: '#',
    svg: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
      </svg>
    ),
  },
  {
    label: 'LinkedIn',
    href: '#',
    svg: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z" />
        <rect x="2" y="9" width="4" height="12" />
        <circle cx="4" cy="4" r="2" />
      </svg>
    ),
  },
]

interface FooterProps {
  collections: SlimCollection[]
  availableCountries?: AvailableCountry[]
  currentCountry?: string
}

export function Footer({ collections, availableCountries = [], currentCountry = 'US' }: FooterProps) {
  const topCategories = collections.slice(0, 8)
  const moreCategories = collections.slice(8, 16)

  return (
    <footer className="bg-neutral-50 border-t border-blue-50 pt-14 pb-0">
      <div className="max-w-360 mx-auto px-4 md:px-8">
        {/* Main columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand column */}
          <div className="sm:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-5">
              <div className="w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center shrink-0">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M9 2v14M2 9h14" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
              <span className="font-bold text-xl">
                <span className="text-navy-900">MD</span>
                <span className="text-teal-500">Supplies</span>
              </span>
            </Link>

            <p className="text-sm text-gray-500 leading-relaxed mb-7 max-w-sm">
              MDSupplies.com is a wholesale medical supply ecommerce company serving
              clinics, urgent care centers, HRT practices, home care agencies, and
              institutional buyers nationwide.
            </p>

            <div className="flex items-center gap-3 mb-8">
              {SOCIAL.map(({ label, svg, href }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:text-teal-500 hover:border-teal-500 transition-colors"
                >
                  {svg}
                </a>
              ))}
            </div>

            <div className="flex items-end max-w-sm">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 bg-transparent border-b border-gray-200 text-sm text-navy-900 placeholder:text-gray-200 pb-2.5 focus:outline-none focus:border-teal-500 transition-colors"
              />
              <button className="bg-navy-900 text-white text-sm font-semibold px-6 py-2.5 hover:bg-navy-950 transition-colors shrink-0">
                Subscribe
              </button>
            </div>
          </div>

          {/* Top Categories (dynamic) */}
          <div>
            <h4 className="text-[11px] font-bold text-navy-900 tracking-widest uppercase mb-5">
              Top Categories
            </h4>
            <ul className="space-y-3">
              {topCategories.map((col) => (
                <li key={col.handle}>
                  <Link
                    href={ROUTES.category(col.handle)}
                    className="text-sm text-gray-500 hover:text-teal-500 transition-colors"
                  >
                    {col.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* More Categories (dynamic) */}
          <div>
            <h4 className="text-[11px] font-bold text-navy-900 tracking-widest uppercase mb-5">
              More Categories
            </h4>
            <ul className="space-y-3">
              {moreCategories.map((col) => (
                <li key={col.handle}>
                  <Link
                    href={ROUTES.category(col.handle)}
                    className="text-sm text-gray-500 hover:text-teal-500 transition-colors"
                  >
                    {col.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company & Help (static) */}
          <div>
            <h4 className="text-[11px] font-bold text-navy-900 tracking-widest uppercase mb-5">
              Company &amp; Help
            </h4>
            <ul className="space-y-3">
              {COMPANY_HELP.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="text-sm text-gray-500 hover:text-teal-500 transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 py-5 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} MDSupplies. All rights reserved.
          </p>

          {availableCountries.length > 1 && (
            <CurrencySwitcher
              availableCountries={availableCountries}
              currentIsoCode={currentCountry}
            />
          )}

          <Link
            href="/b2b"
            className="bg-teal-500 text-white text-sm font-semibold px-7 py-3 rounded-full hover:bg-[#006d92] transition-colors"
          >
            Get 10% OFF
          </Link>
        </div>
      </div>
    </footer>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/layout/Footer.tsx
git commit -m "feat(a3): wire Footer category columns to Shopify collections API"
```

---

## Task 7: Redesign `/categories` hub page

**Files:**
- Modify: `app/categories/page.tsx`

- [ ] **Step 1: Replace the full file**

```tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_COLLECTIONS } from '@/lib/shopify/queries/collections'
import { ROUTES } from '@/lib/routes'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { ShopByIndustry } from '@/components/home/ShopByIndustry'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'All Medical Supply Categories | MD Supplies',
  description: 'Browse all medical supply categories at wholesale prices — gloves, wound care, needles, IV therapy, and more. Serving clinics, urgent care, and B2B buyers.',
}

type CollectionNode = {
  id: string
  handle: string
  title: string
  description: string
  image: { url: string; altText: string | null } | null
}

export default async function CategoriesPage() {
  let collections: CollectionNode[] = []
  try {
    const data = await storefrontFetch<{ collections: { nodes: CollectionNode[] } }>(
      GET_COLLECTIONS,
      { first: 250 },
    )
    collections = data.collections.nodes
  } catch {
    // degrade gracefully — render empty state
  }

  const popularCollections = collections.slice(0, 8)

  return (
    <main className="bg-[#f9fafc] min-h-screen">
      {/* Breadcrumb */}
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-5">
        <Breadcrumb items={[{ label: 'All Categories' }]} />
      </div>

      {/* Hero */}
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 pb-10">
        <h1 className="text-navy-900 text-[32px] sm:text-[40px] font-bold leading-tight mb-3">
          All Medical Supply Categories
        </h1>
        <p className="text-gray-500 text-[16px] max-w-2xl leading-relaxed">
          Browse our complete catalog of wholesale medical supplies — from gloves to IV therapy,
          organized for fast ordering. Trusted by clinics, urgent care centers, and B2B buyers nationwide.
        </p>
      </div>

      {/* Popular Categories strip */}
      {popularCollections.length > 0 && (
        <section className="bg-white border-t border-b border-gray-100 py-10">
          <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14">
            <h2 className="text-navy-900 text-[22px] font-semibold mb-7">Popular Categories</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-[1px] border border-[rgba(0,0,0,0.08)] bg-[rgba(0,0,0,0.08)]">
              {popularCollections.map((col) => (
                <Link
                  key={col.id}
                  href={ROUTES.category(col.handle)}
                  className="group bg-white hover:bg-neutral-50 transition-colors flex flex-col items-center justify-center gap-4 py-8 px-4 h-full"
                >
                  <div className="w-[50px] h-[50px] rounded-xl bg-[rgba(0,193,255,0.15)] flex items-center justify-center overflow-hidden group-hover:bg-[rgba(0,193,255,0.25)] transition-colors">
                    {col.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={col.image.url}
                        alt={col.image.altText ?? col.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-teal-500 text-[20px] font-bold">
                        {col.title.charAt(0)}
                      </span>
                    )}
                  </div>
                  <span className="text-[14px] font-semibold text-navy-900 text-center leading-snug">
                    {col.title}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* All Categories grid */}
      <section className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-12">
        <h2 className="text-navy-900 text-[22px] font-semibold mb-7">Browse All Categories</h2>

        {collections.length === 0 ? (
          <p className="text-gray-500 text-[15px]">No categories found.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {collections.map((col) => (
              <Link
                key={col.id}
                href={ROUTES.category(col.handle)}
                className="group bg-white border border-gray-200 hover:border-navy-900 transition-colors overflow-hidden"
              >
                {col.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={col.image.url}
                    alt={col.image.altText ?? col.title}
                    className="w-full aspect-[4/3] object-cover"
                  />
                ) : (
                  <div className="w-full aspect-[4/3] bg-navy-900/5 flex items-center justify-center">
                    <span className="text-navy-900/20 text-[36px] font-bold">{col.title.charAt(0)}</span>
                  </div>
                )}
                <div className="px-4 py-3">
                  <p className="text-navy-900 text-[14px] font-semibold group-hover:underline">
                    {col.title}
                  </p>
                  {col.description && (
                    <p className="text-gray-500 text-[12px] mt-1 line-clamp-2">
                      {col.description}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Shop by Industry */}
      <ShopByIndustry />
    </main>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/categories/page.tsx
git commit -m "feat(a3): redesign /categories hub — hero, popular strip, grid, industry section"
```

---

## Task 8: Replace inline breadcrumbs in category + subcategory pages

**Files:**
- Modify: `app/category/[slug]/page.tsx`
- Modify: `app/category/[slug]/[sub]/page.tsx`

- [ ] **Step 1: Update L1 category page breadcrumb**

In `app/category/[slug]/page.tsx`:

Add import at the top (after other imports):
```tsx
import { Breadcrumb } from '@/components/layout/Breadcrumb'
```

Replace the inline breadcrumb block:
```tsx
{/* OLD — remove this block: */}
<div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-5">
  <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[15px] tracking-[0.3px] flex-wrap">
    <Link href={ROUTES.home} className="text-gray-500 hover:text-navy-900 transition-colors">
      Home
    </Link>
    <span className="text-gray-500">›</span>
    <span className="text-navy-900 font-semibold">{collection.title}</span>
  </nav>
</div>
```

Replace with:
```tsx
<div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-5">
  <Breadcrumb items={[{ label: collection.title }]} />
</div>
```

- [ ] **Step 2: Update L2 subcategory page breadcrumb**

In `app/category/[slug]/[sub]/page.tsx`:

Add import at the top (after other imports):
```tsx
import { Breadcrumb } from '@/components/layout/Breadcrumb'
```

Replace the inline breadcrumb block:
```tsx
{/* OLD — remove this block: */}
<div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-5">
  <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[15px] tracking-[0.3px] flex-wrap">
    <Link href={ROUTES.home} className="text-gray-500 hover:text-navy-900 transition-colors">
      Home
    </Link>
    <span className="text-gray-500">›</span>
    <Link
      href={ROUTES.category(slug)}
      className="text-gray-500 hover:text-navy-900 transition-colors capitalize"
    >
      {slug.replace(/-/g, ' ')}
    </Link>
    <span className="text-gray-500">›</span>
    <span className="text-navy-900 font-semibold">{collection.title}</span>
  </nav>
</div>
```

Replace with:
```tsx
<div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-5">
  <Breadcrumb
    items={[
      { label: slug.replace(/-/g, ' '), href: ROUTES.category(slug) },
      { label: collection.title },
    ]}
  />
</div>
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/category/[slug]/page.tsx "app/category/[slug]/[sub]/page.tsx"
git commit -m "feat(a3): replace inline breadcrumbs with Breadcrumb component"
```

---

## Task 9: Internal linking audit — fix hrefs and ShopByIndustry bug

**Files:**
- Modify: `components/home/ShopByIndustry.tsx`
- Modify: `components/product/RelatedCategories.tsx`
- Modify: `components/home/PopularCategories.tsx`

- [ ] **Step 1: Fix `ShopByIndustry` duplicate-import bug + use ROUTES**

`ShopByIndustry.tsx` has a merge-conflict artifact: a hardcoded `INDUSTRIES` const AND a second `import { INDUSTRIES } from '@/lib/industries'` block. Replace the full file:

```tsx
'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { FadeIn } from '@/components/ui/FadeIn'
import { INDUSTRIES } from '@/lib/industries'
import { ROUTES } from '@/lib/routes'

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
}

export function ShopByIndustry() {
  return (
    <section className="w-full bg-neutral-50">
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-14 md:py-16">

        <FadeIn className="flex items-center justify-between mb-8">
          <h2 className="text-[28px] font-semibold text-navy-900 tracking-[0.56px]">
            Shop By Industry
          </h2>
          <Link
            href={ROUTES.industries}
            className="text-[15px] font-semibold text-gray-500 hover:text-navy-900 transition-colors whitespace-nowrap"
          >
            All Industries →
          </Link>
        </FadeIn>

        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4"
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          {INDUSTRIES.map(({ name, slug, image }) => (
            <motion.div key={slug} variants={itemVariants}>
              <Link
                href={ROUTES.industry(slug)}
                className="group relative overflow-hidden aspect-[314/390] block"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image}
                  alt={name}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/65" />
                <span className="absolute bottom-5 left-5 text-white text-[20px] font-semibold tracking-[0.4px] drop-shadow-sm">
                  {name}
                </span>
              </Link>
            </motion.div>
          ))}
        </motion.div>

      </div>
    </section>
  )
}
```

- [ ] **Step 2: Fix `RelatedCategories` — use `ROUTES.category()`**

Replace the `href` in `components/product/RelatedCategories.tsx`:

```tsx
{/* OLD */}
href={`/category/${col.handle}`}

{/* NEW — add import at top: import { ROUTES } from '@/lib/routes' */}
href={ROUTES.category(col.handle)}
```

Full updated file:
```tsx
import Link from 'next/link'
import { ROUTES } from '@/lib/routes'
import type { RelatedCollection } from '@/types/product'

interface Props {
  collections: RelatedCollection[]
}

export function RelatedCategories({ collections }: Props) {
  if (collections.length === 0) return null

  return (
    <section aria-labelledby="related-categories-heading" className="border-t border-gray-200 pt-8">
      <h2 id="related-categories-heading" className="text-xl font-semibold text-navy-900 mb-4">
        Related Categories
      </h2>
      <ul className="flex flex-wrap gap-2">
        {collections.map((col) => (
          <li key={col.handle}>
            <Link
              href={ROUTES.category(col.handle)}
              className="inline-block px-4 py-2 text-sm font-medium text-teal-500 border border-teal-500 rounded-full hover:bg-teal-500 hover:text-white transition-colors"
            >
              {col.title}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
```

- [ ] **Step 3: Fix `PopularCategories` "Browse all" href**

In `components/home/PopularCategories.tsx`, the "Browse all categories" link points to `/shop`. Update it to `/categories` via `ROUTES`:

```tsx
{/* OLD */}
import Link from "next/link";
// ...
<Link href="/shop" ...>Browse all categories →</Link>

{/* NEW */}
import Link from "next/link";
import { ROUTES } from '@/lib/routes'
// ...
<Link href={ROUTES.categories} ...>Browse all categories →</Link>
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/home/ShopByIndustry.tsx components/product/RelatedCategories.tsx components/home/PopularCategories.tsx
git commit -m "fix(a3): internal linking audit — fix ShopByIndustry import bug, use ROUTES constants throughout"
```

---

## Final verification

- [ ] **Run the dev server and check each surface**

```bash
npm run dev
```

Visit and verify:
1. `http://localhost:3000` — header shows 4 stats; Categories hover opens mega-dropdown with collection links; Home Care/Mobility/Needles/Testing show subcategory dropdowns or plain links if no subs found
2. `http://localhost:3000/categories` — shows hero, popular strip (8 tiles), all-categories grid, Shop by Industry
3. `http://localhost:3000/category/gloves` — breadcrumb shows "Home › Gloves" using Breadcrumb component
4. `http://localhost:3000/category/gloves/nitrile` — breadcrumb shows "Home › gloves › Exam Gloves"
5. Footer shows live collection names linked to `/category/{handle}`
6. Mobile menu (resize to <768px): all items expand correctly; "All categories →" link present

- [ ] **Final commit if any tweaks were made**

```bash
git add -A
git commit -m "fix(a3): visual tweaks from dev server verification"
```
