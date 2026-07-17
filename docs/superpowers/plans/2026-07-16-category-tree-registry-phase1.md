# Category Tree Registry — Phase 1 (Registry + All-Categories Rebuild) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the collection-derived category source with ONE registry module (`lib/category-tree.ts`) computed from live `category:`/`subcategory:` product tags, and rebuild the "Browse All Categories" grid on `app/categories/page.tsx` from it — 26(25 confirmed live, see Global Constraints) L1 tiles, zero trocar-size/attribute tiles at top level.

**Architecture:** A pure, unit-testable core (tag parsing, the L1 allowlist, L1/L2 tree builders, the hardcoded override tables) is fully decoupled from the paginated Storefront fetch that supplies its input. The fetch is cached at the Next `fetch()` data-cache layer (like every other Storefront read in this repo) so the ~30-request full-catalog tag scan doesn't run per-request. `app/categories/page.tsx` consumes the registry for the "Browse All Categories" grid only; the "Popular Categories" strip keeps its existing nav-registry (`lib/category-nav.ts`) source untouched — that surface has no trocar-tile bug and is out of this ticket's scope (feeds a separate nav-engine ticket).

**Tech Stack:** Next.js App Router (server components), Shopify Storefront API (GraphQL), Vitest.

## Global Constraints

- **Never match on collection title or ID** — only on tag value / product handle (spec requirement; titles use "&" not "and", and duplicate titles exist — see below).
- **Never use publication state as a tree signal** — 695 collections exist, all published; this registry ignores collections entirely as a membership source (it may still read collection `image`/`description` for tile artwork — that is a display concern, not a membership source).
- **L1 allowlist is 25 entries confirmed against live data on 2026-07-16**, not the ticket's stated 26. Verified via a live product-tag pull (7,386 active products): the 25 approved `category:` tag values exactly match the existing `ROADMAP_CATEGORIES` display names (including `pharmacy-products`, which IS approved — the ticket's separately-excluded "Pharmaceuticals" is a distinct, already-excluded concept per `lib/seo/__tests__/sitemap.test.ts:79`'s `pharmaceuticals` handle, and has no live `category:` tag of its own). Sanity check from the live pull matches the ticket's own acceptance criterion exactly: `exam-room` = 845, `dental` = 149. Four more live `category:` values (`non-medical`, `non-healthcare`, `office-supplies`, `daily-living-aids`) are catalog noise, not approved L1s, and are excluded by the allowlist gate (same default-deny posture as the existing collection allowlist). If a 26th approved value is confirmed later, it's a one-line addition to `CATEGORY_TREE_L1`.
- **Verified finding (ticket task item):** `app/categories/page.tsx` does **not** render from the custom "Categories" collection (live handle `categories-categories-surgery-procedure-categories-surgery-procedure-instruments-trays`) or "Home page" (`frontpage`) — confirmed by reading the current fetch path, which queries `GET_COLLECTIONS` and filters through `getAllowedHandles()`. The actual bug: `getAllowedHandles()` flattens **every** `matchedHandles` entry (including synthesized sub-handles like the 4 trocar-size collections) into one flat set, and the "Browse All Categories" grid renders one tile per matched Shopify collection — so trocar-size collections render as individual top-level tiles. This plan's registry fixes it structurally: the grid renders one tile per **L1 tag**, never per matched collection.
- **Dual-category override table** (5 products, confirmed live handles):
  - `dynaride-transport-wheelchair-17-x-16-w-fixed-full-arm-silver-vein-1pc-cs` → `mobility` (live tags carry both `category:home-care` and `category:mobility`)
  - `iv-catheter-20g-x-2-box-sr-ox2051ca-3sr-ox2051ca` → `iv-therapy` (live tags carry both `category:iv-therapy` and `category:needles-syringes`)
  - `surgical-aspirator-tips-1-4-green` → `dental` (live tags carry both `category:dental` and `category:respiratory`)
  - The two Universal Mattress Cover products (`universal-defined-perimeter-mattress-cover-42-1pc-cs`, `universal-mattress-cover-w-defined-perimeter-36-x-80-x-6-1pc-cs`) currently carry only `category:room-furniture` live (not yet dual-tagged) — per user decision, leave them resolving to `room-furniture` (their live tag); no override entry until the catalog team confirms home-care vs. housekeeping-janitorial.
- **Boundary subcategory overrides** (3 real splits, canonical parent + documented cross-link target for Phase 2):
  - `barrier-sleeves` → canonical `exam-room`, cross-link `dental`
  - `vital-sign-monitors` → canonical `testing`, cross-link `exam-room`
  - `exam-tables` → canonical `room-furniture`, cross-link `exam-room` (deliberate override — live counts actually favor `exam-room` 16 to 12; this is NOT the dominant-parent default)
  - All other boundary subcategory values (confirmed 24 live, ticket states 26 — catalog drift) default to whichever `category:` tag co-occurs most often (dominant parent by count).
