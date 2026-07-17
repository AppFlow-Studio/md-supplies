# Nav Wiring (E1): Point Header/Footer/Popular-Categories at the Tag Registry

## Problem

Three render surfaces still source their category navigation from the legacy
collection-matching registry (`lib/category-nav.ts`'s `ROADMAP_CATEGORIES` +
`buildCategoryNav()`), which the Category Tree ticket's Dependencies section
explicitly calls out as this ticket's own follow-on scope ("Feeds: E1 —
Roadmap Nav Engine (nav consumes this registry)"), separate from Phase 1/2's
front-end derivation work:

1. `components/layout/Header.tsx` — the "Categories" mega-dropdown (desktop)
   and its mobile-drawer equivalent.
2. `components/layout/Footer.tsx` — the "Top Categories" / "More Categories"
   columns.
3. `app/categories/page.tsx` — the "Popular Categories" strip. Phase 1's own
   code comment on this file states explicitly: *"the 'Popular Categories'
   strip keeps its existing nav-registry (`lib/category-nav.ts`) source
   untouched — that surface has no trocar-tile bug and is out of this
   ticket's scope (feeds a separate nav-engine ticket)."* This is that ticket.

`ROADMAP_CATEGORIES` is collection-handle-matching, not tag-derived — the
same architecture the rest of this larger ticket has been replacing.

## Current state (verified against both source files)

`CATEGORY_TREE_L1` (`lib/category-tree.ts`, 25 entries) and `ROADMAP_CATEGORIES`
(`lib/category-nav.ts`, 25 entries) are in **the same order with identical
display names** — confirmed by direct comparison, entry by entry. This is
expected: Phase 1's plan documented that `CATEGORY_TREE_L1` was built by
matching the live `category:` tag pull against `ROADMAP_CATEGORIES`'s
existing display names. `ROADMAP_CATEGORIES` marks its first 13 entries
`navGroup: 'primary'` (Gloves … Disinfectants) and its last 12
`navGroup: 'more'` (Home Care … Pharmacy Products) — a straight positional
split, not derived from any live signal.

`getAllowedHandles()` (also exported from `lib/category-nav.ts`) has two
consumers outside of nav: `app/api/search/predictive/route.ts` and
`lib/category-utils.ts`. Neither is in scope here — `lib/category-nav.ts`
stays fully intact; nothing is deleted or migrated away from it.

`Header.tsx` also has a second, unrelated nav mechanism: non-Categories
top-level menu items sourced from Shopify's Navigation/Menu API, with
submenu hrefs resolved via `titleToSlug(item.title)` reconciled against live
collection handles (`categoryHref`). This is a structurally different data
source (Shopify menu configuration, not the category tree) and is
deliberately left untouched by this work.

## Approach

Add one function to the existing tag registry, `buildCategoryTreeNav()` in
`lib/category-tree.ts`, with the exact same signature and return shape as
the function it replaces at each call site
(`(collections: {handle: string}[]) => {primary: NavEntry[]; more: NavEntry[]}`,
`NavEntry = {displayName: string; href: string}`). Because the shape is
identical, all three call sites change only their import statement — no
prop-drilling changes to `app/layout.tsx`, `Header.tsx`, or `Footer.tsx`,
since `collections`/`allCollections` are already fetched and passed down
today.

The primary/more split is preserved exactly as it exists today (a
data-source swap, not a nav redesign) by copying it onto `CATEGORY_TREE_L1`
as a new static field, rather than computing it from live product counts.

## Design

### 1. `lib/category-tree.ts` — `navGroup` field + `buildCategoryTreeNav()`

Add `import { ROUTES } from '@/lib/routes'` (not currently imported by this
file).

Extend `L1CategoryDef`:

```ts
export type L1CategoryDef = {
  tag: string
  displayName: string
  collectionHandle: string
  // Nav placement (E1) — a straight positional copy from the legacy
  // ROADMAP_CATEGORIES split (lib/category-nav.ts), not a live-data
  // signal. Preserves the existing nav grouping across the registry swap;
  // see docs/superpowers/specs/2026-07-17-nav-wiring-design.md.
  navGroup: 'primary' | 'more'
}
```

Add `navGroup` to all 25 `CATEGORY_TREE_L1` entries: `'primary'` for the
first 13 (`gloves` through `disinfectants`), `'more'` for the last 12
(`home-care` through `pharmacy-products`) — matching array order exactly as
it exists today.

Add, near `getSubcategoriesForParent`:

