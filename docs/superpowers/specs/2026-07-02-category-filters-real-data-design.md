# Category/Search Filters Reflect Real Product Data — Design

**Date:** 2026-07-02
**Source:** QA ticket — "Filters looked off during the walkthrough" (P1 data UX)
**Branch:** sardor-dev

---

## Problem

`CategoryFilters` (category pages) and `SearchFilters` (search page) already consume Shopify's
native faceted filter API (`collection.products.filters` / `search.productFilters`), which
computes filter groups, values, and counts from the real products in that collection/search
context. That part already works correctly — the app does not need to reimplement counting or
filter generation.

The actual bug: both components render **every** value Shopify returns, including values with
`count === 0` (zero matching products in the current context). Shopify's faceted API intentionally
includes zero-count values so callers can decide how to present them — this app currently just
displays them as clickable, dead-end options. That's almost certainly what looked "off" during
the client walkthrough.

A second, separate bug: `SearchFilters`' price-range slider ignores the real price bounds Shopify
returns for the collection and instead hardcodes a `$0–$200,000` range with a fixed `$500` step.
`CategoryFilters`' price slider already parses the real bounds from `filter.values[0].input`
correctly — the search version drifted from it because the logic is duplicated rather than shared.

Two things the ticket asks for are already correct and need no code change:
- **Counts matching visible results** — Shopify computes counts server-side against the real
  product set; not something the app calculates.
- **Filter state surviving pagination and sorting** — category pages already thread `sort` and
  `filter[]` through `persistParams` into `CategoryPagination`/`CategorySort`; search already
  threads the active filters/sort through props into `SearchResultsSection`'s "load more" flow
  (client-side, no navigation, so no state to lose in the first place).

## Design

### 1. New shared module: `lib/shopify/filters.ts`

Pure functions, unit tested directly (no component rendering needed to verify the logic):

```ts
export function getVisibleFilters(
  filters: CollectionFilter[],
  activeFilters: string[],
): CollectionFilter[]
```
- For groups where `type !== 'PRICE_RANGE'`: keep a value if `value.count > 0` OR
  `activeFilters.includes(value.input)` (so a user can still deselect a filter that dropped to
  zero because of another filter combination — never strand a selection).
- Drop the entire group if, after that, it has no values left.
- `PRICE_RANGE` groups are always kept as-is — their single "value" is range metadata
  (`{ price: { min, max } }`), not a selectable, countable option.

```ts
export function parsePriceBounds(filter: CollectionFilter): { min: number; max: number }
export function calcPriceStep(range: number): number
```
- Extracted verbatim from `CategoryFilters`' existing `parsePriceRange`/`calcStep` (already
  correct there), so both surfaces share one source of truth for price bounds.

### 2. Wire into the two pages, not the components

`app/category/[slug]/page.tsx` and `app/search/page.tsx` keep the **raw** filters list for
resolving active-filter chip labels (so a chip for an already-selected, now-zero-count value still
shows its real label instead of falling back to the raw JSON input), and pass
`getVisibleFilters(raw, activeFilterStrings)` as the `filters` prop into `CategoryFilters`/
`FilterDrawer` and `SearchFilters`/`SearchFilterDrawer` respectively. The drawers need no changes —
they just render whatever filter list they're given.

### 3. Fix `SearchFilters`' price slider

`PriceRangeFilter` in `components/search/SearchFilters.tsx` currently takes no `filter` prop and
hardcodes `MAX_PRICE = 200000`. Change it to accept the `PRICE_RANGE` filter (like
`CategoryFilters` does) and use `parsePriceBounds`/`calcPriceStep` from the new shared module
instead of the hardcoded constant.

### 4. Tests

- `lib/shopify/__tests__/filters.test.ts`: `getVisibleFilters` — hides zero-count values, keeps a
  zero-count value that is currently active, drops a group that becomes empty, never drops or
  filters `PRICE_RANGE` groups. `parsePriceBounds`/`calcPriceStep` — parses real bounds, falls back
  sanely on malformed input.
- Small regression tests locking in the already-correct persistence behavior (explicit acceptance
  criterion): `CategoryPagination`'s href builders include `filter`/`sort` params, and
  `CategorySort`'s handler preserves `activeFilters` in the URL it navigates to.

## Out of scope

- Reordering or allowlisting filter *groups* by semantic type (type, size, sterility, color,
  brand/vendor, order size). Shopify's Search & Discovery configuration already scopes which
  filter groups exist per collection to that collection's real product attributes. There's no
  concrete evidence of an actually-irrelevant group appearing today, and hardcoding a taxonomy
  without live store data risks hiding something legitimately relevant. Fast follow-up if the
  client points to a specific bad group after this ships.
- Any Shopify Admin / Search & Discovery configuration changes (merchant-side, not app code).
- Merging `CategoryFilters` and `SearchFilters` into one shared component. Only the drifted pure
  logic (visibility filtering, price bounds) is unified; the components' URL-building differs
  enough (search carries a `q` param) that merging them is a larger refactor than this bug fix
  warrants.
