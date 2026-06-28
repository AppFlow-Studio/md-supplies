# Category Policy Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify hub, sitemap, and related-categories under the same `ROADMAP_CATEGORIES` allowlist that already drives the nav, fill the 8 previously-empty `matchedHandles`, add `lastmod` to the sitemap, and deliver the §5.5 11-section mismatch report.

**Architecture:** `lib/category-nav.ts` gains a new `getAllowedHandles()` export — a `Set<string>` of every handle in `ROADMAP_CATEGORIES.matchedHandles`. This single function replaces `EXCLUDED_COLLECTION_HANDLES` as the filter in `app/categories/page.tsx`, `lib/seo/sitemap.ts`, and `lib/category-utils.ts`. `lib/category-nav-audit.ts` gains `buildSurfaceReport()` which computes per-surface handle sets; `scripts/audit-collections.ts` uses it to emit sections 3–11 of the mismatch report.

**Tech Stack:** Next.js (check `node_modules/next/dist/docs/` before writing any Next.js-specific code), React 19, TypeScript, Shopify Storefront API (GraphQL), Vitest.

## Global Constraints

- Do not change the export name `EXCLUDED_COLLECTION_HANDLES` in `lib/excluded-categories.ts` — already imported by multiple callers.
- Roadmap display names must match `ROADMAP_CATEGORIES` exactly (e.g. "Needles & Syringes", not "Needles and Syringes").
- Audit report writes to `audit/category-nav-audit-report.md` — never touch `audit/AUDIT-REPORT.md` or `audit/AXE-REPORT.md`.
- No Shopify Admin API writes; no metafield definitions.
- Test convention: `lib/__tests__/<name>.test.ts`, `lib/seo/__tests__/<name>.test.ts`.

---

### Task 1: Fill the 8 empty `matchedHandles` and export `getAllowedHandles`

**Files:**
- Modify: `lib/category-nav.ts`
- Modify: `lib/__tests__/category-nav.test.ts`

**Interfaces:**
- Produces:
  - `getAllowedHandles(): Set<string>` — returns a Set of every handle across all `ROADMAP_CATEGORIES.matchedHandles`. Consumed by Tasks 2, 3, 4, and 5.

- [ ] **Step 1: Write the failing tests**

Open `lib/__tests__/category-nav.test.ts`.

First, update line 2 (the import) to add `getAllowedHandles`:
```ts
import { buildCategoryNav, getUnmappedRoadmapCategories, getAllowedHandles } from '../category-nav'
```

Then append these two `describe` blocks at the end of the file (after the existing tests):

```ts
describe('getAllowedHandles', () => {
  it('returns a Set containing known mapped handles', () => {
    const allowed = getAllowedHandles()
    expect(allowed.has('gloves')).toBe(true)
    expect(allowed.has('face-coverings')).toBe(true)
    expect(allowed.has('exam-tables')).toBe(true)
  })

  it('returns a Set containing the 8 newly filled handles', () => {
    const allowed = getAllowedHandles()
    expect(allowed.has('needles-syringes')).toBe(true)
    expect(allowed.has('surgical-sutures')).toBe(true)
    expect(allowed.has('respiratory')).toBe(true)
    expect(allowed.has('disinfectants')).toBe(true)
    expect(allowed.has('iv-therapy')).toBe(true)
    expect(allowed.has('urology-ostomy')).toBe(true)
    expect(allowed.has('sterilization')).toBe(true)
    expect(allowed.has('pharmacy-products')).toBe(true)
  })

  it('does not contain handles absent from all roadmap categories', () => {
    const allowed = getAllowedHandles()
    expect(allowed.has('pharmaceuticals')).toBe(false)
    expect(allowed.has('random-nonexistent')).toBe(false)
    expect(allowed.has('')).toBe(false)
  })
})

describe('getUnmappedRoadmapCategories — after filling 8 handles', () => {
  it('no longer reports any of the 8 previously-empty categories as unmapped', () => {
    const nowLive = [
      'needles-syringes', 'surgical-sutures', 'respiratory', 'disinfectants',
      'iv-therapy', 'urology-ostomy', 'sterilization', 'pharmacy-products',
    ].map((h) => ({ handle: h }))
    const unmapped = getUnmappedRoadmapCategories(nowLive)
    const names = unmapped.map((c) => c.displayName)
    expect(names).not.toContain('Needles & Syringes')
    expect(names).not.toContain('Surgical Sutures')
    expect(names).not.toContain('Respiratory')
    expect(names).not.toContain('Disinfectants')
    expect(names).not.toContain('IV Therapy')
    expect(names).not.toContain('Urology & Ostomy')
    expect(names).not.toContain('Sterilization')
    expect(names).not.toContain('Pharmacy Products')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/__tests__/category-nav.test.ts`
