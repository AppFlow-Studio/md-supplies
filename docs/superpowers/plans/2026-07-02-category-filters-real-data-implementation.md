# Category/Search Filters Reflect Real Product Data — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop rendering dead-end (0-count) filter options on category and search pages, and fix search's price-range slider so it reflects Shopify's real price bounds instead of a hardcoded `$0–$200,000` ceiling.

**Architecture:** Extract two pure, unit-tested utilities into a new `lib/shopify/filters.ts` — `getVisibleFilters` (drops zero-count, non-active filter values and empty groups) and `parsePriceBounds`/`calcPriceStep` (real price-range parsing, already correct in `CategoryFilters`, currently missing in `SearchFilters`). Wire `getVisibleFilters` into both server pages (`app/category/[slug]/page.tsx`, `app/search/page.tsx`) right where Shopify's raw filter response is read, keeping the raw (unpruned) list around only for resolving active-filter chip labels. No changes to Shopify queries, counting logic, or pagination/sort persistence — those are already correct.

**Tech Stack:** Next.js (App Router, async server components), TypeScript, Vitest + Testing Library, Shopify Storefront API.

## Global Constraints

- This repo runs a customized Next.js — per `AGENTS.md`, breaking changes vs. training data are possible. This plan introduces no new Next.js APIs; every server-component pattern used here (async `page.tsx`, `searchParams` as a `Promise`) already exists verbatim in the files being modified, so no new doc lookup is required.
- Follow existing code style exactly (no semicolons in `components/`/most `app/` files except `lib/shopify/*.ts`, which does use semicolons — match the file you're editing).
- Tests use Vitest (`npm test` = `vitest run`). Component tests live in `**/__tests__/*.test.tsx` (jsdom project); lib tests live in `lib/**/__tests__/*.test.ts` (node project). Path alias `@/` maps to repo root.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `lib/shopify/filters.ts` | Create | `getVisibleFilters`, `parsePriceBounds`, `calcPriceStep` |
| `lib/shopify/__tests__/filters.test.ts` | Create | Unit tests for the above |
| `components/category/CategoryFilters.tsx` | Modify | Use shared `parsePriceBounds`/`calcPriceStep` instead of local duplicates |
| `app/category/[slug]/page.tsx` | Modify | Prune filters via `getVisibleFilters` before passing to UI; keep raw list for chip labels |
| `components/search/SearchFilters.tsx` | Modify | Fix hardcoded price range; use shared `parsePriceBounds`/`calcPriceStep` |
| `components/search/__tests__/SearchFilters.test.tsx` | Create | Regression test for the price-range fix |
| `app/search/page.tsx` | Modify | Prune filters via `getVisibleFilters` before passing to UI; keep raw list for chip labels |
| `components/category/__tests__/CategoryPagination.test.tsx` | Create | Locks in existing (correct) filter/sort persistence across pagination links |

---

## Task 1: Create `lib/shopify/filters.ts` — shared filter utilities

**Files:**
- Create: `lib/shopify/filters.ts`
- Create: `lib/shopify/__tests__/filters.test.ts`

**Interfaces:**
- Consumes: `CollectionFilter` type from `lib/shopify/types.ts` (`{ id, label, type, values: { id, label, count, input }[] }`)
- Produces:
  - `getVisibleFilters(filters: CollectionFilter[], activeFilters: string[]): CollectionFilter[]`
  - `parsePriceBounds(filter: CollectionFilter): { min: number; max: number }`
  - `calcPriceStep(range: number): number`

- [ ] **Step 1: Write the failing tests for `getVisibleFilters`**

Create `lib/shopify/__tests__/filters.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { getVisibleFilters, parsePriceBounds, calcPriceStep } from '../filters'
import type { CollectionFilter } from '../types'

function listFilter(overrides: Partial<CollectionFilter> = {}): CollectionFilter {
  return {
    id: 'filter.v.option.material',
    label: 'Material',
    type: 'LIST',
    values: [
      { id: 'nitrile', label: 'Nitrile', count: 12, input: '{"v":"nitrile"}' },
      { id: 'latex', label: 'Latex', count: 0, input: '{"v":"latex"}' },
      { id: 'vinyl', label: 'Vinyl', count: 0, input: '{"v":"vinyl"}' },
    ],
    ...overrides,
  }
}

describe('getVisibleFilters', () => {
  it('drops values with zero count that are not currently active', () => {
    const result = getVisibleFilters([listFilter()], [])
    expect(result).toHaveLength(1)
    expect(result[0].values.map((v) => v.id)).toEqual(['nitrile'])
  })

  it('keeps a zero-count value if it is currently active, so it can be deselected', () => {
    const result = getVisibleFilters([listFilter()], ['{"v":"latex"}'])
    expect(result[0].values.map((v) => v.id)).toEqual(['nitrile', 'latex'])
  })

  it('drops the entire group when every value ends up hidden', () => {
    const allZero = listFilter({
      values: [
        { id: 'latex', label: 'Latex', count: 0, input: '{"v":"latex"}' },
        { id: 'vinyl', label: 'Vinyl', count: 0, input: '{"v":"vinyl"}' },
      ],
    })
    expect(getVisibleFilters([allZero], [])).toEqual([])
  })

  it('always keeps PRICE_RANGE groups regardless of the count on their single value', () => {
    const priceFilter: CollectionFilter = {
      id: 'filter.v.price',
      label: 'Price',
      type: 'PRICE_RANGE',
      values: [{ id: 'price', label: 'Price', count: 0, input: '{"price":{"min":0,"max":500}}' }],
    }
    expect(getVisibleFilters([priceFilter], [])).toEqual([priceFilter])
  })

  it('keeps unrelated groups untouched', () => {
    const vendor = listFilter({
      id: 'filter.p.vendor',
      label: 'Brand',
      values: [{ id: 'acme', label: 'Acme', count: 5, input: '{"v":"acme"}' }],
    })
    const result = getVisibleFilters([listFilter(), vendor], [])
    expect(result).toHaveLength(2)
    expect(result[1]).toEqual(vendor)
  })
})

describe('parsePriceBounds', () => {
  it('parses real min/max bounds from the filter value input', () => {
    const filter: CollectionFilter = {
      id: 'filter.v.price',
      label: 'Price',
      type: 'PRICE_RANGE',
      values: [{ id: 'price', label: 'Price', count: 1, input: '{"price":{"min":0,"max":150}}' }],
    }
    expect(parsePriceBounds(filter)).toEqual({ min: 0, max: 150 })
  })

  it('falls back to a default range on malformed input', () => {
    const filter: CollectionFilter = {
      id: 'filter.v.price',
      label: 'Price',
      type: 'PRICE_RANGE',
      values: [{ id: 'price', label: 'Price', count: 1, input: 'not-json' }],
    }
    expect(parsePriceBounds(filter)).toEqual({ min: 0, max: 500 })
  })

  it('falls back to a default range when max is not greater than min', () => {
    const filter: CollectionFilter = {
      id: 'filter.v.price',
      label: 'Price',
      type: 'PRICE_RANGE',
      values: [{ id: 'price', label: 'Price', count: 1, input: '{"price":{"min":100,"max":100}}' }],
    }
    expect(parsePriceBounds(filter)).toEqual({ min: 0, max: 500 })
  })
})

describe('calcPriceStep', () => {
  it('picks a coarser step as the range grows', () => {
    expect(calcPriceStep(20)).toBe(1)
    expect(calcPriceStep(100)).toBe(2)
    expect(calcPriceStep(500)).toBe(5)
    expect(calcPriceStep(2000)).toBe(10)
    expect(calcPriceStep(10000)).toBe(50)
    expect(calcPriceStep(50000)).toBe(100)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run lib/shopify/__tests__/filters.test.ts`
Expected: FAIL — `Cannot find module '../filters'` (the file doesn't exist yet).

- [ ] **Step 3: Implement `lib/shopify/filters.ts`**

```ts
import type { CollectionFilter } from './types';

export function getVisibleFilters(
  filters: CollectionFilter[],
  activeFilters: string[],
): CollectionFilter[] {
  return filters.reduce<CollectionFilter[]>((visible, group) => {
    if (group.type === 'PRICE_RANGE') {
      visible.push(group);
      return visible;
    }

    const values = group.values.filter(
      (v) => v.count > 0 || activeFilters.includes(v.input),
    );
    if (values.length > 0) visible.push({ ...group, values });
    return visible;
  }, []);
}

export function parsePriceBounds(filter: CollectionFilter): { min: number; max: number } {
  try {
    const parsed = JSON.parse(filter.values[0]?.input ?? '{}');
    const min = Math.max(0, Math.floor(Number(parsed?.price?.min ?? 0)));
    const max = Math.ceil(Number(parsed?.price?.max ?? 500));
    if (isFinite(min) && isFinite(max) && max > min) return { min, max };
  } catch { /* ignore */ }
  return { min: 0, max: 500 };
}

export function calcPriceStep(range: number): number {
  if (range <= 20) return 1;
  if (range <= 100) return 2;
  if (range <= 500) return 5;
  if (range <= 2000) return 10;
  if (range <= 10000) return 50;
  return 100;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run lib/shopify/__tests__/filters.test.ts`
Expected: PASS — all 9 tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/shopify/filters.ts lib/shopify/__tests__/filters.test.ts
git commit -m "feat: add getVisibleFilters and price-bounds utilities for real-data filtering"
```

---

## Task 2: Refactor `CategoryFilters.tsx` to use the shared price utilities

**Files:**
- Modify: `components/category/CategoryFilters.tsx`

**Interfaces:**
- Consumes: `parsePriceBounds`, `calcPriceStep` from `@/lib/shopify/filters` (Task 1)
- Produces: no external change — `CategoryFilters`' rendered output and behavior are identical; this only removes duplicated logic that had already drifted once (see Task 4).

- [ ] **Step 1: Replace the local `parsePriceRange`/`calcStep` with the shared import**

In `components/category/CategoryFilters.tsx`, add the import near the top (after the `withTrackingParams` import):

```ts
import { parsePriceBounds, calcPriceStep } from '@/lib/shopify/filters'
```

Delete these two local functions entirely:

```ts
function parsePriceRange(filter: CollectionFilter): { min: number; max: number } {
  try {
    const parsed = JSON.parse(filter.values[0]?.input ?? '{}')
    const min = Math.max(0, Math.floor(Number(parsed?.price?.min ?? 0)))
    const max = Math.ceil(Number(parsed?.price?.max ?? 500))
    if (isFinite(min) && isFinite(max) && max > min) return { min, max }
  } catch { /* ignore */ }
  return { min: 0, max: 500 }
}

function calcStep(range: number): number {
  if (range <= 20)    return 1
  if (range <= 100)   return 2
  if (range <= 500)   return 5
  if (range <= 2000)  return 10
  if (range <= 10000) return 50
  return 100
}
```

Inside `PriceRangeFilter`, update the two call sites:

```ts
  const { min: rangeMin, max: rangeMax } = parsePriceBounds(filter)
  const step = calcPriceStep(rangeMax - rangeMin)
```

(replacing the previous `parsePriceRange(filter)` / `calcStep(rangeMax - rangeMin)` calls — everything else in the function is unchanged.)

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors mentioning `CategoryFilters.tsx`.

- [ ] **Step 3: Run the full test suite to confirm nothing else broke**

Run: `npm test`
Expected: all existing suites still pass (no test currently exercises `CategoryFilters` directly, so this just guards against a typo breaking the build elsewhere).

- [ ] **Step 4: Commit**

```bash
git add components/category/CategoryFilters.tsx
git commit -m "refactor: use shared price-bounds utility in CategoryFilters"
```

---

## Task 3: Prune zero-count filters on the category page

**Files:**
- Modify: `app/category/[slug]/page.tsx`

**Interfaces:**
- Consumes: `getVisibleFilters` from `@/lib/shopify/filters` (Task 1)
- Produces: `CategoryFilters`/`FilterDrawer` now receive only filter groups/values with real available products (or currently-active selections); the active-filter chip row still resolves correct labels from the raw, unpruned filter list.

- [ ] **Step 1: Add the import**

In `app/category/[slug]/page.tsx`, add alongside the other `@/lib/*` imports:

```ts
import { getVisibleFilters } from '@/lib/shopify/filters'
```

- [ ] **Step 2: Split the raw filters from the pruned filters**

Replace this line:

```ts
  const filters = collection.products.filters ?? []
```

with:

```ts
  const rawFilters = collection.products.filters ?? []
  const filters = getVisibleFilters(rawFilters, activeFilterStrings)
```

- [ ] **Step 3: Build the chip label map from the raw (unpruned) list**

Replace:

```ts
  const filterLabelMap = new Map(
    filters.flatMap((g) => g.values.map((v) => [v.input, v.label] as const))
  )
```

with:

```ts
  const filterLabelMap = new Map(
    rawFilters.flatMap((g) => g.values.map((v) => [v.input, v.label] as const))
  )
```

This keeps the "Clear filter" chip showing a real label (e.g. "Latex") even for a selection that just dropped to a zero-count value and is no longer shown as a checkbox in the sidebar — it stays removable via its chip regardless.

Everything else in the file (the `<CategoryFilters filters={filters} .../>` and `<FilterDrawer filters={filters} .../>` call sites) is unchanged — they already reference the `filters` variable, which is now the pruned list.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors mentioning `app/category/[slug]/page.tsx`.

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: all existing suites pass (no page-level tests exist in this repo for `app/**/page.tsx` files — verification here is type-check plus the manual smoke check in Task 7).

- [ ] **Step 6: Commit**

```bash
git add "app/category/[slug]/page.tsx"
git commit -m "fix: hide zero-count filter options on category pages"
```

---

## Task 4: Fix `SearchFilters`' hardcoded price range

**Files:**
- Modify: `components/search/SearchFilters.tsx`
- Create: `components/search/__tests__/SearchFilters.test.tsx`

**Interfaces:**
- Consumes: `parsePriceBounds`, `calcPriceStep` from `@/lib/shopify/filters` (Task 1)
- Produces: `PriceRangeFilter` (internal to `SearchFilters.tsx`) now takes a `filter: CollectionFilter` prop, matching `CategoryFilters`' already-correct pattern.

- [ ] **Step 1: Write the failing test**

Create `components/search/__tests__/SearchFilters.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { SearchFilters } from '../SearchFilters'
import type { CollectionFilter } from '@/lib/shopify/types'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

afterEach(cleanup)

const priceFilter: CollectionFilter = {
  id: 'filter.v.price',
  label: 'Price',
  type: 'PRICE_RANGE',
  values: [{ id: 'price', label: 'Price', count: 12, input: '{"price":{"min":0,"max":150}}' }],
}

describe('SearchFilters price range', () => {
  it('uses the real price bounds from the filter data, not a hardcoded ceiling', () => {
    render(<SearchFilters filters={[priceFilter]} activeFilters={[]} currentSort={undefined} q="gloves" />)

    const slider = screen.getByLabelText('Maximum price') as HTMLInputElement
    expect(slider.min).toBe('0')
    expect(slider.max).toBe('150')
  })

  it('shows the real max as the display label when no price filter is active', () => {
    render(<SearchFilters filters={[priceFilter]} activeFilters={[]} currentSort={undefined} q="gloves" />)

    expect(screen.getByText('$150.00+')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run components/search/__tests__/SearchFilters.test.tsx`
Expected: FAIL — `slider.max` is `'200000'`, not `'150'` (current hardcoded behavior).

- [ ] **Step 3: Fix `PriceRangeFilter` in `components/search/SearchFilters.tsx`**

Add the import near the top, alongside the existing `CollectionFilter` type import:

```ts
import { parsePriceBounds, calcPriceStep } from '@/lib/shopify/filters'
```

Replace the entire block from `const MAX_PRICE = 200000` through the end of the `PriceRangeFilter` function with:

```ts
function parseActivePriceMax(activeFilters: string[]): number | null {
  for (const f of activeFilters) {
    try {
      const parsed = JSON.parse(f)
      if (parsed?.price?.max !== undefined) return Number(parsed.price.max)
    } catch { /* ignore */ }
  }
  return null
}

function PriceRangeFilter({
  filter,
  activeFilters,
  onSetPrice,
}: {
  filter: CollectionFilter
  activeFilters: string[]
  onSetPrice: (input: string) => void
}) {
  const { min: rangeMin, max: rangeMax } = parsePriceBounds(filter)
  const step = calcPriceStep(rangeMax - rangeMin)

  const [open, setOpen] = useState(true)
  const [value, setValue] = useState(() => {
    const active = parseActivePriceMax(activeFilters)
    return active !== null ? Math.min(active, rangeMax) : rangeMax
  })

  const atMax = value >= rangeMax
  const pct = Math.round(((value - rangeMin) / (rangeMax - rangeMin)) * 100)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setValue(Number(e.target.value))

  const handleCommit = () => {
    onSetPrice(atMax ? '' : JSON.stringify({ price: { min: rangeMin, max: value } }))
  }

  const fmt = (n: number) =>
    n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const displayMax = atMax ? `$${fmt(rangeMax)}+` : `$${fmt(value)}`

  return (
    <div className="mb-7">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between mb-3"
      >
        <p className="text-navy-900 text-[18px] font-semibold tracking-[0.36px] uppercase">Price Range</p>
        <ChevronDown size={16} className={`text-navy-900 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className="h-px bg-gray-200 mb-5" />
      {open && (
        <div>
          <div className="relative">
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[5px] rounded-full bg-gray-200 pointer-events-none" />
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 h-[5px] rounded-full bg-navy-900 pointer-events-none"
              style={{ width: `${pct}%` }}
            />
            <input
              type="range" min={rangeMin} max={rangeMax} step={step} value={value}
              onChange={handleChange} onMouseUp={handleCommit} onTouchEnd={handleCommit}
              className="price-slider w-full relative"
              aria-label="Maximum price"
            />
          </div>
          <div className="flex justify-between mt-3">
            <span className="text-navy-900 text-[13px] font-semibold tracking-[0.26px]">${fmt(rangeMin)}</span>
            <span className="text-navy-900 text-[13px] font-semibold tracking-[0.26px]">{displayMax}</span>
          </div>
        </div>
      )}
    </div>
  )
}
```

Then update the call site inside `SearchFilters` (in the `filters.map` block):

```ts
      filters.map((f) => {
        if (f.type === 'PRICE_RANGE') {
          return <PriceRangeFilter key={f.id} filter={f} activeFilters={activeFilters} onSetPrice={setPriceFilter} />
        }
        return <FilterGroup key={f.id} filter={f} activeFilters={activeFilters} onToggle={toggleFilter} />
      })
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run components/search/__tests__/SearchFilters.test.tsx`
Expected: PASS — both tests green.

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: all suites pass.

- [ ] **Step 6: Commit**

```bash
git add components/search/SearchFilters.tsx components/search/__tests__/SearchFilters.test.tsx
git commit -m "fix: search price-range filter uses real bounds instead of hardcoded \$200k ceiling"
```

---

## Task 5: Prune zero-count filters on the search page

**Files:**
- Modify: `app/search/page.tsx`

**Interfaces:**
- Consumes: `getVisibleFilters` from `@/lib/shopify/filters` (Task 1)
- Produces: `SearchFilters`/`SearchFilterDrawer` now receive only real, available filter options; chips still resolve correct labels from the raw list.

- [ ] **Step 1: Add the import**

In `app/search/page.tsx`, add alongside the other imports:

```ts
import { getVisibleFilters } from '@/lib/shopify/filters'
```

- [ ] **Step 2: Rename the mutable raw filters variable and derive the pruned list**

Replace:

```ts
  let products: CollectionProduct[] = []
  let totalCount = 0
  let productFilters: CollectionFilter[] = []
  let pageInfo: PageInfo = { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null }

  if (q.trim()) {
    try {
      const data = await storefrontFetch<SearchData>(SEARCH_PRODUCTS, {
        query: q,
        first: 12,
        after: sp.after ?? null,
        sortKey,
        reverse,
        filters: parsedFilters,
      })
      products = data.search.nodes
      totalCount = data.search.totalCount
      productFilters = data.search.productFilters ?? []
      pageInfo = data.search.pageInfo
    } catch {
      // network error — show empty state
    }
  }
```

with:

```ts
  let products: CollectionProduct[] = []
  let totalCount = 0
  let rawProductFilters: CollectionFilter[] = []
  let pageInfo: PageInfo = { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null }

  if (q.trim()) {
    try {
      const data = await storefrontFetch<SearchData>(SEARCH_PRODUCTS, {
        query: q,
        first: 12,
        after: sp.after ?? null,
        sortKey,
        reverse,
        filters: parsedFilters,
      })
      products = data.search.nodes
      totalCount = data.search.totalCount
      rawProductFilters = data.search.productFilters ?? []
      pageInfo = data.search.pageInfo
    } catch {
      // network error — show empty state
    }
  }

  const productFilters = getVisibleFilters(rawProductFilters, activeFilterStrings)
```

- [ ] **Step 3: Build the chip label map from the raw (unpruned) list**

Replace:

```ts
  const filterLabelMap = new Map(
    productFilters.flatMap((g) => g.values.map((v) => [v.input, v.label] as const))
  )
```

with:

```ts
  const filterLabelMap = new Map(
    rawProductFilters.flatMap((g) => g.values.map((v) => [v.input, v.label] as const))
  )
```

Everything else in the file (the `q.trim() && productFilters.length > 0` guards, `<SearchFilters filters={productFilters} .../>`, `<SearchFilterDrawer filters={productFilters} .../>`) is unchanged — they already reference `productFilters`, now the pruned list.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors mentioning `app/search/page.tsx`.

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: all suites pass.

- [ ] **Step 6: Commit**

```bash
git add "app/search/page.tsx"
git commit -m "fix: hide zero-count filter options on the search page"
```

---

## Task 6: Lock in filter/sort persistence across category pagination

**Files:**
- Create: `components/category/__tests__/CategoryPagination.test.tsx`

**Interfaces:**
- Consumes: `CategoryPagination` from `../CategoryPagination` (existing component, no changes)

This task adds regression coverage for an acceptance criterion the code already satisfies ("filter state survives pagination and sorting") — `CategorySort` already has equivalent coverage (`components/category/__tests__/CategorySort.test.tsx`); pagination has none yet.

- [ ] **Step 1: Write the test**

Create `components/category/__tests__/CategoryPagination.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { CategoryPagination } from '../CategoryPagination'

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
```

- [ ] **Step 2: Run the test to verify it passes**

Run: `npx vitest run components/category/__tests__/CategoryPagination.test.tsx`
Expected: PASS — both tests green immediately (this locks in existing, already-correct behavior; no implementation change is expected here).

- [ ] **Step 3: Commit**

```bash
git add components/category/__tests__/CategoryPagination.test.tsx
git commit -m "test: lock in filter/sort persistence across category pagination links"
```

---

## Task 7: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all suites pass, including the new `filters.test.ts`, `SearchFilters.test.tsx`, and `CategoryPagination.test.tsx`.

- [ ] **Step 2: Type-check the whole project**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual smoke check in the dev server**

Run: `npm run dev`, then in a browser:
1. Open a category page for a collection with several filter groups (e.g. `/category/gloves`).
2. Apply a filter combination and confirm no checkbox option in the sidebar shows a `(0)` count.
3. Confirm the "Clear filter" chips for active selections still show a readable label (not raw JSON), even if that combination happens to zero out a value elsewhere.
4. Change sort while filters are active — confirm the URL still contains `filter=...` and the active filters remain checked.
5. Paginate to page 2 while filters/sort are active — confirm the URL still contains `filter=...&sort=...` and filters remain checked on the new page.
6. Repeat steps 2–4 on `/search?q=<term>` and confirm the price-range slider's max reflects a real, collection-appropriate ceiling (not `$200,000`) when a `PRICE_RANGE` filter is present.

- [ ] **Step 4: Stop the dev server**

No commit for this task — it's verification only.

---

## Self-Review

**Spec coverage check:**

| Spec item | Task |
|---|---|
| `getVisibleFilters` hides zero-count values, keeps active selections, drops empty groups, preserves `PRICE_RANGE` | Task 1 |
| `CategoryFilters` uses shared price-bounds logic (no behavior change) | Task 2 |
| Category page prunes filters via `getVisibleFilters`; chips still resolve labels | Task 3 |
| Search's hardcoded `$200,000` price ceiling replaced with real bounds | Task 4 |
| Search page prunes filters via `getVisibleFilters`; chips still resolve labels | Task 5 |
| Filter state survives pagination (regression-locked) | Task 6 |
| Filter state survives sorting (already covered by existing `CategorySort.test.tsx`/`SearchSort.test.tsx`) | No new task needed |
| Counts match visible product results (Shopify-computed, no app-level bug found) | No task needed — documented in the design spec as already correct |
| Filter groups relevant to category (Shopify's Search & Discovery config already scopes this) | Explicitly out of scope per design spec |
| Full verification | Task 7 |

**No placeholders, TODOs, or "similar to above" steps found.**

**Type consistency:** `getVisibleFilters(filters: CollectionFilter[], activeFilters: string[]): CollectionFilter[]` and `parsePriceBounds(filter: CollectionFilter): { min: number; max: number }` are used with identical signatures in Tasks 2, 3, 4, and 5.
