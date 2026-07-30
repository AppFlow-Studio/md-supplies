# Attribute-Subcategory Exclusion + Sitemap Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop `buildL2Tree()` from creating routes for attribute-patterned `subcategory:` tags (e.g. `25g-hypodermic-needles`), then repoint `lib/seo/sitemap.ts` at the tag registry (`lib/category-tree.ts`) — fixing the leaked sub-collection URL bug and adding L2 subcategory URLs to the sitemap.

**Architecture:** A small, documented regex denylist (`ATTRIBUTE_SUBCATEGORY_PATTERNS`) added to the existing registry gates which subcategory tags become `L2Node`s — this is a pure, unit-tested addition with no new dependencies. The category tree audit script gets a new report section so the pattern list's correctness against the full live tag catalog is durably re-checkable, not a one-off manual eyeball. `lib/seo/sitemap.ts` then swaps its L1 URL source from the legacy `ROADMAP_CATEGORIES`-derived `getAllowedHandles()` to `CATEGORY_TREE_L1`, and gains a new `fetchSubcategoryUrls()` built from the same already-cached `fetchProductTagSummaries()`/`buildL2Tree()` pair every other registry consumer already uses.

**Tech Stack:** TypeScript, Vitest, Next.js `MetadataRoute.Sitemap`.

## Global Constraints

- **Attribute-pattern exclusion is deliberately narrow.** False negatives (an attribute-patterned tag that still gets a route) are acceptable and correctable later; false positives (a real subcategory silently losing its page) are not. Ambiguous tags (e.g. `12-panel`) are left unmatched, not guessed at.
- **The pattern list must be confirmed against the full 794-value live `subcategory:` tag list**, not just a frequency-sorted sample — Task 2 makes this durably re-checkable via the audit script rather than a one-off check.
- **No changes to `lib/category-nav.ts`, the rendered nav UI, or any facet/filter-allowlist code in this plan.** Nav wiring and the full facet build-out are separate, later sub-projects.
- **`L2Node.parentTag` (the canonical parent) is the only field read when building a subcategory URL.** `crossLinkParentTag` must never be used to construct a route or sitemap URL — that field only drives the redirect-source side, already handled by the existing L2 route.
- **L2 sitemap entries never carry `lastModified`** — there's no backing Shopify collection to source a date from, matching how partner/industry entries in the same file already omit it.
- **Never match on collection title or ID** — only tag value / collection handle, consistent with the rest of the registry.

---

## Task 1: Attribute-subcategory pattern denylist + `buildL2Tree()` exclusion

**Files:**
- Modify: `lib/category-tree.ts`
- Test: `lib/__tests__/category-tree.test.ts`

**Interfaces:**
- Consumes: `ProductTagSummary`, `CATEGORY_TREE_L1`, `resolveCanonicalCategory`, `BOUNDARY_L1_OVERRIDES` (existing)
- Produces: `ATTRIBUTE_SUBCATEGORY_PATTERNS: readonly RegExp[]`, `isAttributeSubcategoryTag(tag: string): boolean`

- [ ] **Step 1: Write the failing tests**

Append to `lib/__tests__/category-tree.test.ts` (after the existing `import { buildL2Tree } from '../category-tree'` line, before its `describe('buildL2Tree', ...)` block):

```ts
import { isAttributeSubcategoryTag } from '../category-tree'

describe('isAttributeSubcategoryTag', () => {
  it('matches gauge-prefixed needle/lancet/catheter tags', () => {
    expect(isAttributeSubcategoryTag('25g-hypodermic-needles')).toBe(true)
    expect(isAttributeSubcategoryTag('21g-lancets')).toBe(true)
    expect(isAttributeSubcategoryTag('20g-iv-catheters')).toBe(true)
    expect(isAttributeSubcategoryTag('23g-dental-needles')).toBe(true)
  })

  it('matches suture-gauge tags, including the bare "0-sutures" case', () => {
    expect(isAttributeSubcategoryTag('4-0-sutures')).toBe(true)
    expect(isAttributeSubcategoryTag('3-0-sutures')).toBe(true)
    expect(isAttributeSubcategoryTag('0-sutures')).toBe(true)
  })

  it('matches cc-volume syringe tags', () => {
    expect(isAttributeSubcategoryTag('3cc-syringe')).toBe(true)
    expect(isAttributeSubcategoryTag('10cc-syringe')).toBe(true)
  })

  it('matches manual-wheelchairs width-suffixed tags', () => {
    expect(isAttributeSubcategoryTag('manual-wheelchairs-20')).toBe(true)
    expect(isAttributeSubcategoryTag('manual-wheelchairs-18')).toBe(true)
  })

  it('matches gal-volume sharps tags', () => {
    expect(isAttributeSubcategoryTag('2-gal-sharps')).toBe(true)
  })

  it('does not match real subcategory tags that happen to contain a digit', () => {
    expect(isAttributeSubcategoryTag('12-panel')).toBe(false)
    expect(isAttributeSubcategoryTag('exam-gloves')).toBe(false)
    expect(isAttributeSubcategoryTag('bariatric-wheelchairs')).toBe(false)
  })
})
```

