# A2 · Category + Subcategory Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build SEO-ready L1 (category) and L2 (subcategory) page templates with 9-per-page real-anchor pagination, noindex/canonical logic for filtered URLs, a mobile filter drawer, and schema slots — reworking the existing L1 page and building L2 from its stub.

**Architecture:** Separate L1 and L2 page files pull from three new shared components (`ProductGrid`, `CategoryPagination`, `FilterDrawer`) plus the existing `CategoryFilters`/`CategorySort`/`ShopifyProductCard`. A thin `lib/seo.ts` stub is created matching Munis's B1 interface so the pages compile without waiting for the merge. Filtered/sorted URLs are `noindex,follow` with canonical to parent; clean paginated URLs use `?page=N&after=CURSOR` real anchor links.

**Tech Stack:** Next.js 15 (App Router, RSC), TypeScript, Tailwind CSS, Shopify Storefront API (`storefrontFetch`), Lucide React icons

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `lib/seo.ts` | B1 stub: `buildMetadata`, `STAGING_GUARD` |
| Create | `components/category/ProductGrid.tsx` | 3×3 grid + empty state, pure display |
| Create | `components/category/CategoryPagination.tsx` | Real `<a>` prev/next links with cursor |
| Create | `components/category/FilterDrawer.tsx` | Mobile full-screen filter overlay |
| Modify | `app/category/[slug]/page.tsx` | L1 rework: 9 products, SEO logic, schema slot |
| Modify | `app/category/[slug]/[sub]/page.tsx` | L2 implementation from stub |

---

## Task 1: `lib/seo.ts` — B1 stub

**Files:**
- Create: `lib/seo.ts`

- [ ] **Step 1: Create the file**

```ts
// lib/seo.ts — B1 stub; replaced wholesale when Munis's branch merges
import type { Metadata } from 'next'

export const STAGING_GUARD = process.env.NEXT_PUBLIC_IS_STAGING === 'true'

interface BuildMetadataOptions {
  pageType: 'category' | 'subcategory' | 'product' | 'page'
  title: string
  slug?: string
  description?: string
  canonical?: string
  noindex?: boolean
}

export function buildMetadata(opts: BuildMetadataOptions): Metadata {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mdsupplies.com'
  const canonical =
    opts.canonical ??
    (opts.slug ? `${base}/${opts.pageType}/${opts.slug}` : base)
  return {
    title: `${opts.title} | MD Supplies`,
    description: opts.description,
    alternates: { canonical },
    robots: opts.noindex
      ? { index: false, follow: true }
      : { index: true, follow: true },
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add lib/seo.ts
git commit -m "feat(a2): add lib/seo stub (B1 interface)"
```

---

## Task 2: `ProductGrid` component

**Files:**
- Create: `components/category/ProductGrid.tsx`

- [ ] **Step 1: Create the component**

```tsx
import Link from 'next/link'
import type { CollectionProduct } from '@/lib/shopify/types'
import { ShopifyProductCard } from '@/components/store/ShopifyProductCard'

interface Props {
  products: CollectionProduct[]
  emptyStateHref: string
  emptyStateMessage?: string
}

export function ProductGrid({
  products,
  emptyStateHref,
  emptyStateMessage = 'No products found.',
}: Props) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-navy-900 text-[20px] font-semibold">
          {emptyStateMessage}
        </p>
        <p className="text-gray-500 text-[15px]">
          Try adjusting or clearing your filters.
        </p>
        <Link
          href={emptyStateHref}
          className="mt-2 border border-navy-900 text-navy-900 text-[15px] font-semibold px-6 h-[44px] flex items-center hover:bg-neutral-50 transition-colors"
        >
          Clear all filters
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-[23px]">
      {products.map((product) => (
        <ShopifyProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: exits 0 with no TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add components/category/ProductGrid.tsx
git commit -m "feat(a2): add ProductGrid component"
```

---

## Task 3: `CategoryPagination` component

