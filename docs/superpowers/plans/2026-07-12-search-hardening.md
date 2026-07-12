# Search Hardening (NF3/NF4/NF10/NF13/NF15/NF16) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close six search-surface gaps: unfiltered S&D facets on `/search`, internal collections leaking through predictive search, a false "No results" on a bad pagination cursor, Load More state that isn't reflected in the URL, an uncapped/uncached predictive endpoint with non-link result items, and a regex bypass in the predictive highlight sanitizer.

**Architecture:** Reuse the existing registry pattern (`lib/filter-registry.ts`, `lib/category-nav.ts`) that already gates the category page — extend it to search instead of inventing a second mechanism. Fix the cursor/URL issues by following the redirect-on-failure and URL-reflects-state patterns already used by `components/category/CategoryResults.tsx` / `CategoryPagination.tsx`. Fix predictive-search hardening (cap, cache, abort, links, sanitizer) inside the existing `SearchDropdown` client component and `predictive/route.ts` handler — no new files needed.

**Tech Stack:** Next.js App Router (server components + server actions), TypeScript, Vitest + Testing Library.

## Global Constraints

- No collection/facet allowlist may be derived from tags — registry-driven only (existing project rule, `lib/filter-registry.ts:1-9`).
- Preserve existing "network error → empty state" behavior for search's initial query fetch except for the specific bad-cursor case (don't regress general resilience).
- Keep `q` and other user input treated as untrusted (existing project convention across `lib/filter-registry.ts` and `app/search/actions.ts`).

---

### Task 1: Gate `/search` facets with a search-wide allowlist

**Files:**
- Modify: `lib/filter-registry.ts` (add `SEARCH_FACET_RULES` + `getSearchFacets`)
- Modify: `app/search/page.tsx:14,105` (swap `stripBlockedFacets` for `getSearchFacets`)
- Test: `lib/__tests__/filter-registry.test.ts` (append)

**Interfaces:**
- Produces: `export const SEARCH_FACET_RULES: FacetRule[]`, `export function getSearchFacets(facets: CollectionFilter[]): CollectionFilter[]`

- [ ] **Step 1: Write the failing test**

Append to `lib/__tests__/filter-registry.test.ts`:

```ts
import { getSearchFacets } from '@/lib/filter-registry'

describe('getSearchFacets', () => {
  it('allows availability/price/vendor/productType and approved metafields', () => {
    const facets: CollectionFilter[] = [
      facet('filter.v.availability'),
      facet('filter.v.price'),
      facet('filter.p.vendor'),
      facet('filter.p.type'),
      facet('filter.p.m.custom.material'),
    ]
    expect(getSearchFacets(facets).map((f) => f.id)).toEqual(facets.map((f) => f.id))
  })

  it('drops raw tag facets and any facet not on the search allowlist', () => {
    const facets: CollectionFilter[] = [
      facet('filter.p.tag'),
      facet('filter.p.category'), // not in the search bullet list
      facet('filter.v.option.color'), // variant option, not approved for search
    ]
    expect(getSearchFacets(facets)).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/filter-registry.test.ts`
Expected: FAIL — `getSearchFacets` is not exported.

- [ ] **Step 3: Implement `SEARCH_FACET_RULES` / `getSearchFacets`**

In `lib/filter-registry.ts`, directly below `DEFAULT_FACET_RULES` (after line 137):

```ts
// Search spans every collection, so unlike getAllowedFacets there is no
// collection handle to key a per-collection allowlist on. One registry
// entry covers all of search: the same non-tag sources approved anywhere
// (availability/price/vendor/productType) plus every approved metafield,
// since a search result set can span collections with different metafield
// registries.
export const SEARCH_FACET_RULES: FacetRule[] = [
  AVAILABILITY,
  PRICE,
  VENDOR,
  PRODUCT_TYPE,
  ...Object.values(APPROVED_METAFIELDS),
]

/** The single gate for search-page facets — mirrors getAllowedFacets but
 *  keyed on the search-wide allowlist instead of a collection handle. */
export function getSearchFacets(facets: CollectionFilter[]): CollectionFilter[] {
  return facets.filter(
    (facet) => !isBlockedFacetId(facet.id) && SEARCH_FACET_RULES.some((rule) => rule.matches(facet.id)),
  )
}
```