Then append two new cases inside the existing `describe('buildL2Tree', ...)` block (add after its last `it(...)`, still inside the closing `})`):

```ts

  it('excludes attribute-patterned subcategory tags from ever producing a node', () => {
    const nodes = buildL2Tree([
      { handle: 'a', categories: ['needles-syringes'], subcategories: ['25g-hypodermic-needles'] },
    ])
    expect(nodes.find((n) => n.tag === '25g-hypodermic-needles')).toBeUndefined()
  })

  it('builds a node only for the real tag when a product carries both a real and an attribute-patterned subcategory tag', () => {
    const nodes = buildL2Tree([
      { handle: 'a', categories: ['surgical-sutures'], subcategories: ['sutures', '4-0-sutures'] },
    ])
    expect(nodes.find((n) => n.tag === 'sutures')).toBeDefined()
    expect(nodes.find((n) => n.tag === '4-0-sutures')).toBeUndefined()
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/__tests__/category-tree.test.ts`
Expected: FAIL — `isAttributeSubcategoryTag` is not exported yet (`SyntaxError`/`is not a function`), and the two new `buildL2Tree` cases fail because attribute-patterned tags currently do produce nodes.

- [ ] **Step 3: Write the implementation**

In `lib/category-tree.ts`, insert this block after `BOUNDARY_L1_OVERRIDES`'s closing `}` and before `export function buildL2Tree`:

```ts
// Attribute-patterned subcategory: values — a numeric size/gauge/volume
// modifier on a base concept (e.g. "25G Hypodermic Needles"). Per the ticket,
// these render as facets on their parent L1 page, never their own tile/route.
// Confirmed against a live tag pull (2026-07-16, 794 distinct subcategory:
// values) — see docs/superpowers/specs/2026-07-17-attribute-subcategory-
// exclusion-sitemap-design.md, and re-checked on every audit-category-tree.ts
// run (Task 2 below) since that pull only sampled the top ~250 by frequency.
// Deliberately narrow: false negatives (an attribute tag that still gets a
// route) are acceptable and correctable later; false positives (a real
// subcategory silently losing its page) are not, so ambiguous tags (e.g.
// "12-panel") are left unmatched.
export const ATTRIBUTE_SUBCATEGORY_PATTERNS: readonly RegExp[] = [
  /^\d+g-/,                      // gauge prefix: 25g-hypodermic-needles, 21g-lancets, 20g-iv-catheters
  /^\d+-0-sutures$/,             // suture gauge: 4-0-sutures, 3-0-sutures
  /^0-sutures$/,                 // suture gauge: 0-sutures
  /^\d+cc-/,                     // syringe volume: 3cc-syringe, 10cc-syringe
  /^manual-wheelchairs-\d+$/,    // wheelchair width: manual-wheelchairs-20
  /^\d+-gal-/,                   // sharps volume: 2-gal-sharps
]

export function isAttributeSubcategoryTag(tag: string): boolean {
  return ATTRIBUTE_SUBCATEGORY_PATTERNS.some((p) => p.test(tag))
}
```

Then modify `buildL2Tree`'s loop — change:

```ts
  for (const summary of summaries) {
    const category = resolveCanonicalCategory(summary)
    for (const sub of summary.subcategories) {
      subProductCounts.set(sub, (subProductCounts.get(sub) ?? 0) + 1)
      if (!category || !l1Tags.has(category)) continue
```

to:

```ts
  for (const summary of summaries) {
    const category = resolveCanonicalCategory(summary)
    for (const sub of summary.subcategories) {
      if (isAttributeSubcategoryTag(sub)) continue
      subProductCounts.set(sub, (subProductCounts.get(sub) ?? 0) + 1)
      if (!category || !l1Tags.has(category)) continue
```

(The rest of the function body — the `parentCounts` block and the final node-building loop below it — is unchanged.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/__tests__/category-tree.test.ts`
Expected: PASS (all tests, including the 6 new `isAttributeSubcategoryTag` cases and 2 new `buildL2Tree` cases)

- [ ] **Step 5: Commit**

```bash
git add lib/category-tree.ts lib/__tests__/category-tree.test.ts
git commit -m "feat: exclude attribute-patterned subcategory tags from the L2 tree"
```

---

## Task 2: Report attribute-tag exclusions in the category tree audit script

**Files:**
- Modify: `scripts/audit-category-tree.ts`

**Interfaces:**
- Consumes: `fetchProductTagSummaries`, `isAttributeSubcategoryTag` (Task 1)

This script has no test file (matching the existing convention — it's a live-data QA tool, not unit-tested logic). Its own live run against the full catalog is the verification step, satisfying the Global Constraint that the pattern list be checked against all 794 values, not just the ~250 sampled during design.

- [ ] **Step 1: Add the import and computed values**

In `scripts/audit-category-tree.ts`, replace the import block:

```ts
import {
  fetchProductTagSummaries,
  buildL1Tiles,
  buildL2Tree,
  CATEGORY_TREE_L1,
} from '../lib/category-tree'
```

with:

```ts
import {
  fetchProductTagSummaries,
  buildL1Tiles,
  buildL2Tree,
  CATEGORY_TREE_L1,
  isAttributeSubcategoryTag,
} from '../lib/category-tree'
```

Then, inside `main()`, after the existing `noiseTags` computation, add:

```ts
  const allSubcategoryTags = new Set(summaries.flatMap((s) => s.subcategories))
  const attributeTags = [...allSubcategoryTags].filter(isAttributeSubcategoryTag).sort()
```

- [ ] **Step 2: Add the report section**

Insert this block after the existing `## L2 boundary subcategories` section (after its `for (const n of boundaryNodes) { ... }` loop, before the final `Total distinct subcategory: values` line):

```ts
  lines.push('')
  lines.push('## Subcategory: values excluded as attribute-patterned (never routed)')
  lines.push('')
  lines.push(`${attributeTags.length} of ${allSubcategoryTags.size} distinct subcategory: values excluded.`)
  lines.push('')
  if (attributeTags.length === 0) {
    lines.push('_None found._')
  } else {
    for (const tag of attributeTags) lines.push(`- \`${tag}\``)
  }
```

Then change the final total line from:

```ts
  lines.push(`Total distinct subcategory: values: ${l2Nodes.length}`)
```

to:

```ts
  lines.push(`Total routable subcategory: values (post attribute-exclusion): ${l2Nodes.length}`)
```

- [ ] **Step 3: Run it against the live catalog**

Run: `NODE_OPTIONS='--conditions=react-server' npx tsx scripts/audit-category-tree.ts`

- [ ] **Step 4: Manually verify the pattern list against the full result**

Open `audit/category-tree-audit-report.md` and read the new "Subcategory: values excluded as attribute-patterned" section:

- **Check for false positives:** every listed tag must follow one of the 6 documented shapes (gauge prefix, suture gauge, cc-volume, wheelchair width, gal-volume). If a plain product-type name (e.g. `exam-gloves`, `walkers`) appears in this list, a pattern is too broad — narrow it and re-run Step 3.
- **Check for false negatives:** skim the tags that are *not* in the excluded list (cross-reference against the `## L2 boundary subcategories` section and the total routable count) for anything that still looks like an unmodeled numeric size/gauge/volume family (e.g. a `31g-...` gauge value this pattern set didn't anticipate). If found, note it — adding a new pattern is a fast follow-up, not a blocker for this task, per the Global Constraint that false negatives are acceptable.

- [ ] **Step 5: Commit**

```bash
git add scripts/audit-category-tree.ts audit/category-tree-audit-report.md
git commit -m "feat: report attribute-tag exclusions in the category tree audit"
```

---

## Task 3: Source sitemap L1 category URLs from the tag registry

