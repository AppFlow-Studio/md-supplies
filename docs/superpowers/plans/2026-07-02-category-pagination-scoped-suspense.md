# Category Pagination — No Scroll Jump, No Full-Page Reload — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clicking pagination on `/category/[slug]` updates only the product grid/filters — no scroll jump to the top, no full-page skeleton flash — while filters, sort, shareable URLs, and back/forward all keep working exactly as they do today.

**Architecture:** Split `app/category/[slug]/page.tsx` into a fast outer shell (breadcrumb/hero/subcategory-tabs/related/about/schema — sourced from a new lightweight `GET_COLLECTION_HERO` query that doesn't depend on `page`/`sort`/`filter`/`after`) and a new nested Server Component, `CategoryResults` (sidebar filters + sort bar + chips + grid + pagination), wrapped in its own `<Suspense>` so only that region re-suspends on same-route navigation. Combined with `scroll={false}` on `CategoryPagination`'s links.

**Tech Stack:** Next.js 16 App Router (Server Components, `<Suspense>`/`loading.tsx` streaming), TypeScript, Shopify Storefront API, Vitest + Testing Library.

## Global Constraints

- Filter/sort persistence, UTM/tracking param passthrough, and cursor-based pagination logic are already correct — do not change their behavior, only relocate the code that implements them.
- No new client-side state, no new API routes — stay within the existing server-rendered architecture.
- `app/category/[slug]/error.tsx` and `[product]/page.tsx` are out of scope.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `lib/shopify/types.ts` | Modify | Add `CollectionHero` type |
| `lib/shopify/queries/collections.ts` | Modify | Add `GET_COLLECTION_HERO` query |
| `lib/shopify/queries/__tests__/collections.test.ts` | Create | Guards `GET_COLLECTION_HERO` stays decoupled from pagination |
| `components/category/CategoryPagination.tsx` | Modify | Add `scroll={false}` to prev/next `<Link>`s |
| `components/category/__tests__/CategoryPagination.test.tsx` | Modify | Assert `scroll={false}` on prev/next links |
| `components/category/CategoryResultsSkeleton.tsx` | Create | Sidebar+grid skeleton, shared by `loading.tsx` and the new `<Suspense>` fallback |
| `app/category/[slug]/loading.tsx` | Modify | Use `CategoryResultsSkeleton` instead of inline markup |
| `components/category/CategoryResults.tsx` | Create | Async Server Component: product fetch + sidebar/sort/chips/drawer/grid/pagination |
| `app/category/[slug]/page.tsx` | Modify | Shell-only fetch (`GET_COLLECTION_HERO`) + `<Suspense><CategoryResults/></Suspense>` |

---

## Task 1: Add `GET_COLLECTION_HERO` query

**Files:**
- Modify: `lib/shopify/types.ts`
- Modify: `lib/shopify/queries/collections.ts`
- Test: `lib/shopify/queries/__tests__/collections.test.ts`

**Interfaces:**
- Produces: `CollectionHero` type (`lib/shopify/types.ts`); `GET_COLLECTION_HERO` query string (`lib/shopify/queries/collections.ts`)

- [ ] **Step 1: Write the failing test**

Create `lib/shopify/queries/__tests__/collections.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { GET_COLLECTION_HERO } from '../collections'

describe('GET_COLLECTION_HERO', () => {
  it('fetches hero fields without touching the paginated products connection', () => {
    expect(GET_COLLECTION_HERO).toContain('descriptionHtml')
    expect(GET_COLLECTION_HERO).toContain('image { id url altText width height }')
    expect(GET_COLLECTION_HERO).not.toContain('products(')
    expect(GET_COLLECTION_HERO).not.toMatch(/\$first|\$after|\$sortKey|\$reverse|\$filters/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/shopify/queries/__tests__/collections.test.ts`
Expected: FAIL — `GET_COLLECTION_HERO` is not exported from `../collections`

- [ ] **Step 3: Add the `CollectionHero` type**

In `lib/shopify/types.ts`, add immediately after the `Collection` type (after line 129):

```ts
export type CollectionHero = Pick<Collection, 'id' | 'title' | 'handle' | 'description' | 'descriptionHtml' | 'image'>;
```

- [ ] **Step 4: Add the `GET_COLLECTION_HERO` query**

In `lib/shopify/queries/collections.ts`, add immediately after `GET_COLLECTION_META` (after line 23):

```ts
export const GET_COLLECTION_HERO = `#graphql
  query GetCollectionHero($handle: String!) {
    collection(handle: $handle) {
      id
      title
      handle
      description
      descriptionHtml
      image { id url altText width height }
    }
  }
`;
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run lib/shopify/queries/__tests__/collections.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add lib/shopify/types.ts lib/shopify/queries/collections.ts lib/shopify/queries/__tests__/collections.test.ts
git commit -m "feat: add lightweight GET_COLLECTION_HERO query for category page shell"
```

---

## Task 2: Disable scroll-to-top on pagination links

**Files:**
- Modify: `components/category/CategoryPagination.tsx`
- Modify: `components/category/__tests__/CategoryPagination.test.tsx`

**Interfaces:**
- No prop/signature changes to `CategoryPagination` — internal `<Link>` usage only.

- [ ] **Step 1: Write the failing test**

Replace the full contents of `components/category/__tests__/CategoryPagination.test.tsx`:

```tsx
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import type { ReactNode } from 'react'
import { CategoryPagination } from '../CategoryPagination'

vi.mock('next/link', () => ({
  default: ({ href, scroll, children, ...rest }: { href: string; scroll?: boolean; children: ReactNode }) => (
    <a href={href} data-scroll={String(scroll)} {...rest}>
      {children}
    </a>
  ),
}))

afterEach(cleanup)

describe('CategoryPagination filter/sort persistence', () => {
  it('carries sort and filter params into the next-page link', () => {
    const persistParams = new URLSearchParams()
    persistParams.set('sort', 'PRICE_ASC')
    persistParams.append('filter', '{"v":"latex"}')

    render(
      <CategoryPagination
        currentPage={1}
        hasNext={true}
        nextCursor="cursorA"
        prevCursors={[]}
        currentAfter={null}
        baseUrl="/category/gloves"
        persistParams={persistParams}
      />
    )

    const nextLink = screen.getByRole('link', { name: 'Next page' })
    const params = new URLSearchParams(nextLink.getAttribute('href')?.split('?')[1])
    expect(params.get('sort')).toBe('PRICE_ASC')
    expect(params.getAll('filter')).toEqual(['{"v":"latex"}'])
    expect(params.get('page')).toBe('2')
    expect(params.get('after')).toBe('cursorA')
  })

  it('carries sort and filter params into the previous-page link', () => {
    const persistParams = new URLSearchParams()
    persistParams.set('sort', 'CREATED')
    persistParams.append('filter', '{"v":"nitrile"}')

    render(
      <CategoryPagination
        currentPage={2}
        hasNext={false}
        nextCursor={null}
        prevCursors={['cursorA']}
        currentAfter="cursorB"
        baseUrl="/category/gloves"
        persistParams={persistParams}
      />
    )

    const prevLink = screen.getByRole('link', { name: 'Previous page' })
    const params = new URLSearchParams(prevLink.getAttribute('href')?.split('?')[1])
    expect(params.get('sort')).toBe('CREATED')
    expect(params.getAll('filter')).toEqual(['{"v":"nitrile"}'])
  })
})

describe('CategoryPagination scroll behavior', () => {
  it('disables scroll-to-top on the next-page link', () => {
    render(
      <CategoryPagination
        currentPage={1}
        hasNext={true}
        nextCursor="cursorA"
        prevCursors={[]}
        currentAfter={null}
        baseUrl="/category/gloves"
      />
    )

    const nextLink = screen.getByRole('link', { name: 'Next page' })
    expect(nextLink).toHaveAttribute('data-scroll', 'false')
  })

  it('disables scroll-to-top on the previous-page link', () => {
    render(
      <CategoryPagination
        currentPage={2}
        hasNext={false}
        nextCursor={null}
        prevCursors={['cursorA']}
        currentAfter="cursorB"
        baseUrl="/category/gloves"
      />
    )

    const prevLink = screen.getByRole('link', { name: 'Previous page' })
    expect(prevLink).toHaveAttribute('data-scroll', 'false')
  })
})
```

- [ ] **Step 2: Run test to verify the new assertions fail**

Run: `npx vitest run components/category/__tests__/CategoryPagination.test.tsx`
Expected: The two "scroll behavior" tests FAIL (`data-scroll="undefined"`, expected `"false"`). The two "filter/sort persistence" tests still PASS (the mock forwards `href` unchanged).

- [ ] **Step 3: Add `scroll={false}` to both pagination links**

In `components/category/CategoryPagination.tsx`, update the prev `<Link>` (around line 118):

```tsx
        <Link
          href={prevHref}
          scroll={false}
          aria-label="Previous page"
          className="flex size-[35px] items-center justify-center text-navy-900 hover:text-navy-950 transition-colors"
        >
```

And the next `<Link>` (around line 182):

```tsx
        <Link
          href={nextHref}
          scroll={false}
          aria-label="Next page"
          className="flex size-[35px] items-center justify-center text-navy-900 hover:text-navy-950 transition-colors"
        >
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/category/__tests__/CategoryPagination.test.tsx`
Expected: PASS (all 4 tests)

- [ ] **Step 5: Commit**

```bash
git add components/category/CategoryPagination.tsx components/category/__tests__/CategoryPagination.test.tsx
git commit -m "fix: disable scroll-to-top on category pagination links"
```

---

## Task 3: Extract `CategoryResultsSkeleton`

**Files:**
- Create: `components/category/CategoryResultsSkeleton.tsx`
- Modify: `app/category/[slug]/loading.tsx`

**Interfaces:**
- Produces: `CategoryResultsSkeleton` — a Server Component with no props, rendering a `<>` fragment of `<aside>` + product-grid skeleton markup (used later by Task 5 as the `<Suspense>` fallback).

- [ ] **Step 1: Create `CategoryResultsSkeleton`**

Create `components/category/CategoryResultsSkeleton.tsx`:

```tsx
import { Skeleton } from "@/components/ui/Skeleton";

export function CategoryResultsSkeleton() {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-[280px] shrink-0 pr-10 sticky top-[140px]">
        <Skeleton className="h-5 w-20 mb-6" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="mb-7">
            <Skeleton className="h-4 w-28 mb-3" />
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="flex items-center gap-2 mb-2.5">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        ))}
      </aside>

      {/* Product grid */}
      <div className="flex-1 min-w-0">
        {/* Sort bar */}
        <div className="flex justify-end mb-6">
          <Skeleton className="h-9 w-40" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-[23px]">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex flex-col bg-white">
              <Skeleton className="aspect-square w-full" />
              <div className="px-[22px] pt-[19px] pb-[22px] flex flex-col gap-2">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-5 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Shrink `loading.tsx` to use it**

Replace the full contents of `app/category/[slug]/loading.tsx`:

```tsx
import { Skeleton } from "@/components/ui/Skeleton";
import { CategoryResultsSkeleton } from "@/components/category/CategoryResultsSkeleton";

export default function CategoryLoading() {
  return (
    <main className="bg-[#f9fafc] min-h-screen">
      {/* Breadcrumb */}
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-5">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-10" />
          <span className="text-gray-300">›</span>
          <Skeleton className="h-4 w-32" />
        </div>
      </div>

      {/* Hero banner */}
      <Skeleton className="w-full h-[220px] sm:h-[280px]" />

      {/* Main layout */}
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-8 flex gap-0 items-start">
        <CategoryResultsSkeleton />
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles cleanly**

Run: `npx tsc --noEmit`
Expected: no errors referencing `CategoryResultsSkeleton` or `app/category/[slug]/loading.tsx`

- [ ] **Step 4: Commit**

```bash
git add components/category/CategoryResultsSkeleton.tsx app/category/\[slug\]/loading.tsx
git commit -m "refactor: extract CategoryResultsSkeleton for reuse as a scoped Suspense fallback"
```

---

## Task 4: Create `CategoryResults`

**Files:**
- Create: `components/category/CategoryResults.tsx`

**Interfaces:**
- Consumes: `GET_COLLECTION` (`lib/shopify/queries/collections.ts`, unchanged), `Collection` type, `getVisibleFilters` (`lib/shopify/filters.ts`), `withTrackingParams`/`TrackingParamSource` (`lib/analytics/tracking-params.ts`), `CategoryFilters`, `CategorySort`, `ProductGrid`, `CategoryPagination`, `FilterDrawer`, `ROUTES.category`
- Produces: `CategoryResults` — async Server Component, props:
  ```ts
  interface CategoryResultsProps {
    slug: string
    sortKey: string
    reverse: boolean
    sortParam?: string
    activeFilterStrings: string[]
    currentPage: number
    after: string | null
    prevCursors: string[]
    trackingParamsSource: TrackingParamSource
  }
  ```
  Renders the `<aside>` filter sidebar + product area (sort bar, active filter chips, `FilterDrawer`, `ProductGrid`, `CategoryPagination`) as a single fragment. Calls `notFound()` if the collection doesn't exist or if `currentPage > 1` resolves to zero products on an unfiltered view.

This is a Server Component performing a live Shopify fetch; it has no existing unit-test coverage pattern in this codebase (`app/category/[slug]/page.tsx` itself isn't unit tested either — see `git log` / no `page.test.tsx` anywhere in `app/`). Verification is TypeScript + the manual check in Task 6.

- [ ] **Step 1: Create `CategoryResults.tsx`**

```tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { X } from 'lucide-react'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_COLLECTION } from '@/lib/shopify/queries/collections'
import type { Collection } from '@/lib/shopify/types'
import { getVisibleFilters } from '@/lib/shopify/filters'
import { withTrackingParams, type TrackingParamSource } from '@/lib/analytics/tracking-params'
import { CategoryFilters } from '@/components/category/CategoryFilters'
import { CategorySort } from '@/components/category/CategorySort'
import { ProductGrid } from '@/components/category/ProductGrid'
import { CategoryPagination } from '@/components/category/CategoryPagination'
import { FilterDrawer } from '@/components/category/FilterDrawer'
import { ROUTES } from '@/lib/routes'

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

interface Props {
  slug: string
  sortKey: string
  reverse: boolean
  sortParam?: string
  activeFilterStrings: string[]
  currentPage: number
  after: string | null
  prevCursors: string[]
  trackingParamsSource: TrackingParamSource
}

export async function CategoryResults({
  slug,
  sortKey,
  reverse,
  sortParam,
  activeFilterStrings,
  currentPage,
  after,
  prevCursors,
  trackingParamsSource,
}: Props) {
  const isFiltered = activeFilterStrings.length > 0 || Boolean(sortParam)

  const data = await storefrontFetch<{ collection: Collection | null }>(GET_COLLECTION, {
    handle: slug,
    first: 9,
    after,
    sortKey,
    reverse,
    filters: parseFilters(activeFilterStrings),
  })

  if (!data.collection) notFound()

  if (!isFiltered && currentPage > 1 && data.collection.products.nodes.length === 0) notFound()

  const { collection } = data
  const products = collection.products.nodes
  const { pageInfo } = collection.products
  const rawFilters = collection.products.filters ?? []
  const filters = getVisibleFilters(rawFilters, activeFilterStrings)

  const removeFilterUrl = (filterToRemove: string) => {
    const next = activeFilterStrings.filter((f) => f !== filterToRemove)
    const p = new URLSearchParams()
    if (sortParam) p.set('sort', sortParam)
    next.forEach((f) => p.append('filter', f))
    withTrackingParams(p, trackingParamsSource)
    const qs = p.toString()
    return qs ? `/category/${slug}?${qs}` : `/category/${slug}`
  }

  const persistParams = new URLSearchParams()
  if (sortParam) persistParams.set('sort', sortParam)
  activeFilterStrings.forEach((f) => persistParams.append('filter', f))
  withTrackingParams(persistParams, trackingParamsSource)

  const filterLabelMap = new Map(
    rawFilters.flatMap((g) => g.values.map((v) => [v.input, v.label] as const)),
  )

  return (
    <>
      {/* Desktop filter sidebar */}
      <aside className="hidden lg:block w-[280px] shrink-0 pr-10 sticky top-[140px]">
        <CategoryFilters
          filters={filters}
          activeFilters={activeFilterStrings}
          currentSort={sortParam}
        />
      </aside>

      {/* Product area */}
      <div className="flex-1 min-w-0">
        {/* Sort bar */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-500 text-[15px]">
            Showing {products.length} products
          </p>
          <CategorySort currentSort={sortParam} activeFilters={activeFilterStrings} />
        </div>

        {/* Active filter chips */}
        {activeFilterStrings.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {activeFilterStrings.map((f) => {
              let label = filterLabelMap.get(f) ?? f
              try {
                const parsed = JSON.parse(f)
                if (parsed?.price) {
                  const { min, max } = parsed.price
                  label = max >= 200000
                    ? `Price: $${Number(min).toLocaleString()}+`
                    : `Price: $${Number(min).toLocaleString()} – $${Number(max).toLocaleString()}`
                }
              } catch { /* keep raw */ }
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
          currentSort={sortParam}
        />

        {/* Product grid */}
        <ProductGrid
          products={products}
          emptyStateHref={ROUTES.category(slug)}
          categorySlug={collection.handle}
          itemListId={collection.handle}
          itemListName={collection.title}
        />

        {/* Pagination — works for both plain and filtered/sorted views */}
        <CategoryPagination
          currentPage={currentPage}
          hasNext={pageInfo.hasNextPage}
          nextCursor={pageInfo.endCursor ?? null}
          prevCursors={prevCursors}
          currentAfter={after}
          baseUrl={ROUTES.category(slug)}
          persistParams={persistParams}
        />
      </div>
    </>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

Run: `npx tsc --noEmit`
Expected: no errors referencing `CategoryResults.tsx` (it's not imported anywhere yet, so this only checks the file is internally type-correct)

- [ ] **Step 3: Commit**

```bash
git add components/category/CategoryResults.tsx
git commit -m "feat: add CategoryResults server component for scoped product-area suspense"
```

---

## Task 5: Rewire `page.tsx` into shell + scoped Suspense

**Files:**
- Modify: `app/category/[slug]/page.tsx`

**Interfaces:**
- Consumes: `GET_COLLECTION_HERO`/`CollectionHero` (Task 1), `CategoryResults` (Task 4), `CategoryResultsSkeleton` (Task 3)
- Produces: `CategorySearchParams` type (exported, in case a future task needs it — currently only consumed within this file)

- [ ] **Step 1: Replace `app/category/[slug]/page.tsx`**

```tsx
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_COLLECTION_HERO } from '@/lib/shopify/queries/collections'
import type { CollectionHero } from '@/lib/shopify/types'
import { CategoryResults } from '@/components/category/CategoryResults'
import { CategoryResultsSkeleton } from '@/components/category/CategoryResultsSkeleton'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { buildMetadata } from '@/lib/seo'
import { buildCollectionPageSchema, buildBreadcrumbListSchema, jsonLdSafe } from '@/lib/schema'
import { SITE_URL } from '@/lib/seo/constants'
import { ROUTES } from '@/lib/routes'
import { getClusterLinks } from '@/lib/cluster-links'
import { getSubcategories, getRelatedCategories } from '@/lib/category-utils'
import { CategoryImage } from '@/components/shared/CategoryImage'
import { getCategoryBannerConfig } from '@/lib/bunnycdn'

export const revalidate = 30

export interface CategorySearchParams {
  sort?: string
  after?: string
  filter?: string | string[]
  page?: string
  cursors?: string
}

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<CategorySearchParams>
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

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params
  const sp = await searchParams
  const base = SITE_URL

  const activeFilterStrings = parseFilterParam(sp.filter)
  const isFiltered = activeFilterStrings.length > 0 || Boolean(sp.sort)
  const currentPage = parseInt(sp.page ?? '1', 10)

  try {
    const data = await storefrontFetch<{ collection: CollectionHero | null }>(
      GET_COLLECTION_HERO,
      { handle: slug },
    )
    if (!data.collection) return { title: 'Category | MD Supplies' }
    const { title, description } = data.collection

    if (isFiltered) {
      return buildMetadata({
        pageType: 'category',
        title,
        description: description || undefined,
        canonical: `${base}/category/${slug}`,
        noIndex: true,
      })
    }

    if (currentPage > 1) {
      return buildMetadata({
        pageType: 'category',
        title,
        description: description || undefined,
        canonical: `${base}/category/${slug}?page=${currentPage}`,
      })
    }

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
  const prevCursors = sp.cursors ? sp.cursors.split(',').filter(Boolean) : []

  if (isNaN(currentPage) || currentPage < 1) notFound()

  const [data, subcategories, relatedCategories] = await Promise.all([
    storefrontFetch<{ collection: CollectionHero | null }>(GET_COLLECTION_HERO, { handle: slug }),
    getSubcategories(slug),
    getRelatedCategories(slug),
  ])

  if (!data.collection) notFound()

  const banner = getCategoryBannerConfig(slug)
  const clusterLinks = getClusterLinks(slug)

  const { collection } = data

  return (
    <main id="main-content" className="bg-[#f9fafc] min-h-screen">
      {/* Breadcrumb */}
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-4">
        <Breadcrumb items={[{ label: collection.title }]} />
      </div>

      {/* ── Hero — banner image always present (BunnyCDN → Shopify → neutral panel) ── */}
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 pb-8">
        <div className="relative bg-white overflow-hidden flex min-h-[320px] sm:min-h-[380px]">
          {/* Text content */}
          <div className="relative z-10 flex flex-col justify-center px-8 sm:px-12 py-10 max-w-[560px]">
            <div className="inline-flex self-start items-center bg-[rgba(0,193,255,0.2)] rounded-full px-4 py-1.5 mb-5">
              <span className="text-[#0086b1] text-[13px] font-semibold tracking-[0.3px]">
                CERTIFIED MEDICAL SUPPLIER
              </span>
            </div>

            <h1 className="text-navy-900 text-[40px] sm:text-[50px] font-semibold leading-[1.2] tracking-[-0.01em] mb-4">
              {collection.title}
            </h1>

            {collection.description && (
              <p className="text-gray-500 text-[15px] leading-[1.75] mb-8 max-w-[500px]">
                {collection.description}
              </p>
            )}

            <Link
              href={ROUTES.category(slug)}
              className="self-start border border-navy-900 text-navy-900 text-[14px] font-semibold px-6 h-[52px] flex items-center hover:bg-navy-900 hover:text-white transition-colors"
            >
              View All {collection.title}
            </Link>
          </div>

          {/* Right: banner image — only on larger screens, matching the existing layout */}
          <div className="hidden lg:block absolute right-0 top-0 bottom-0 w-[55%]">
            <CategoryImage
              bannerPath={banner.path}
              alt={banner.alt}
            />
          </div>
        </div>
      </div>

      {/* ── Subcategory tabs ── */}
      {subcategories.length > 0 && (
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 mb-6">
          <div className="flex flex-wrap gap-2 items-center">
            {subcategories.map((sub) => (
              <Link
                key={sub.slug}
                href={ROUTES.subcategory(slug, sub.slug)}
                className="border border-[rgba(102,102,100,0.2)] bg-white text-navy-900 text-[13px] font-semibold px-4 h-[52px] flex items-center hover:border-navy-900 transition-colors whitespace-nowrap"
              >
                {sub.label}
              </Link>
            ))}
            <Link
              href={ROUTES.category(slug)}
              className="bg-navy-900 text-white text-[13px] font-semibold px-4 h-[52px] flex items-center hover:bg-navy-800 transition-colors whitespace-nowrap"
            >
              All
            </Link>
          </div>
        </div>
      )}

      {/* Main layout */}
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-6 flex gap-0 items-start">
        <Suspense fallback={<CategoryResultsSkeleton />}>
          <CategoryResults
            slug={slug}
            sortKey={sortKey}
            reverse={reverse}
            sortParam={sp.sort}
            activeFilterStrings={activeFilterStrings}
            currentPage={currentPage}
            after={sp.after ?? null}
            prevCursors={prevCursors}
            trackingParamsSource={sp}
          />
        </Suspense>
      </div>

      {/* Related categories */}
      {relatedCategories.length > 0 && (
        <section className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-8 border-t border-gray-200">
          <h2 className="text-navy-900 text-[18px] font-semibold mb-4">
            Related Categories
          </h2>
          <div className="flex flex-wrap gap-3">
            {relatedCategories.map((cat) => (
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

      {/* ── Cluster: Industries & Partners ── */}
      {clusterLinks && (clusterLinks.industryLinks.length > 0 || clusterLinks.partnerLinks.length > 0 || clusterLinks.occEligible) && (
        <section className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-8 border-t border-gray-200">
          <h2 className="text-navy-900 text-[18px] font-semibold mb-6">Shop by Need</h2>
          <div className="flex flex-col gap-6 sm:flex-row sm:gap-10">
            {clusterLinks.industryLinks.length > 0 && (
              <div>
                <p className="text-gray-500 text-[12px] font-semibold uppercase tracking-[0.48px] mb-3">
                  Industries
                </p>
                <div className="flex flex-wrap gap-2">
                  {clusterLinks.industryLinks.map((ind) => (
                    <Link
                      key={ind.slug}
                      href={ROUTES.industry(ind.slug)}
                      className="border border-gray-200 bg-white text-navy-900 text-[14px] px-4 py-2 hover:border-navy-900 transition-colors"
                    >
                      {ind.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {clusterLinks.partnerLinks.length > 0 && (
              <div>
                <p className="text-gray-500 text-[12px] font-semibold uppercase tracking-[0.48px] mb-3">
                  Brands
                </p>
                <div className="flex flex-wrap gap-2">
                  {clusterLinks.partnerLinks.map((p) => (
                    <Link
                      key={p.slug}
                      href={ROUTES.partner(p.slug)}
                      className="border border-gray-200 bg-white text-navy-900 text-[14px] px-4 py-2 hover:border-navy-900 transition-colors"
                    >
                      {p.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {clusterLinks.occEligible && (
              <div>
                <p className="text-gray-500 text-[12px] font-semibold uppercase tracking-[0.48px] mb-3">
                  Programs
                </p>
                <Link
                  href={ROUTES.solutions.occ}
                  className="border border-teal-500 bg-teal-50 text-teal-700 text-[14px] px-4 py-2 hover:bg-teal-100 transition-colors inline-block"
                >
                  OCC Program — Volume Pricing
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── About section — dark navy background ── */}
      {collection.descriptionHtml && (
        <section className="bg-navy-900 py-16 sm:py-20">
          <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 text-center">
            <h2 className="text-white text-[36px] sm:text-[50px] font-semibold leading-[1.2] tracking-[-0.01em] mb-8">
              About {collection.title}
            </h2>
            <div
              className="prose prose-invert max-w-[880px] mx-auto text-[15px] leading-[1.85] text-white/75
                prose-headings:text-white prose-a:text-[#0086b1] prose-strong:text-white"
              dangerouslySetInnerHTML={{ __html: collection.descriptionHtml }}
            />
          </div>
        </section>
      )}

      {!isFiltered && (
        <>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: jsonLdSafe(
                buildCollectionPageSchema({
                  name: collection.title,
                  url: `${SITE_URL}/category/${slug}`,
                  ...(collection.description ? { description: collection.description } : {}),
                  ...(collection.image?.url ? { image: collection.image.url } : {}),
                }),
              ),
            }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: jsonLdSafe(
                buildBreadcrumbListSchema(
                  [{ label: collection.title }],
                  `${SITE_URL}/category/${slug}`,
                ),
              ),
            }}
          />
        </>
      )}
    </main>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

Run: `npx tsc --noEmit`
Expected: no errors referencing `app/category/[slug]/page.tsx` or `components/category/CategoryResults.tsx`

- [ ] **Step 3: Run the full test suite**

Run: `npx vitest run`
Expected: all tests PASS, including `CategoryPagination.test.tsx` and the new `collections.test.ts`

- [ ] **Step 4: Commit**

```bash
git add app/category/\[slug\]/page.tsx
git commit -m "refactor: split category page into fast shell + scoped Suspense product results"
```

---

## Task 6: Manual verification

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`

- [ ] **Step 2: Verify no scroll jump and no full-page flash**

Open a category with more than 9 products (e.g. `/category/exam-gloves` — adjust to any populated collection handle in the store), scroll to the bottom so the pagination controls are in view, and click "Next page" (or a numbered page). Confirm:
- The browser does not jump to the top — you stay at roughly the same scroll position.
- The hero banner, breadcrumb, and filter sidebar do not flash/blank out; only the product grid area shows a brief skeleton (or no visible flash at all) before the new products render.

- [ ] **Step 3: Verify filters/sort survive pagination**

Apply a filter and a sort option, then paginate. Confirm the active filter chips and selected sort remain applied after navigating pages.

- [ ] **Step 4: Verify back/forward and shareable URLs**

Paginate two pages deep, then use the browser back button — confirm it returns to the previous page's product set and cursor. Copy the current URL, open it in a new tab, and confirm it loads the same page/filter/sort state.

- [ ] **Step 5: Verify a bad slug and a stale page number still 404**

Visit `/category/not-a-real-collection` — confirm the 404 page renders. Visit a real category with `?page=999` — confirm the 404 page renders (not an infinite skeleton or a crash).

---

## Self-Review

**Spec coverage check:**

| Design requirement | Task |
|---|---|
| `GET_COLLECTION_HERO` query, decoupled from pagination | Task 1 |
| Shell renders hero/breadcrumb/subcategory-tabs/related/about/schema from the lightweight fetch | Task 5 |
| `generateMetadata` uses `GET_COLLECTION_HERO` | Task 5 |
| `CategoryResults` — sidebar + sort + chips + drawer + grid + pagination, own fetch | Task 4 |
| Wrapped in local `<Suspense>` with `CategoryResultsSkeleton` fallback | Task 5 (Suspense wiring) + Task 3 (skeleton) |
| `loading.tsx` reuses the same skeleton for consistency | Task 3 |
| `scroll={false}` on pagination links | Task 2 |
| Bad slug still 404s (shell-level) | Task 5 |
| Stale page number still 404s (results-level) | Task 4 |
| Filters/sort/tracking-param persistence unchanged | Task 4 (relocated verbatim, not modified) |
| Manual end-to-end verification | Task 6 |

**No placeholders, no TODOs found.**

**Type consistency check:** `CategoryResults`' `Props` interface (Task 4) matches exactly how it's invoked in `page.tsx` (Task 5) — `slug`, `sortKey`, `reverse`, `sortParam`, `activeFilterStrings`, `currentPage`, `after`, `prevCursors`, `trackingParamsSource` all present on both sides with matching types. `CollectionHero` (Task 1) is used identically in both `generateMetadata` and `CategoryPage` (Task 5).
