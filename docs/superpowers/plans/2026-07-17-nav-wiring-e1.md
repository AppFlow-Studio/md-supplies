# Nav Wiring (E1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Point Header's Categories dropdown, Footer's category columns, and the `/categories` Popular Categories strip at the tag registry (`lib/category-tree.ts`) instead of the legacy collection-matching `ROADMAP_CATEGORIES`/`buildCategoryNav()` in `lib/category-nav.ts`.

**Architecture:** Add `buildCategoryTreeNav()` to the existing registry, matching `buildCategoryNav()`'s exact signature and return shape (`(collections: {handle}[]) => {primary, more}: {displayName, href}[]`). Because the shape is identical, all three call sites change only their import — no prop-drilling changes anywhere. The primary/more grouping is preserved exactly via a new static `navGroup` field on `CATEGORY_TREE_L1`, copied positionally from `ROADMAP_CATEGORIES`'s existing split (both arrays are in the same order with identical display names, confirmed by direct comparison).

**Tech Stack:** TypeScript, Vitest, Next.js.

## Global Constraints

- **`lib/category-nav.ts` is untouched.** `ROADMAP_CATEGORIES`, `buildCategoryNav`, `getAllowedHandles`, `getUnmappedRoadmapCategories` all stay exactly as they are — `getAllowedHandles()` still serves `app/api/search/predictive/route.ts`, `lib/category-utils.ts`, and `lib/category-nav-audit.ts`, none of which are in scope here.
- **Header's Shopify-Menu-API-driven branch is untouched** (`categoryHref`, `menuItemHref`, `titleToSlug` in `Header.tsx`) — a separate, unrelated nav mechanism, not derived from the category tree.
- **Primary/more grouping is preserved exactly as it exists today** — a straight positional copy from `ROADMAP_CATEGORIES` (first 13 entries `'primary'`, last 12 `'more'`), not recomputed from live product counts.
- **No sitemap, facet, or L2-page changes** — out of scope for this plan.

---

## Task 1: `navGroup` field + `buildCategoryTreeNav()`

**Files:**
- Modify: `lib/category-tree.ts`
- Test: `lib/__tests__/category-tree.test.ts`

**Interfaces:**
- Consumes: `CATEGORY_TREE_L1`, `L1CategoryDef` (existing)
- Produces: `L1CategoryDef.navGroup: 'primary' | 'more'` (new field on existing type), `type CategoryNavEntry = { displayName: string; href: string }`, `buildCategoryTreeNav(collections: { handle: string }[]): { primary: CategoryNavEntry[]; more: CategoryNavEntry[] }`

- [ ] **Step 1: Write the failing tests**

Append to `lib/__tests__/category-tree.test.ts`:

```ts
import { buildCategoryTreeNav } from '../category-tree'

describe('buildCategoryTreeNav', () => {
  it('splits entries into primary/more per navGroup', () => {
    const nav = buildCategoryTreeNav(CATEGORY_TREE_L1.map((l1) => ({ handle: l1.collectionHandle })))
    expect(nav.primary.some((e) => e.displayName === 'Gloves')).toBe(true)
    expect(nav.more.some((e) => e.displayName === 'Dental')).toBe(true)
    expect(nav.primary.some((e) => e.displayName === 'Dental')).toBe(false)
    expect(nav.more.some((e) => e.displayName === 'Gloves')).toBe(false)
  })

  it('skips an L1 whose collectionHandle has no matching live collection', () => {
    const nav = buildCategoryTreeNav([{ handle: 'not-a-real-handle' }])
    expect(nav.primary).toHaveLength(0)
    expect(nav.more).toHaveLength(0)
  })

  it('builds href via ROUTES.category(collectionHandle)', () => {
    const nav = buildCategoryTreeNav([{ handle: 'testing-screening' }])
    const testing = nav.primary.find((e) => e.displayName === 'Testing')
    expect(testing?.href).toBe('/category/testing-screening')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/__tests__/category-tree.test.ts`
Expected: FAIL — `buildCategoryTreeNav` is not exported yet, and `CATEGORY_TREE_L1` entries have no `navGroup` field.

- [ ] **Step 3: Write the implementation**

In `lib/category-tree.ts`, add to the top imports:

```ts
import { ROUTES } from '@/lib/routes'
```

Replace the `L1CategoryDef` type:

```ts
export type L1CategoryDef = {
  tag: string
  displayName: string
  // Shopify collection handle used for tile artwork (image/description) AND
  // as the Phase 1 navigation target (`/category/<collectionHandle>`). For
  // most L1s this handle matches the category well, but 5 are narrower
  // "representative" sub-collections chosen for their image (e.g.
  // surgery-procedure -> trocars-trocar-kits, room-furniture -> seating,
  // testing -> testing-screening, apparel -> capes-gowns, face-masks ->
  // face-coverings) — clicking those tiles currently lands on a narrower
  // collection than the tile's label promises. Tag-scoped category landing
  // (making the destination match the tag-derived product set exactly) is
  // deferred to Phase 2. Regardless of this field's value, it is never a
  // membership/existence signal for the registry — CATEGORY_TREE_L1
  // membership (which 25 tiles exist) is tag-derived only.
  collectionHandle: string
}
```

