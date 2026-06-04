# A2 · Category (L1) + Subcategory (L2) Templates + 9-per-page Pagination — Design Spec

**Date:** 2026-06-01
**Owner:** Sardorbek
**Ticket:** A2 — Category (L1) + Subcategory (L2) Templates + 9-per-page Pagination
**Depends on:** A1 (routes, lib/routes.ts) · B1 (lib/seo — stubbed here)
**Blocks:** A5 (schema slots wired in these pages)
**Status:** Approved for implementation

---

## Context

A1 is complete. The L1 category page (`app/category/[slug]/page.tsx`) exists but does not meet A2 criteria: it fetches 24 products, uses cursor-based "Load More" pagination, has no canonical/noindex logic for filtered/sorted URLs, and has no schema slots or related-links sections. The L2 subcategory page (`app/category/[slug]/[sub]/page.tsx`) is a bare stub calling `notFound()`.

B1 (`lib/seo`) is not yet merged from Munis's branch. A thin stub is created here so A2 compiles in the correct final shape without waiting.

---

## Decisions

| Question | Decision |
|---|---|
| Pagination URL shape | `?page=N&after=CURSOR` — page number + cursor both in URL |
| B1 lib/seo availability | Stub `lib/seo.ts` matching Munis's published interface |
| Subcategory Shopify handle | Composite: `${cat}-${sub}` (e.g. `/category/gloves/nitrile` → collection `gloves-nitrile`) |
| Mobile filters | `FilterDrawer` component — full-screen overlay wrapping existing `CategoryFilters` |
| Template strategy | Separate L1/L2 page files + 3 new shared components |
| Filtered/sorted URLs | `noindex, follow` + canonical → parent unfiltered URL |
| Subcategory/related links | Static mock stub arrays — data team replaces later |

---

## Architecture

### Approach: Separate pages, shared UI building blocks