- [ ] **Step 4: Wire it into the search page**

In `app/search/page.tsx:14`, change:

```ts
import { stripBlockedFacets, isAllowedFilterInput } from '@/lib/filter-registry'
```

to:

```ts
import { getSearchFacets, isAllowedFilterInput } from '@/lib/filter-registry'
```

And at `app/search/page.tsx:105`, change:

```ts
      productFilters = stripBlockedFacets(data.search.productFilters ?? [])
```

to:

```ts
      // Registry gate: only sources approved anywhere in the search
      // allowlist may reach the filter rail (NF3) — the Storefront
      // `productFilters` response is untrusted input.
      productFilters = getSearchFacets(data.search.productFilters ?? [])
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run lib/__tests__/filter-registry.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add lib/filter-registry.ts lib/__tests__/filter-registry.test.ts app/search/page.tsx
git commit -m "search: gate productFilters with a search-wide registry allowlist (NF3)"
```

---

### Task 2: Filter predictive collections against the nav registry

**Files:**
- Modify: `app/api/search/predictive/route.ts`
- Test: `app/api/search/predictive/__tests__/route.test.ts` (new)

**Interfaces:**
- Consumes: `getAllowedHandles(): Set<string>` from `lib/category-nav.ts:98-100` (already exported).
- Produces: same `GET(req: NextRequest)` signature; response `collections` now filtered.

- [ ] **Step 1: Write the failing test**

Create `app/api/search/predictive/__tests__/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/shopify/storefront', () => ({
  storefrontFetch: vi.fn(),
}))

import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET } from '../route'

const mockFetch = vi.mocked(storefrontFetch)

beforeEach(() => {
  mockFetch.mockReset()
})

describe('predictive search collection filtering (NF4)', () => {
  it('drops collections whose handle is not in the nav registry', async () => {
    mockFetch.mockResolvedValue({
      predictiveSearch: {
        products: [],
        queries: [],
        collections: [
          { id: 'gid://1', title: 'Gloves', handle: 'gloves' }, // registered
          { id: 'gid://2', title: 'Internal Ops', handle: 'consolidation-duplicate' }, // not registered
        ],
      },
    })

    const req = new NextRequest('http://localhost/api/search/predictive?q=gl')
    const res = await GET(req)
    const body = await res.json()

    expect(body.collections.map((c: { handle: string }) => c.handle)).toEqual(['gloves'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/api/search/predictive/__tests__/route.test.ts`
Expected: FAIL — `Internal Ops` / `consolidation-duplicate` still present.

- [ ] **Step 3: Implement the filter**