Expected: FAIL — `getAllowedHandles` is not exported; the 8 handles are not in `matchedHandles`.

- [ ] **Step 3: Fill the 8 empty handles in `lib/category-nav.ts`**

In `lib/category-nav.ts`, replace the 8 entries that have `matchedHandles: []`:

```ts
  { displayName: 'Needles & Syringes', navGroup: 'primary', matchedHandles: ['needles-syringes'], placeholderSlug: 'needles-syringes' },
  { displayName: 'Surgical Sutures', navGroup: 'primary', matchedHandles: ['surgical-sutures'], placeholderSlug: 'surgical-sutures' },
  { displayName: 'Respiratory', navGroup: 'primary', matchedHandles: ['respiratory'], placeholderSlug: 'respiratory' },
  { displayName: 'Disinfectants', navGroup: 'primary', matchedHandles: ['disinfectants'], placeholderSlug: 'disinfectants' },
  { displayName: 'IV Therapy', navGroup: 'more', matchedHandles: ['iv-therapy'], placeholderSlug: 'iv-therapy' },
  { displayName: 'Urology & Ostomy', navGroup: 'more', matchedHandles: ['urology-ostomy'], placeholderSlug: 'urology-ostomy' },
  { displayName: 'Sterilization', navGroup: 'more', matchedHandles: ['sterilization'], placeholderSlug: 'sterilization' },
  { displayName: 'Pharmacy Products', navGroup: 'more', matchedHandles: ['pharmacy-products'], placeholderSlug: 'pharmacy-products' },
```

- [ ] **Step 4: Add `getAllowedHandles` to `lib/category-nav.ts`**

Append after the `getUnmappedRoadmapCategories` function:

```ts
export function getAllowedHandles(): Set<string> {
  return new Set(ROADMAP_CATEGORIES.flatMap((c) => c.matchedHandles))
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run lib/__tests__/category-nav.test.ts`
Expected: PASS (all tests, including the pre-existing ones)

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add lib/category-nav.ts lib/__tests__/category-nav.test.ts
git commit -m "feat: fill 8 matchedHandles and export getAllowedHandles from category-nav"
```

---

### Task 2: Switch the categories hub to the allowlist

**Files:**
- Modify: `app/categories/page.tsx`

**Interfaces:**
- Consumes: `getAllowedHandles(): Set<string>` and `buildCategoryNav(collections): { primary: NavEntry[]; more: NavEntry[] }` from `lib/category-nav.ts` (Task 1).

- [ ] **Step 1: Replace the import and filter in `app/categories/page.tsx`**

Remove the `EXCLUDED_COLLECTION_HANDLES` import (line 10):
```ts
import { EXCLUDED_COLLECTION_HANDLES } from '@/lib/excluded-categories'
```

Add in its place:
```ts
import { getAllowedHandles, buildCategoryNav } from '@/lib/category-nav'
```

- [ ] **Step 2: Replace the filtering and popular-collection logic**

Find this block inside the component (inside the `try` block, currently lines 33–38):
```ts
    collections = data.collections.nodes.filter(
      (c) => !EXCLUDED_COLLECTION_HANDLES.has(c.handle)
    )
  } catch {
    // degrade gracefully — render empty state
  }

  const popularCollections = collections.slice(0, 8)