L1 and L2 are separate page files with their own layouts. Both pull from the same pool of small components. Pages own structure; components own behavior. A shared shell was rejected because L1 and L2 will diverge (L1 gets subcategory card grid, L2 doesn't), and a god-component with conditional branches is harder to maintain.

---

## File Map

### New files

```
lib/seo.ts                                  ← B1 stub — replaced wholesale when Munis merges
components/category/ProductGrid.tsx         ← 9-product 3×3 grid + empty state
components/category/CategoryPagination.tsx  ← numbered page <a> links with cursor baked in
components/category/FilterDrawer.tsx        ← mobile full-screen filter overlay
```

### Modified files

```
app/category/[slug]/page.tsx                ← L1 rework (9 products, pagination, SEO logic, schema slot)
app/category/[slug]/[sub]/page.tsx          ← L2 built from stub (full implementation)
```

### Untouched files

```
components/category/CategoryFilters.tsx     ← reused as-is inside FilterDrawer and page sidebars
components/category/CategorySort.tsx        ← reused as-is in both pages
components/store/ShopifyProductCard.tsx     ← reused as-is in ProductGrid
lib/shopify/queries/collections.ts          ← existing GET_COLLECTION covers both L1 and L2
lib/routes.ts                               ← already has category() and subcategory() helpers
```

---

## SEO / Canonical / Robots Logic

Three URL classes, three rule sets. Applied in both `generateMetadata` (for HTTP headers) and an inline `<script>` canonical tag.

### Rule 1 — Clean page
**Condition:** no `?filter`, no `?sort`, `?page` absent or `1`
- `canonical` = `/category/[slug]` (no query string)
- `robots` = `index, follow`

### Rule 2 — Paginated page
**Condition:** `?page=N&after=CURSOR` only (no `?filter`, no `?sort`)
- `canonical` = self (`/category/[slug]?page=2&after=CURSOR`)
- `robots` = `index, follow`
- Emit `<link rel="prev">` / `<link rel="next">` in `<head>` for Google to walk the chain

### Rule 3 — Filtered or sorted URL
**Condition:** any `?filter=` or `?sort=` present
- `canonical` = parent unfiltered URL (`/category/[slug]`)
- `robots` = `noindex, follow`

L2 applies identical rules. Parent canonical for L2 is `/category/[cat]`.

---

## Pagination

### URL shape

```
Page 1:  /category/exam-gloves                              ← clean, no params
Page 2:  /category/exam-gloves?page=2&after=ABC123
Page 3:  /category/exam-gloves?page=3&after=DEF456
```

### How cursors flow

1. Server fetches 9 products using `?after=CURSOR` from searchParams (null on page 1).
2. Shopify returns `pageInfo.endCursor` and `pageInfo.hasNextPage`.
3. "Next" link = `?page=N+1&after=endCursor` — rendered as real `<a>` only if `hasNextPage`.
4. "Prev" link = plain `baseUrl` (`/category/[slug]`, page 1) for any page > 1. We never store the N-1 cursor, so we can only go back to the start — acceptable for SEO (Google crawls forward chains).
5. Page 1 has no Prev link.

This means users can always crawl forward. Google indexes the full chain. Jump-to-page is not supported (acceptable for SEO — bots walk chains, not jump).

---

## Component Specs

### `ProductGrid`

```tsx
interface Props {
  products: CollectionProduct[]
  emptyStateHref: string        // link for "Clear filters" in empty state
  emptyStateMessage?: string
}
```

- Renders `grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-[23px]`
- Maps each product to `<ShopifyProductCard>`
- If `products.length === 0`: centered message + clear-filters `<Link>`
- Pure display — no pagination, no fetch

### `CategoryPagination`

```tsx
interface Props {
  currentPage: number
  hasNext: boolean
  nextCursor: string | null
  baseUrl: string             // e.g. /category/exam-gloves (no query string)
  activeFilters: string[]     // preserved across page turns
  currentSort?: string        // preserved across page turns
}
```

- All links are `<Link href={...}>` (real `<a>` tags, no JS navigation)
- "Next" link not rendered if `!hasNext`
- "Prev" link not rendered on page 1; for page > 1, always links to `baseUrl` (page 1)
- Filter/sort params are stripped from pagination links (filtered pages are noindex — pagination links should point to clean paginated URLs)
- Shows "Page N" indicator between Prev/Next

### `FilterDrawer`

```tsx
interface Props {
  filters: CollectionFilter[]
  activeFilters: string[]
  currentSort?: string
}
```

- `'use client'` component
- Desktop (`lg+`): renders `null` (desktop sidebar is in the page)
- Mobile: renders a "Filters (N)" button above the product grid
- Button opens `fixed inset-0 z-50` overlay with `CategoryFilters` inside
- X button closes; tapping the backdrop closes
- Filter count badge on button when `activeFilters.length > 0`

---

## L1 Page Structure (`app/category/[slug]/page.tsx`)

```
Breadcrumb              Home › [Category]                    ← <nav> with <Link> anchors
H1                      collection.title                     ← one per page
Intro copy              collection.description               ← server-rendered, <p> tag
────────────────────────────────────────────────────────────
Desktop sidebar   │   Sort bar (CategorySort)
CategoryFilters   │   Active filter chips
                  │   FilterDrawer (mobile only)
                  │   ProductGrid (9 products)
                  │   CategoryPagination
────────────────────────────────────────────────────────────
Subcategory grid        Card links → /category/[slug]/[sub]  ← MOCK DATA, data team fills
Related categories      Links to sibling categories          ← MOCK DATA, data team fills
Bottom SEO copy         collection.descriptionHtml           ← prose block
Schema slot             <script type="application/ld+json">  ← empty {}, A5 fills
```

`generateMetadata` calls `buildMetadata` from `@/lib/seo` and applies Rule 1/2/3 based on searchParams.

---

## L2 Page Structure (`app/category/[slug]/[sub]/page.tsx`)

```
Breadcrumb              Home › [Category] › [Subcategory]   ← <nav> with <Link> anchors
H1                      collection.title                     ← one per page
Intro copy              collection.description
────────────────────────────────────────────────────────────
Desktop sidebar   │   Sort bar (CategorySort)
CategoryFilters   │   Active filter chips
                  │   FilterDrawer (mobile only)
                  │   ProductGrid (9 products)
                  │   CategoryPagination
────────────────────────────────────────────────────────────
Related links           Parent category + sibling links      ← MOCK DATA, data team fills
Bottom SEO copy         collection.descriptionHtml
Schema slot             <script type="application/ld+json">  ← empty {}, A5 fills
```

Shopify handle lookup: `${cat}-${sub}` (e.g. `gloves-nitrile`).
`generateMetadata` applies identical Rule 1/2/3 logic. Parent canonical = `/category/[cat]`.

---

## `lib/seo.ts` Stub

Matches Munis's published interface exactly. Replaced wholesale when B1 merges — call sites in A2 do not change.

```ts
// lib/seo.ts — B1 stub, replaced by Munis's full implementation on merge
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
  const canonical = opts.canonical ?? (opts.slug ? `${base}/${opts.pageType}/${opts.slug}` : base)
  return {
    title: `${opts.title} | MD Supplies`,
    description: opts.description,
    alternates: { canonical },
    robots: opts.noindex ? { index: false, follow: true } : { index: true, follow: true },
  }
}
```

---

## Mock Data Stubs

Both pages include placeholder arrays clearly marked for the data team:

```ts
// TODO(data-team): replace with real subcategory list from Shopify metafields
const SUBCATEGORY_STUBS: { label: string; slug: string }[] = []

// TODO(data-team): replace with real related category list
const RELATED_CATEGORY_STUBS: { label: string; slug: string }[] = []
```

These sections are wrapped in `{stubs.length > 0 && (...)}` so they are hidden when the array is empty — no thin placeholder UI ships to production.

---

## Out of Scope

- Jump-to-page (page N > 2 without cursor chain) — requires server-side cursor cache
- Real subcategory / related category data — data team responsibility
- Making filter/sort URL combinations indexable — future, SEO-lead approval only
- B1 full implementation — Munis owns this; stub is sufficient for A2

---

## Acceptance Criteria

- [ ] One H1 per page, matching category/subcategory name
- [ ] Intro copy + bottom SEO copy are server-rendered
- [ ] Grid shows exactly 9 products/page; pagination uses real crawlable `<a>` links
- [ ] Page-1 canonical = clean base URL; page 2+ canonical = self
- [ ] Filtered & sorted URLs emit `noindex, follow` + canonical to parent
- [ ] Related category/subcategory links are real anchors (hidden if stubs empty)
- [ ] `FilterDrawer` opens on mobile; desktop sidebar is unchanged
- [ ] CollectionPage/Breadcrumb schema slots present for A5 to fill
- [ ] L2 fetches via composite handle `${cat}-${sub}` and calls `notFound()` if collection missing
- [ ] `lib/seo.ts` stub exports `buildMetadata` and `STAGING_GUARD`