**Files:**
- Modify: `lib/seo/sitemap.ts`
- Test: `lib/seo/__tests__/sitemap.test.ts`

**Interfaces:**
- Consumes: `CATEGORY_TREE_L1` (`@/lib/category-tree`)
- Removes: `getAllowedHandles` (`@/lib/category-nav`) usage from this file

- [ ] **Step 1: Write the failing test**

Append to the `describe('getSitemapUrls', ...)` block in `lib/seo/__tests__/sitemap.test.ts`, after the existing `'excludes §2.4 removed and hidden-at-launch handles'` test:

```ts

  it('does not emit /category/<handle> for a sub-collection handle that is not an approved L1 (leaked sub-collection bugfix)', async () => {
    setupDefaultMocks({ collections: ['gloves', 'disposable-3-2mm-3-5mm-trocars'] })
    const urls = (await getSitemapUrls(false)).map((e) => e.url)
    expect(urls).toContain('https://mdsupplies.com/category/gloves')
    expect(urls).not.toContain('https://mdsupplies.com/category/disposable-3-2mm-3-5mm-trocars')
  })
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/seo/__tests__/sitemap.test.ts -t "leaked sub-collection"`
Expected: FAIL — `disposable-3-2mm-3-5mm-trocars` is currently one of `ROADMAP_CATEGORIES`'s Surgery & Procedure `matchedHandles`, so `getAllowedHandles()` includes it and the sitemap currently emits that URL.

- [ ] **Step 3: Write the implementation**

In `lib/seo/sitemap.ts`, replace the import:

```ts
import { getAllowedHandles } from '@/lib/category-nav'
```

with:

```ts
import { CATEGORY_TREE_L1 } from '@/lib/category-tree'
```

Then replace `fetchCategoryUrls`:

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

with:

```ts
async function fetchCategoryUrls(): Promise<SitemapEntry[]> {
  try {
    const data = await storefrontFetch<{
      collections: { nodes: { handle: string; updatedAt: string }[] }
    }>(GET_COLLECTIONS_FOR_SITEMAP, { first: 250 })
    const allowedHandles = new Set(CATEGORY_TREE_L1.map((c) => c.collectionHandle))
    return data.collections.nodes
      .filter((c) => allowedHandles.has(c.handle))
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

- [ ] **Step 4: Run the full sitemap test file to verify everything passes**

Run: `npx vitest run lib/seo/__tests__/sitemap.test.ts`
Expected: PASS (all tests, including the pre-existing `'emits /category/<handle> only for roadmap-allowed handles'` and `'excludes §2.4 removed and hidden-at-launch handles'` tests — both still pass unchanged because `gloves`/`needles-syringes` are `CATEGORY_TREE_L1` collection handles and `pharmaceuticals`/`office-supplies`/`non-roadmap-handle` are not)

- [ ] **Step 5: Commit**

```bash
git add lib/seo/sitemap.ts lib/seo/__tests__/sitemap.test.ts
git commit -m "fix: source sitemap L1 category URLs from the tag registry, dropping leaked sub-collection URLs"
```

---

## Task 4: Add L2 subcategory URLs to the sitemap

**Files:**
- Modify: `lib/seo/sitemap.ts`
- Test: `lib/seo/__tests__/sitemap.test.ts`

**Interfaces:**
- Consumes: `fetchProductTagSummaries`, `buildL2Tree`, `CATEGORY_TREE_L1` (`@/lib/category-tree`)
- Produces: `fetchSubcategoryUrls(): Promise<SitemapEntry[]>` (internal to `sitemap.ts`, not exported)

- [ ] **Step 1: Extend the mock helper and write the failing tests**

In `lib/seo/__tests__/sitemap.test.ts`, replace the `setupDefaultMocks` function:

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
          nodes: products.map((h) => ({ handle: h, updatedAt: '2026-06-01T00:00:00Z' })),
          pageInfo: { hasNextPage: false, endCursor: '' },
        },
      })
    }
    if (query.includes('GetAllArticleHandles')) {
      return Promise.resolve({
        blogs: {
          nodes: [{
            handle: 'news',
            articles: { nodes: articles.map((h) => ({ handle: h, publishedAt: '2026-06-01T00:00:00Z' })) },
          }],
        },
      })
    }
    return Promise.reject(new Error(`Unexpected query: ${String(query).slice(0, 60)}`))
  })
}
```

with:

```ts
function setupDefaultMocks(overrides: {
  collections?: string[]
  products?: string[]
  articles?: string[]
  productTags?: { handle: string; tags: string[] }[]
} = {}) {
  const collections = overrides.collections ?? []
  const products = overrides.products ?? []
  const articles = overrides.articles ?? []
  const productTags = overrides.productTags ?? []

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
          nodes: products.map((h) => ({ handle: h, updatedAt: '2026-06-01T00:00:00Z' })),
          pageInfo: { hasNextPage: false, endCursor: '' },
        },
      })
    }
    if (query.includes('GetAllProductTags')) {
      return Promise.resolve({
        products: {
          nodes: productTags,
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      })
    }
    if (query.includes('GetAllArticleHandles')) {
      return Promise.resolve({
        blogs: {
          nodes: [{
            handle: 'news',
            articles: { nodes: articles.map((h) => ({ handle: h, publishedAt: '2026-06-01T00:00:00Z' })) },
          }],
        },
      })
    }
    return Promise.reject(new Error(`Unexpected query: ${String(query).slice(0, 60)}`))
  })
}
```

Then append these tests to the `describe('getSitemapUrls', ...)` block, after the test added in Task 3:

```ts

  it('emits /category/<l1>/<sub> for a real subcategory tag', async () => {
    setupDefaultMocks({
      productTags: [
        { handle: 'p1', tags: ['category:gloves', 'subcategory:exam-gloves'] },
        { handle: 'p2', tags: ['category:gloves', 'subcategory:exam-gloves'] },
      ],
    })
    const urls = (await getSitemapUrls(false)).map((e) => e.url)
    expect(urls).toContain('https://mdsupplies.com/category/gloves/exam-gloves')
  })

  it('emits only the canonical URL for a boundary subcategory, never the cross-link URL', async () => {
    setupDefaultMocks({
      productTags: [
        { handle: 'p1', tags: ['category:room-furniture', 'subcategory:exam-tables'] },
      ],
    })
    const urls = (await getSitemapUrls(false)).map((e) => e.url)
    expect(urls).toContain('https://mdsupplies.com/category/seating/exam-tables')
    expect(urls).not.toContain('https://mdsupplies.com/category/exam-room/exam-tables')
  })

  it('omits a sitemap URL for an attribute-patterned subcategory tag', async () => {
    setupDefaultMocks({
      productTags: [
        { handle: 'p1', tags: ['category:needles-syringes', 'subcategory:25g-hypodermic-needles'] },
      ],
    })
    const urls = (await getSitemapUrls(false)).map((e) => e.url)
    expect(urls).not.toContain('https://mdsupplies.com/category/needles-syringes/25g-hypodermic-needles')
  })

  it('degrades gracefully when the product-tag fetch fails, keeping the rest of the sitemap intact', async () => {
    mockFetch.mockImplementation((query: string) => {
      if (query.includes('GetAllProductTags')) return Promise.reject(new Error('tag scan failed'))
      if (query.includes('GetCollectionsForSitemap')) return Promise.resolve({ collections: { nodes: [] } })
      if (query.includes('GetAllProductHandles')) {
        return Promise.resolve({ products: { nodes: [], pageInfo: { hasNextPage: false, endCursor: '' } } })
      }
      if (query.includes('GetAllArticleHandles')) return Promise.resolve({ blogs: { nodes: [] } })
      return Promise.reject(new Error('Unexpected query'))
    })
    const urls = (await getSitemapUrls(false)).map((e) => e.url)
    expect(urls).toContain('https://mdsupplies.com/')
    expect(urls.some((u) => u.includes('/category/'))).toBe(false)
  })
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run lib/seo/__tests__/sitemap.test.ts`
Expected: The first 3 new tests FAIL — `fetchSubcategoryUrls` doesn't exist yet, so no `/category/<l1>/<sub>` URL is ever emitted regardless of the mocked `productTags`. The 4th test ("degrades gracefully...") trivially PASSES pre-implementation (there's no subcategory-fetching code yet to fail, so there are vacuously no `/category/` URLs) — it becomes a meaningful regression guard once Step 3 lands, not a red/green demonstration on its own.

- [ ] **Step 3: Write the implementation**

In `lib/seo/sitemap.ts`, replace the import added in Task 3:

```ts
import { CATEGORY_TREE_L1 } from '@/lib/category-tree'
```