```

Replace with:
```ts
    const allowed = getAllowedHandles()
    collections = data.collections.nodes.filter((c) => allowed.has(c.handle))
  } catch {
    // degrade gracefully — render empty state
  }

  const collectionsByHandle = new Map(collections.map((c) => [c.handle, c]))
  const popularCollections = buildCategoryNav(collections)
    .primary
    .map((entry) => {
      const handle = entry.href.split('/').pop() ?? ''
      return collectionsByHandle.get(handle)
    })
    .filter((c): c is CollectionNode => c != null)
    .slice(0, 8)
```

This ensures "Popular Categories" renders in roadmap primary-group order (matching the nav), while "Browse All" shows every roadmap-allowed collection present in Shopify.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add app/categories/page.tsx
git commit -m "feat: switch categories hub from EXCLUDED denylist to ROADMAP_CATEGORIES allowlist"
```

---

### Task 3: Sitemap — allowlist + `lastmod`

**Files:**
- Modify: `lib/shopify/queries/collections.ts`
- Modify: `lib/seo/sitemap.ts`
- Modify: `lib/seo/__tests__/sitemap.test.ts`

**Interfaces:**
- Consumes: `getAllowedHandles(): Set<string>` from `lib/category-nav.ts` (Task 1).
- Consumes: new `GET_COLLECTIONS_FOR_SITEMAP` GraphQL query (added in Step 1).

- [ ] **Step 1: Add `GET_COLLECTIONS_FOR_SITEMAP` query**

In `lib/shopify/queries/collections.ts`, append at the end of the file:

```ts
export const GET_COLLECTIONS_FOR_SITEMAP = `#graphql
  query GetCollectionsForSitemap($first: Int!) {
    collections(first: $first) {
      nodes {
        handle
        updatedAt
      }
    }
  }
`;
```

- [ ] **Step 2: Write the failing tests**

Open `lib/seo/__tests__/sitemap.test.ts`.

Replace the `setupDefaultMocks` helper — the sitemap now uses `GetCollectionsForSitemap`, not `GetCollections(`:

```ts
function setupDefaultMocks(overrides: {
  collections?: string[]
  products?: string[]
  articles?: string[]
} = {}) {
  const collections = overrides.collections ?? []
  const products = overrides.products ?? []
  const articles = overrides.articles ?? []

  mockFetch.mockImplementation((query: string, variables?: Record<string, unknown>) => {
    if (query.includes('GetCollectionsForSitemap')) {
      return Promise.resolve({
        collections: {
          nodes: collections.map((h) => ({ handle: h, updatedAt: '2026-06-01T00:00:00Z' })),
        },
      })
    }
    if (query.includes('GetAllProductHandles')) {
      return Promise.resolve({
        products: {
          nodes: products.map((h) => ({ handle: h })),
          pageInfo: { hasNextPage: false, endCursor: '' },
        },
      })
    }
    if (query.includes('GetAllArticleHandles')) {
      return Promise.resolve({
        blogs: {
          nodes: [{ handle: 'news', articles: { nodes: articles.map((h) => ({ handle: h })) } }],
        },
      })
    }
    return Promise.reject(new Error(`Unexpected query: ${String(query).slice(0, 60)}`))
  })
}
```

Replace the existing `'emits /category/<handle> for each Shopify collection'` test with an allowlist-aware version, and replace the `'excludes brands and brands-* collection handles'` test and the `'excludes §2.4 removed...'` test:

```ts
  it('emits /category/<handle> only for roadmap-allowed handles', async () => {
    setupDefaultMocks({ collections: ['gloves', 'needles-syringes', 'non-roadmap-handle'] })
    const urls = (await getSitemapUrls(false)).map((e) => e.url)
    expect(urls).toContain('https://mdsupplies.com/category/gloves')
    expect(urls).toContain('https://mdsupplies.com/category/needles-syringes')
    expect(urls).not.toContain('https://mdsupplies.com/category/non-roadmap-handle')
  })

  it('excludes §2.4 removed and hidden-at-launch handles (not in allowlist)', async () => {
    setupDefaultMocks({ collections: ['gloves', 'pharmaceuticals', 'office-supplies'] })
    const urls = (await getSitemapUrls(false)).map((e) => e.url)
    expect(urls).toContain('https://mdsupplies.com/category/gloves')
    expect(urls).not.toContain('https://mdsupplies.com/category/pharmaceuticals')
    expect(urls).not.toContain('https://mdsupplies.com/category/office-supplies')
  })

  it('includes lastmod on category entries from updatedAt', async () => {
    setupDefaultMocks({ collections: ['gloves'] })
    const entries = await getSitemapUrls(false)
    const entry = entries.find((e) => e.url === 'https://mdsupplies.com/category/gloves')
    expect(entry?.lastModified).toEqual(new Date('2026-06-01T00:00:00Z'))
  })
```

Also update the pagination test — it used to check `GetCollections(` internally. Change its mock block for collections to check `GetCollectionsForSitemap` instead of `GetCollections(`:

Find in the pagination test:
```ts
      if (query.includes('GetCollections(')) {
        return Promise.resolve({ collections: { nodes: [] } })
      }
```
Replace with:
```ts
      if (query.includes('GetCollectionsForSitemap')) {
        return Promise.resolve({ collections: { nodes: [] } })
      }
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run lib/seo/__tests__/sitemap.test.ts`
Expected: multiple FAIL — `GetCollectionsForSitemap` is not yet used by the sitemap; `lastmod` is absent.

- [ ] **Step 4: Update `lib/seo/sitemap.ts`**

Replace the import block at the top of the file. Change:
```ts
import { GET_COLLECTIONS } from '@/lib/shopify/queries/collections'
```
to:
```ts
import { GET_COLLECTIONS_FOR_SITEMAP } from '@/lib/shopify/queries/collections'
```

Remove the `EXCLUDED_COLLECTION_HANDLES` import:
```ts
import { EXCLUDED_COLLECTION_HANDLES } from '@/lib/excluded-categories'
```

Add in its place:
```ts
import { getAllowedHandles } from '@/lib/category-nav'
```

Replace the entire `isExcludedCollectionHandle` function and `fetchCategoryUrls` function:

```ts
async function fetchCategoryUrls(): Promise<SitemapEntry[]> {
  try {
    const data = await storefrontFetch<{
      collections: { nodes: { handle: string; updatedAt: string }[] }
    }>(GET_COLLECTIONS_FOR_SITEMAP, { first: 250 })
    const allowed = getAllowedHandles()
    return data.collections.nodes
      .filter((c) => allowed.has(c.handle))
      .map((c) => ({
        url: `${SITE_URL}/category/${c.handle}`,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
        lastModified: new Date(c.updatedAt),
      }))
  } catch {
    return []
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run lib/seo/__tests__/sitemap.test.ts`
Expected: PASS (all tests)

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add lib/shopify/queries/collections.ts lib/seo/sitemap.ts lib/seo/__tests__/sitemap.test.ts
git commit -m "feat: switch sitemap to ROADMAP_CATEGORIES allowlist and add lastmod from updatedAt"
```

---

### Task 4: Switch related categories to the allowlist

**Files:**
- Modify: `lib/category-utils.ts`
- Modify: `lib/__tests__/category-utils.test.ts`

**Interfaces:**
- Consumes: `getAllowedHandles(): Set<string>` from `lib/category-nav.ts` (Task 1).
- Consumes: `EXCLUDED_COLLECTION_HANDLES` from `lib/excluded-categories.ts` (already imported).

- [ ] **Step 1: Write the failing test**

Open `lib/__tests__/category-utils.test.ts` and add a new `it` block inside `describe('getRelatedCategories', ...)`:

```ts
  it('only returns roadmap-allowed handles as related options', async () => {
    setupCollections([
      { handle: 'gloves', title: 'Gloves' },
      { handle: 'wound-care', title: 'Wound Care' },
      { handle: 'non-roadmap-handle', title: 'Not In Roadmap' },
    ])
    const related = await getRelatedCategories('wound-care')
    const slugs = related.map((c) => c.slug)
    expect(slugs).toContain('gloves')
    expect(slugs).not.toContain('non-roadmap-handle')
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/category-utils.test.ts`
Expected: FAIL — `non-roadmap-handle` is not yet filtered out.

- [ ] **Step 3: Update `lib/category-utils.ts`**

Add the import at the top (after the `EXCLUDED_COLLECTION_HANDLES` import):
```ts
import { getAllowedHandles } from '@/lib/category-nav'
```

Replace the `getRelatedCategories` function:

```ts
export async function getRelatedCategories(
  excludeSlug: string,
): Promise<{ label: string; slug: string }[]> {
  const all = await fetchAllCollections()
  const allowed = getAllowedHandles()
  return all
    .filter(
      (c) =>
        c.handle !== excludeSlug &&
        !c.handle.startsWith(`${excludeSlug}-`) &&
        !EXCLUDED_COLLECTION_HANDLES.has(c.handle) &&
        allowed.has(c.handle),
    )
    .slice(0, 6)
    .map((c) => ({ label: c.title, slug: c.handle }))
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/__tests__/category-utils.test.ts`
Expected: PASS (all tests)

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add lib/category-utils.ts lib/__tests__/category-utils.test.ts
git commit -m "feat: restrict getRelatedCategories to roadmap-allowed handles"
```

---

### Task 5: Extend audit module and script to produce the §5.5 11-section report

**Files:**
- Modify: `lib/category-nav-audit.ts`
- Modify: `lib/__tests__/category-nav-audit.test.ts`
- Modify: `scripts/audit-collections.ts`

**Interfaces:**
- Consumes: `buildCategoryNav`, `getAllowedHandles`, `ROADMAP_CATEGORIES`, `RoadmapCategory` from `lib/category-nav.ts` (Task 1).
- Consumes: `EXCLUDED_COLLECTION_HANDLES` from `lib/excluded-categories.ts`.
- Consumes: existing `AuditCollectionInput`, `buildCollectionFlags`, `buildRoadmapCoverage` from `lib/category-nav-audit.ts`.
- Produces: `type SurfaceReport` and `buildSurfaceReport(collections, roadmap?): SurfaceReport` — consumed by `scripts/audit-collections.ts`.

- [ ] **Step 1: Write the failing tests**

Open `lib/__tests__/category-nav-audit.test.ts`. Add the import for `buildSurfaceReport` and `SurfaceReport`:

```ts
import { buildCollectionFlags, buildRoadmapCoverage, buildSurfaceReport, type AuditCollectionInput, type SurfaceReport } from '../category-nav-audit'
```

Add a new `describe` block at the end of the file:

```ts
describe('buildSurfaceReport', () => {
  const SURFACE_ROADMAP: RoadmapCategory[] = [
    { displayName: 'Gloves', navGroup: 'primary', matchedHandles: ['gloves'], placeholderSlug: 'gloves' },
    { displayName: 'Apparel', navGroup: 'primary', matchedHandles: ['capes-gowns', 'footwear'], placeholderSlug: 'apparel' },
    { displayName: 'Home Care', navGroup: 'more', matchedHandles: ['home-care'], placeholderSlug: 'home-care' },
    { displayName: 'Needles & Syringes', navGroup: 'primary', matchedHandles: ['needles-syringes'], placeholderSlug: 'needles-syringes' },
  ]

  const SURFACE_COLLECTIONS: AuditCollectionInput[] = [
    collection({ handle: 'gloves' }),
    collection({ handle: 'capes-gowns' }),
    collection({ handle: 'footwear' }),
    collection({ handle: 'home-care' }),
    collection({ handle: 'orphan-handle' }),      // not in roadmap
    collection({ handle: 'pharmaceuticals' }),    // excluded
    // needles-syringes is missing (unmapped)
  ]

  it('navPrimary contains the first matched handle for each live primary category', () => {
    const report = buildSurfaceReport(SURFACE_COLLECTIONS, SURFACE_ROADMAP)
    expect(report.navPrimary).toContain('gloves')
    expect(report.navPrimary).toContain('capes-gowns')
    expect(report.navPrimary).not.toContain('footwear') // second handle, nav uses first
    expect(report.navPrimary).not.toContain('needles-syringes') // not live
  })

  it('navMore contains live more-group category handles', () => {
    const report = buildSurfaceReport(SURFACE_COLLECTIONS, SURFACE_ROADMAP)
    expect(report.navMore).toContain('home-care')
  })

  it('hubAll contains all live allowed handles including synthesized sub-handles', () => {
    const report = buildSurfaceReport(SURFACE_COLLECTIONS, SURFACE_ROADMAP)
    expect(report.hubAll).toContain('gloves')
    expect(report.hubAll).toContain('capes-gowns')
    expect(report.hubAll).toContain('footwear') // second synthesized handle — in hub, not nav
    expect(report.hubAll).not.toContain('orphan-handle')
    expect(report.hubAll).not.toContain('pharmaceuticals')
  })

  it('orphanHandles lists live collections not in any roadmap handle and not excluded', () => {
    const report = buildSurfaceReport(SURFACE_COLLECTIONS, SURFACE_ROADMAP)
    expect(report.orphanHandles).toContain('orphan-handle')
    expect(report.orphanHandles).not.toContain('gloves')
    expect(report.orphanHandles).not.toContain('pharmaceuticals')
  })

  it('hubOnlyHandles are synthesized sub-handles absent from nav (expected)', () => {
    const report = buildSurfaceReport(SURFACE_COLLECTIONS, SURFACE_ROADMAP)
    expect(report.hubOnlyHandles).toContain('footwear')
    expect(report.hubOnlyHandles).not.toContain('gloves')
    expect(report.hubOnlyHandles).not.toContain('capes-gowns')
  })

  it('actionItems lists roadmap categories with no live matching handle', () => {
    const report = buildSurfaceReport(SURFACE_COLLECTIONS, SURFACE_ROADMAP)
    expect(report.actionItems).toContain('Needles & Syringes')
    expect(report.actionItems).not.toContain('Gloves')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/__tests__/category-nav-audit.test.ts`
Expected: FAIL — `buildSurfaceReport` is not exported.

- [ ] **Step 3: Add `buildSurfaceReport` to `lib/category-nav-audit.ts`**

At the top of the file, add `buildCategoryNav` and `getAllowedHandles` to the import from `@/lib/category-nav`:

```ts
import { buildCategoryNav, getAllowedHandles, ROADMAP_CATEGORIES, type RoadmapCategory } from '@/lib/category-nav'
```

Append at the end of the file:

```ts
export type SurfaceReport = {
  navPrimary: string[]
  navMore: string[]
  hubAll: string[]
  relatedPool: string[]
  orphanHandles: string[]
  hubOnlyHandles: string[]
  actionItems: string[]
}

export function buildSurfaceReport(
  collections: AuditCollectionInput[],
  roadmap: RoadmapCategory[] = ROADMAP_CATEGORIES,
): SurfaceReport {
  const liveHandles = new Set(collections.map((c) => c.handle))

  const nav = buildCategoryNav(collections)
  const navPrimary = nav.primary.map((e) => e.href.split('/').pop()!)
  const navMore = nav.more.map((e) => e.href.split('/').pop()!)
  const navAll = new Set([...navPrimary, ...navMore])

  const allowed = new Set(roadmap.flatMap((c) => c.matchedHandles))
  const hubAll = [...allowed].filter((h) => liveHandles.has(h))

  const relatedPool = hubAll.filter((h) => !EXCLUDED_COLLECTION_HANDLES.has(h))

  const orphanHandles = collections
    .map((c) => c.handle)
    .filter((h) => !allowed.has(h) && !EXCLUDED_COLLECTION_HANDLES.has(h))

  const hubOnlyHandles = hubAll.filter((h) => !navAll.has(h))

  const actionItems = roadmap
    .filter((c) => !c.matchedHandles.some((h) => liveHandles.has(h)))
    .map((c) => c.displayName)

  return { navPrimary, navMore, hubAll, relatedPool, orphanHandles, hubOnlyHandles, actionItems }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/__tests__/category-nav-audit.test.ts`
Expected: PASS (all tests)

- [ ] **Step 5: Rewrite `scripts/audit-collections.ts` to produce 11 sections**

Replace the full contents of `scripts/audit-collections.ts`:

```ts
import { writeFileSync } from 'fs'
import { storefrontFetch } from '../lib/shopify/storefront'
import { GET_COLLECTIONS_AUDIT } from '../lib/shopify/queries/collections'
import { ROADMAP_CATEGORIES } from '../lib/category-nav'
import {
  buildCollectionFlags,
  buildRoadmapCoverage,
  buildSurfaceReport,
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

function handleList(handles: string[]): string {
  return handles.length === 0 ? '_none_' : handles.map((h) => `\`${h}\``).join(', ')
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
  const surface = buildSurfaceReport(collections, ROADMAP_CATEGORIES)

  const lines: string[] = []
  lines.push('# Category Nav Audit Report — §5.5 Surfaces Mismatch')
  lines.push('')
  lines.push(`Generated: ${new Date().toISOString()}`)
  lines.push('')

  // §1 — Roadmap Coverage
  lines.push('## §1 Roadmap Coverage (§3.1)')
  lines.push('')
  lines.push('| Category | Group | Status | Matched Handles |')
  lines.push('|---|---|---|---|')
  for (const c of coverage) {
    lines.push(`| ${c.displayName} | ${c.navGroup} | ${c.status} | ${c.matchedHandles.join(', ') || '—'} |`)
  }

  // §2 — Collection Flags
  lines.push('')
  lines.push('## §2 Collection Flags (§4.2)')
  lines.push('')
  lines.push('| Handle | Title | Excluded | Zero Product | Missing Image | Missing SEO Title | Missing SEO Desc | Unmapped Orphan |')
  lines.push('|---|---|---|---|---|---|---|---|')
  for (const f of flags) {
    lines.push(
      `| ${f.handle} | ${f.title} | ${statusIcon(f.excluded)} | ${statusIcon(f.zeroProduct)} | ${statusIcon(f.missingImage)} | ${statusIcon(f.missingSeoTitle)} | ${statusIcon(f.missingSeoDescription)} | ${statusIcon(f.unmappedOrphan)} |`,
    )
  }

  // §3 — Nav Surface Primary
  lines.push('')
  lines.push('## §3 Nav Surface — Primary')
  lines.push('')
  lines.push('Handles rendered in the header desktop mega-menu and mobile drawer "Categories" column, and footer "Top Categories" column.')
  lines.push('')
  lines.push(handleList(surface.navPrimary))

  // §4 — Nav Surface More
  lines.push('')
  lines.push('## §4 Nav Surface — More')
  lines.push('')
  lines.push('Handles rendered in the header desktop mega-menu and mobile drawer "More Categories" column, and footer "More Categories" column.')
  lines.push('')
  lines.push(handleList(surface.navMore))

  // §5 — Hub Primary Strip
  lines.push('')
  lines.push('## §5 Hub Surface — Primary Strip')
  lines.push('')
  lines.push('Handles shown in the "Popular Categories" strip on /categories (roadmap primary order, first 8).')
  lines.push('')
  lines.push(handleList(surface.navPrimary.slice(0, 8)))

  // §6 — Hub All Categories
  lines.push('')
  lines.push('## §6 Hub Surface — All Categories')
  lines.push('')
  lines.push('All handles eligible to appear in the "Browse All Categories" grid on /categories.')
  lines.push('')
  lines.push(handleList(surface.hubAll))

  // §7 — Sitemap
  lines.push('')
  lines.push('## §7 Sitemap Surface — /category/* URLs')
  lines.push('')
  lines.push('Handles emitted as /category/{handle} in sitemap.xml (same allowlist as Hub All).')
  lines.push('')
  lines.push(handleList(surface.hubAll))

  // §8 — Related Categories
  lines.push('')
  lines.push('## §8 Internal Links Surface — Related Categories Pool')
  lines.push('')
  lines.push('Handles eligible to appear in the "Related Categories" block on collection and product pages.')
  lines.push('')
  lines.push(handleList(surface.relatedPool))

  // §9 — Orphan Handles
  lines.push('')
  lines.push('## §9 Orphan Handles — Not In Any Roadmap Surface')
  lines.push('')
  lines.push('Live Shopify collections that are not in ROADMAP_CATEGORIES.matchedHandles and not in EXCLUDED_COLLECTION_HANDLES. These do not appear on any public-facing surface.')
  lines.push('')
  if (surface.orphanHandles.length === 0) {
    lines.push('_No orphan handles found._')
  } else {
    lines.push('| Handle |')
    lines.push('|---|')
    for (const h of surface.orphanHandles) {
      lines.push(`| ${h} |`)
    }
  }

  // §10 — Surface Consistency
  lines.push('')
  lines.push('## §10 Surface Consistency — Hub-Only Handles')
  lines.push('')
  lines.push('Handles present in Hub All / Sitemap but absent from Nav. These are synthesized sub-handles (e.g. individual Apparel sub-collections). This is expected behaviour — nav collapses them to one parent entry.')
  lines.push('')
  if (surface.hubOnlyHandles.length === 0) {
    lines.push('_All hub handles also appear in nav (no synthesized categories)._')
  } else {
    lines.push(handleList(surface.hubOnlyHandles))
  }

  // §11 — Action Items
  lines.push('')
  lines.push('## §11 Action Items — Unmapped Roadmap Categories')
  lines.push('')
  lines.push('Roadmap categories with no live Shopify collection. Catalog team must create these collections.')
  lines.push('')
  if (surface.actionItems.length === 0) {
    lines.push('_All 25 roadmap categories are mapped to at least one live Shopify collection._')
  } else {
    lines.push('| Category |')
    lines.push('|---|')
    for (const name of surface.actionItems) {
      lines.push(`| ${name} |`)
    }
  }

  const report = lines.join('\n') + '\n'
  writeFileSync('audit/category-nav-audit-report.md', report)
  console.log(report)
}

main().catch(console.error)
```

- [ ] **Step 6: Run the full test suite**

Run: `npx vitest run`
Expected: PASS — all pre-existing tests plus new tests from Tasks 1–5.

- [ ] **Step 7: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 8: Run the audit script against live Shopify**

Run: `npx tsx scripts/audit-collections.ts`
Expected:
- Script completes without throwing.
- `audit/category-nav-audit-report.md` is overwritten.
- §11 Action Items reads "_All 25 roadmap categories are mapped..._" (since all 8 handles are now filled and the collections exist in Shopify).
- §9 shows orphan handles (legitimate Shopify collections not in the roadmap).
- §3–§8 show the expected handle sets with no §2.4-removed handles present.

- [ ] **Step 9: Commit**

```bash
git add lib/category-nav-audit.ts lib/__tests__/category-nav-audit.test.ts scripts/audit-collections.ts audit/category-nav-audit-report.md
git commit -m "feat: extend audit to §5.5 11-section surfaces mismatch report"
```

---

## Final Verification

- [ ] Run the full test suite: `npx vitest run`
  Expected: all tests pass

- [ ] Run a full type-check: `npx tsc --noEmit`
  Expected: no errors

- [ ] Run a production build: `npm run build`
  Expected: build succeeds with no errors