with:

```ts
export type L1CategoryDef = {
  tag: string
  displayName: string
  // Shopify collection handle used for tile artwork (image/description) AND
  // as the Phase 1 navigation target (`/category/<collectionHandle>`). For
  // most L1s this handle matches the category well, but 5 are narrower
  // "representative" sub-collections chosen for their image (e.g.
  // surgery-procedure -> trocars-trocar-kits, room-furniture -> seating,
  // testing -> testing-screening, apparel -> capes-gowns, face-masks ->
  // face-coverings) — clicking those tiles currently lands on a narrower
  // collection than the tile's label promises. Tag-scoped category landing
  // (making the destination match the tag-derived product set exactly) is
  // deferred to Phase 2. Regardless of this field's value, it is never a
  // membership/existence signal for the registry — CATEGORY_TREE_L1
  // membership (which 25 tiles exist) is tag-derived only.
  collectionHandle: string
  // Nav placement (E1) — a straight positional copy from the legacy
  // ROADMAP_CATEGORIES split (lib/category-nav.ts), not a live-data
  // signal. Preserves the existing nav grouping across the registry swap;
  // see docs/superpowers/specs/2026-07-17-nav-wiring-design.md.
  navGroup: 'primary' | 'more'
}
```

Replace the `CATEGORY_TREE_L1` array entirely with (adds `navGroup` to each entry, no other change):

```ts
export const CATEGORY_TREE_L1: readonly L1CategoryDef[] = [
  { tag: 'gloves', displayName: 'Gloves', collectionHandle: 'gloves', navGroup: 'primary' },
  { tag: 'wound-care', displayName: 'Wound Care', collectionHandle: 'wound-care', navGroup: 'primary' },
  { tag: 'needles-syringes', displayName: 'Needles & Syringes', collectionHandle: 'needles-syringes', navGroup: 'primary' },
  { tag: 'surgical-sutures', displayName: 'Surgical Sutures', collectionHandle: 'surgical-sutures', navGroup: 'primary' },
  { tag: 'testing', displayName: 'Testing', collectionHandle: 'testing-screening', navGroup: 'primary' },
  { tag: 'exam-room', displayName: 'Exam Room', collectionHandle: 'exam-room', navGroup: 'primary' },
  { tag: 'respiratory', displayName: 'Respiratory', collectionHandle: 'respiratory', navGroup: 'primary' },
  { tag: 'mobility', displayName: 'Mobility', collectionHandle: 'mobility', navGroup: 'primary' },
  { tag: 'patient-therapy-rehab', displayName: 'Patient Therapy & Rehab', collectionHandle: 'patient-therapy-rehab', navGroup: 'primary' },
  { tag: 'surgery-procedure', displayName: 'Surgery & Procedure', collectionHandle: 'trocars-trocar-kits', navGroup: 'primary' },
  { tag: 'apparel', displayName: 'Apparel', collectionHandle: 'capes-gowns', navGroup: 'primary' },
  { tag: 'hygiene', displayName: 'Hygiene', collectionHandle: 'hygiene', navGroup: 'primary' },
  { tag: 'disinfectants', displayName: 'Disinfectants', collectionHandle: 'disinfectants', navGroup: 'primary' },
  { tag: 'home-care', displayName: 'Home Care', collectionHandle: 'home-care', navGroup: 'more' },
  { tag: 'emergency-supplies', displayName: 'Emergency Supplies', collectionHandle: 'emergency-supplies', navGroup: 'more' },
  { tag: 'incontinence', displayName: 'Incontinence', collectionHandle: 'incontinence', navGroup: 'more' },
  { tag: 'iv-therapy', displayName: 'IV Therapy', collectionHandle: 'iv-therapy', navGroup: 'more' },
  { tag: 'urology-ostomy', displayName: 'Urology & Ostomy', collectionHandle: 'urology-ostomy', navGroup: 'more' },
  { tag: 'sterilization', displayName: 'Sterilization', collectionHandle: 'sterilization', navGroup: 'more' },
  { tag: 'dental', displayName: 'Dental', collectionHandle: 'dental', navGroup: 'more' },
  { tag: 'housekeeping-janitorial', displayName: 'Housekeeping & Janitorial', collectionHandle: 'housekeeping-janitorial', navGroup: 'more' },
  { tag: 'bariatric', displayName: 'Bariatric', collectionHandle: 'bariatric', navGroup: 'more' },
  { tag: 'room-furniture', displayName: 'Room Furniture', collectionHandle: 'seating', navGroup: 'more' },
  { tag: 'face-masks', displayName: 'Face Masks', collectionHandle: 'face-coverings', navGroup: 'more' },
  { tag: 'pharmacy-products', displayName: 'Pharmacy Products', collectionHandle: 'pharmacy-products', navGroup: 'more' },
] as const
```