In `app/api/search/predictive/route.ts`, add the import and filter step:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { PREDICTIVE_SEARCH } from '@/lib/shopify/queries/search'
import { getAllowedHandles } from '@/lib/category-nav'
```

Replace the try block body (was lines 36–42):

```ts
  try {
    const data = await storefrontFetch<{ predictiveSearch: PredictiveResults }>(
      PREDICTIVE_SEARCH,
      { q, limit: 6 },
      { cache: 'no-store' },
    )
    // NF4: predictiveSearch returns every matching collection verbatim,
    // including internal/ops collections deliberately absent from the nav
    // registry. Gate against the same allowlist the header nav uses.
    const allowedHandles = getAllowedHandles()
    return NextResponse.json<PredictiveResults>({
      ...data.predictiveSearch,
      collections: data.predictiveSearch.collections.filter((c) => allowedHandles.has(c.handle)),
    })
  } catch {
    return NextResponse.json<PredictiveResults>({ products: [], collections: [], queries: [] })
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/api/search/predictive/__tests__/route.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/api/search/predictive/route.ts app/api/search/predictive/__tests__/route.test.ts
git commit -m "search: filter predictive collections against the nav registry (NF4)"
```

---

### Task 3: Cap `q` on the predictive route; add AbortController + cache and combobox links in `SearchDropdown`

**Files:**
- Modify: `app/api/search/predictive/route.ts`
- Modify: `components/layout/SearchDropdown.tsx`
- Test: `components/layout/__tests__/SearchDropdown.test.tsx` (new, sanitizer-focused; full interaction testing is out of scope for time)

**Interfaces:**
- No exported signatures change; `PredictiveResults` type unchanged.

- [ ] **Step 1: Cap `q` length server-side**

In `app/api/search/predictive/route.ts`, change:

```ts
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
```

to:

```ts
const MAX_Q_LENGTH = 100

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim().slice(0, MAX_Q_LENGTH)
```

- [ ] **Step 2: Add AbortController + a bounded client cache in `SearchDropdown`**

In `components/layout/SearchDropdown.tsx`, add a cache ref near the other state (after line 45's `activeIdx` state):

```ts
  // Bounded query→results cache: repeated queries (retyping, arrow-key
  // revisits) are served without a network round trip. FIFO eviction, not
  // LRU — simplicity over perfect recency for a session-scoped cache this
  // small.
  const cacheRef = useRef<Map<string, PredictiveResults>>(new Map())
  const MAX_CACHE_ENTRIES = 30
```

Replace the fetch effect (was lines 58–71):

```ts
  useEffect(() => {
    if (debouncedQuery.length < 2) return

    const cached = cacheRef.current.get(debouncedQuery)
    if (cached) {
      setFetched({ for: debouncedQuery, data: cached })
      setActiveIdx(-1)
      return
    }

    const controller = new AbortController()
    fetch(`/api/search/predictive?q=${encodeURIComponent(debouncedQuery)}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data: PredictiveResults) => {
        if (cacheRef.current.size >= MAX_CACHE_ENTRIES) {
          const oldestKey = cacheRef.current.keys().next().value
          if (oldestKey !== undefined) cacheRef.current.delete(oldestKey)
        }
        cacheRef.current.set(debouncedQuery, data)
        setFetched({ for: debouncedQuery, data })
        setActiveIdx(-1)
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setFetched({ for: debouncedQuery, data: EMPTY })
      })
    return () => controller.abort()
  }, [debouncedQuery])
```

- [ ] **Step 3: Turn result rows into real links with combobox ARIA**

In `components/layout/SearchDropdown.tsx`, add `Link` to the imports (line 7):

```ts
import Link from 'next/link'
```

Add a shared click handler next to `navigate` (after line 87):

```ts
  // Only intercept a plain left-click: middle-click (auxclick, never fires
  // this handler) and modified clicks (ctrl/cmd/shift — open in new
  // tab/window) must fall through to native <a> behavior (NF15).
  const onItemClick = useCallback((e: React.MouseEvent, href: string) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    navigate(href)
  }, [navigate])
```

Add `type` import for the mouse event alongside the existing `KeyboardEvent, FormEvent` import (line 5-6):

```ts
import {
  useState, useEffect, useRef, useCallback,
  type KeyboardEvent, type FormEvent, type MouseEvent,
} from 'react'
```

(then use `MouseEvent` instead of `React.MouseEvent` in the handler above.)

Give the input combobox semantics (replace the `<input ... />` at lines 133–142):

```tsx
              <input
                ref={inputRef}
                type="text"
                role="combobox"
                aria-expanded={showDropdown && (hasResults || loading)}
                aria-controls="search-dropdown-listbox"
                aria-autocomplete="list"
                aria-activedescendant={activeIdx >= 0 ? `search-option-${activeIdx}` : undefined}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search products, categories…"
                autoComplete="off"
                className="flex-1 h-[44px] text-[15px] text-navy-900 placeholder:text-gray-400 outline-none bg-transparent"
              />
```

Give the results panel `listbox` semantics — on the wrapping div at line 162:

```tsx
            <div ref={dropdownRef} id="search-dropdown-listbox" role="listbox" className="mt-2 bg-white border border-gray-100 shadow-md overflow-hidden">
```

Convert each of the three result `<button>` blocks to `<Link>` with `role="option"`. Suggestions block (lines 175–187):

```tsx
                  {results.queries.map((q) => {
                    const idx = flatIdx++
                    const isActive = activeIdx === idx
                    const href = `/search?q=${encodeURIComponent(q.text)}`
                    return (
                      <Link
                        key={q.text}
                        href={href}
                        role="option"
                        id={`search-option-${idx}`}
                        aria-selected={isActive}
                        onClick={(e) => onItemClick(e, href)}
                        className={`w-full flex items-center gap-3 px-4 py-1.5 text-left transition-colors focus:outline-none ${isActive ? 'bg-neutral-50' : 'hover:bg-neutral-50'}`}
                      >
                        <Search size={12} className="text-gray-300 shrink-0" />
                        <span
                          className="text-[13px] text-navy-900 [&_mark]:bg-transparent [&_mark]:font-semibold [&_mark]:text-teal-500"
                          dangerouslySetInnerHTML={{ __html: sanitizeStyledText(q.styledText) }}
                        />
                      </Link>
                    )
                  })}
```

Products block (lines 199–227) — same shape, `href={`/product/${p.handle}`}`:

```tsx
                  {results.products.map((p) => {
                    const idx = flatIdx++
                    const isActive = activeIdx === idx
                    const href = `/product/${p.handle}`
                    return (
                      <Link
                        key={p.id}
                        href={href}
                        role="option"
                        id={`search-option-${idx}`}
                        aria-selected={isActive}
                        onClick={(e) => onItemClick(e, href)}
                        className={`w-full flex items-center gap-3 px-4 py-1.5 text-left transition-colors focus:outline-none ${isActive ? 'bg-neutral-50' : 'hover:bg-neutral-50'}`}
                      >
                        <div className="relative w-8 h-8 shrink-0 border border-gray-100 bg-gray-50 flex items-center justify-center overflow-hidden">
                          {p.featuredImage ? (
                            <ProductImage
                              src={p.featuredImage.url}
                              alt={p.featuredImage.altText ?? p.title}
                              sizes="32px"
                              className="object-contain"
                            />
                          ) : (
                            <span className="text-[9px] font-bold text-gray-300 uppercase leading-none text-center px-0.5">
                              {p.title.slice(0, 3)}
                            </span>
                          )}
                        </div>
                        <span className="text-[13px] text-navy-900 line-clamp-1 flex-1">{p.title}</span>
                        <ArrowRight size={12} className="text-gray-300 shrink-0" />
                      </Link>
                    )
                  })}
```

Collections block (lines 238–253) — same shape, `href={`/category/${c.handle}`}`:

```tsx
                  {results.collections.map((c) => {
                    const idx = flatIdx++
                    const isActive = activeIdx === idx
                    const href = `/category/${c.handle}`
                    return (
                      <Link
                        key={c.id}
                        href={href}
                        role="option"
                        id={`search-option-${idx}`}
                        aria-selected={isActive}
                        onClick={(e) => onItemClick(e, href)}
                        className={`w-full flex items-center gap-3 px-4 py-1.5 text-left transition-colors focus:outline-none ${isActive ? 'bg-neutral-50' : 'hover:bg-neutral-50'}`}
                      >
                        <Tag size={12} className="text-gray-300 shrink-0" />
                        <span className="text-[13px] text-navy-900 flex-1">{c.title}</span>
                        <ArrowRight size={12} className="text-gray-300 shrink-0" />
                      </Link>
                    )
                  })}
```

The footer "See all results" button (lines 258–267) stays a `<button>` — it isn't part of the option list (no `flatIdx`/ARIA option role) and always navigates to the same computed href, so convert it to a `Link` for consistency but it's not required for the acceptance criteria; leave as-is to minimize diff.

- [ ] **Step 4: Manual verification (no automated interaction test — time-boxed)**

Run `npm run dev`, open `/`, focus the search input, type "glove", confirm:
- middle-click on a product opens it in a new tab
- ctrl/cmd-click on a collection opens it in a new tab
- plain click still navigates in the same tab and closes the dropdown
- retyping a previously-seen query renders instantly (cache hit, no network tab entry)

- [ ] **Step 5: Commit**

```bash
git add app/api/search/predictive/route.ts components/layout/SearchDropdown.tsx
git commit -m "search: cap predictive q, add abort+cache, make results real links with combobox ARIA (NF15)"
```

---

### Task 4: Fix the predictive sanitizer regex bypass

**Files:**
- Modify: `components/layout/SearchDropdown.tsx:12-16`
- Test: `components/layout/__tests__/SearchDropdown.test.tsx` (new)

**Interfaces:**
- `sanitizeStyledText` stays module-private; tested indirectly isn't possible since it's not exported — export it for the test (it's a pure function, safe to export).

- [ ] **Step 1: Export the function and write the failing test**

In `components/layout/SearchDropdown.tsx`, change:

```ts
function sanitizeStyledText(raw: string): string {
```

to:

```ts
export function sanitizeStyledText(raw: string): string {
```

Create `components/layout/__tests__/SearchDropdown.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { sanitizeStyledText } from '../SearchDropdown'

describe('sanitizeStyledText (NF16)', () => {
  it('strips an onclick payload smuggled via a missing space before the attribute', () => {
    const out = sanitizeStyledText('<span/onclick=alert(1)>Gloves</span>')
    expect(out).not.toMatch(/onclick/i)
    expect(out).toBe('<span>Gloves</span>')
  })

  it('still highlights via clean mark/span tags', () => {
    expect(sanitizeStyledText('Blue <mark>Gloves</mark>')).toBe('Blue <mark>Gloves</mark>')
  })

  it('strips disallowed tags entirely, including their attributes', () => {
    expect(sanitizeStyledText('<img src=x onerror=alert(1)>Gloves')).toBe('Gloves')
  })

  it('strips a script tag', () => {
    expect(sanitizeStyledText('<script>alert(1)</script>Gloves')).toBe('alert(1)Gloves')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/layout/__tests__/SearchDropdown.test.tsx`
Expected: FAIL on the first case — current regex leaves `/onclick=alert(1)` in the output.

- [ ] **Step 3: Implement the fix**

In `components/layout/SearchDropdown.tsx`, replace lines 12–16:

```ts
function sanitizeStyledText(raw: string): string {
  return raw
    .replace(/<(?!\/?(?:mark|span)\b)[^>]*>/gi, '')
    .replace(/<(mark|span)\s[^>]*>/gi, '<$1>')
}
```

with:

```ts
const ALLOWED_STYLED_TEXT_TAGS = new Set(['mark', 'span'])

// Rebuilds every tag from its captured name only — the previous two-pass
// regex used a whitespace-gated pattern to strip attributes
// (`<(mark|span)\s[^>]*>`), so `<span/onclick=…>` (no space before the
// attribute) matched neither the strip pass nor the attribute-strip pass
// and reached dangerouslySetInnerHTML verbatim. Capturing the tag name via
// a character class ([a-zA-Z][a-zA-Z0-9]*) stops at the first non-letter
// character regardless of what follows it (space, `/`, or `>`), so this
// can't be bypassed the same way — every attribute is always discarded.
export function sanitizeStyledText(raw: string): string {
  return raw.replace(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g, (_match, slash: string, name: string) => {
    const tag = name.toLowerCase()
    if (!ALLOWED_STYLED_TEXT_TAGS.has(tag)) return ''
    return `<${slash}${tag}>`
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/layout/__tests__/SearchDropdown.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/layout/SearchDropdown.tsx components/layout/__tests__/SearchDropdown.test.tsx
git commit -m "search: fix predictive sanitizer bypass on unspaced tag attributes (NF16)"
```

---

### Task 5: Bad search cursor redirects to page 1 instead of a false "No results"

**Files:**
- Modify: `app/search/page.tsx`
- Test: `app/search/__tests__/page.test.ts` (new)

**Interfaces:**
- No exported signature changes (default page export is a Next.js route component).

- [ ] **Step 1: Write the failing test**

`app/search/page.tsx` is an async server component that calls `redirect()` (which throws `NEXT_REDIRECT`), so test the redirect behavior directly:

Create `app/search/__tests__/page.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/shopify/storefront', () => ({
  storefrontFetch: vi.fn(),
}))

import { storefrontFetch } from '@/lib/shopify/storefront'
import SearchPage from '../page'

const mockFetch = vi.mocked(storefrontFetch)

beforeEach(() => {
  mockFetch.mockReset()
})

function getRedirectPath(err: unknown): string {
  // next/navigation's redirect() throws an Error whose `.digest` encodes
  // the target, e.g. "NEXT_REDIRECT;replace;/search?q=gloves;307".
  const digest = (err as { digest?: string }).digest ?? ''
  const parts = digest.split(';')
  return parts[2] ?? ''
}

describe('search page bad-cursor handling (NF10)', () => {
  it('redirects to page 1 with q/sort/filter preserved when a stale `after` cursor errors', async () => {
    mockFetch.mockRejectedValue(new Error('Cursor is invalid'))

    await expect(
      SearchPage({
        searchParams: Promise.resolve({
          q: 'gloves',
          sort: 'PRICE_ASC',
          filter: ['{"available":true}'],
          after: 'stale-cursor',
        }),
      }),
    ).rejects.toSatisfy((err: unknown) => {
      const path = getRedirectPath(err)
      return path.includes('q=gloves') && path.includes('sort=PRICE_ASC') && !path.includes('after=')
    })
  })

  it('still shows the empty state (no redirect) when there is no `after` cursor', async () => {
    mockFetch.mockRejectedValue(new Error('network down'))

    const result = await SearchPage({
      searchParams: Promise.resolve({ q: 'gloves' }),
    })

    expect(result).toBeTruthy()
  })
})
```

Note: `expect(...).rejects.toSatisfy` requires Vitest ≥ 1.x's `toSatisfy` matcher; if unavailable in this project's Vitest version, use `.rejects.toMatchObject` against `{ digest: expect.stringContaining('q=gloves') }` combined with a separate assertion — check `npx vitest --version` and adjust before running.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/search/__tests__/page.test.ts`
Expected: FAIL — no redirect currently happens; the first test's promise resolves instead of rejecting.

- [ ] **Step 3: Implement the redirect**

In `app/search/page.tsx`, add `redirect` to the `next/navigation` import (currently only `Link` is imported from `next/link`, no `next/navigation` import exists — add a new one after line 3):

```ts
import { redirect } from 'next/navigation'
```

Add a `page1Url` builder right before the `if (q.trim())` block (before line 92), reusing `activeFilterStrings`/`sp` already in scope:

```ts
  // Target for the bad-cursor redirect below: same q/sort/filter, no
  // `after` — i.e. exactly what a fresh page-1 visit would build.
  const page1Url = (() => {
    const p = new URLSearchParams()
    if (q) p.set('q', q)
    if (sp.sort) p.set('sort', sp.sort)
    activeFilterStrings.forEach((f) => p.append('filter', f))
    const qs = p.toString()
    return qs ? `/search?${qs}` : '/search'
  })()
```

Replace the catch block (was lines 107–109):

```ts
    } catch {
      // network error — show empty state
    }
```

with:

```ts
    } catch {
      // NF10: an expired/mangled `after` cursor throws here just like any
      // other Storefront error, but it isn't a genuinely empty result —
      // bounce to page 1 (q/sort/filter intact) instead of rendering a
      // false "No results". Errors with no cursor involved keep the
      // original behavior (empty state) since there's no lower fallback.
      if (sp.after) {
        redirect(page1Url)
      }
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/search/__tests__/page.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/search/page.tsx app/search/__tests__/page.test.ts
git commit -m "search: redirect a bad pagination cursor to page 1 instead of a false empty state (NF10)"
```

---

### Task 6: Reflect the Load More cursor in the URL

**Files:**
- Modify: `components/search/SearchResultsSection.tsx`
- Test: `components/search/__tests__/SearchResultsSection.test.tsx` (new)

**Interfaces:**
- Consumes: `loadMoreSearchProducts` (unchanged, `app/search/actions.ts:20-39`).
- No prop signature changes.

- [ ] **Step 1: Write the failing test**

Create `components/search/__tests__/SearchResultsSection.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { SearchResultsSection } from '../SearchResultsSection'
import type { CollectionProduct, PageInfo } from '@/lib/shopify/types'

const replace = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams('q=gloves'),
}))

vi.mock('../../../app/search/actions', () => ({
  loadMoreSearchProducts: vi.fn().mockResolvedValue({
    products: [],
    pageInfo: { hasNextPage: false, hasPreviousPage: true, startCursor: null, endCursor: 'cursor-2' },
  }),
}))

afterEach(() => {
  cleanup()
  replace.mockClear()
})

const product: CollectionProduct = {
  id: 'gid://1', title: 'Gloves', handle: 'gloves', vendor: 'Acme', availableForSale: true, tags: [],
  priceRange: { minVariantPrice: { amount: '10', currencyCode: 'USD' }, maxVariantPrice: { amount: '10', currencyCode: 'USD' } },
  images: { nodes: [] },
  variants: { nodes: [{ id: 'v1', price: { amount: '10', currencyCode: 'USD' }, compareAtPrice: null, availableForSale: true }] },
}

const pageInfo: PageInfo = { hasNextPage: true, hasPreviousPage: false, startCursor: null, endCursor: 'cursor-1' }

describe('SearchResultsSection Load More URL reflection (NF13)', () => {
  it('reflects the new cursor in the URL via router.replace after loading more', async () => {
    render(
      <SearchResultsSection
        initialProducts={[product]}
        initialPageInfo={pageInfo}
        q="gloves"
        sortKey="RELEVANCE"
        reverse={false}
        filters={[]}
        clearFiltersUrl="/search?q=gloves"
        isFiltered={false}
      />,
    )

    fireEvent.click(screen.getByText('Load More'))

    await waitFor(() => expect(replace).toHaveBeenCalled())
    const [url] = replace.mock.calls[0]
    expect(url).toContain('after=cursor-2')
    expect(url).toContain('q=gloves')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/search/__tests__/SearchResultsSection.test.tsx`
Expected: FAIL — `replace` is never called (component doesn't touch the URL today).

- [ ] **Step 3: Implement the URL reflection**

In `components/search/SearchResultsSection.tsx`, update the import (line 3):

```ts
import { useState, useTransition } from 'react'
```

to:

```ts
import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
```

Inside the component, after the existing state hooks (after line 40):

```ts
  const router = useRouter()
  const searchParams = useSearchParams()
```

Replace `loadMore` (was lines 42–55):

```ts
  function loadMore() {
    if (!pageInfo.endCursor) return
    startTransition(async () => {
      const result = await loadMoreSearchProducts({
        q,
        after: pageInfo.endCursor!,
        sortKey,
        reverse,
        filters,
      })
      setProducts((prev) => [...prev, ...result.products])
      setPageInfo(result.pageInfo)

      // NF13: URL never changed on Load More, so back-navigation landed on
      // the original unpaginated page-1 URL and lost the shopper's place.
      // Mirror category's URL-driven pagination by reflecting the new
      // cursor here (shallow — no scroll, no server refetch since state is
      // already updated above).
      const params = new URLSearchParams(searchParams)
      if (result.pageInfo.endCursor) params.set('after', result.pageInfo.endCursor)
      else params.delete('after')
      router.replace(`/search?${params.toString()}`, { scroll: false })
    })
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/search/__tests__/SearchResultsSection.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/search/SearchResultsSection.tsx components/search/__tests__/SearchResultsSection.test.tsx
git commit -m "search: reflect Load More cursor in the URL so back-navigation preserves position (NF13)"
```

---

### Task 7: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: all tests pass, including the five new/modified suites above.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `npx eslint app/search app/api/search components/layout/SearchDropdown.tsx components/search lib/filter-registry.ts lib/category-nav.ts`
Expected: no errors.

- [ ] **Step 4: Manual smoke test (`npm run dev`)**

- `/search?q=gloves` — filter rail shows only availability/price/vendor/productType/metafield facets, never a raw tag.
- `/search?q=gloves&after=not-a-real-cursor` — lands on `/search?q=gloves` (page 1), not a false "No results".
- Predictive dropdown for a query matching an internal/ops collection — that collection does not appear.
- Predictive dropdown — middle-click / ctrl-click a product opens a new tab; plain click navigates in-page.
- Load More on `/search?q=gloves`, then browser back — URL carries `after`, doesn't silently re-show page 1 with no memory of the click.
