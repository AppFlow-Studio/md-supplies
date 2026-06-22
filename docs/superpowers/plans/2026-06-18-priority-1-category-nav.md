# Roadmap-driven Category Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace raw, inconsistent Shopify-collection consumption in nav/footer/sitemap/related-categories with a roadmap-driven mapping layer, and rewrite the catalog audit script to report coverage and data-quality gaps.

**Architecture:** A static fallback mapping (`lib/category-nav.ts`) maps the June 15 Roadmap's 25 approved category names (§3.1) onto real Shopify collection handles (1:1, synthesized-parent, or unmapped). `buildCategoryNav()` filters/groups/normalizes for rendering; a shared `EXCLUDED_COLLECTION_HANDLES` set (extended) is applied everywhere a collection list is rendered. A new `lib/category-nav-audit.ts` module computes per-collection data-quality flags and roadmap coverage status, consumed by a rewritten `scripts/audit-collections.ts` that writes a markdown report.

**Tech Stack:** Next.js 16 / React 19 / TypeScript, Shopify Storefront API (GraphQL), Vitest for unit tests.

## Global Constraints

- No Shopify Admin API writes and no metafield definitions — fallback mapping file only (per brainstorming decision).
- Roadmap category display names must match §3.1 exactly (e.g. "Testing", "Face Masks", "Surgery & Procedure", "Apparel").
- Roadmap categories with zero live matching Shopify collections are omitted from rendered nav/footer — never rendered with a dead or guessed link.
- The existing export name `EXCLUDED_COLLECTION_HANDLES` in `lib/excluded-categories.ts` must not change (already imported by `app/categories/page.tsx`).
- The audit report writes to `audit/category-nav-audit-report.md` — never touch the existing, unrelated `audit/AUDIT-REPORT.md`.

---

### Task 1: Extend the exclusion list

