# Category Pagination Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the category page's cursor-based pagination so `?page=N` deterministically serves real page-N products, the initial HTML always contains real `/product/` anchors, cursor/API failures degrade to a page-1 redirect instead of a full error page, pagination URLs stay short, and changing pages scrolls the results into view.

**Architecture:** Replace Shopify Storefront `after`-cursor chaining with a deterministic "fetch from the start, slice locally" strategy: for page N, request `first: N * PAGE_SIZE + 1` products (no cursor) and slice out the `[  (N-1)*PAGE_SIZE, N*PAGE_SIZE )` window. This makes every `?page=N` self-contained (no dependency on a previously-issued cursor), which simultaneously fixes the duplicate-content bug (NF2), removes the cursor-chain URL bloat (NF12), and gives the "bad cursor" failure mode (NF10) a clean equivalent: a caught fetch error or an out-of-range page redirects to page 1 with filters preserved. Separately, remove the route's `loading.tsx` and the `<Suspense>` boundary around the results so the whole page renders as one blocking response — this guarantees the first HTML byte sent to any client (including non-JS crawlers) contains the real product grid, not a skeleton (M9). A small client component restores scroll-to-results on page change (NF14).

**Tech Stack:** Next.js App Router (server components, `redirect`/`notFound` from `next/navigation`), Shopify Storefront API (GraphQL), Vitest + Testing Library.

## Global Constraints

- This repo runs a modified Next.js — breaking changes vs. stock Next.js are possible; consult `node_modules/next/dist/docs/` before assuming standard behavior (per `AGENTS.md`). Already consulted for this plan: `redirect()`/`notFound()` semantics, the streaming/Suspense HTTP contract, and `unstable_rethrow`.
- `redirect()` and `notFound()` throw internally and must be called **outside** any `try` block whose `catch` would swallow them (or, if inside a `catch`, must not be re-wrapped in another `try`).
- Storefront API's `first` argument has a hard ceiling of 250 items per request — this bounds how deep deterministic pagination can go.
- Existing filter/sort/tracking-param persistence behavior (`lib/analytics/tracking-params.ts`) must be preserved unchanged on every pagination link and redirect target.
- Follow existing test conventions: component tests live in `components/**/__tests__/*.test.tsx` under the `jsdom` Vitest project; mock `next/navigation` and `@/lib/shopify/storefront` the same way the existing `CategoryResults.test.tsx` does.

---

### Task 1: Shared pagination constants

**Files:**
- Modify: `lib/category-utils.ts`

**Interfaces:**
- Produces: `CATEGORY_PAGE_SIZE: number` (9, matches the existing `first: 9`), `MAX_CATEGORY_PAGE: number` (27, derived from the Storefront `first` ceiling of 250) — both consumed by Task 4 (`CategoryResults.tsx`) and Task 5 (`page.tsx`).

- [ ] **Step 1: Add the constants**

Add to the top of `lib/category-utils.ts`, after the existing imports:

```ts
// Page size and the Storefront API `first` argument ceiling (250) that bounds
// how deep deterministic category pagination can go before falling back to
// page 1 instead of requesting more items than Shopify allows in one query.
export const CATEGORY_PAGE_SIZE = 9
const STOREFRONT_MAX_FIRST = 250
export const MAX_CATEGORY_PAGE = Math.floor((STOREFRONT_MAX_FIRST - 1) / CATEGORY_PAGE_SIZE)
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors (nothing consumes these exports yet).

- [ ] **Step 3: Commit**

```bash
git add lib/category-utils.ts
git commit -m "Add shared category pagination size/depth constants"
```

---

### Task 2: Rewrite CategoryPagination to plain page-N links

**Files:**
- Modify: `components/category/CategoryPagination.tsx`
- Test: `components/category/__tests__/CategoryPagination.test.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `CategoryPagination(props: { currentPage: number; hasNext: boolean; baseUrl: string; persistParams?: URLSearchParams })` — note `nextCursor`, `prevCursors`, and `currentAfter` are **removed** from the props. Task 4 must call it with only these four props.

- [ ] **Step 1: Rewrite the failing test first**

Replace `components/category/__tests__/CategoryPagination.test.tsx` entirely with:

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