**Files:**
- Create: `components/category/CategoryPagination.tsx`

- [ ] **Step 1: Create the component**

```tsx
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  currentPage: number
  hasNext: boolean
  nextCursor: string | null
  baseUrl: string   // e.g. /category/exam-gloves (no query string)
}

export function CategoryPagination({
  currentPage,
  hasNext,
  nextCursor,
  baseUrl,
}: Props) {
  const hasPrev = currentPage > 1

  // Next href: embed cursor + page number so the server can fetch efficiently.
  // encodeURIComponent keeps cursor characters safe in the URL.
  const nextHref =
    hasNext && nextCursor
      ? `${baseUrl}?page=${currentPage + 1}&after=${encodeURIComponent(nextCursor)}`
      : null

  // Prev always goes to page 1 (the clean base URL) — we don't store older
  // cursors, so we can't reconstruct page N-1 for N > 2.
  const prevHref = hasPrev ? baseUrl : null

  if (!hasPrev && !hasNext) return null

  return (
    <div className="flex items-center justify-center gap-6 pt-12">
      {prevHref ? (
        <Link
          href={prevHref}
          className="flex items-center gap-2 border border-navy-900 text-navy-900 text-[14px] font-semibold px-5 h-[44px] hover:bg-neutral-50 transition-colors"
        >
          <ChevronLeft size={16} />
          Previous
        </Link>
      ) : (
        <span className="w-[107px]" />
      )}

      <span className="text-navy-900 text-[14px] font-medium min-w-[60px] text-center">
        Page {currentPage}
      </span>

      {nextHref ? (
        <Link
          href={nextHref}
          className="flex items-center gap-2 border border-navy-900 text-navy-900 text-[14px] font-semibold px-5 h-[44px] hover:bg-neutral-50 transition-colors"
        >
          Next
          <ChevronRight size={16} />
        </Link>
      ) : (
        <span className="w-[107px]" />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: exits 0

- [ ] **Step 3: Commit**

```bash
git add components/category/CategoryPagination.tsx
git commit -m "feat(a2): add CategoryPagination component (real anchor links)"
```

---

## Task 4: `FilterDrawer` component

**Files:**
- Create: `components/category/FilterDrawer.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client'

import { useState } from 'react'
import { X, SlidersHorizontal } from 'lucide-react'
import type { CollectionFilter } from '@/lib/shopify/types'
import { CategoryFilters } from '@/components/category/CategoryFilters'

interface Props {
  filters: CollectionFilter[]
  activeFilters: string[]
  currentSort?: string
}

