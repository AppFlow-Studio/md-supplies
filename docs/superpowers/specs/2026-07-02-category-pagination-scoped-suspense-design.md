# Category Pagination — No Scroll Jump, No Full-Page Reload — Design

**Date:** 2026-07-02
**Source:** QA ticket — "Moving to the next product page reloads/jumps to the top" (P1 catalog UX/CRO)
**Branch:** sardor-dev

---

## Problem

`app/category/[slug]/page.tsx` is a single async Server Component. `app/category/[slug]/loading.tsx`
wraps the *entire* rendered output of that component — breadcrumb, hero banner, subcategory tabs,
filter sidebar, product grid, pagination, related categories, about section — in one Suspense
boundary.

`CategoryPagination` links to the same route with new `page`/`after`/`cursors` query params. Because
the whole page component re-runs its data fetch on that navigation, the single top-level Suspense
boundary re-suspends and Next.js shows the *full-page* skeleton (`loading.tsx`) while the new RSC
payload streams in — hero and sidebar included, not just the product grid.

Next.js `<Link>`'s default scroll behavior scrolls to the top of the page root if that root element
isn't fully visible in the viewport at navigation time. Since pagination controls sit at the bottom
of a long product grid, the page root is out of view when the user clicks — so on top of the
full-page skeleton flash, the browser also jumps to the top.

Filter/sort state, the URL, and browser back/forward already work correctly today (pagination
already threads `sort`/`filter[]`/`cursors` through `persistParams`, and it's real `<Link href>`
navigation, not client state) — those acceptance criteria are already met and need no change.

## Design

### 1. New lightweight query: `GET_COLLECTION_HERO`

Add to `lib/shopify/queries/collections.ts`:

```graphql
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
```

This carries no `products(...)` field and no pagination/sort/filter args, so it's identical on
every request for a given `handle` regardless of query string — cache-friendly and independent of
`searchParams`.

### 2. Split `page.tsx` into a shell + a nested results section

**Shell (`CategoryPage`, stays in `app/category/[slug]/page.tsx`)** — awaits only:
- `GET_COLLECTION_HERO` (replaces the `GET_COLLECTION` call currently used for hero data)
- `getSubcategories(slug)`
- `getRelatedCategories(slug)`

None of these depend on `sp.page`/`sp.sort`/`sp.filter`/`sp.after`, so this resolves fast and
consistently regardless of which page/sort/filter the user is on. It renders breadcrumb, hero
banner, subcategory tabs, related categories, the about section, and the two JSON-LD scripts —
exactly as today, just sourced from the lighter query. `!collection` (bad slug) is checked here,
before any product fetch, so a bad slug still 404s immediately.

`generateMetadata` switches to `GET_COLLECTION_HERO` too (it only ever read `title`/`description`).

**Results section (new: `components/category/CategoryResults.tsx`, async Server Component)** —
takes `slug` and the parsed search-param values (`sortKey`, `reverse`, `activeFilterStrings`,
`currentPage`, `after`, `prevCursors`) as props. Does the existing `GET_COLLECTION` fetch (products,
`pageInfo`, `filters`) and renders everything currently inside "Main layout": the desktop
`CategoryFilters` sidebar, the sort bar + "Showing N products" count, active filter chips,
`FilterDrawer`, `ProductGrid`, and `CategoryPagination`. The filter sidebar moves in here (not the
shell) because filter visibility/counts (`getVisibleFilters`) depend on this same product query.

The stale-pagination-link check (`currentPage > 1 && zero products` → `notFound()`) moves into
`CategoryResults` alongside the fetch it depends on.

`page.tsx` renders it as:

```tsx
<Suspense fallback={<CategoryResultsSkeleton />}>
  <CategoryResults slug={slug} sortKey={sortKey} reverse={reverse}
    activeFilterStrings={activeFilterStrings} currentPage={currentPage}
    after={sp.after ?? null} prevCursors={prevCursors} searchParamsForTracking={sp} />
</Suspense>
```

Because the shell no longer awaits product data, a same-route navigation (pagination/sort/filter
click) only re-suspends this inner boundary — hero/breadcrumb/subcategory-tabs/related/about never
unmount or flash. `loading.tsx` (unchanged) still covers real full-route loads (first visit, hard
refresh).

### 3. New fallback: `CategoryResultsSkeleton`

New component (`components/category/CategoryResultsSkeleton.tsx`) reusing the sidebar+grid portion
of the current `loading.tsx` markup (skeleton filter groups + skeleton sort bar + skeleton product
cards). `loading.tsx` shrinks to only the breadcrumb+hero skeleton plus `<CategoryResultsSkeleton />`
for the rest, so the two stay visually consistent without duplicating markup.

### 4. Scroll fix

`CategoryPagination`'s prev/next `<Link>`s get `scroll={false}`. This is the direct, explicit fix
for "don't jump to top" — belt-and-suspenders with the Suspense split, which removes the root cause
of the root element leaving the viewport in the first place.

## Data flow / correctness checklist

| Requirement | How it's satisfied |
|---|---|
| No full-page reload look | Hero/sidebar-shell/breadcrumb render once from the shell fetch; only `CategoryResults` re-suspends on pagination |
| Grid updates smoothly | Local `CategoryResultsSkeleton` fallback scoped to just the results area |
| Stay near the grid, no jump to top | `scroll={false}` on pagination links + shell no longer disappears from viewport |
| Filters/sort stay selected | Unchanged — `persistParams` threading in `CategoryPagination`/`CategorySort` already does this |
| Shareable URLs | Unchanged — still real `<Link href>` navigation with `page`/`after`/`cursors`/`sort`/`filter` in the query string |
| Back/forward predictable | Unchanged — browser history still recorded per `<Link>` navigation as today |
| Bad slug still 404s | Checked in the shell against the lightweight hero fetch, before any product fetch runs |
| Stale page number (e.g. `?page=5` past the end) still 404s | Checked inside `CategoryResults` |

## Testing

- `CategoryPagination.test.tsx`: assert next/prev links render with `scroll={false}` (via the
  rendered `<Link>` prop, not a DOM attribute — `scroll` isn't serialized to the anchor).
- New `lib/shopify/__tests__/queries.test.ts` or inline check: `GET_COLLECTION_HERO` has no
  `products` field / no pagination args (guards against someone reintroducing the coupling).
- Manual verification via `/run`: paginate while scrolled to the bottom of the grid — confirm no
  scroll jump, confirm hero/sidebar don't flash, confirm active filters/sort survive the click,
  confirm back button returns to the prior page and cursor state.

## Out of scope

- Search page pagination — it uses a client-side "load more" flow (`app/search/actions.ts`), not
  `<Link>`-based numbered pagination, so it doesn't have this bug.
- Any change to filter/sort persistence logic itself (already correct; tracked separately, and
  overlaps with P1-4 per the ticket's dependency note).
- Any change to UTM/tracking param passthrough (`withTrackingParams`) — already wired through
  `persistParams`, untouched by this refactor (overlaps with P2-3 per the ticket's dependency note).
- Converting pagination to a fully client-side SPA experience (new API route + client fetch/state).
  The scoped-Suspense approach meets every acceptance criterion using the existing server-rendered
  architecture, with far less new surface area to maintain.