describe('CategoryPagination page links', () => {
  it('links directly to page N without carrying any cursor state', () => {
    const persistParams = new URLSearchParams()
    persistParams.set('sort', 'PRICE_ASC')
    persistParams.append('filter', '{"v":"latex"}')

    render(
      <CategoryPagination
        currentPage={1}
        hasNext={true}
        baseUrl="/category/gloves"
        persistParams={persistParams}
      />
    )

    const nextLink = screen.getByRole('link', { name: 'Next page' })
    const params = new URLSearchParams(nextLink.getAttribute('href')?.split('?')[1])
    expect(params.get('sort')).toBe('PRICE_ASC')
    expect(params.getAll('filter')).toEqual(['{"v":"latex"}'])
    expect(params.get('page')).toBe('2')
    expect(params.has('after')).toBe(false)
    expect(params.has('cursors')).toBe(false)
  })

  it('omits the page param entirely when linking back to page 1', () => {
    const persistParams = new URLSearchParams()
    persistParams.set('sort', 'CREATED')

    render(
      <CategoryPagination
        currentPage={2}
        hasNext={false}
        baseUrl="/category/gloves"
        persistParams={persistParams}
      />
    )

    const prevLink = screen.getByRole('link', { name: 'Previous page' })
    expect(prevLink.getAttribute('href')).toBe('/category/gloves?sort=CREATED')
  })

  it('computes a direct href for a numbered page with no prior page having been visited', () => {
    render(
      <CategoryPagination currentPage={5} hasNext={true} baseUrl="/category/gloves" />
    )

    const pageSixLink = screen.getByRole('link', { name: '6' })
    expect(pageSixLink.getAttribute('href')).toBe('/category/gloves?page=6')
    const page1Link = screen.getByRole('link', { name: '1' })
    expect(page1Link.getAttribute('href')).toBe('/category/gloves')
  })
})