export function FilterDrawer({ filters, activeFilters, currentSort }: Props) {
  const [open, setOpen] = useState(false)
  const count = activeFilters.length

  return (
    <>
      {/* Trigger — mobile only */}
      <div className="lg:hidden mb-4">
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 border border-navy-900 text-navy-900 text-[14px] font-semibold px-4 h-[40px] hover:bg-neutral-50 transition-colors"
        >
          <SlidersHorizontal size={15} />
          {count > 0 ? `Filters (${count})` : 'Filters'}
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          {/* Drawer panel */}
          <div className="absolute inset-y-0 left-0 w-full max-w-[320px] bg-white flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <span className="text-navy-900 text-[16px] font-semibold">
                Filters
              </span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close filters"
              >
                <X size={20} className="text-navy-900" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-6">
              <CategoryFilters
                filters={filters}
                activeFilters={activeFilters}
                currentSort={currentSort}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: exits 0

- [ ] **Step 3: Commit**

```bash
git add components/category/FilterDrawer.tsx
git commit -m "feat(a2): add FilterDrawer (mobile full-screen filter overlay)"
```

---

## Task 5: L1 category page rework

**Files:**
- Modify: `app/category/[slug]/page.tsx`

Changes from current: `first: 24 → 9`; Load More → `CategoryPagination` on clean pages; `generateMetadata` → `buildMetadata` with three SEO rules; add noindex/canonical for filtered/sorted URLs; add `FilterDrawer`; add subcategory grid + related categories stubs; add schema slot; use `ProductGrid`.

- [ ] **Step 1: Replace the entire file**

```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { X, ChevronRight } from 'lucide-react'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_COLLECTION } from '@/lib/shopify/queries/collections'
import type { Collection } from '@/lib/shopify/types'
import { CategoryFilters } from '@/components/category/CategoryFilters'
import { CategorySort } from '@/components/category/CategorySort'
import { ProductGrid } from '@/components/category/ProductGrid'
import { CategoryPagination } from '@/components/category/CategoryPagination'
import { FilterDrawer } from '@/components/category/FilterDrawer'
import { buildMetadata } from '@/lib/seo'
import { ROUTES } from '@/lib/routes'

export const revalidate = 30

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{
    sort?: string
    after?: string
    filter?: string | string[]
    page?: string
  }>
}

function parseSortKey(sort?: string): { sortKey: string; reverse: boolean } {
  switch (sort) {
    case 'PRICE_ASC':    return { sortKey: 'PRICE', reverse: false }
    case 'PRICE_DESC':   return { sortKey: 'PRICE', reverse: true }
    case 'BEST_SELLING': return { sortKey: 'BEST_SELLING', reverse: false }
    case 'CREATED':      return { sortKey: 'CREATED', reverse: true }
    default:             return { sortKey: 'COLLECTION_DEFAULT', reverse: false }
  }
}

function parseFilterParam(filter?: string | string[]): string[] {
  if (!filter) return []
  return Array.isArray(filter) ? filter : [filter]
}

function parseFilters(filterStrings: string[]): Record<string, unknown>[] {
  return filterStrings.flatMap((f) => {
    try {
      const parsed = JSON.parse(f)
      return parsed ? [parsed] : []
    } catch {
      return []
    }
  })
}

// TODO(data-team): replace with real subcategory list from Shopify metafields
const SUBCATEGORY_STUBS: { label: string; slug: string }[] = []
// TODO(data-team): replace with real related category list from Shopify metafields
const RELATED_CATEGORY_STUBS: { label: string; slug: string }[] = []

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params
  const sp = await searchParams
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mdsupplies.com'

  const activeFilterStrings = parseFilterParam(sp.filter)
  const isFiltered = activeFilterStrings.length > 0 || Boolean(sp.sort)
  const currentPage = parseInt(sp.page ?? '1', 10)

  try {
    const data = await storefrontFetch<{ collection: Collection | null }>(
      GET_COLLECTION,
      { handle: slug, first: 1 },
    )
    if (!data.collection) return { title: 'Category | MD Supplies' }
    const { title, description } = data.collection

    // Rule 3: filtered or sorted → noindex, canonical to clean base
    if (isFiltered) {
      return buildMetadata({
        pageType: 'category',
        title,
        description: description || undefined,
        canonical: `${base}/category/${slug}`,
        noindex: true,
      })
    }

    // Rule 2: paginated → index, canonical to self (with page + cursor)
    if (currentPage > 1) {
      return buildMetadata({
        pageType: 'category',
        title,
        description: description || undefined,
        canonical: `${base}/category/${slug}?page=${currentPage}&after=${sp.after ?? ''}`,
      })
    }

    // Rule 1: clean page 1 → index, canonical computed from slug
    return buildMetadata({
      pageType: 'category',
      title,
      slug,
      description: description || undefined,
    })
  } catch {
    return { title: 'Category | MD Supplies' }
  }
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params
  const sp = await searchParams

  const activeFilterStrings = parseFilterParam(sp.filter)
  const { sortKey, reverse } = parseSortKey(sp.sort)
  const currentPage = parseInt(sp.page ?? '1', 10)
  const isFiltered = activeFilterStrings.length > 0 || Boolean(sp.sort)

  const data = await storefrontFetch<{ collection: Collection | null }>(GET_COLLECTION, {
    handle: slug,
    first: 9,
    after: sp.after ?? null,
    sortKey,
    reverse,
    filters: parseFilters(activeFilterStrings),
  })

  if (!data.collection) notFound()

  const { collection } = data
  const products = collection.products.nodes
  const { pageInfo } = collection.products
  const filters = collection.products.filters ?? []

  const removeFilterUrl = (filterToRemove: string) => {
    const next = activeFilterStrings.filter((f) => f !== filterToRemove)
    const p = new URLSearchParams()
    if (sp.sort) p.set('sort', sp.sort)
    next.forEach((f) => p.append('filter', f))
    const qs = p.toString()
    return qs ? `/category/${slug}?${qs}` : `/category/${slug}`
  }

  const loadMoreUrl = (() => {
    const p = new URLSearchParams()
    if (sp.sort) p.set('sort', sp.sort)
    activeFilterStrings.forEach((f) => p.append('filter', f))
    if (pageInfo.endCursor) p.set('after', pageInfo.endCursor)
    return `/category/${slug}?${p.toString()}`
  })()

  return (
    <main className="bg-[#f9fafc] min-h-screen">
      {/* Breadcrumb */}
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-5">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[15px] tracking-[0.3px] flex-wrap">
          <Link href={ROUTES.home} className="text-gray-500 hover:text-navy-900 transition-colors">
            Home
          </Link>
          <span className="text-gray-500">›</span>
          <span className="text-navy-900 font-semibold">{collection.title}</span>
        </nav>
      </div>

      {/* Hero — with image */}
      {collection.image && (
        <div className="relative bg-navy-900 overflow-hidden h-[220px] sm:h-[280px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={collection.image.url}
            alt={collection.image.altText ?? collection.title}
            className="absolute inset-0 w-full h-full object-cover opacity-30"
          />
          <div className="relative max-w-360 mx-auto px-4 sm:px-8 lg:px-14 h-full flex flex-col justify-center">
            <h1 className="text-white text-[28px] sm:text-[36px] font-bold leading-tight">
              {collection.title}
            </h1>
            {collection.description && (
              <p className="text-white/70 text-[15px] mt-2 max-w-2xl">
                {collection.description}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Hero — no image fallback */}
      {!collection.image && (
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 pb-4">
          <h1 className="text-navy-900 text-[26px] font-bold">{collection.title}</h1>
          {collection.description && (
            <p className="text-gray-500 text-[15px] mt-1 max-w-2xl">
              {collection.description}
            </p>
          )}
        </div>
      )}

      {/* Main layout */}
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-8 flex gap-0 items-start">
        {/* Desktop filter sidebar */}
        <aside className="hidden lg:block w-[280px] shrink-0 pr-10 sticky top-[140px]">
          <CategoryFilters
            filters={filters}
            activeFilters={activeFilterStrings}
            currentSort={sp.sort}
          />
        </aside>

        {/* Product area */}
        <div className="flex-1 min-w-0">
          {/* Sort bar */}
          <div className="flex justify-end mb-6">
            <CategorySort currentSort={sp.sort} activeFilters={activeFilterStrings} />
          </div>

          {/* Active filter chips */}
          {activeFilterStrings.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {activeFilterStrings.map((f) => {
                let label = f
                try { label = String(Object.values(JSON.parse(f)).join(', ')) } catch { /* keep raw */ }
                return (
                  <Link
                    key={f}
                    href={removeFilterUrl(f)}
                    className="flex items-center gap-1 bg-navy-900 text-white text-[12px] font-medium px-3 h-[28px] hover:bg-navy-950 transition-colors"
                  >
                    {label}
                    <X size={11} />
                  </Link>
                )
              })}
            </div>
          )}

          {/* Mobile filter drawer */}
          <FilterDrawer
            filters={filters}
            activeFilters={activeFilterStrings}
            currentSort={sp.sort}
          />

          {/* Product grid */}
          <ProductGrid
            products={products}
            emptyStateHref={ROUTES.category(slug)}
          />

          {/* Clean-page pagination (real anchor links, SEO-indexable) */}
          {!isFiltered && (
            <CategoryPagination
              currentPage={currentPage}
              hasNext={pageInfo.hasNextPage}
              nextCursor={pageInfo.endCursor ?? null}
              baseUrl={ROUTES.category(slug)}
            />
          )}

          {/* Filtered/sorted pages: cursor-based Load More (noindex, not paginated) */}
          {isFiltered && pageInfo.hasNextPage && (
            <div className="flex items-center justify-center pt-12">
              <Link
                href={loadMoreUrl}
                className="flex items-center gap-2 border border-navy-900 text-navy-900 text-[14px] font-semibold px-5 h-[44px] hover:bg-neutral-50 transition-colors"
              >
                Load More
                <ChevronRight size={16} />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Subcategory grid — hidden until data team populates SUBCATEGORY_STUBS */}
      {SUBCATEGORY_STUBS.length > 0 && (
        <section className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-10 border-t border-gray-200">
          <h2 className="text-navy-900 text-[20px] font-semibold mb-6">
            Browse by Subcategory
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {SUBCATEGORY_STUBS.map((sub) => (
              <Link
                key={sub.slug}
                href={ROUTES.subcategory(slug, sub.slug)}
                className="border border-gray-200 bg-white text-navy-900 text-[14px] font-medium px-4 py-3 text-center hover:border-navy-900 transition-colors"
              >
                {sub.label}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Related categories — hidden until data team populates RELATED_CATEGORY_STUBS */}
      {RELATED_CATEGORY_STUBS.length > 0 && (
        <section className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-8">
          <h2 className="text-navy-900 text-[18px] font-semibold mb-4">
            Related Categories
          </h2>
          <div className="flex flex-wrap gap-3">
            {RELATED_CATEGORY_STUBS.map((cat) => (
              <Link
                key={cat.slug}
                href={ROUTES.category(cat.slug)}
                className="border border-gray-200 bg-white text-navy-900 text-[14px] px-4 py-2 hover:border-navy-900 transition-colors"
              >
                {cat.label}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Bottom SEO copy */}
      {collection.descriptionHtml && (
        <section className="bg-white border-t border-gray-200 py-14">
          <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14">
            <h2 className="text-navy-900 text-[22px] font-semibold tracking-[0.44px] mb-6">
              About {collection.title}
            </h2>
            <div
              className="prose prose-gray max-w-3xl text-[15px] leading-[28px] text-gray-500"
              dangerouslySetInnerHTML={{ __html: collection.descriptionHtml }}
            />
          </div>
        </section>
      )}

      {/* Schema slot — A5 (Discovery Schema ticket) fills this with CollectionPage + BreadcrumbList JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({}) }}
      />
    </main>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: exits 0. If TypeScript errors appear on `Collection` type missing fields, check `lib/shopify/types.ts` — the `Collection` type should have `description` and `descriptionHtml` as strings (it does per the existing type definition).

- [ ] **Step 3: Commit**

```bash
git add app/category/[slug]/page.tsx
git commit -m "feat(a2): rework L1 category page (9 products, pagination, SEO rules, schema slot)"
```

---

## Task 6: L2 subcategory page

**Files:**
- Modify: `app/category/[slug]/[sub]/page.tsx`

The current file is a stub calling `notFound()`. Replace it entirely.

- [ ] **Step 1: Replace the entire file**

```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { X, ChevronRight } from 'lucide-react'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_COLLECTION } from '@/lib/shopify/queries/collections'
import type { Collection } from '@/lib/shopify/types'
import { CategoryFilters } from '@/components/category/CategoryFilters'
import { CategorySort } from '@/components/category/CategorySort'
import { ProductGrid } from '@/components/category/ProductGrid'
import { CategoryPagination } from '@/components/category/CategoryPagination'
import { FilterDrawer } from '@/components/category/FilterDrawer'
import { buildMetadata } from '@/lib/seo'
import { ROUTES } from '@/lib/routes'

export const revalidate = 30

interface Props {
  params: Promise<{ slug: string; sub: string }>
  searchParams: Promise<{
    sort?: string
    after?: string
    filter?: string | string[]
    page?: string
  }>
}

function parseSortKey(sort?: string): { sortKey: string; reverse: boolean } {
  switch (sort) {
    case 'PRICE_ASC':    return { sortKey: 'PRICE', reverse: false }
    case 'PRICE_DESC':   return { sortKey: 'PRICE', reverse: true }
    case 'BEST_SELLING': return { sortKey: 'BEST_SELLING', reverse: false }
    case 'CREATED':      return { sortKey: 'CREATED', reverse: true }
    default:             return { sortKey: 'COLLECTION_DEFAULT', reverse: false }
  }
}

function parseFilterParam(filter?: string | string[]): string[] {
  if (!filter) return []
  return Array.isArray(filter) ? filter : [filter]
}

function parseFilters(filterStrings: string[]): Record<string, unknown>[] {
  return filterStrings.flatMap((f) => {
    try {
      const parsed = JSON.parse(f)
      return parsed ? [parsed] : []
    } catch {
      return []
    }
  })
}

// TODO(data-team): replace with real related links from Shopify metafields
const RELATED_STUBS: { label: string; catSlug: string; subSlug: string }[] = []

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug, sub } = await params
  const sp = await searchParams
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mdsupplies.com'
  // Composite handle: /category/gloves/nitrile → Shopify collection "gloves-nitrile"
  const handle = `${slug}-${sub}`

  const activeFilterStrings = parseFilterParam(sp.filter)
  const isFiltered = activeFilterStrings.length > 0 || Boolean(sp.sort)
  const currentPage = parseInt(sp.page ?? '1', 10)

  try {
    const data = await storefrontFetch<{ collection: Collection | null }>(
      GET_COLLECTION,
      { handle, first: 1 },
    )
    if (!data.collection) return { title: 'Category | MD Supplies' }
    const { title, description } = data.collection

    // Rule 3: filtered or sorted → noindex, canonical to clean subcategory URL
    if (isFiltered) {
      return buildMetadata({
        pageType: 'subcategory',
        title,
        description: description || undefined,
        canonical: `${base}/category/${slug}/${sub}`,
        noindex: true,
      })
    }

    // Rule 2: paginated → index, canonical to self
    if (currentPage > 1) {
      return buildMetadata({
        pageType: 'subcategory',
        title,
        description: description || undefined,
        canonical: `${base}/category/${slug}/${sub}?page=${currentPage}&after=${sp.after ?? ''}`,
      })
    }

    // Rule 1: clean page 1 → index, canonical to clean subcategory URL
    return buildMetadata({
      pageType: 'subcategory',
      title,
      description: description || undefined,
      canonical: `${base}/category/${slug}/${sub}`,
    })
  } catch {
    return { title: 'Category | MD Supplies' }
  }
}