```ts
export type CategoryNavEntry = { displayName: string; href: string }

export function buildCategoryTreeNav(
  collections: { handle: string }[],
): { primary: CategoryNavEntry[]; more: CategoryNavEntry[] } {
  const liveHandles = new Set(collections.map((c) => c.handle))
  const primary: CategoryNavEntry[] = []
  const more: CategoryNavEntry[] = []

  for (const l1 of CATEGORY_TREE_L1) {
    if (!liveHandles.has(l1.collectionHandle)) continue
    const entry: CategoryNavEntry = { displayName: l1.displayName, href: ROUTES.category(l1.collectionHandle) }
    if (l1.navGroup === 'primary') primary.push(entry)
    else more.push(entry)
  }

  return { primary, more }
}
```

The liveness check (skip an L1 whose `collectionHandle` has no matching live
collection) reproduces `buildCategoryNav`'s existing safety property —
protects against a nav link pointing at a deleted or renamed collection —
sourced from the same `collections` list already being fetched, no new
Shopify request.

### 2. `components/layout/Header.tsx`

Replace:

```ts
import { buildCategoryNav } from '@/lib/category-nav'
```

with:

```ts
import { buildCategoryTreeNav } from '@/lib/category-tree'
```

Replace:

```ts
  const categoryNav = buildCategoryNav(collections)
```

with:

```ts
  const categoryNav = buildCategoryTreeNav(collections)
```

No other line changes — `categoryNav.primary`/`categoryNav.more` are
consumed identically by the desktop dropdown and mobile drawer JSX below.

### 3. `components/layout/Footer.tsx`

Same swap:

```ts
import { buildCategoryNav } from '@/lib/category-nav'
```

→

```ts
import { buildCategoryTreeNav } from '@/lib/category-tree'
```

```ts
  const categoryNav = buildCategoryNav(collections)
```

→

```ts
  const categoryNav = buildCategoryTreeNav(collections)
```

### 4. `app/categories/page.tsx`

Replace:

```ts
import { getAllowedHandles, buildCategoryNav } from '@/lib/category-nav'
```

with:

```ts
import { buildCategoryTreeNav } from '@/lib/category-tree'
```

Replace:

```ts
  const allowed = getAllowedHandles()
  const navCollections = allCollections.filter((c) => allowed.has(c.handle))
  const popularCollections = buildCategoryNav(navCollections)
    .primary
```

with:

```ts
  const popularCollections = buildCategoryTreeNav(allCollections)
    .primary
```

The `getAllowedHandles()`/`navCollections` pre-filter becomes redundant once
`buildCategoryTreeNav` does its own liveness check internally, so it's
dropped rather than left as dead filtering.

## Out of scope

- No changes to `lib/category-nav.ts` itself — `ROADMAP_CATEGORIES`,
  `buildCategoryNav`, `getAllowedHandles`, `getUnmappedRoadmapCategories` all
  stay exactly as they are, still serving `app/api/search/predictive/route.ts`,
  `lib/category-utils.ts`, and `lib/category-nav-audit.ts` (audit tooling).
- No change to Header's Shopify-Menu-API-driven branch (`categoryHref`,
  `menuItemHref`, `titleToSlug`) — a separate, unrelated nav mechanism.
- No recomputation of primary/more grouping from live product counts —
  explicitly preserved as-is per user decision.
- No sitemap, facet, or L2-page changes — those are separate sub-projects
  (sitemap already shipped; facets next).

## Testing

- `lib/__tests__/category-tree.test.ts`: new `describe('buildCategoryTreeNav', ...)`
  block — splits entries into `primary`/`more` per `navGroup`; skips an L1
  whose `collectionHandle` isn't present in the passed-in collections list;
  produces `href` via `ROUTES.category(collectionHandle)`; a specific known
  entry (e.g. `gloves`) lands in `primary` and a specific known entry (e.g.
  `dental`) lands in `more`, rather than asserting exact global counts (more
  robust to future catalog/registry changes than a total-count assertion).
- No changes needed to `components/layout/__tests__/Header.test.tsx` — its
  existing test fixtures never include a `CATALOG`-type menu item, so the
  Categories mega-dropdown branch (and therefore `categoryNav`) never
  renders in that suite today; confirmed by reading the file, not assumed.
- No existing test file for `Footer.tsx` or `app/categories/page.tsx` to
  update.
- Manual verification (dev server): Header desktop dropdown, mobile drawer,
  Footer's Top/More Categories columns, and `/categories`' Popular
  Categories strip all render the same categories in the same groupings as
  before the swap.