**Files:**
- Modify: `lib/excluded-categories.ts`
- Test: `lib/__tests__/excluded-categories.test.ts` (new — this repo's convention is `<dir>/__tests__/<name>.test.ts`, e.g. `lib/seo/__tests__/sitemap.test.ts`; `lib/` itself has no `__tests__` dir yet, create it)

**Interfaces:**
- Produces: `EXCLUDED_COLLECTION_HANDLES: Set<string>` (existing export, extended) — consumed by Task 5, Task 6, and already by `app/categories/page.tsx`.

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/excluded-categories.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { EXCLUDED_COLLECTION_HANDLES } from '../excluded-categories'

describe('EXCLUDED_COLLECTION_HANDLES', () => {
  it('excludes §2.4 removed categories', () => {
    expect(EXCLUDED_COLLECTION_HANDLES.has('pharmaceuticals')).toBe(true)
    expect(EXCLUDED_COLLECTION_HANDLES.has('beds')).toBe(true)
    expect(EXCLUDED_COLLECTION_HANDLES.has('bariatric-beds')).toBe(true)
    expect(EXCLUDED_COLLECTION_HANDLES.has('maternity-and-infant-care')).toBe(true)
    expect(EXCLUDED_COLLECTION_HANDLES.has('maternity-infant-care')).toBe(true)
  })

  it('excludes Office Supplies (hidden at launch)', () => {
    expect(EXCLUDED_COLLECTION_HANDLES.has('office-supplies')).toBe(true)
  })

  it('excludes the malformed duplicate "Categories" collection', () => {
    expect(
      EXCLUDED_COLLECTION_HANDLES.has(
        'categories-categories-surgery-procedure-categories-surgery-procedure-instruments-trays',
      ),
    ).toBe(true)
  })

  it('does not exclude approved categories', () => {
    expect(EXCLUDED_COLLECTION_HANDLES.has('gloves')).toBe(false)
    expect(EXCLUDED_COLLECTION_HANDLES.has('wound-care')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/excluded-categories.test.ts`
Expected: FAIL — `office-supplies` and the duplicate-collection handle are not yet in the set.

- [ ] **Step 3: Extend the exclusion set**

Replace the full contents of `lib/excluded-categories.ts`:

```ts
export const EXCLUDED_COLLECTION_HANDLES = new Set([
  // §2.4 — permanently removed from public scope
  'pharmaceuticals',
  'beds',
  'bariatric-beds',
  'maternity-and-infant-care',
  'maternity-infant-care',

  // §2.4 — hidden at launch unless explicitly approved
  'office-supplies',

  // Junk/duplicate Shopify collection — not part of the roadmap taxonomy.
  // Title is literally "Categories"; its real children (trocar collections)
  // are used directly by the Surgery & Procedure mapping in lib/category-nav.ts.
  'categories-categories-surgery-procedure-categories-surgery-procedure-instruments-trays',
])
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/__tests__/excluded-categories.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/excluded-categories.ts lib/__tests__/excluded-categories.test.ts
git commit -m "feat: extend EXCLUDED_COLLECTION_HANDLES with Office Supplies and junk duplicate collection"
```

---

### Task 2: Create the roadmap category-nav mapping module

**Files:**
- Create: `lib/category-nav.ts`
- Test: `lib/__tests__/category-nav.test.ts` (this repo's convention is `<dir>/__tests__/<name>.test.ts`)

**Interfaces:**
- Consumes: `ROUTES.category(handle: string): string` from `lib/routes.ts` (already exists).
- Produces:
  - `type RoadmapCategory = { displayName: string; navGroup: 'primary' | 'more'; matchedHandles: string[] }`
  - `ROADMAP_CATEGORIES: RoadmapCategory[]`
  - `type NavEntry = { displayName: string; href: string }`
  - `buildCategoryNav(collections: { handle: string }[]): { primary: NavEntry[]; more: NavEntry[] }`
  - `getUnmappedRoadmapCategories(collections: { handle: string }[]): RoadmapCategory[]`
  - Consumed by Task 3 (Header), Task 4 (Footer), Task 7 (audit module).

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/category-nav.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildCategoryNav, getUnmappedRoadmapCategories } from '../category-nav'

const LIVE_HANDLES = [
  'gloves', 'wound-care', 'testing-screening', 'exam-room', 'mobility',
  'patient-therapy-rehab', 'hygiene', 'home-care', 'emergency-supplies',
  'incontinence', 'dental', 'housekeeping-janitorial', 'bariatric',
  'face-coverings', 'seating', 'capes-gowns', 'caps-headwear',
  'coats-jackets', 'footwear', 'medical-scrubs', 'pants-shirts',
  'undergarments-wraps', 'trocars-trocar-kits', 'disposable-3-2mm-3-5mm-trocars',
].map((handle) => ({ handle }))

describe('buildCategoryNav', () => {
  it('renders mapped categories with normalized display names', () => {
    const { primary } = buildCategoryNav(LIVE_HANDLES)
    const testing = primary.find((c) => c.displayName === 'Testing')
    expect(testing).toEqual({ displayName: 'Testing', href: '/category/testing-screening' })
  })

  it('renders Face Masks normalized from the face-coverings handle', () => {
    const { more } = buildCategoryNav(LIVE_HANDLES)
    expect(more.find((c) => c.displayName === 'Face Masks')).toEqual({
      displayName: 'Face Masks',
      href: '/category/face-coverings',
    })
  })

  it('splits entries into primary and more groups', () => {
    const { primary, more } = buildCategoryNav(LIVE_HANDLES)
    expect(primary.map((c) => c.displayName)).toContain('Gloves')
    expect(more.map((c) => c.displayName)).toContain('Home Care')
    expect(primary.map((c) => c.displayName)).not.toContain('Home Care')
  })

  it('synthesizes a parent entry linking to the first present matched handle', () => {
    const { primary } = buildCategoryNav(LIVE_HANDLES)
    expect(primary.find((c) => c.displayName === 'Apparel')).toEqual({
      displayName: 'Apparel',
      href: '/category/capes-gowns',
    })
  })

  it('falls back to the next present handle when the first matched handle is missing', () => {
    const withoutCapesGowns = LIVE_HANDLES.filter((c) => c.handle !== 'capes-gowns')
    const { primary } = buildCategoryNav(withoutCapesGowns)
    expect(primary.find((c) => c.displayName === 'Apparel')).toEqual({
      displayName: 'Apparel',
      href: '/category/caps-headwear',
    })
  })

  it('omits roadmap categories with no live matching handle', () => {
    const { primary, more } = buildCategoryNav(LIVE_HANDLES)
    const allNames = [...primary, ...more].map((c) => c.displayName)
    expect(allNames).not.toContain('Needles & Syringes')
    expect(allNames).not.toContain('Pharmacy Products')
  })
})

describe('getUnmappedRoadmapCategories', () => {
  it('lists roadmap categories with zero live matches', () => {
    const unmapped = getUnmappedRoadmapCategories(LIVE_HANDLES)
    const names = unmapped.map((c) => c.displayName)
    expect(names).toContain('Needles & Syringes')
    expect(names).toContain('Surgical Sutures')
    expect(names).toContain('Respiratory')
    expect(names).toContain('Disinfectants')
    expect(names).toContain('IV Therapy')
    expect(names).toContain('Urology & Ostomy')
    expect(names).toContain('Sterilization')
    expect(names).toContain('Pharmacy Products')
  })

  it('does not list a fully mapped category', () => {
    const unmapped = getUnmappedRoadmapCategories(LIVE_HANDLES)
    expect(unmapped.map((c) => c.displayName)).not.toContain('Gloves')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/category-nav.test.ts`
Expected: FAIL with "Cannot find module '../category-nav'"

- [ ] **Step 3: Implement the module**

Create `lib/category-nav.ts`:

```ts
import { ROUTES } from '@/lib/routes'

export type RoadmapCategory = {
  displayName: string
  navGroup: 'primary' | 'more'
  matchedHandles: string[]
}

// §3.1 approved category structure, checked against the live Shopify
// catalog on 2026-06-18 via scripts/audit-collections.ts. Categories with
// an empty matchedHandles array have no live Shopify collection yet and
// are reported by getUnmappedRoadmapCategories() / the audit script
// instead of being rendered.
export const ROADMAP_CATEGORIES: RoadmapCategory[] = [
  { displayName: 'Gloves', navGroup: 'primary', matchedHandles: ['gloves'] },
  { displayName: 'Wound Care', navGroup: 'primary', matchedHandles: ['wound-care'] },
  { displayName: 'Needles & Syringes', navGroup: 'primary', matchedHandles: [] },
  { displayName: 'Surgical Sutures', navGroup: 'primary', matchedHandles: [] },
  { displayName: 'Testing', navGroup: 'primary', matchedHandles: ['testing-screening'] },
  { displayName: 'Exam Room', navGroup: 'primary', matchedHandles: ['exam-room'] },
  { displayName: 'Respiratory', navGroup: 'primary', matchedHandles: [] },
  { displayName: 'Mobility', navGroup: 'primary', matchedHandles: ['mobility'] },
  { displayName: 'Patient Therapy & Rehab', navGroup: 'primary', matchedHandles: ['patient-therapy-rehab'] },
  {
    displayName: 'Surgery & Procedure',
    navGroup: 'primary',
    matchedHandles: [
      'trocars-trocar-kits',
      'disposable-3-2mm-3-5mm-trocars',
      'disposable-4-5mm-trocars',
      'reusable-3-2mm-3-5mm-trocars',
      'reusable-4-5mm-trocars',
    ],
  },
  {
    displayName: 'Apparel',
    navGroup: 'primary',
    matchedHandles: [
      'capes-gowns',
      'caps-headwear',
      'coats-jackets',
      'footwear',
      'medical-scrubs',
      'pants-shirts',
      'undergarments-wraps',
    ],
  },
  { displayName: 'Hygiene', navGroup: 'primary', matchedHandles: ['hygiene'] },
  { displayName: 'Disinfectants', navGroup: 'primary', matchedHandles: [] },
  { displayName: 'Home Care', navGroup: 'more', matchedHandles: ['home-care'] },
  { displayName: 'Emergency Supplies', navGroup: 'more', matchedHandles: ['emergency-supplies'] },
  { displayName: 'Incontinence', navGroup: 'more', matchedHandles: ['incontinence'] },
  { displayName: 'IV Therapy', navGroup: 'more', matchedHandles: [] },
  { displayName: 'Urology & Ostomy', navGroup: 'more', matchedHandles: [] },
  { displayName: 'Sterilization', navGroup: 'more', matchedHandles: [] },
  { displayName: 'Dental', navGroup: 'more', matchedHandles: ['dental'] },
  { displayName: 'Housekeeping & Janitorial', navGroup: 'more', matchedHandles: ['housekeeping-janitorial'] },
  { displayName: 'Bariatric', navGroup: 'more', matchedHandles: ['bariatric'] },
  { displayName: 'Room Furniture', navGroup: 'more', matchedHandles: ['seating', 'exam-tables'] },
  { displayName: 'Face Masks', navGroup: 'more', matchedHandles: ['face-coverings'] },
  { displayName: 'Pharmacy Products', navGroup: 'more', matchedHandles: [] },
]

export type NavEntry = { displayName: string; href: string }

export function buildCategoryNav(
  collections: { handle: string }[],
): { primary: NavEntry[]; more: NavEntry[] } {
  const liveHandles = new Set(collections.map((c) => c.handle))
  const primary: NavEntry[] = []
  const more: NavEntry[] = []

  for (const category of ROADMAP_CATEGORIES) {
    const matchedHandle = category.matchedHandles.find((h) => liveHandles.has(h))
    if (!matchedHandle) continue

    const entry: NavEntry = { displayName: category.displayName, href: ROUTES.category(matchedHandle) }
    if (category.navGroup === 'primary') primary.push(entry)
    else more.push(entry)
  }

  return { primary, more }
}

export function getUnmappedRoadmapCategories(
  collections: { handle: string }[],
): RoadmapCategory[] {
  const liveHandles = new Set(collections.map((c) => c.handle))
  return ROADMAP_CATEGORIES.filter(
    (category) => !category.matchedHandles.some((h) => liveHandles.has(h)),
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/__tests__/category-nav.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/category-nav.ts lib/__tests__/category-nav.test.ts
git commit -m "feat: add roadmap-driven category nav mapping module"
```

---

### Task 3: Wire the Header mega-dropdown to the roadmap category nav

**Files:**
- Modify: `app/layout.tsx`
- Modify: `components/layout/Header.tsx`

**Interfaces:**
- Consumes: `buildCategoryNav` and `NavEntry` from `lib/category-nav.ts` (Task 2); `SlimCollection` from `lib/shopify/types.ts` (existing).

- [ ] **Step 1: Pass `collections` into `Header` from the layout**

In `app/layout.tsx`, change line 64:

```tsx
          <Header menuItems={menuItems} />
```

to:

```tsx
          <Header menuItems={menuItems} collections={collections} />
```

- [ ] **Step 2: Accept the new prop and build the nav groups in `Header`**

In `components/layout/Header.tsx`, change the type import on line 15:

```ts
import type { MenuItem } from '@/lib/shopify/types'
```

to:

```ts
import type { MenuItem, SlimCollection } from '@/lib/shopify/types'
import { buildCategoryNav } from '@/lib/category-nav'
```

Change the `HeaderProps` interface (lines 17-19):

```ts
interface HeaderProps {
  menuItems: MenuItem[]
}
```

to:

```ts
interface HeaderProps {
  menuItems: MenuItem[]
  collections: SlimCollection[]
}
```

Change the component signature (line 44):

```ts
export function Header({ menuItems }: HeaderProps) {
```

to:

```ts
export function Header({ menuItems, collections }: HeaderProps) {
```

Add, right after the `categoriesItem`/`otherItems` lines (after line 89, `const otherItems = ...`):

```ts
  const categoryNav = buildCategoryNav(collections)
```

- [ ] **Step 3: Replace the desktop mega-dropdown grid**

Replace the grid block inside the desktop "Categories" dropdown (lines 168-178):

```tsx
                    <div className="grid grid-cols-4 gap-1">
                      {categoriesItem.items.map((col) => (
                        <Link
                          key={col.id}
                          href={ROUTES.category(titleToSlug(col.title))}
                          className="text-[13px] text-gray-500 hover:text-navy-900 hover:bg-neutral-50 px-2 py-1.5 rounded transition-colors truncate"
                        >
                          {col.title}
                        </Link>
                      ))}
                    </div>
```

with:

```tsx
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-[11px] font-bold text-navy-900 tracking-widest uppercase mb-3">
                          Categories
                        </p>
                        <div className="grid grid-cols-2 gap-1">
                          {categoryNav.primary.map((cat) => (
                            <Link
                              key={cat.href}
                              href={cat.href}
                              className="text-[13px] text-gray-500 hover:text-navy-900 hover:bg-neutral-50 px-2 py-1.5 rounded transition-colors truncate"
                            >
                              {cat.displayName}
                            </Link>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-navy-900 tracking-widest uppercase mb-3">
                          More Categories
                        </p>
                        <div className="grid grid-cols-2 gap-1">
                          {categoryNav.more.map((cat) => (
                            <Link
                              key={cat.href}
                              href={cat.href}
                              className="text-[13px] text-gray-500 hover:text-navy-900 hover:bg-neutral-50 px-2 py-1.5 rounded transition-colors truncate"
                            >
                              {cat.displayName}
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
```

- [ ] **Step 4: Replace the mobile drawer Categories list**

Replace the mobile drawer block (lines 334-345):

```tsx
                  {mobileExpanded === 'categories' && (
                    <div className="py-2 pl-4 flex flex-col gap-0.5">
                      {categoriesItem.items.map((col) => (
                        <Link
                          key={col.id}
                          href={ROUTES.category(titleToSlug(col.title))}
                          onClick={() => setMobileOpen(false)}
                          className="text-gray-500 text-sm py-1.5 hover:text-navy-900 transition-colors"
                        >
                          {col.title}
                        </Link>
                      ))}
```

with:

```tsx
                  {mobileExpanded === 'categories' && (
                    <div className="py-2 pl-4 flex flex-col gap-0.5">
                      {categoryNav.primary.map((cat) => (
                        <Link
                          key={cat.href}
                          href={cat.href}
                          onClick={() => setMobileOpen(false)}
                          className="text-gray-500 text-sm py-1.5 hover:text-navy-900 transition-colors"
                        >
                          {cat.displayName}
                        </Link>
                      ))}
                      {categoryNav.more.map((cat) => (
                        <Link
                          key={cat.href}
                          href={cat.href}
                          onClick={() => setMobileOpen(false)}
                          className="text-gray-500 text-sm py-1.5 hover:text-navy-900 transition-colors"
                        >
                          {cat.displayName}
                        </Link>
                      ))}
```

(The rest of the block — the "All categories →" link right after — stays unchanged.)

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 6: Manually verify in the browser**

Run: `npm run dev`

Open `http://localhost:3000`, hover "Categories" in the top nav, and confirm:
- Two columns, "Categories" and "More Categories", render normalized roadmap names (e.g. "Testing", "Face Masks", "Apparel", "Surgery & Procedure").
- None of the unmapped names (Needles & Syringes, Disinfectants, Pharmacy Products, ...) appear.
- Clicking "Apparel" navigates to `/category/capes-gowns`.
- Resize to mobile width, open the hamburger menu, expand "Categories", confirm the same entries render and links work, then stop the dev server.

- [ ] **Step 7: Commit**

```bash
git add app/layout.tsx components/layout/Header.tsx
git commit -m "feat: drive Header category mega-dropdown from roadmap nav mapping"
```

---

### Task 4: Wire the Footer category columns to the roadmap category nav

**Files:**
- Modify: `components/layout/Footer.tsx`

**Interfaces:**
- Consumes: `buildCategoryNav` from `lib/category-nav.ts` (Task 2).

- [ ] **Step 1: Replace the raw slice with `buildCategoryNav`**

In `components/layout/Footer.tsx`, add the import (after line 3):

```ts
import { buildCategoryNav } from '@/lib/category-nav'
```

Replace lines 67-68:

```ts
  const topCategories = collections.slice(0, 8)
  const moreCategories = collections.slice(8, 16)
```

with:

```ts
  const categoryNav = buildCategoryNav(collections)
```

- [ ] **Step 2: Update the "Top Categories" column**

Replace lines 125-136:

```tsx
            <ul className="space-y-3">
              {topCategories.map((col) => (
                <li key={col.handle}>
                  <Link
                    href={ROUTES.category(col.handle)}
                    className="text-sm text-gray-500 hover:text-teal-500 transition-colors"
                  >
                    {col.title}
                  </Link>
                </li>
              ))}
            </ul>
```

with:

```tsx
            <ul className="space-y-3">
              {categoryNav.primary.map((cat) => (
                <li key={cat.href}>
                  <Link
                    href={cat.href}
                    className="text-sm text-gray-500 hover:text-teal-500 transition-colors"
                  >
                    {cat.displayName}
                  </Link>
                </li>
              ))}
            </ul>
```

- [ ] **Step 3: Update the "More Categories" column**

Replace lines 144-156:

```tsx
            <ul className="space-y-3">
              {moreCategories.map((col) => (
                <li key={col.handle}>
                  <Link
                    href={ROUTES.category(col.handle)}
                    className="text-sm text-gray-500 hover:text-teal-500 transition-colors"
                  >
                    {col.title}
                  </Link>
                </li>
              ))}
            </ul>
```

with:

```tsx
            <ul className="space-y-3">
              {categoryNav.more.map((cat) => (
                <li key={cat.href}>
                  <Link
                    href={cat.href}
                    className="text-sm text-gray-500 hover:text-teal-500 transition-colors"
                  >
                    {cat.displayName}
                  </Link>
                </li>
              ))}
            </ul>
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors (note: `ROUTES` import in `Footer.tsx` is still used elsewhere in the file — do not remove it)

- [ ] **Step 5: Manually verify in the browser**

Run: `npm run dev`, scroll to the footer, confirm "Top Categories" and "More Categories" columns show the same normalized roadmap names as the Header dropdown, with working links. Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add components/layout/Footer.tsx
git commit -m "feat: drive Footer category columns from roadmap nav mapping"
```

---

### Task 5: Fix sitemap exclusion to use the shared exclusion list

**Files:**
- Modify: `lib/seo/sitemap.ts`
- Modify: `lib/seo/__tests__/sitemap.test.ts` (existing — uses `vi.mock('@/lib/shopify/storefront')` with a `setupDefaultMocks({ collections, products, articles })` helper; follow that pattern)

- [ ] **Step 1: Write the failing test**

In `lib/seo/__tests__/sitemap.test.ts`, add a new test inside the `describe('getSitemapUrls', ...)` block, right after the existing `'excludes brands and brands-* collection handles'` test:

```ts
  it('excludes §2.4 removed and hidden-at-launch collection handles', async () => {
    setupDefaultMocks({
      collections: ['gloves', 'pharmaceuticals', 'beds', 'bariatric-beds', 'office-supplies'],
    })
    const urls = (await getSitemapUrls(false)).map(e => e.url)
    expect(urls).toContain('https://mdsupplies.com/category/gloves')
    expect(urls).not.toContain('https://mdsupplies.com/category/pharmaceuticals')
    expect(urls).not.toContain('https://mdsupplies.com/category/beds')
    expect(urls).not.toContain('https://mdsupplies.com/category/bariatric-beds')
    expect(urls).not.toContain('https://mdsupplies.com/category/office-supplies')
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/seo/__tests__/sitemap.test.ts`
Expected: FAIL — the new test fails because `pharmaceuticals`/`beds`/`bariatric-beds`/`office-supplies` are not yet excluded by `lib/seo/sitemap.ts`.

- [ ] **Step 3: Import the shared exclusion set and extend the local check**

In `lib/seo/sitemap.ts`, add the import (after line 8):

```ts
import { EXCLUDED_COLLECTION_HANDLES } from '@/lib/excluded-categories'
```

Replace lines 25-27:

```ts
function isExcludedCollectionHandle(handle: string): boolean {
  return handle === 'brands' || handle.startsWith('brands-')
}
```

with:

```ts
function isExcludedCollectionHandle(handle: string): boolean {
  return EXCLUDED_COLLECTION_HANDLES.has(handle) || handle === 'brands' || handle.startsWith('brands-')
}
```

(`brands`/`brands-*` stays as a forward-looking guard for partner/brand collections that aren't part of the public category taxonomy; `EXCLUDED_COLLECTION_HANDLES` adds the §2.4 removed-category and hidden-category coverage.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/seo/__tests__/sitemap.test.ts`
Expected: PASS (all tests in the file, including the new one)

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 6: Manually verify**

Run: `npm run dev`, open `http://localhost:3000/sitemap.xml`, confirm it loads and contains no `/category/pharmaceuticals`, `/category/beds`, `/category/bariatric-beds`, `/category/maternity-and-infant-care`, or `/category/office-supplies` URLs. Stop the dev server.

- [ ] **Step 7: Commit**

```bash
git add lib/seo/sitemap.ts lib/seo/__tests__/sitemap.test.ts
git commit -m "fix: apply shared EXCLUDED_COLLECTION_HANDLES to sitemap generation"
```

---

### Task 6: Fix related-categories to exclude removed/hidden collections

**Files:**
- Modify: `lib/category-utils.ts`
- Test: `lib/__tests__/category-utils.test.ts` (new — no existing test file for this module; follow the `vi.mock('@/lib/shopify/storefront')` pattern from `lib/seo/__tests__/sitemap.test.ts`. Note: this module's `fetchAllCollections` is wrapped in React's `cache()`, but `cache()` does not memoize outside of an active render — verified empirically — so each test's mock call resolves independently with no cross-test cache pollution.)

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/category-utils.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getRelatedCategories } from '../category-utils'

vi.mock('@/lib/shopify/storefront', () => ({
  storefrontFetch: vi.fn(),
}))

import { storefrontFetch } from '@/lib/shopify/storefront'
const mockFetch = vi.mocked(storefrontFetch)

function setupCollections(handles: { handle: string; title: string }[]) {
  mockFetch.mockResolvedValue({ collections: { nodes: handles } })
}

beforeEach(() => {
  mockFetch.mockReset()
})

describe('getRelatedCategories', () => {
  it('excludes removed/hidden categories from the related list', async () => {
    setupCollections([
      { handle: 'gloves', title: 'Gloves' },
      { handle: 'wound-care', title: 'Wound Care' },
      { handle: 'pharmaceuticals', title: 'Pharmaceuticals' },
      { handle: 'beds', title: 'Beds' },
      { handle: 'office-supplies', title: 'Office Supplies' },
    ])
    const related = await getRelatedCategories('gloves')
    const slugs = related.map((c) => c.slug)
    expect(slugs).toContain('wound-care')
    expect(slugs).not.toContain('pharmaceuticals')
    expect(slugs).not.toContain('beds')
    expect(slugs).not.toContain('office-supplies')
  })

  it('still excludes the current category and its subcategories', async () => {
    setupCollections([
      { handle: 'gloves', title: 'Gloves' },
      { handle: 'gloves-nitrile', title: 'Nitrile Gloves' },
      { handle: 'wound-care', title: 'Wound Care' },
    ])
    const related = await getRelatedCategories('gloves')
    const slugs = related.map((c) => c.slug)
    expect(slugs).not.toContain('gloves')
    expect(slugs).not.toContain('gloves-nitrile')
    expect(slugs).toContain('wound-care')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/category-utils.test.ts`
Expected: FAIL — the first test fails because `pharmaceuticals`/`beds`/`office-supplies` are not yet excluded.

- [ ] **Step 3: Import the shared exclusion set and filter in `getRelatedCategories`**

In `lib/category-utils.ts`, add the import (after line 3):

```ts
import { EXCLUDED_COLLECTION_HANDLES } from '@/lib/excluded-categories'
```

Replace the `getRelatedCategories` function (lines 48-59):

```ts
export async function getRelatedCategories(
  excludeSlug: string,
): Promise<{ label: string; slug: string }[]> {
  const all = await fetchAllCollections()
  return all
    .filter(
      (c) => c.handle !== excludeSlug && !c.handle.startsWith(`${excludeSlug}-`),
    )
    .slice(0, 6)
    .map((c) => ({ label: c.title, slug: c.handle }))
}
```

with:

```ts
export async function getRelatedCategories(
  excludeSlug: string,
): Promise<{ label: string; slug: string }[]> {
  const all = await fetchAllCollections()
  return all
    .filter(
      (c) =>
        c.handle !== excludeSlug &&
        !c.handle.startsWith(`${excludeSlug}-`) &&
        !EXCLUDED_COLLECTION_HANDLES.has(c.handle),
    )
    .slice(0, 6)
    .map((c) => ({ label: c.title, slug: c.handle }))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/__tests__/category-utils.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 6: Manually verify**

Run: `npm run dev`, open `http://localhost:3000/category/gloves`, scroll to "Related Categories", confirm none of the listed links are removed/hidden categories (pharmaceuticals, beds, bariatric-beds, maternity-and-infant-care, office-supplies). Stop the dev server.

- [ ] **Step 7: Commit**

```bash
git add lib/category-utils.ts lib/__tests__/category-utils.test.ts
git commit -m "fix: exclude removed/hidden categories from related-categories block"
```

---

### Task 7: Create the category-nav audit module

**Files:**
- Create: `lib/category-nav-audit.ts`
- Test: `lib/__tests__/category-nav-audit.test.ts` (this repo's convention is `<dir>/__tests__/<name>.test.ts`)

**Interfaces:**
- Consumes: `RoadmapCategory`, `ROADMAP_CATEGORIES` from `lib/category-nav.ts` (Task 2); `EXCLUDED_COLLECTION_HANDLES` from `lib/excluded-categories.ts` (Task 1).
- Produces:
  - `type AuditCollectionInput = { handle: string; title: string; hasProduct: boolean; image: { url: string } | null; seo: { title: string | null; description: string | null } }`
  - `type CollectionFlags = { handle: string; title: string; excluded: boolean; zeroProduct: boolean; missingImage: boolean; missingSeoTitle: boolean; missingSeoDescription: boolean; unmappedOrphan: boolean }`
  - `buildCollectionFlags(collections: AuditCollectionInput[], roadmap?: RoadmapCategory[]): CollectionFlags[]`
  - `type RoadmapCoverage = { displayName: string; navGroup: 'primary' | 'more'; status: 'mapped' | 'synthesized' | 'unmapped'; matchedHandles: string[] }`
  - `buildRoadmapCoverage(collections: { handle: string }[], roadmap?: RoadmapCategory[]): RoadmapCoverage[]`
  - Both consumed by Task 8 (`scripts/audit-collections.ts`).

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/category-nav-audit.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildCollectionFlags, buildRoadmapCoverage, type AuditCollectionInput } from '../category-nav-audit'
import type { RoadmapCategory } from '../category-nav'

const ROADMAP: RoadmapCategory[] = [
  { displayName: 'Gloves', navGroup: 'primary', matchedHandles: ['gloves'] },
  { displayName: 'Apparel', navGroup: 'primary', matchedHandles: ['capes-gowns', 'footwear'] },
  { displayName: 'Needles & Syringes', navGroup: 'primary', matchedHandles: [] },
]

function collection(overrides: Partial<AuditCollectionInput>): AuditCollectionInput {
  return {
    handle: 'placeholder',
    title: 'Placeholder',
    hasProduct: true,
    image: { url: 'https://example.com/img.jpg' },
    seo: { title: 'Title', description: 'Description' },
    ...overrides,
  }
}

describe('buildCollectionFlags', () => {
  it('flags a zero-product collection', () => {
    const flags = buildCollectionFlags([collection({ handle: 'gloves', hasProduct: false })], ROADMAP)
    expect(flags[0].zeroProduct).toBe(true)
  })

  it('flags missing image and missing SEO fields', () => {
    const flags = buildCollectionFlags(
      [collection({ handle: 'gloves', image: null, seo: { title: null, description: null } })],
      ROADMAP,
    )
    expect(flags[0].missingImage).toBe(true)
    expect(flags[0].missingSeoTitle).toBe(true)
    expect(flags[0].missingSeoDescription).toBe(true)
  })

  it('flags an excluded collection and does not also mark it an orphan', () => {
    const flags = buildCollectionFlags([collection({ handle: 'pharmaceuticals' })], ROADMAP)
    expect(flags[0].excluded).toBe(true)
    expect(flags[0].unmappedOrphan).toBe(false)
  })

  it('does not flag a roadmap-matched handle as an orphan', () => {
    const flags = buildCollectionFlags([collection({ handle: 'gloves' })], ROADMAP)
    expect(flags[0].unmappedOrphan).toBe(false)
  })

  it('does not flag a recognized subcategory (prefix match) as an orphan', () => {
    const flags = buildCollectionFlags([collection({ handle: 'gloves-nitrile' })], ROADMAP)
    expect(flags[0].unmappedOrphan).toBe(false)
  })

  it('flags a collection with no roadmap relationship as an orphan', () => {
    const flags = buildCollectionFlags([collection({ handle: 'random-collection' })], ROADMAP)
    expect(flags[0].unmappedOrphan).toBe(true)
  })
})

describe('buildRoadmapCoverage', () => {
  it('marks a single-handle category as mapped when present', () => {
    const coverage = buildRoadmapCoverage([{ handle: 'gloves' }], ROADMAP)
    expect(coverage.find((c) => c.displayName === 'Gloves')).toMatchObject({
      status: 'mapped',
      matchedHandles: ['gloves'],
    })
  })

  it('marks a multi-handle category as synthesized when at least one handle is present', () => {
    const coverage = buildRoadmapCoverage([{ handle: 'footwear' }], ROADMAP)
    expect(coverage.find((c) => c.displayName === 'Apparel')).toMatchObject({
      status: 'synthesized',
      matchedHandles: ['footwear'],
    })
  })

  it('marks a category with zero live matches as unmapped', () => {
    const coverage = buildRoadmapCoverage([{ handle: 'gloves' }], ROADMAP)
    expect(coverage.find((c) => c.displayName === 'Needles & Syringes')).toMatchObject({
      status: 'unmapped',
      matchedHandles: [],
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/category-nav-audit.test.ts`
Expected: FAIL with "Cannot find module '../category-nav-audit'"

- [ ] **Step 3: Implement the module**

Create `lib/category-nav-audit.ts`:

```ts
import { EXCLUDED_COLLECTION_HANDLES } from '@/lib/excluded-categories'
import { ROADMAP_CATEGORIES, type RoadmapCategory } from '@/lib/category-nav'

export type AuditCollectionInput = {
  handle: string
  title: string
  hasProduct: boolean
  image: { url: string } | null
  seo: { title: string | null; description: string | null }
}

export type CollectionFlags = {
  handle: string
  title: string
  excluded: boolean
  zeroProduct: boolean
  missingImage: boolean
  missingSeoTitle: boolean
  missingSeoDescription: boolean
  unmappedOrphan: boolean
}

function isMatchedHandle(handle: string, roadmap: RoadmapCategory[]): boolean {
  return roadmap.some((category) => category.matchedHandles.includes(handle))
}

function isKnownSubcategory(handle: string, roadmap: RoadmapCategory[]): boolean {
  return roadmap.some((category) =>
    category.matchedHandles.some((parentHandle) => handle.startsWith(`${parentHandle}-`)),
  )
}

export function buildCollectionFlags(
  collections: AuditCollectionInput[],
  roadmap: RoadmapCategory[] = ROADMAP_CATEGORIES,
): CollectionFlags[] {
  return collections.map((collection) => {
    const excluded = EXCLUDED_COLLECTION_HANDLES.has(collection.handle)
    const unmappedOrphan =
      !excluded &&
      !isMatchedHandle(collection.handle, roadmap) &&
      !isKnownSubcategory(collection.handle, roadmap)

    return {
      handle: collection.handle,
      title: collection.title,
      excluded,
      zeroProduct: !collection.hasProduct,
      missingImage: !collection.image,
      missingSeoTitle: !collection.seo.title,
      missingSeoDescription: !collection.seo.description,
      unmappedOrphan,
    }
  })
}

export type RoadmapCoverage = {
  displayName: string
  navGroup: 'primary' | 'more'
  status: 'mapped' | 'synthesized' | 'unmapped'
  matchedHandles: string[]
}

export function buildRoadmapCoverage(
  collections: { handle: string }[],
  roadmap: RoadmapCategory[] = ROADMAP_CATEGORIES,
): RoadmapCoverage[] {
  const liveHandles = new Set(collections.map((c) => c.handle))
  return roadmap.map((category) => {
    const present = category.matchedHandles.filter((h) => liveHandles.has(h))
    const status: RoadmapCoverage['status'] =
      present.length === 0 ? 'unmapped' : category.matchedHandles.length > 1 ? 'synthesized' : 'mapped'
    return { displayName: category.displayName, navGroup: category.navGroup, status, matchedHandles: present }
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/__tests__/category-nav-audit.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/category-nav-audit.ts lib/__tests__/category-nav-audit.test.ts
git commit -m "feat: add category-nav audit module (collection flags + roadmap coverage)"
```

---

### Task 8: Rewrite the audit script to use the new modules and write a report file

**Files:**
- Modify: `lib/shopify/queries/collections.ts`
- Modify: `scripts/audit-collections.ts`

**Interfaces:**
- Consumes: `ROADMAP_CATEGORIES` from `lib/category-nav.ts`; `buildCollectionFlags`, `buildRoadmapCoverage`, `AuditCollectionInput` from `lib/category-nav-audit.ts` (Task 7).

- [ ] **Step 1: Add an audit-specific collections query**

In `lib/shopify/queries/collections.ts`, append at the end of the file:

```ts
export const GET_COLLECTIONS_AUDIT = `#graphql
  query GetCollectionsAudit($first: Int!) {
    collections(first: $first) {
      nodes {
        handle
        title
        image { url }
        seo { title description }
        products(first: 1) {
          nodes { id }
        }
      }
    }
  }
`;
```

- [ ] **Step 2: Replace the script**

Replace the full contents of `scripts/audit-collections.ts`:

```ts
import { writeFileSync } from 'fs'
import { storefrontFetch } from '../lib/shopify/storefront'
import { GET_COLLECTIONS_AUDIT } from '../lib/shopify/queries/collections'
import { ROADMAP_CATEGORIES } from '../lib/category-nav'
import {
  buildCollectionFlags,
  buildRoadmapCoverage,
  type AuditCollectionInput,
} from '../lib/category-nav-audit'

type RawCollection = {
  handle: string
  title: string
  image: { url: string } | null
  seo: { title: string | null; description: string | null }
  products: { nodes: { id: string }[] }
}

function statusIcon(flag: boolean): string {
  return flag ? '⚠️' : '✅'
}

async function main() {
  const data = await storefrontFetch<{ collections: { nodes: RawCollection[] } }>(
    GET_COLLECTIONS_AUDIT,
    { first: 250 },
  )
  const raw = data.collections.nodes

  const collections: AuditCollectionInput[] = raw.map((c) => ({
    handle: c.handle,
    title: c.title,
    hasProduct: c.products.nodes.length > 0,
    image: c.image,
    seo: c.seo,
  }))

  const coverage = buildRoadmapCoverage(collections, ROADMAP_CATEGORIES)
  const flags = buildCollectionFlags(collections, ROADMAP_CATEGORIES)

  const lines: string[] = []
  lines.push('# Category Nav Audit Report')
  lines.push('')
  lines.push(`Generated: ${new Date().toISOString()}`)
  lines.push('')
  lines.push('## Roadmap Coverage (§3.1)')
  lines.push('')
  lines.push('| Category | Group | Status | Matched Handles |')
  lines.push('|---|---|---|---|')
  for (const c of coverage) {
    lines.push(`| ${c.displayName} | ${c.navGroup} | ${c.status} | ${c.matchedHandles.join(', ') || '—'} |`)
  }

  lines.push('')
  lines.push('## Collection Flags (§4.2)')
  lines.push('')
  lines.push('| Handle | Title | Excluded | Zero Product | Missing Image | Missing SEO Title | Missing SEO Desc | Unmapped Orphan |')
  lines.push('|---|---|---|---|---|---|---|---|')
  for (const f of flags) {
    lines.push(
      `| ${f.handle} | ${f.title} | ${statusIcon(f.excluded)} | ${statusIcon(f.zeroProduct)} | ${statusIcon(f.missingImage)} | ${statusIcon(f.missingSeoTitle)} | ${statusIcon(f.missingSeoDescription)} | ${statusIcon(f.unmappedOrphan)} |`,
    )
  }

  const report = lines.join('\n') + '\n'
  writeFileSync('audit/category-nav-audit-report.md', report)
  console.log(report)
}

main().catch(console.error)
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Run the script against the live Shopify store**

Run: `npx tsx scripts/audit-collections.ts`

Expected:
- Script completes without throwing.
- `audit/category-nav-audit-report.md` is created/overwritten.
- In the "Roadmap Coverage" table: Gloves/Wound Care/Testing/.../Hygiene show `mapped`, Apparel/Surgery & Procedure/Room Furniture show `synthesized`, Needles & Syringes/Surgical Sutures/Respiratory/Disinfectants/IV Therapy/Urology & Ostomy/Sterilization/Pharmacy Products show `unmapped`.
- In the "Collection Flags" table: `pharmaceuticals` (if present), `beds`, `bariatric-beds` show ⚠️ under Excluded; the malformed `categories-categories-surgery-procedure-...` handle shows ⚠️ under Excluded.

- [ ] **Step 5: Commit**

```bash
git add lib/shopify/queries/collections.ts scripts/audit-collections.ts audit/category-nav-audit-report.md
git commit -m "feat: rewrite audit-collections script to report roadmap coverage and collection data-quality flags"
```

---

## Final verification

- [ ] Run the full test suite: `npx vitest run`
  Expected: all tests pass — Task 1 (4 new), Task 2 (8 new), Task 5 (1 new, appended to the existing `sitemap.test.ts`), Task 6 (2 new), Task 7 (9 new), plus the pre-existing suite
- [ ] Run a full type-check: `npx tsc --noEmit`
  Expected: no errors
- [ ] Run `npm run build`
  Expected: build succeeds