- **Duplicate-title collections** (per user decision — for Phase 2's consumption, not exercised by any Phase 1 code path): canonical `walkers` (twin `wheeled-walkers` excluded), canonical `first-responder-bags` (twin `first-responder-bags-category` excluded).

---

## Task 1: Storefront query for all product tags

**Files:**
- Modify: `lib/shopify/queries/products.ts`

**Interfaces:**
- Produces: `GET_ALL_PRODUCT_TAGS` (exported GraphQL query string)

- [ ] **Step 1: Add the query**

Add to `lib/shopify/queries/products.ts` (after `GET_ALL_PRODUCT_HANDLES`):

```ts
export const GET_ALL_PRODUCT_TAGS = `#graphql
  query GetAllProductTags($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      nodes {
        handle
        tags
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;
```

- [ ] **Step 2: Commit**

```bash
git add lib/shopify/queries/products.ts
git commit -m "feat: add GET_ALL_PRODUCT_TAGS storefront query"
```

---

## Task 2: Tag parsing + L1 allowlist (pure core)

**Files:**
- Create: `lib/category-tree.ts`
- Test: `lib/__tests__/category-tree.test.ts`

**Interfaces:**
- Produces: `type ProductTagSummary = { handle: string; categories: string[]; subcategories: string[] }`, `parseProductTags(tags: string[]): { categories: string[]; subcategories: string[] }`, `type L1CategoryDef = { tag: string; displayName: string; collectionHandle: string }`, `CATEGORY_TREE_L1: readonly L1CategoryDef[]`

- [ ] **Step 1: Write the failing tests**

Create `lib/__tests__/category-tree.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { parseProductTags, CATEGORY_TREE_L1 } from '../category-tree'

describe('parseProductTags', () => {
  it('splits category: and subcategory: tags from the rest', () => {
    const result = parseProductTags([
      'brand:dynarex',
      'category:mobility',
      'industry:home-care',
      'subcategory:transport-chairs',
      'subcategory:manual-wheelchairs-18',
    ])
    expect(result.categories).toEqual(['mobility'])
    expect(result.subcategories).toEqual(['transport-chairs', 'manual-wheelchairs-18'])
  })

  it('returns empty arrays when no namespaced tags are present', () => {
    expect(parseProductTags(['brand:dukal', 'shipping:free'])).toEqual({
      categories: [],
      subcategories: [],
    })
  })

  it('preserves multiple category: tags in order (dual-tag products)', () => {
    const result = parseProductTags(['category:home-care', 'category:mobility'])
    expect(result.categories).toEqual(['home-care', 'mobility'])
  })
})

describe('CATEGORY_TREE_L1', () => {
  it('has exactly 25 confirmed-live approved L1 categories, each with a unique tag', () => {
    expect(CATEGORY_TREE_L1).toHaveLength(25)
    const tags = CATEGORY_TREE_L1.map((c) => c.tag)
    expect(new Set(tags).size).toBe(tags.length)
  })

  it('includes exam-room and dental (sanity-check anchors from the live pull)', () => {
    const tags = CATEGORY_TREE_L1.map((c) => c.tag)
    expect(tags).toContain('exam-room')
    expect(tags).toContain('dental')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/__tests__/category-tree.test.ts`
Expected: FAIL with "Cannot find module '../category-tree'"

- [ ] **Step 3: Write the implementation**

Create `lib/category-tree.ts`:

```ts
// ONE registry for the category tree — sourced from live category:/subcategory:
// product tags, never from the Shopify collection list (that legacy source
// only reached 51% of the catalog; see docs/superpowers/plans/
// 2026-07-16-category-tree-registry-phase1.md for the audit).

const CATEGORY_TAG_PREFIX = 'category:'
const SUBCATEGORY_TAG_PREFIX = 'subcategory:'

export type ProductTagSummary = {
  handle: string
  categories: string[]
  subcategories: string[]
}

export function parseProductTags(tags: string[]): {
  categories: string[]
  subcategories: string[]
} {
  return {
    categories: tags
      .filter((t) => t.startsWith(CATEGORY_TAG_PREFIX))
      .map((t) => t.slice(CATEGORY_TAG_PREFIX.length)),
    subcategories: tags
      .filter((t) => t.startsWith(SUBCATEGORY_TAG_PREFIX))
      .map((t) => t.slice(SUBCATEGORY_TAG_PREFIX.length)),
  }
}

export type L1CategoryDef = {
  tag: string
  displayName: string
  // Shopify collection handle used only for tile artwork (image/description).
  // Never used as a membership signal — see Global Constraints.
  collectionHandle: string
}

// The 25 approved category: tag values, confirmed against the live catalog
// on 2026-07-16 (7,386 active products). See the plan's Global Constraints
// for the reconciliation against the ticket's stated count of 26.
export const CATEGORY_TREE_L1: readonly L1CategoryDef[] = [
  { tag: 'gloves', displayName: 'Gloves', collectionHandle: 'gloves' },
  { tag: 'wound-care', displayName: 'Wound Care', collectionHandle: 'wound-care' },
  { tag: 'needles-syringes', displayName: 'Needles & Syringes', collectionHandle: 'needles-syringes' },
  { tag: 'surgical-sutures', displayName: 'Surgical Sutures', collectionHandle: 'surgical-sutures' },
  { tag: 'testing', displayName: 'Testing', collectionHandle: 'testing-screening' },
  { tag: 'exam-room', displayName: 'Exam Room', collectionHandle: 'exam-room' },
  { tag: 'respiratory', displayName: 'Respiratory', collectionHandle: 'respiratory' },
  { tag: 'mobility', displayName: 'Mobility', collectionHandle: 'mobility' },
  { tag: 'patient-therapy-rehab', displayName: 'Patient Therapy & Rehab', collectionHandle: 'patient-therapy-rehab' },
  { tag: 'surgery-procedure', displayName: 'Surgery & Procedure', collectionHandle: 'trocars-trocar-kits' },
  { tag: 'apparel', displayName: 'Apparel', collectionHandle: 'capes-gowns' },
  { tag: 'hygiene', displayName: 'Hygiene', collectionHandle: 'hygiene' },
  { tag: 'disinfectants', displayName: 'Disinfectants', collectionHandle: 'disinfectants' },
  { tag: 'home-care', displayName: 'Home Care', collectionHandle: 'home-care' },
  { tag: 'emergency-supplies', displayName: 'Emergency Supplies', collectionHandle: 'emergency-supplies' },
  { tag: 'incontinence', displayName: 'Incontinence', collectionHandle: 'incontinence' },
  { tag: 'iv-therapy', displayName: 'IV Therapy', collectionHandle: 'iv-therapy' },
  { tag: 'urology-ostomy', displayName: 'Urology & Ostomy', collectionHandle: 'urology-ostomy' },
  { tag: 'sterilization', displayName: 'Sterilization', collectionHandle: 'sterilization' },
  { tag: 'dental', displayName: 'Dental', collectionHandle: 'dental' },
  { tag: 'housekeeping-janitorial', displayName: 'Housekeeping & Janitorial', collectionHandle: 'housekeeping-janitorial' },
  { tag: 'bariatric', displayName: 'Bariatric', collectionHandle: 'bariatric' },
  { tag: 'room-furniture', displayName: 'Room Furniture', collectionHandle: 'seating' },
  { tag: 'face-masks', displayName: 'Face Masks', collectionHandle: 'face-coverings' },
  { tag: 'pharmacy-products', displayName: 'Pharmacy Products', collectionHandle: 'pharmacy-products' },
] as const
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/__tests__/category-tree.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/category-tree.ts lib/__tests__/category-tree.test.ts
git commit -m "feat: add category tree tag parsing and L1 allowlist"
```

---

## Task 3: Canonical category resolution + L1 tile counts

**Files:**
- Modify: `lib/category-tree.ts`
- Test: `lib/__tests__/category-tree.test.ts`

**Interfaces:**
- Consumes: `ProductTagSummary`, `CATEGORY_TREE_L1` (Task 2)
- Produces: `PRODUCT_CATEGORY_OVERRIDES: Record<string, string>`, `resolveCanonicalCategory(summary: ProductTagSummary): string | null`, `type L1Tile = { tag: string; displayName: string; collectionHandle: string; productCount: number }`, `buildL1Tiles(summaries: ProductTagSummary[]): L1Tile[]`

- [ ] **Step 1: Write the failing tests**

Append to `lib/__tests__/category-tree.test.ts`:

```ts
import { resolveCanonicalCategory, buildL1Tiles, PRODUCT_CATEGORY_OVERRIDES } from '../category-tree'

describe('resolveCanonicalCategory', () => {
  it('returns the single category for a normally-tagged product', () => {
    expect(resolveCanonicalCategory({ handle: 'foo', categories: ['gloves'], subcategories: [] })).toBe('gloves')
  })

  it('returns null when a product has no category: tag at all', () => {
    expect(resolveCanonicalCategory({ handle: 'foo', categories: [], subcategories: [] })).toBeNull()
  })

  it('applies the hardcoded override for the 5 dual-tag exception products', () => {
    expect(
      resolveCanonicalCategory({
        handle: 'dynaride-transport-wheelchair-17-x-16-w-fixed-full-arm-silver-vein-1pc-cs',
        categories: ['home-care', 'mobility'],
        subcategories: ['transport-chairs'],
      }),
    ).toBe('mobility')
  })

  it('falls back to the first category: tag for an un-overridden dual-tag product', () => {
    expect(
      resolveCanonicalCategory({ handle: 'some-other-handle', categories: ['home-care', 'mobility'], subcategories: [] }),
    ).toBe('home-care')
  })
})

describe('buildL1Tiles', () => {
  it('counts products per L1 tag, zero for tags with no matching products', () => {
    const tiles = buildL1Tiles([
      { handle: 'a', categories: ['gloves'], subcategories: [] },
      { handle: 'b', categories: ['gloves'], subcategories: [] },
      { handle: 'c', categories: ['dental'], subcategories: [] },
    ])
    const gloves = tiles.find((t) => t.tag === 'gloves')!
    const dental = tiles.find((t) => t.tag === 'dental')!
    const wound = tiles.find((t) => t.tag === 'wound-care')!
    expect(gloves.productCount).toBe(2)
    expect(dental.productCount).toBe(1)
    expect(wound.productCount).toBe(0)
    expect(tiles).toHaveLength(25)
  })

  it('ignores products whose category: tag is not in the L1 allowlist (noise tags)', () => {
    const tiles = buildL1Tiles([
      { handle: 'a', categories: ['non-medical'], subcategories: [] },
    ])
    expect(tiles.every((t) => t.productCount === 0)).toBe(true)
  })

  it('routes the override products into their canonical L1 count instead of their first raw tag', () => {
    const tiles = buildL1Tiles([
      {
        handle: 'surgical-aspirator-tips-1-4-green',
        categories: ['dental', 'respiratory'],
        subcategories: ['suction'],
      },
    ])
    expect(tiles.find((t) => t.tag === 'dental')!.productCount).toBe(1)
    expect(tiles.find((t) => t.tag === 'respiratory')!.productCount).toBe(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/__tests__/category-tree.test.ts`
Expected: FAIL with "resolveCanonicalCategory is not a function" (or similar)

- [ ] **Step 3: Write the implementation**

Append to `lib/category-tree.ts`:

```ts
// Confirmed live on 2026-07-16 (see plan Global Constraints) — 3 of the 5
// products the spec calls out are dual-tagged today; the 2 Universal
// Mattress Cover products are not (see comment below).
export const PRODUCT_CATEGORY_OVERRIDES: Record<string, string> = {
  'dynaride-transport-wheelchair-17-x-16-w-fixed-full-arm-silver-vein-1pc-cs': 'mobility',
  'iv-catheter-20g-x-2-box-sr-ox2051ca-3sr-ox2051ca': 'iv-therapy',
  'surgical-aspirator-tips-1-4-green': 'dental',
  // Universal Mattress Cover products (universal-defined-perimeter-mattress-
  // cover-42-1pc-cs, universal-mattress-cover-w-defined-perimeter-36-x-80-x-
  // 6-1pc-cs): canonical category is home-care vs. housekeeping-janitorial,
  // pending catalog-team sign-off. They carry only category:room-furniture
  // live today, so no override is needed until that tag changes.
}

export function resolveCanonicalCategory(summary: ProductTagSummary): string | null {
  return PRODUCT_CATEGORY_OVERRIDES[summary.handle] ?? summary.categories[0] ?? null
}

export type L1Tile = L1CategoryDef & { productCount: number }

export function buildL1Tiles(summaries: ProductTagSummary[]): L1Tile[] {
  const counts = new Map<string, number>()
  for (const summary of summaries) {
    const category = resolveCanonicalCategory(summary)
    if (category) counts.set(category, (counts.get(category) ?? 0) + 1)
  }
  return CATEGORY_TREE_L1.map((l1) => ({ ...l1, productCount: counts.get(l1.tag) ?? 0 }))
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/__tests__/category-tree.test.ts`
Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add lib/category-tree.ts lib/__tests__/category-tree.test.ts
git commit -m "feat: add canonical category resolution and L1 tile counts"
```

---

## Task 4: L2 subcategory nesting + boundary overrides

**Files:**
- Modify: `lib/category-tree.ts`
- Test: `lib/__tests__/category-tree.test.ts`

**Interfaces:**
- Consumes: `ProductTagSummary`, `resolveCanonicalCategory`, `CATEGORY_TREE_L1` (Tasks 2–3)
- Produces: `type L2Node = { tag: string; parentTag: string; crossLinkParentTag?: string; productCount: number }`, `BOUNDARY_L1_OVERRIDES: Record<string, { canonical: string; crossLink: string }>`, `buildL2Tree(summaries: ProductTagSummary[]): L2Node[]`

This task builds the L2 nesting the spec calls for ("Build the tree as ONE registry... single source of truth") so Phase 2 (boundary pages, cross-links, breadcrumbs) has a ready foundation. Phase 1 does not route or render L2 pages from it yet.

- [ ] **Step 1: Write the failing tests**

Append to `lib/__tests__/category-tree.test.ts`:

```ts
import { buildL2Tree } from '../category-tree'

describe('buildL2Tree', () => {
  it('nests a subcategory under its single co-occurring L1 category', () => {
    const nodes = buildL2Tree([
      { handle: 'a', categories: ['gloves'], subcategories: ['exam-gloves'] },
      { handle: 'b', categories: ['gloves'], subcategories: ['exam-gloves'] },
    ])
    const examGloves = nodes.find((n) => n.tag === 'exam-gloves')!
    expect(examGloves.parentTag).toBe('gloves')
    expect(examGloves.crossLinkParentTag).toBeUndefined()
    expect(examGloves.productCount).toBe(2)
  })

  it('applies the 3 hardcoded boundary overrides regardless of raw dominance', () => {
    // exam-tables: live counts favor exam-room (16) over room-furniture (12) —
    // the override deliberately picks room-furniture as canonical anyway.
    const nodes = buildL2Tree([
      ...Array.from({ length: 16 }, (_, i) => ({
        handle: `er-${i}`, categories: ['exam-room'], subcategories: ['exam-tables'],
      })),
      ...Array.from({ length: 12 }, (_, i) => ({
        handle: `rf-${i}`, categories: ['room-furniture'], subcategories: ['exam-tables'],
      })),
    ])
    const examTables = nodes.find((n) => n.tag === 'exam-tables')!
    expect(examTables.parentTag).toBe('room-furniture')
    expect(examTables.crossLinkParentTag).toBe('exam-room')
    expect(examTables.productCount).toBe(28)
  })

  it('defaults un-overridden boundary subcategories to the dominant co-occurring parent', () => {
    const nodes = buildL2Tree([
      { handle: 'a', categories: ['exam-room'], subcategories: ['foot-stools'] },
      { handle: 'b', categories: ['exam-room'], subcategories: ['foot-stools'] },
      { handle: 'c', categories: ['home-care'], subcategories: ['foot-stools'] },
    ])
    const footStools = nodes.find((n) => n.tag === 'foot-stools')!
    expect(footStools.parentTag).toBe('exam-room')
    expect(footStools.crossLinkParentTag).toBeUndefined()
  })

  it('excludes a subcategory whose only co-occurring category: tags are not approved L1s', () => {
    const nodes = buildL2Tree([
      { handle: 'a', categories: ['non-medical'], subcategories: ['pet-pads'] },
    ])
    expect(nodes.find((n) => n.tag === 'pet-pads')).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/__tests__/category-tree.test.ts`
Expected: FAIL with "buildL2Tree is not a function"

- [ ] **Step 3: Write the implementation**

Append to `lib/category-tree.ts`:

```ts
export type L2Node = {
  tag: string
  parentTag: string
  crossLinkParentTag?: string
  productCount: number
}

// The 3 real boundary splits called out in the spec — deliberate picks, not
// always the raw-count winner (exam-tables favors room-furniture over the
// larger exam-room count on purpose).
export const BOUNDARY_L1_OVERRIDES: Record<string, { canonical: string; crossLink: string }> = {
  'barrier-sleeves': { canonical: 'exam-room', crossLink: 'dental' },
  'vital-sign-monitors': { canonical: 'testing', crossLink: 'exam-room' },
  'exam-tables': { canonical: 'room-furniture', crossLink: 'exam-room' },
}

export function buildL2Tree(summaries: ProductTagSummary[]): L2Node[] {
  const l1Tags = new Set(CATEGORY_TREE_L1.map((c) => c.tag))
  const subProductCounts = new Map<string, number>()
  const subParentCounts = new Map<string, Map<string, number>>()

  for (const summary of summaries) {
    const category = resolveCanonicalCategory(summary)
    for (const sub of summary.subcategories) {
      subProductCounts.set(sub, (subProductCounts.get(sub) ?? 0) + 1)
      if (!category || !l1Tags.has(category)) continue
      let parentCounts = subParentCounts.get(sub)
      if (!parentCounts) {
        parentCounts = new Map()
        subParentCounts.set(sub, parentCounts)
      }
      parentCounts.set(category, (parentCounts.get(category) ?? 0) + 1)
    }
  }

  const nodes: L2Node[] = []
  for (const [sub, parentCounts] of subParentCounts.entries()) {
    const override = BOUNDARY_L1_OVERRIDES[sub]
    let parentTag: string
    let crossLinkParentTag: string | undefined
    if (override) {
      parentTag = override.canonical
      crossLinkParentTag = override.crossLink
    } else {
      const [dominant] = [...parentCounts.entries()].sort((a, b) => b[1] - a[1])
      parentTag = dominant[0]
    }
    nodes.push({ tag: sub, parentTag, crossLinkParentTag, productCount: subProductCounts.get(sub) ?? 0 })
  }
  return nodes
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/__tests__/category-tree.test.ts`
Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add lib/category-tree.ts lib/__tests__/category-tree.test.ts
git commit -m "feat: add L2 subcategory nesting with boundary overrides"
```

---

## Task 5: Paginated, cached fetch of all product tags

**Files:**
- Modify: `lib/category-tree.ts`
- Test: `lib/__tests__/category-tree.test.ts`

**Interfaces:**
- Consumes: `storefrontFetch` (`@/lib/shopify/storefront`), `GET_ALL_PRODUCT_TAGS` (Task 1), `ProductTagSummary`, `parseProductTags` (Task 2)
- Produces: `fetchProductTagSummaries(): Promise<ProductTagSummary[]>`

- [ ] **Step 1: Write the failing test**

Create a new describe block at the top of `lib/__tests__/category-tree.test.ts` (add the mock before other imports run):

```ts
import { vi, beforeEach } from 'vitest'

vi.mock('@/lib/shopify/storefront', () => ({ storefrontFetch: vi.fn() }))
import { storefrontFetch } from '@/lib/shopify/storefront'
const mockFetch = vi.mocked(storefrontFetch)

beforeEach(() => {
  mockFetch.mockReset()
})

describe('fetchProductTagSummaries', () => {
  it('paginates through every page and parses tags into summaries', async () => {
    mockFetch
      .mockResolvedValueOnce({
        products: {
          nodes: [{ handle: 'a', tags: ['category:gloves'] }],
          pageInfo: { hasNextPage: true, endCursor: 'cursor-1' },
        },
      })
      .mockResolvedValueOnce({
        products: {
          nodes: [{ handle: 'b', tags: ['category:dental', 'subcategory:suction'] }],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      })

    const { fetchProductTagSummaries } = await import('../category-tree')
    const summaries = await fetchProductTagSummaries()

    expect(summaries).toEqual([
      { handle: 'a', categories: ['gloves'], subcategories: [] },
      { handle: 'b', categories: ['dental'], subcategories: ['suction'] },
    ])
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('stops instead of looping forever if the API returns a stale cursor', async () => {
    mockFetch.mockResolvedValue({
      products: {
        nodes: [{ handle: 'a', tags: [] }],
        pageInfo: { hasNextPage: true, endCursor: null },
      },
    })
    const { fetchProductTagSummaries } = await import('../category-tree')
    const summaries = await fetchProductTagSummaries()
    expect(summaries).toHaveLength(1)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/category-tree.test.ts`
Expected: FAIL with "fetchProductTagSummaries is not a function"

- [ ] **Step 3: Write the implementation**

Add to the top of `lib/category-tree.ts` (imports) and append the function:

```ts
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_ALL_PRODUCT_TAGS } from '@/lib/shopify/queries/products'
```

```ts
type ProductTagsResponse = {
  products: {
    nodes: { handle: string; tags: string[] }[]
    pageInfo: { hasNextPage: boolean; endCursor: string | null }
  }
}

// Full-catalog tag scan (~30 requests at 7,400 products / 250 per page).
// Cached for 1 hour under the 'category-tree' tag — the catalog moves daily
// per the spec, so this is far less aggressive than the 5-minute default in
// storefront.ts, and can be bumped via revalidateTag('category-tree') if a
// faster refresh is ever needed.
export async function fetchProductTagSummaries(): Promise<ProductTagSummary[]> {
  const summaries: ProductTagSummary[] = []
  let cursor: string | null = null

  while (true) {
    const data: ProductTagsResponse = await storefrontFetch<ProductTagsResponse>(
      GET_ALL_PRODUCT_TAGS,
      { first: 250, after: cursor },
      { next: { revalidate: 3600, tags: ['shopify', 'category-tree'] } },
    )

    for (const node of data.products.nodes) {
      const { categories, subcategories } = parseProductTags(node.tags)
      summaries.push({ handle: node.handle, categories, subcategories })
    }

    const nextCursor = data.products.pageInfo.endCursor
    if (!data.products.pageInfo.hasNextPage || !nextCursor || nextCursor === cursor) break
    cursor = nextCursor
  }

  return summaries
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/__tests__/category-tree.test.ts`
Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add lib/category-tree.ts lib/__tests__/category-tree.test.ts
git commit -m "feat: fetch and cache all product tags for the category tree"
```

---

## Task 6: Rebuild the All-Categories grid from the registry

**Files:**
- Modify: `app/categories/page.tsx`

**Interfaces:**
- Consumes: `CATEGORY_TREE_L1`, `fetchProductTagSummaries`, `buildL1Tiles`, `L1Tile` (Tasks 2, 3, 5)

- [ ] **Step 1: Replace the data fetch**

In `app/categories/page.tsx`, add the import:

```tsx
import { fetchProductTagSummaries, buildL1Tiles, type L1Tile } from '@/lib/category-tree'
```

Then replace the existing fetch block (lines 30–50: `let collections: CollectionNode[] = []` through the `popularCollections` computation) with:

```tsx
export default async function CategoriesPage() {
  const nonce = await getNonce()

  let allCollections: CollectionNode[] = []
  let l1Tiles: L1Tile[] = []
  try {
    // Two independent reads: `allCollections` supplies both the Popular
    // Categories strip (nav-registry-sourced, out of this ticket's scope)
    // and tile artwork for the grid below; `l1Tiles` is the tag-derived
    // registry that decides WHICH tiles the grid renders. Verified
    // 2026-07-16: this page has never read from the stale custom
    // "Categories"/"Home page" collections — the trocar-size top-level
    // tiles came from getAllowedHandles() flattening synthesized sub-handles
    // (e.g. the 4 trocar-size collections) into one flat allowlist set.
    const [summaries, data] = await Promise.all([
      fetchProductTagSummaries(),
      storefrontFetch<{ collections: { nodes: CollectionNode[] } }>(GET_COLLECTIONS, { first: 250 }),
    ])
    l1Tiles = buildL1Tiles(summaries)
    allCollections = data.collections.nodes
  } catch {
    // degrade gracefully — render empty state
  }

  const allCollectionsByHandle = new Map(allCollections.map((c) => [c.handle, c]))
  const allowed = getAllowedHandles()
  const navCollections = allCollections.filter((c) => allowed.has(c.handle))
  const popularCollections = buildCategoryNav(navCollections)
    .primary
    .map((entry) => {
      const handle = entry.href.split('/').pop() ?? ''
      return allCollectionsByHandle.get(handle)
    })
    .filter((c): c is CollectionNode => c != null)
    .slice(0, 8)
```

- [ ] **Step 2: Replace the "All Categories grid" JSX**

Replace the `{/* All Categories grid */}` section (rendering over `collections`) with:

```tsx
      {/* All Categories grid */}
      <section className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-12">
        <h2 className="text-navy-900 text-[22px] font-semibold mb-7">Browse All Categories</h2>

        {l1Tiles.length === 0 ? (
          <p className="text-gray-500 text-[15px]">No categories found.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {l1Tiles.map((tile) => {
              const col = allCollectionsByHandle.get(tile.collectionHandle)
              return (
                <Link
                  key={tile.tag}
                  href={ROUTES.category(tile.collectionHandle)}
                  className="group bg-white border border-gray-200 hover:border-navy-900 transition-colors overflow-hidden"
                >
                  {col?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={col.image.url}
                      alt={col.image.altText ?? tile.displayName}
                      className="w-full aspect-[4/3] object-cover"
                    />
                  ) : (
                    <div className="w-full aspect-[4/3] bg-navy-900/5 flex items-center justify-center">
                      <span className="text-navy-900/20 text-[36px] font-bold">{tile.displayName.charAt(0)}</span>
                    </div>
                  )}
                  <div className="px-4 py-3">
                    <p className="text-navy-900 text-[14px] font-semibold group-hover:underline">
                      {tile.displayName}
                    </p>
                    {col?.description && (
                      <p className="text-gray-500 text-[12px] mt-1 line-clamp-2">
                        {col.description}
                      </p>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>
```

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc --noEmit`
Expected: no errors

Run: `npx eslint app/categories/page.tsx`
Expected: no errors

- [ ] **Step 4: Manual verification**

Run: `npm run dev`
Visit `http://localhost:3000/categories` and confirm:
- The "Browse All Categories" grid shows exactly 25 tiles (Gloves … Pharmacy Products), each linking to `/category/<collectionHandle>`.
- None of the 4 trocar-size collections (Disposable 3.2mm/3.5mm, Disposable 4.5mm, Reusable 3.2mm/3.5mm, Reusable 4.5mm) appear as their own tile.
- The "Popular Categories" strip above it is unchanged from before this change.

- [ ] **Step 5: Commit**

```bash
git add app/categories/page.tsx
git commit -m "feat: render All-Categories grid from the tag-derived L1 registry"
```

---

## Task 7: Audit script for QA sign-off

**Files:**
- Create: `scripts/audit-category-tree.ts`

**Interfaces:**
- Consumes: `fetchProductTagSummaries`, `buildL1Tiles`, `buildL2Tree`, `CATEGORY_TREE_L1` (Tasks 2–5)

- [ ] **Step 1: Write the script**

Create `scripts/audit-category-tree.ts`, mirroring the existing `scripts/audit-collections.ts` pattern:

```ts
// Run with:
//   NODE_OPTIONS='--conditions=react-server' npx tsx scripts/audit-category-tree.ts
import { loadEnvConfig } from '@next/env'
import { writeFileSync } from 'fs'
import {
  fetchProductTagSummaries,
  buildL1Tiles,
  buildL2Tree,
  CATEGORY_TREE_L1,
} from '../lib/category-tree'

loadEnvConfig(process.cwd())

async function main() {
  const summaries = await fetchProductTagSummaries()
  const l1Tiles = buildL1Tiles(summaries)
  const l2Nodes = buildL2Tree(summaries)

  const approvedTags = new Set(CATEGORY_TREE_L1.map((c) => c.tag))
  const liveCategoryTags = new Set(summaries.flatMap((s) => s.categories))
  const noiseTags = [...liveCategoryTags].filter((t) => !approvedTags.has(t)).sort()

  const lines: string[] = []
  lines.push('# Category Tree Audit Report')
  lines.push('')
  lines.push(`Generated: ${new Date().toISOString()}`)
  lines.push(`Total products scanned: ${summaries.length}`)
  lines.push('')

  lines.push('## L1 tiles (product counts)')
  lines.push('')
  lines.push('| Tag | Display Name | Product Count |')
  lines.push('|---|---|---|')
  for (const tile of [...l1Tiles].sort((a, b) => b.productCount - a.productCount)) {
    lines.push(`| ${tile.tag} | ${tile.displayName} | ${tile.productCount} |`)
  }

  lines.push('')
  lines.push('## Live category: tag values NOT in the L1 allowlist (catalog noise)')
  lines.push('')
  if (noiseTags.length === 0) {
    lines.push('_None found._')
  } else {
    for (const tag of noiseTags) lines.push(`- \`${tag}\``)
  }

  lines.push('')
  lines.push('## L2 boundary subcategories (nest under >1 category: tag)')
  lines.push('')
  const boundaryNodes = l2Nodes.filter((n) => n.crossLinkParentTag)
  lines.push('| Subcategory | Canonical Parent | Cross-link Parent | Product Count |')
  lines.push('|---|---|---|---|')
  for (const n of boundaryNodes) {
    lines.push(`| ${n.tag} | ${n.parentTag} | ${n.crossLinkParentTag} | ${n.productCount} |`)
  }

  lines.push('')
  lines.push(`Total distinct subcategory: values: ${l2Nodes.length}`)

  const report = lines.join('\n') + '\n'
  writeFileSync('audit/category-tree-audit-report.md', report)
  console.log(report)
}

main().catch(console.error)
```

- [ ] **Step 2: Run it against the live catalog**

Run: `NODE_OPTIONS='--conditions=react-server' npx tsx scripts/audit-category-tree.ts`
Expected: Prints the report and writes `audit/category-tree-audit-report.md`; confirm `exam-room` = 845-ish and `dental` = 149-ish (small drift expected day to day per the spec's own caveat).

- [ ] **Step 3: Commit**

```bash
git add scripts/audit-category-tree.ts audit/category-tree-audit-report.md
git commit -m "feat: add category tree audit script for QA sign-off"
```

---

## Task 8: Full verification pass

- [ ] **Step 1: Run the full test suite**

Run: `npm run test`
Expected: all tests pass, including the new `lib/__tests__/category-tree.test.ts` suite.

- [ ] **Step 2: Run the production build**

Run: `npm run build`
Expected: build succeeds with no type errors.

- [ ] **Step 3: Screenshot evidence**

With `npm run dev` running, capture a screenshot of `/categories` showing the 25 L1 tiles in the "Browse All Categories" grid for the ticket's QA checklist ("New All-Categories page (26 L1 tiles, no attribute tiles)" — actual count is 25, see Global Constraints).

---

## What Phase 1 deliberately does not do (tracked for Phase 2 / Phase 3)

- No L2/subcategory routes, boundary-page cross-links, or breadcrumb re-sourcing yet (`buildL2Tree` is ready for this).
- No facet gating changes for the ~114 attribute collections / 80 attribute subcategory values (NF1 filter allowlist work).
- No sitemap changes (`lib/seo/sitemap.ts` still uses the old collection allowlist for `/category/*` URLs).
- No trocar standalone-collection unpublish/merge, no duplicate-title collection redirects (`walkers`/`wheeled-walkers`, `first-responder-bags`/`first-responder-bags-category` — canonical picks are recorded in Global Constraints for Phase 2 to consume).
- No nav (`lib/category-nav.ts`) changes — the Popular Categories strip and header/footer nav keep their current source until the nav-engine ticket (E1) consumes this registry.