with:

```ts
import { CATEGORY_TREE_L1, fetchProductTagSummaries, buildL2Tree } from '@/lib/category-tree'
```

Add this function directly after `fetchCategoryUrls`:

```ts
async function fetchSubcategoryUrls(): Promise<SitemapEntry[]> {
  try {
    const summaries = await fetchProductTagSummaries()
    const l2Nodes = buildL2Tree(summaries)
    return l2Nodes
      .map((node) => {
        const l1 = CATEGORY_TREE_L1.find((c) => c.tag === node.parentTag)
        if (!l1) return null
        return {
          url: `${SITE_URL}/category/${l1.collectionHandle}/${node.tag}`,
          changeFrequency: 'weekly' as const,
          priority: 0.7,
        }
      })
      .filter((e): e is SitemapEntry => e !== null)
  } catch {
    return []
  }
}
```

Then in `getSitemapUrls`, replace:

```ts
  const [categoryUrls, productUrls, articleUrls] = await Promise.all([
    fetchCategoryUrls(),
    fetchProductUrls(),
    fetchArticleUrls(),
  ])

  return [
    ...STATIC_URLS,
    ...categoryUrls,
    ...productUrls,
    ...partnerUrls,
    ...industryUrls,
    ...articleUrls,
  ]
```

with:

```ts
  const [categoryUrls, subcategoryUrls, productUrls, articleUrls] = await Promise.all([
    fetchCategoryUrls(),
    fetchSubcategoryUrls(),
    fetchProductUrls(),
    fetchArticleUrls(),
  ])

  return [
    ...STATIC_URLS,
    ...categoryUrls,
    ...subcategoryUrls,
    ...productUrls,
    ...partnerUrls,
    ...industryUrls,
    ...articleUrls,
  ]
```

- [ ] **Step 4: Run the full sitemap test file to verify everything passes**

Run: `npx vitest run lib/seo/__tests__/sitemap.test.ts`
Expected: PASS (all tests, including all pre-existing ones — none inspect the sitemap's full URL list by exact equality, so adding new L2 entries doesn't break any of them)

- [ ] **Step 5: Commit**

```bash
git add lib/seo/sitemap.ts lib/seo/__tests__/sitemap.test.ts
git commit -m "feat: add L2 subcategory URLs to the sitemap from the tag registry"
```

---

## Task 5: Full verification pass

- [ ] **Step 1: Run the full test suite**

Run: `npm run test`
Expected: All tests pass except the same pre-existing, unrelated baseline failures already documented for this ticket (19 failures across `app/api/sourcing/__tests__/route.test.ts`, `__tests__/route-revalidate.test.ts`, `lib/seo/__tests__/route-guardrails.test.ts`) — no new failures anywhere this plan touched.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: No new errors. (The pre-existing, unrelated error in `components/product/__tests__/ProductView.a11y.test.tsx` — a mock `Product` object missing a `collections` field, introduced by an earlier unrelated commit — is not touched by this plan and may still appear.)

- [ ] **Step 3: Run the production build**

Run: `npm run build`
Expected: Build succeeds with no type errors.

- [ ] **Step 4: Manual verification of the live sitemap**

Run: `npm run dev`, then fetch the sitemap:

```bash
curl -s http://localhost:3000/sitemap.xml | grep -c "trocar"
```

Expected: `0` — no trocar-size sub-collection handle appears anywhere in the sitemap.

```bash
curl -s http://localhost:3000/sitemap.xml | grep "seating/exam-tables\|exam-room/exam-tables"
```

Expected: exactly one match, `.../category/seating/exam-tables` — the boundary subcategory's non-canonical URL (`exam-room/exam-tables`) must not appear.

```bash
curl -s http://localhost:3000/sitemap.xml | grep -o "/category/[a-z0-9-]*/[a-z0-9-]*hypodermic[a-z0-9-]*"
```

Expected: no output — no attribute-patterned gauge tag has its own sitemap URL.

Stop the dev server when done.

- [ ] **Step 5: Re-read the audit report as final sign-off**

Open `audit/category-tree-audit-report.md` (regenerated in Task 2) one more time and confirm the "Subcategory: values excluded as attribute-patterned" section still looks correct against current live data — this is the same manual check from Task 2 Step 4, repeated now that both the exclusion logic and its sitemap consumer are complete.