describe('CategoryPagination scroll behavior', () => {
  it('disables scroll-to-top on the next-page link', () => {
    render(<CategoryPagination currentPage={1} hasNext={true} baseUrl="/category/gloves" />)
    expect(screen.getByRole('link', { name: 'Next page' })).toHaveAttribute('data-scroll', 'false')
  })

  it('disables scroll-to-top on the previous-page link', () => {
    render(<CategoryPagination currentPage={2} hasNext={false} baseUrl="/category/gloves" />)
    expect(screen.getByRole('link', { name: 'Previous page' })).toHaveAttribute('data-scroll', 'false')
  })

  it('disables scroll-to-top on a numbered page link', () => {
    render(<CategoryPagination currentPage={1} hasNext={true} baseUrl="/category/gloves" />)
    expect(screen.getByRole('link', { name: '2' })).toHaveAttribute('data-scroll', 'false')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run components/category/__tests__/CategoryPagination.test.tsx`
Expected: FAIL — current `CategoryPagination` still requires `nextCursor`/`prevCursors`/`currentAfter` props (TypeScript/runtime prop mismatch) and old tests are gone so these new assertions don't match current href-building.

- [ ] **Step 3: Rewrite the component**

Replace `components/category/CategoryPagination.tsx` entirely with:

```tsx
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  currentPage: number
  hasNext: boolean
  baseUrl: string
  /** Sort/filter params to carry through every page link (e.g. sort, filter[]). */
  persistParams?: URLSearchParams
}

type PageItem =
  | { kind: 'page'; page: number; href: string | null; isCurrent: boolean }
  | { kind: 'ellipsis'; key: string }

function pageHref(baseUrl: string, persistParams: URLSearchParams, page: number): string {
  const p = new URLSearchParams(persistParams)
  if (page > 1) p.set('page', String(page))
  else p.delete('page')
  const qs = p.toString()
  return qs ? `${baseUrl}?${qs}` : baseUrl
}

function buildPages(
  currentPage: number,
  hasNext: boolean,
  baseUrl: string,
  persistParams: URLSearchParams,
): PageItem[] {
  const items: PageItem[] = []
  const href = (page: number) => pageHref(baseUrl, persistParams, page)

  if (currentPage === 1) {
    items.push({ kind: 'page', page: 1, href: null, isCurrent: true })
    if (hasNext) {
      items.push({ kind: 'page', page: 2, href: href(2), isCurrent: false })
      items.push({ kind: 'ellipsis', key: 'end' })
    }
  } else if (currentPage === 2) {
    items.push({ kind: 'page', page: 1, href: href(1), isCurrent: false })
    items.push({ kind: 'page', page: 2, href: null, isCurrent: true })
    if (hasNext) {
      items.push({ kind: 'page', page: 3, href: href(3), isCurrent: false })
      items.push({ kind: 'ellipsis', key: 'end' })
    }
  } else {
    // currentPage >= 3
    items.push({ kind: 'page', page: 1, href: href(1), isCurrent: false })
    items.push({ kind: 'ellipsis', key: 'start' })
    items.push({ kind: 'page', page: currentPage, href: null, isCurrent: true })
    if (hasNext) {
      items.push({ kind: 'page', page: currentPage + 1, href: href(currentPage + 1), isCurrent: false })
      items.push({ kind: 'ellipsis', key: 'end' })
    }
  }

  return items
}

export function CategoryPagination({
  currentPage,
  hasNext,
  baseUrl,
  persistParams = new URLSearchParams(),
}: Props) {
  const hasPrev = currentPage > 1

  if (!hasPrev && !hasNext) return null

  const nextHref = hasNext ? pageHref(baseUrl, persistParams, currentPage + 1) : null
  const prevHref = hasPrev ? pageHref(baseUrl, persistParams, currentPage - 1) : null
  const pages = buildPages(currentPage, hasNext, baseUrl, persistParams)

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-2 pt-12">
      {/* Prev arrow */}
      {prevHref ? (
        <Link
          href={prevHref}
          scroll={false}
          aria-label="Previous page"
          className="flex size-[35px] items-center justify-center text-navy-900 hover:text-navy-950 transition-colors"
        >
          <ChevronLeft size={16} strokeWidth={2} />
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className="flex size-[35px] items-center justify-center text-gray-200 cursor-not-allowed"
        >
          <ChevronLeft size={16} strokeWidth={2} />
        </span>
      )}

      {/* Page numbers */}
      <div className="flex items-center gap-1">
        {pages.map((item) => {
          if (item.kind === 'ellipsis') {
            return (
              <span
                key={item.key}
                aria-hidden="true"
                className="flex size-[35px] items-center justify-center text-[13px] font-semibold tracking-[0.26px] text-black"
              >
                …
              </span>
            )
          }

          if (item.isCurrent) {
            return (
              <span
                key={item.page}
                aria-current="page"
                className="flex size-[35px] items-center justify-center rounded-full bg-navy-900 text-[13px] font-semibold tracking-[0.26px] text-white"
              >
                {item.page}
              </span>
            )
          }

          return item.href ? (
            <Link
              key={item.page}
              href={item.href}
              scroll={false}
              className="flex size-[35px] items-center justify-center text-[13px] font-semibold tracking-[0.26px] text-black hover:text-navy-900 transition-colors"
            >
              {item.page}
            </Link>
          ) : (
            <span
              key={item.page}
              className="flex size-[35px] items-center justify-center text-[13px] font-semibold tracking-[0.26px] text-black"
            >
              {item.page}
            </span>
          )
        })}
      </div>

      {/* Next arrow */}
      {nextHref ? (
        <Link
          href={nextHref}
          scroll={false}
          aria-label="Next page"
          className="flex size-[35px] items-center justify-center text-navy-900 hover:text-navy-950 transition-colors"
        >
          <ChevronRight size={16} strokeWidth={2} />
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className="flex size-[35px] items-center justify-center text-gray-200 cursor-not-allowed"
        >
          <ChevronRight size={16} strokeWidth={2} />
        </span>
      )}
    </nav>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run components/category/__tests__/CategoryPagination.test.tsx`
Expected: PASS (all 6 tests)

- [ ] **Step 5: Commit**

```bash
git add components/category/CategoryPagination.tsx components/category/__tests__/CategoryPagination.test.tsx
git commit -m "Simplify CategoryPagination to direct page-N links (drop cursor chain)"
```

---

### Task 3: Scroll-to-results client component (NF14)

**Files:**
- Create: `components/category/ScrollToResults.tsx`
- Test: `components/category/__tests__/ScrollToResults.test.tsx`

**Interfaces:**
- Produces: `ScrollToResults(props: { page: number; children: ReactNode })` — a client component. Consumed by Task 4 (`CategoryResults.tsx`), which wraps the product/sort/filter section in it and passes `currentPage` as `page`.

- [ ] **Step 1: Write the failing test**

Create `components/category/__tests__/ScrollToResults.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { ScrollToResults } from '../ScrollToResults'

afterEach(cleanup)

describe('ScrollToResults', () => {
  it('does not scroll on initial mount', () => {
    const scrollIntoView = vi.fn()
    HTMLElement.prototype.scrollIntoView = scrollIntoView

    render(
      <ScrollToResults page={1}>
        <div>results</div>
      </ScrollToResults>
    )

    expect(scrollIntoView).not.toHaveBeenCalled()
  })

  it('scrolls the results into view when the page prop changes', () => {
    const scrollIntoView = vi.fn()
    HTMLElement.prototype.scrollIntoView = scrollIntoView

    const { rerender } = render(
      <ScrollToResults page={1}>
        <div>results</div>
      </ScrollToResults>
    )

    rerender(
      <ScrollToResults page={2}>
        <div>results</div>
      </ScrollToResults>
    )

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
  })

  it('does not scroll again on a re-render where the page is unchanged', () => {
    const scrollIntoView = vi.fn()
    HTMLElement.prototype.scrollIntoView = scrollIntoView

    const { rerender } = render(
      <ScrollToResults page={1}>
        <div>results</div>
      </ScrollToResults>
    )

    rerender(
      <ScrollToResults page={1}>
        <div>results, refreshed</div>
      </ScrollToResults>
    )

    expect(scrollIntoView).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/category/__tests__/ScrollToResults.test.tsx`
Expected: FAIL with "Cannot find module '../ScrollToResults'" (file doesn't exist yet)

- [ ] **Step 3: Create the component**

Create `components/category/ScrollToResults.tsx`:

```tsx
'use client'

import { useEffect, useRef, type ReactNode } from 'react'

interface Props {
  page: number
  children: ReactNode
}

// Category pagination links use `scroll={false}` (see CategoryPagination) so
// Next.js doesn't jump to the top of the page on every click. Without this,
// nothing brings the new results into view — the shopper stays scrolled at
// wherever they clicked (often the pagination controls near the footer).
export function ScrollToResults({ page, children }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [page])

  return <div ref={ref}>{children}</div>
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/category/__tests__/ScrollToResults.test.tsx`
Expected: PASS (all 3 tests)

- [ ] **Step 5: Commit**

```bash
git add components/category/ScrollToResults.tsx components/category/__tests__/ScrollToResults.test.tsx
git commit -m "Add ScrollToResults: scroll product grid into view on page change"
```

---

### Task 4: Deterministic page-N fetch + redirect-on-failure in CategoryResults (NF2 core, NF10, NF14 wiring)

**Files:**
- Modify: `components/category/CategoryResults.tsx`
- Test: `components/category/__tests__/CategoryResults.test.tsx`

**Interfaces:**
- Consumes: `CATEGORY_PAGE_SIZE` from `@/lib/category-utils` (Task 1), `CategoryPagination` with the new 4-prop signature (Task 2), `ScrollToResults` (Task 3).
- Produces: `CategoryResults(props)` where `Props` **drops** `after: string | null` and `prevCursors: string[]` compared to today. Task 5 must stop passing them.

- [ ] **Step 1: Update the test file's mocks and props first**

Replace `components/category/__tests__/CategoryResults.test.tsx` entirely with:

```tsx
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import type { Collection, CollectionProduct } from '@/lib/shopify/types'

const mockRedirect = vi.fn()

vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
  redirect: (url: string) => {
    mockRedirect(url)
    throw new Error(`REDIRECT:${url}`)
  },
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/category/occ',
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@/lib/shopify/storefront', () => ({
  storefrontFetch: vi.fn(),
}))

// Isolate this suite from ShopifyProductCard/ShopifyQuickAddButton/cart
// context — CategoryResults' own slicing/fetch logic is what's under test.
vi.mock('@/components/category/ProductGrid', () => ({
  ProductGrid: ({ products }: { products: CollectionProduct[] }) => (
    <ul>
      {products.map((p) => (
        <li key={p.id}>{p.title}</li>
      ))}
    </ul>
  ),
}))

import { storefrontFetch } from '@/lib/shopify/storefront'
import { CategoryResults } from '../CategoryResults'

const mockFetch = vi.mocked(storefrontFetch)

// A hostile Storefront `filters` response: the raw-tag facet with internal
// taxonomy/ops values, plus a mix of approved and unapproved sources.
const HOSTILE_FILTERS: Collection['products']['filters'] = [
  {
    id: 'filter.p.tag',
    label: 'Tag',
    type: 'LIST',
    values: [
      'compliance:fda-510k',
      'discontinued',
      'consolidation-duplicate',
      'brand:acme',
    ].map((tag) => ({ id: `filter.p.tag.${tag}`, label: tag, count: 3, input: `{"tag":"${tag}"}` })),
  },
  {
    id: 'filter.v.availability',
    label: 'Availability',
    type: 'LIST',
    values: [{ id: 'avail.true', label: 'In stock', count: 5, input: '{"available":true}' }],
  },
  {
    id: 'filter.p.m.custom.glove_size',
    label: 'Glove size',
    type: 'LIST',
    values: [{ id: 'gs.m', label: 'Medium', count: 2, input: '{"productMetafield":{"namespace":"custom","key":"glove_size","value":"M"}}' }],
  },
]

function mockProduct(handle: string): CollectionProduct {
  return {
    id: `gid://shopify/Product/${handle}`,
    title: handle,
    handle,
    vendor: 'Acme',
    availableForSale: true,
    tags: [],
    priceRange: {
      minVariantPrice: { amount: '10.00', currencyCode: 'USD' },
      maxVariantPrice: { amount: '10.00', currencyCode: 'USD' },
    },
    images: { nodes: [] },
    variants: { nodes: [] },
  }
}

function mockCollection(slug: string, nodes: CollectionProduct[] = []): Collection {
  return {
    id: 'gid://shopify/Collection/1',
    title: 'Test collection',
    handle: slug,
    description: '',
    descriptionHtml: '',
    image: null,
    seo: { title: null, description: null },
    products: {
      nodes,
      pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null },
      filters: HOSTILE_FILTERS,
    },
  }
}

function baseProps(slug: string) {
  return {
    slug,
    sortKey: 'COLLECTION_DEFAULT',
    reverse: false,
    sortParam: undefined,
    activeFilterStrings: [],
    currentPage: 1,
    trackingParamsSource: new URLSearchParams(),
  }
}

afterEach(cleanup)
beforeEach(() => {
  mockFetch.mockReset()
  mockRedirect.mockReset()
})

describe('CategoryResults filter rail is registry-gated', () => {
  it('never renders the raw-tag facet or blocked tag values, even when the Storefront response includes them', async () => {
    mockFetch.mockResolvedValue({ collection: mockCollection('occ') })

    const element = await CategoryResults(baseProps('occ'))
    render(element)

    expect(screen.queryByText('compliance:fda-510k')).toBeNull()
    expect(screen.queryByText('discontinued')).toBeNull()
    expect(screen.queryByText('consolidation-duplicate')).toBeNull()
    expect(screen.queryByText('brand:acme')).toBeNull()
  })

  it('drops facets not on the OCC allowlist (e.g. glove size) even though the Storefront response includes them', async () => {
    mockFetch.mockResolvedValue({ collection: mockCollection('occ') })

    const element = await CategoryResults(baseProps('occ'))
    render(element)

    expect(screen.queryByText('Glove size')).toBeNull()
    expect(screen.getByText('Availability')).toBeInTheDocument()
  })

  it('renders the glove-size facet on the gloves collection, where it is allowlisted', async () => {
    mockFetch.mockResolvedValue({ collection: mockCollection('gloves') })

    const element = await CategoryResults(baseProps('gloves'))
    render(element)

    expect(screen.getByText('Glove size')).toBeInTheDocument()
    expect(screen.queryByText('compliance:fda-510k')).toBeNull()
  })
})

describe('CategoryResults deterministic page-N pagination', () => {
  it('requests first = currentPage * pageSize + 1 with no cursor, for a direct deep-page visit', async () => {
    mockFetch.mockResolvedValue({ collection: mockCollection('gloves', []) })

    await CategoryResults({ ...baseProps('gloves'), currentPage: 3 })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ first: 28, after: null }),
    )
  })

  it("slices out only page 2's products and reports the real count", async () => {
    const nodes = Array.from({ length: 19 }, (_, i) => mockProduct(`p${i}`))
    mockFetch.mockResolvedValue({ collection: mockCollection('gloves', nodes) })

    const element = await CategoryResults({ ...baseProps('gloves'), currentPage: 2 })
    render(element)

    expect(screen.getByText('Showing 9 products')).toBeInTheDocument()
    expect(screen.getByText('p9')).toBeInTheDocument()
    expect(screen.queryByText('p0')).toBeNull()
    expect(screen.queryByText('p18')).toBeNull()
  })

  it('renders a real next-page anchor for a deep page, not a page-1 duplicate', async () => {
    const nodes = Array.from({ length: 19 }, (_, i) => mockProduct(`p${i}`))
    mockFetch.mockResolvedValue({ collection: mockCollection('gloves', nodes) })

    const element = await CategoryResults({ ...baseProps('gloves'), currentPage: 2 })
    render(element)

    expect(screen.getByRole('link', { name: 'Next page' })).toHaveAttribute(
      'href',
      '/category/gloves?page=3',
    )
  })
})

describe('CategoryResults error handling', () => {
  it('redirects to page 1 (filters preserved) when the Storefront fetch fails on a deep page', async () => {
    mockFetch.mockRejectedValue(new Error('Storefront API HTTP 500'))

    await expect(
      CategoryResults({
        ...baseProps('gloves'),
        currentPage: 4,
        sortParam: 'PRICE_ASC',
        activeFilterStrings: ['{"v":"latex"}'],
      }),
    ).rejects.toThrow('REDIRECT:')

    expect(mockRedirect).toHaveBeenCalledTimes(1)
    const [url] = mockRedirect.mock.calls[0]
    expect(url).toContain('/category/gloves')
    expect(url).toContain('sort=PRICE_ASC')
    expect(url).toContain('filter=')
    expect(url).not.toContain('page=')
  })

  it('lets the error surface (no redirect) when the failure happens on page 1', async () => {
    mockFetch.mockRejectedValue(new Error('Storefront API HTTP 500'))

    await expect(CategoryResults(baseProps('gloves'))).rejects.toThrow('Storefront API HTTP 500')
    expect(mockRedirect).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/category/__tests__/CategoryResults.test.tsx`
Expected: FAIL — current component signature still requires `after`/`prevCursors`, still uses `pageInfo.endCursor`-based `first: 9` fetch (so the `first: 28`/`first: 19` assertions fail), and has no redirect-on-error path.

- [ ] **Step 3: Rewrite the component**

Replace `components/category/CategoryResults.tsx` entirely with:

```tsx
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { X } from 'lucide-react'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_COLLECTION } from '@/lib/shopify/queries/collections'
import type { Collection } from '@/lib/shopify/types'
import { getVisibleFilters } from '@/lib/shopify/filters'
import { getAllowedFacets } from '@/lib/filter-registry'
import { withTrackingParams, type TrackingParamSource } from '@/lib/analytics/tracking-params'
import { CATEGORY_PAGE_SIZE } from '@/lib/category-utils'
import { CategoryFilters } from '@/components/category/CategoryFilters'
import { CategorySort } from '@/components/category/CategorySort'
import { ProductGrid } from '@/components/category/ProductGrid'
import { CategoryPagination } from '@/components/category/CategoryPagination'
import { FilterDrawer } from '@/components/category/FilterDrawer'
import { ScrollToResults } from '@/components/category/ScrollToResults'
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
  trackingParamsSource: TrackingParamSource
}

export async function CategoryResults({
  slug,
  sortKey,
  reverse,
  sortParam,
  activeFilterStrings,
  currentPage,
  trackingParamsSource,
}: Props) {
  const isFiltered = activeFilterStrings.length > 0 || Boolean(sortParam)

  // Built up front so it's available as the page-1 redirect target below,
  // not just for the links rendered at the bottom of this component.
  const persistParams = new URLSearchParams()
  if (sortParam) persistParams.set('sort', sortParam)
  activeFilterStrings.forEach((f) => persistParams.append('filter', f))
  withTrackingParams(persistParams, trackingParamsSource)
  const page1Qs = persistParams.toString()
  const page1Url = page1Qs ? `${ROUTES.category(slug)}?${page1Qs}` : ROUTES.category(slug)

  // Deterministic page-N: fetch from the start of the (sorted/filtered)
  // result set and slice locally, instead of chaining a Storefront `after`
  // cursor. Every `?page=N` becomes self-contained and immune to
  // stale/expired cursors — the tradeoff is refetching earlier pages'
  // products on every request, bounded by MAX_CATEGORY_PAGE upstream.
  const first = currentPage * CATEGORY_PAGE_SIZE + 1

  let data: { collection: Collection | null }
  try {
    data = await storefrontFetch<{ collection: Collection | null }>(GET_COLLECTION, {
      handle: slug,
      first,
      after: null,
      sortKey,
      reverse,
      filters: parseFilters(activeFilterStrings),
    })
  } catch (err) {
    // A transient Storefront failure shouldn't take down a deep page with a
    // full error page — bounce back to page 1 (filters/sort intact)
    // instead. Page 1 has no lower fallback, so let it surface to error.tsx.
    if (currentPage > 1) {
      redirect(page1Url)
    }
    throw err
  }

  if (!data.collection) notFound()

  const { collection } = data
  const allNodes = collection.products.nodes
  const startIndex = (currentPage - 1) * CATEGORY_PAGE_SIZE
  const products = allNodes.slice(startIndex, startIndex + CATEGORY_PAGE_SIZE)
  const hasNext = allNodes.length > currentPage * CATEGORY_PAGE_SIZE

  if (!isFiltered && currentPage > 1 && products.length === 0) notFound()

  // Registry gate: only allowlisted facet sources may reach the filter rail —
  // the Storefront `filters` response is untrusted input.
  const allowedFacets = getAllowedFacets(slug, collection.products.filters ?? [])
  const filters = getVisibleFilters(allowedFacets, activeFilterStrings)

  const removeFilterUrl = (filterToRemove: string) => {
    const next = activeFilterStrings.filter((f) => f !== filterToRemove)
    const p = new URLSearchParams()
    if (sortParam) p.set('sort', sortParam)
    next.forEach((f) => p.append('filter', f))
    withTrackingParams(p, trackingParamsSource)
    const qs = p.toString()
    return qs ? `/category/${slug}?${qs}` : `/category/${slug}`
  }

  const filterLabelMap = new Map(
    allowedFacets.flatMap((g) => g.values.map((v) => [v.input, v.label] as const)),
  )

  return (
    <>
      {/* Desktop filter sidebar */}
      <aside className="hidden lg:block w-[280px] shrink-0 pr-10 sticky top-[140px] max-h-[calc(100vh-160px)] overflow-y-auto">
        <CategoryFilters
          filters={filters}
          activeFilters={activeFilterStrings}
          currentSort={sortParam}
        />
      </aside>

      {/* Product area */}
      <ScrollToResults page={currentPage}>
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
            hasNext={hasNext}
            baseUrl={ROUTES.category(slug)}
            persistParams={persistParams}
          />
        </div>
      </ScrollToResults>
    </>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/category/__tests__/CategoryResults.test.tsx`
Expected: PASS (all 8 tests)

- [ ] **Step 5: Commit**

```bash
git add components/category/CategoryResults.tsx components/category/__tests__/CategoryResults.test.tsx
git commit -m "CategoryResults: deterministic page-N fetch, redirect to page 1 on fetch failure"
```

---

### Task 5: Wire the page component — drop cursors, cap deep pages, remove Suspense (NF2 page-level, NF10 cap, M9)

**Files:**
- Modify: `app/category/[slug]/page.tsx`

**Interfaces:**
- Consumes: `MAX_CATEGORY_PAGE` from `@/lib/category-utils` (Task 1), `CategoryResults` with its new (no `after`/`prevCursors`) prop signature (Task 4).
- Produces: `CategorySearchParams` type with `after`/`cursors` fields removed — no other file reads these fields today (verified: only `page.tsx` and `CategoryResults.tsx` referenced them).

- [ ] **Step 1: Edit `generateMetadata` and `CategorySearchParams`**

In `app/category/[slug]/page.tsx`, update the imports at the top: remove `Suspense` from the `react` import (delete that whole `import { Suspense } from 'react'` line), remove the `CategoryResultsSkeleton` import, add `redirect` to the `next/navigation` import, add `MAX_CATEGORY_PAGE` to the `category-utils` import, and add a `tracking-params` import:

```tsx
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_COLLECTION_HERO } from '@/lib/shopify/queries/collections'
import type { CollectionHero } from '@/lib/shopify/types'
import { CategoryResults } from '@/components/category/CategoryResults'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { buildMetadata, trimDescription } from '@/lib/seo'
import { buildCollectionPageSchema, buildBreadcrumbListSchema, jsonLdSafe } from '@/lib/schema'
import { SITE_URL } from '@/lib/seo/constants'
import { ROUTES } from '@/lib/routes'
import { getClusterLinks } from '@/lib/cluster-links'
import { getSubcategories, getRelatedCategories, MAX_CATEGORY_PAGE } from '@/lib/category-utils'
import { CategoryImage } from '@/components/shared/CategoryImage'
import { getCategoryBannerConfig } from '@/lib/bunnycdn'
import { isAllowedFilterInput } from '@/lib/filter-registry'
import { withTrackingParams } from '@/lib/analytics/tracking-params'

export const revalidate = 30

export type CategorySearchParams = {
  sort?: string
  filter?: string | string[]
  page?: string
}
```

Then add this helper right after `parseFilterParam` (before `generateMetadata`):

```tsx
// Beyond MAX_CATEGORY_PAGE the deterministic per-page fetch in CategoryResults
// would need a Storefront `first` larger than the API allows — bounce to
// page 1 instead of erroring, mirroring the fetch-failure fallback there.
function page1RedirectUrl(slug: string, sp: CategorySearchParams, activeFilterStrings: string[]): string {
  const p = new URLSearchParams()
  if (sp.sort) p.set('sort', sp.sort)
  activeFilterStrings.forEach((f) => p.append('filter', f))
  withTrackingParams(p, sp)
  const qs = p.toString()
  return qs ? `${ROUTES.category(slug)}?${qs}` : ROUTES.category(slug)
}
```

Then in `generateMetadata`, replace:

```tsx
  const currentPage = parseInt(sp.page ?? '1', 10)
```

with:

```tsx
  const requestedPage = parseInt(sp.page ?? '1', 10)
  const currentPage = requestedPage > MAX_CATEGORY_PAGE ? 1 : requestedPage
```

(leave the rest of `generateMetadata` unchanged — it already branches on `currentPage`).

- [ ] **Step 2: Edit the default export**

In the `CategoryPage` function, remove the `prevCursors` line and add the depth-cap redirect. Replace:

```tsx
  const currentPage = parseInt(sp.page ?? '1', 10)
  const isFiltered = activeFilterStrings.length > 0 || Boolean(sp.sort)
  const prevCursors = sp.cursors ? sp.cursors.split(',').filter(Boolean) : []

  if (isNaN(currentPage) || currentPage < 1) notFound()
```

with:

```tsx
  const currentPage = parseInt(sp.page ?? '1', 10)
  const isFiltered = activeFilterStrings.length > 0 || Boolean(sp.sort)

  if (isNaN(currentPage) || currentPage < 1) notFound()
  if (currentPage > MAX_CATEGORY_PAGE) redirect(page1RedirectUrl(slug, sp, activeFilterStrings))
```

- [ ] **Step 3: Remove the Suspense wrapper around CategoryResults**

Replace:

```tsx
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
```

with:

```tsx
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-6 flex gap-0 items-start">
        <CategoryResults
          slug={slug}
          sortKey={sortKey}
          reverse={reverse}
          sortParam={sp.sort}
          activeFilterStrings={activeFilterStrings}
          currentPage={currentPage}
          trackingParamsSource={sp}
        />
      </div>
```

This is the fix for M9: with no `<Suspense>` boundary and no route-level `loading.tsx` (deleted in Task 6), `CategoryResults` is awaited as part of the same blocking render as the hero/subcategories/related-categories data above — the first (and only) HTML chunk sent to the client always contains the real product grid and its `/product/` anchors.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. (If `sp` doesn't structurally satisfy `TrackingParamSource` in `withTrackingParams(p, sp)`, check `lib/analytics/tracking-params.ts` — `CategorySearchParams` is a `Record<string, string | string[] | undefined>` shape, which is one of the accepted union members, so no cast should be needed.)

- [ ] **Step 5: Commit**

```bash
git add app/category/[slug]/page.tsx
git commit -m "CategoryPage: cap pagination depth, drop cursor params, remove Suspense gate"
```

---

### Task 6: Delete the now-dead Suspense skeleton (M9 cleanup)

**Files:**
- Delete: `app/category/[slug]/loading.tsx`
- Delete: `components/category/CategoryResultsSkeleton.tsx`

**Interfaces:**
- Consumes: nothing (this task only removes now-unreferenced files, after Task 5 removed the last two call sites).

- [ ] **Step 1: Confirm nothing else references these files**

Run: `grep -rn "CategoryResultsSkeleton" --include="*.tsx" --include="*.ts" .`
Expected: no matches (Task 5 removed the only import in `page.tsx`; the component's own file will be deleted next).

- [ ] **Step 2: Delete both files**

```bash
git rm app/category/[slug]/loading.tsx components/category/CategoryResultsSkeleton.tsx
```

Note: keeping this route without a `loading.tsx` is intentional here — see the Task 5 Step 3 note. A route-level `loading.tsx` unconditionally wraps the entire page in a `<Suspense>` boundary (per `node_modules/next/dist/docs/01-app/02-guides/streaming.md`), which is exactly the mechanism that caused M9 (the served HTML being the loading skeleton with zero product links). Do not re-add a `loading.tsx` to this route without re-solving M9 first.

- [ ] **Step 3: Typecheck and build**

Run: `npx tsc --noEmit`
Expected: no errors (no remaining imports of either deleted file).

- [ ] **Step 4: Commit**

```bash
git commit -m "Remove category loading.tsx / CategoryResultsSkeleton (root cause of M9)"
```

---

### Task 7: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: all tests pass, including the untouched `lib/__tests__/filter-registry.test.ts` and `app/search/__tests__/**` suites (unaffected by this change).

- [ ] **Step 2: Typecheck and build**

Run: `npx tsc --noEmit && npx next build`
Expected: clean build. Watch specifically for any other file that imported `CategorySearchParams.after`/`.cursors` or `CategoryPagination`'s old `nextCursor`/`prevCursors`/`currentAfter` props — none were found during planning (`grep -rn "prevCursors\|nextCursor\|currentAfter" --include="*.tsx" --include="*.ts" .` outside the files this plan touches), but re-check after the build in case something was missed.

- [ ] **Step 3: Manual QA against the ticket's acceptance criteria**

Start the dev server (`npm run dev`) and, for a category with enough products to span multiple pages:
- Visit `/category/<slug>?page=2` directly (no `after`/`cursors` in the URL) and confirm it shows different products than page 1, not a duplicate.
- View the page source (`curl -s http://localhost:3000/category/<slug> | grep '/product/'` or browser "View Source") and confirm real `/product/<handle>` anchors are present in the raw HTML.
- Visit `/category/<slug>?page=9999` and confirm it redirects to page 1 with any active filters/sort preserved, rather than showing an error page.
- Click "Next" a few times and confirm the URL stays short (only `page`/`sort`/`filter` params, no growing cursor chain).
- Click a pagination link and confirm the page scrolls the product grid into view (not just staying at the click position, and not jumping to the very top of the page).

This step has no pass/fail command — record the outcome for the ticket's screenshot-evidence checklist.

---

## Self-Review Notes

- **Spec coverage:** NF2 → Tasks 4 (fetch/slice) + 5 (depth cap + trustworthy canonical). M9 → Tasks 5 (remove `<Suspense>`) + 6 (remove `loading.tsx`). NF10 → Task 4 (fetch-failure redirect) + Task 5 (depth-cap redirect); genuinely-empty pages still 404 via the unchanged `notFound()` check. NF12 → resolved as a side effect of Tasks 2/4/5 (no cursor/`after`/`cursors` param exists anywhere anymore). NF14 → Task 3 + its wiring in Task 4.
- **Type consistency:** `CategoryResults` props (`slug, sortKey, reverse, sortParam, activeFilterStrings, currentPage, trackingParamsSource`) are identical across Task 4's definition and Task 5's call site. `CategoryPagination` props (`currentPage, hasNext, baseUrl, persistParams`) are identical across Task 2's definition and Task 4's call site.
- **Out of scope (confirmed with the ticket's own dependency note):** the search page's cursor/error handling is explicitly deferred to the sibling search-hardening ticket and is not touched here.