export default async function SubcategoryPage({ params, searchParams }: Props) {
  const { slug, sub } = await params
  const sp = await searchParams
  // Composite handle: /category/gloves/nitrile → Shopify collection "gloves-nitrile"
  const handle = `${slug}-${sub}`

  const activeFilterStrings = parseFilterParam(sp.filter)
  const { sortKey, reverse } = parseSortKey(sp.sort)
  const currentPage = parseInt(sp.page ?? '1', 10)
  const isFiltered = activeFilterStrings.length > 0 || Boolean(sp.sort)

  const data = await storefrontFetch<{ collection: Collection | null }>(GET_COLLECTION, {
    handle,
    first: 9,
    after: sp.after ?? null,
    sortKey,
    reverse,
    filters: parseFilters(activeFilterStrings),
  })

  if (!data.collection) notFound()

  const { collection } = data
  const products = collection.products.nodes
  const { pageInfo } = collection.products
  const filters = collection.products.filters ?? []

  const removeFilterUrl = (filterToRemove: string) => {
    const next = activeFilterStrings.filter((f) => f !== filterToRemove)
    const p = new URLSearchParams()
    if (sp.sort) p.set('sort', sp.sort)
    next.forEach((f) => p.append('filter', f))
    const qs = p.toString()
    return qs ? `/category/${slug}/${sub}?${qs}` : `/category/${slug}/${sub}`
  }

  const loadMoreUrl = (() => {
    const p = new URLSearchParams()
    if (sp.sort) p.set('sort', sp.sort)
    activeFilterStrings.forEach((f) => p.append('filter', f))
    if (pageInfo.endCursor) p.set('after', pageInfo.endCursor)
    return `/category/${slug}/${sub}?${p.toString()}`
  })()

  return (
    <main className="bg-[#f9fafc] min-h-screen">
      {/* Breadcrumb — parent slug displayed as formatted text until data team provides parent title */}
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

      {/* Hero — with image */}
      {collection.image && (
        <div className="relative bg-navy-900 overflow-hidden h-[220px] sm:h-[280px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={collection.image.url}
            alt={collection.image.altText ?? collection.title}
            className="absolute inset-0 w-full h-full object-cover opacity-30"
          />
          <div className="relative max-w-360 mx-auto px-4 sm:px-8 lg:px-14 h-full flex flex-col justify-center">
            <h1 className="text-white text-[28px] sm:text-[36px] font-bold leading-tight">
              {collection.title}
            </h1>
            {collection.description && (
              <p className="text-white/70 text-[15px] mt-2 max-w-2xl">
                {collection.description}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Hero — no image fallback */}
      {!collection.image && (
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 pb-4">
          <h1 className="text-navy-900 text-[26px] font-bold">{collection.title}</h1>
          {collection.description && (
            <p className="text-gray-500 text-[15px] mt-1 max-w-2xl">
              {collection.description}
            </p>
          )}
        </div>
      )}

      {/* Main layout */}
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-8 flex gap-0 items-start">
        {/* Desktop filter sidebar */}
        <aside className="hidden lg:block w-[280px] shrink-0 pr-10 sticky top-[140px]">
          <CategoryFilters
            filters={filters}
            activeFilters={activeFilterStrings}
            currentSort={sp.sort}
          />
        </aside>

        {/* Product area */}
        <div className="flex-1 min-w-0">
          {/* Sort bar */}
          <div className="flex justify-end mb-6">
            <CategorySort currentSort={sp.sort} activeFilters={activeFilterStrings} />
          </div>

          {/* Active filter chips */}
          {activeFilterStrings.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {activeFilterStrings.map((f) => {
                let label = f
                try { label = String(Object.values(JSON.parse(f)).join(', ')) } catch { /* keep raw */ }
                return (
                  <Link
                    key={f}
                    href={removeFilterUrl(f)}
                    className="flex items-center gap-1 bg-navy-900 text-white text-[12px] font-medium px-3 h-[28px] hover:bg-navy-950 transition-colors"
                  >
                    {label}
                    <X size={11} />
                  </Link>
                )
              })}
            </div>
          )}

          {/* Mobile filter drawer */}
          <FilterDrawer
            filters={filters}
            activeFilters={activeFilterStrings}
            currentSort={sp.sort}
          />

          {/* Product grid */}
          <ProductGrid
            products={products}
            emptyStateHref={ROUTES.subcategory(slug, sub)}
          />

          {/* Clean-page pagination */}
          {!isFiltered && (
            <CategoryPagination
              currentPage={currentPage}
              hasNext={pageInfo.hasNextPage}
              nextCursor={pageInfo.endCursor ?? null}
              baseUrl={ROUTES.subcategory(slug, sub)}
            />
          )}

          {/* Filtered/sorted: cursor-based Load More */}
          {isFiltered && pageInfo.hasNextPage && (
            <div className="flex items-center justify-center pt-12">
              <Link
                href={loadMoreUrl}
                className="flex items-center gap-2 border border-navy-900 text-navy-900 text-[14px] font-semibold px-5 h-[44px] hover:bg-neutral-50 transition-colors"
              >
                Load More
                <ChevronRight size={16} />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Related subcategory links — hidden until data team populates RELATED_STUBS */}
      {RELATED_STUBS.length > 0 && (
        <section className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-8 border-t border-gray-200">
          <h2 className="text-navy-900 text-[18px] font-semibold mb-4">
            Related Subcategories
          </h2>
          <div className="flex flex-wrap gap-3">
            {RELATED_STUBS.map((r) => (
              <Link
                key={r.subSlug}
                href={ROUTES.subcategory(r.catSlug, r.subSlug)}
                className="border border-gray-200 bg-white text-navy-900 text-[14px] px-4 py-2 hover:border-navy-900 transition-colors"
              >
                {r.label}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Bottom SEO copy */}
      {collection.descriptionHtml && (
        <section className="bg-white border-t border-gray-200 py-14">
          <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14">
            <h2 className="text-navy-900 text-[22px] font-semibold tracking-[0.44px] mb-6">
              About {collection.title}
            </h2>
            <div
              className="prose prose-gray max-w-3xl text-[15px] leading-[28px] text-gray-500"
              dangerouslySetInnerHTML={{ __html: collection.descriptionHtml }}
            />
          </div>
        </section>
      )}

      {/* Schema slot — A5 fills this with CollectionPage + BreadcrumbList JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({}) }}
      />
    </main>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: exits 0. If collection lookup fails at runtime for a non-existent `${slug}-${sub}` handle, `notFound()` is called — this is correct.

- [ ] **Step 3: Commit**

```bash
git add "app/category/[slug]/[sub]/page.tsx"
git commit -m "feat(a2): implement L2 subcategory page (composite handle, pagination, SEO rules)"
```

---

## Task 7: Final verification

- [ ] **Step 1: Run lint**

```bash
npm run lint
```
Expected: no errors. If ESLint flags `@next/next/no-img-element`, the `eslint-disable` comment above each `<img>` tag handles it — that rule is suppressed on the collection hero images because Next.js `<Image>` requires fixed dimensions, which aren't available from Shopify's CDN without fetching image metadata first.

- [ ] **Step 2: Run dev server**

```bash
npm run dev
```

Expected: server starts on http://localhost:3000 with no build errors.

- [ ] **Step 3: Smoke-test L1**

Open: `http://localhost:3000/category/<any-real-slug>` (e.g. `exam-gloves` if that handle exists in Shopify)

Check:
- Page renders with H1 = collection title
- Grid shows ≤ 9 products
- If collection has >9 products, "Next" link appears and URL is `?page=2&after=...`
- Desktop sidebar shows CategoryFilters (if filters available from Shopify)
- On mobile viewport (devtools), "Filters" button appears; desktop sidebar is hidden

- [ ] **Step 4: Smoke-test filter noindex**

Add `?sort=PRICE_ASC` to the category URL.
Open devtools → Network → inspect the page response headers or view source.
Expected: `<meta name="robots" content="noindex, follow">` in `<head>`.

- [ ] **Step 5: Smoke-test L2**

Open: `http://localhost:3000/category/<cat-slug>/<sub-slug>` where `${cat-slug}-${sub-slug}` matches a real Shopify collection handle.

Check:
- Breadcrumb shows: Home › [cat] › [Subcategory title]
- H1 = subcategory collection title
- Grid shows ≤ 9 products
- Pagination appears if >9 products

- [ ] **Step 6: Commit**

```bash
git commit --allow-empty -m "chore(a2): A2 implementation complete — verified"
```