Add near `getSubcategoriesForParent` (anywhere after `CATEGORY_TREE_L1` is defined):

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

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/__tests__/category-tree.test.ts`
Expected: PASS (all tests, including the 3 new `buildCategoryTreeNav` cases)

- [ ] **Step 5: Commit**

```bash
git add lib/category-tree.ts lib/__tests__/category-tree.test.ts
git commit -m "feat: add navGroup field and buildCategoryTreeNav to the category registry"
```

---

## Task 2: Repoint Header and Footer at the registry

**Files:**
- Modify: `components/layout/Header.tsx`
- Modify: `components/layout/Footer.tsx`

**Interfaces:**
- Consumes: `buildCategoryTreeNav` (`@/lib/category-tree`, Task 1)
- Removes: `buildCategoryNav` (`@/lib/category-nav`) usage from both files

No test changes: `components/layout/__tests__/Header.test.tsx`'s fixtures never
include a `CATALOG`-type menu item (`makeMenuItem`'s default `type` is
`'COLLECTION'`), so `categoriesItem` is always `undefined` in that suite and
the Categories dropdown branch — the only JSX that reads `categoryNav` — never
renders. Confirm this stays true after the swap by running the existing suite
in Step 2. There is no existing test file for `Footer.tsx`.

- [ ] **Step 1: Swap Header.tsx**

In `components/layout/Header.tsx`, replace:

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

- [ ] **Step 2: Swap Footer.tsx**

In `components/layout/Footer.tsx`, replace:

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

- [ ] **Step 3: Run the existing Header test suite and typecheck**

Run: `npx vitest run components/layout/__tests__/Header.test.tsx`
Expected: PASS (all existing tests, unchanged — confirms the swap is a no-op for this suite as documented above)

Run: `npx tsc --noEmit`
Expected: no new errors (the pre-existing, unrelated `ProductView.a11y.test.tsx` error may still appear)

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, visit `/`. Confirm:
- Desktop: hover/click the "Categories" nav item — the mega-dropdown shows the same categories in the same "Categories"/"More Categories" columns as before this change.
- Mobile (narrow viewport or device toolbar): open the hamburger menu, expand "Categories" — same category list.
- Scroll to the footer — "Top Categories" and "More Categories" columns show the same categories as before.

Stop the dev server when done.

- [ ] **Step 5: Commit**

```bash
git add components/layout/Header.tsx components/layout/Footer.tsx
git commit -m "feat: source Header and Footer category nav from the tag registry"
```

---

## Task 3: Repoint the `/categories` Popular Categories strip

**Files:**
- Modify: `app/categories/page.tsx`

**Interfaces:**
- Consumes: `buildCategoryTreeNav` (`@/lib/category-tree`, Task 1)
- Removes: `getAllowedHandles`, `buildCategoryNav` (`@/lib/category-nav`) usage from this file

- [ ] **Step 1: Swap the import and simplify the popularCollections computation**

In `app/categories/page.tsx`, replace:

```ts
import { getAllowedHandles, buildCategoryNav } from '@/lib/category-nav'
```

with:

```ts
import { buildCategoryTreeNav } from '@/lib/category-tree'
```

Replace:

```ts
  const allCollectionsByHandle = new Map(allCollections.map((c) => [c.handle, c]))
  const allowed = getAllowedHandles()
  const navCollections = allCollections.filter((c) => allowed.has(c.handle))
  const popularCollections = buildCategoryNav(navCollections)
    .primary
```

with:

```ts
  const allCollectionsByHandle = new Map(allCollections.map((c) => [c.handle, c]))
  const popularCollections = buildCategoryTreeNav(allCollections)
    .primary
```

(The rest of the `.map(...).filter(...).slice(0, 8)` chain below is unchanged.)

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors

- [ ] **Step 3: Manual verification**

Run: `npm run dev`, visit `/categories`. Confirm the "Popular Categories" strip renders the same categories (up to 8) as before this change, each linking to its `/category/<handle>` page with the same artwork.

Stop the dev server when done.

- [ ] **Step 4: Commit**

```bash
git add app/categories/page.tsx
git commit -m "feat: source the /categories Popular Categories strip from the tag registry"
```

---

## Task 4: Full verification pass

- [ ] **Step 1: Run the full test suite**

Run: `npm run test`
Expected: All tests pass except the same pre-existing, unrelated baseline failures already documented for this ticket (19 failures across `app/api/sourcing/__tests__/route.test.ts`, `__tests__/route-revalidate.test.ts`, `lib/seo/__tests__/route-guardrails.test.ts`) — no new failures anywhere this plan touched.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: No new errors (the pre-existing, unrelated `ProductView.a11y.test.tsx` error may still appear).

- [ ] **Step 3: Run the production build**

Run: `npm run build`
Expected: Build succeeds with no type errors.

- [ ] **Step 4: Manual cross-check of all three surfaces together**

Run: `npm run dev`. Re-confirm in one pass (this repeats Tasks 2–3's manual checks now that all pieces are integrated):
- `/` — Header desktop dropdown and mobile drawer Categories list.
- `/` — Footer Top/More Categories columns.
- `/categories` — Popular Categories strip.

All three should show the same categories, in the same groupings, as they did before this plan — this is a data-source swap with no intended visual change. Stop the dev server when done.
