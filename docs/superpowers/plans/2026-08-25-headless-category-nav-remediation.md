# Headless Category & Navigation Remediation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the client-reported navigation/category defects (missing Mobility/Home Care dropdown subcategories, intermittent blank category pages, stale post-save data, duplicated category-registry logic) without turning the work into a catalog data project, and document where Product Type does/doesn't affect the storefront.

**Architecture:** The storefront already has ONE tag-derived category registry (`lib/category-tree.ts`, `category:`/`subcategory:` product tags) that computes L1 tiles and L2 subcategory trees, and a working route for subcategory pages (`/category/<l1>/<l2>` → `app/category/[slug]/[product]/page.tsx`, disambiguated from product pages, rendering `SubcategoryNavigator`). That L2 data is already used for the in-page "Browse X subcategories" footer list and the `CategoryTabs` facet-pill row, but it was never wired into the header's mega-dropdown — `components/layout/Header.tsx` only nests children under a parent when the parent has a `FEATURED_SUBCATEGORIES` row, and today that array has exactly one entry (Trocars & Trocar Kits). A legacy, independently-maintained category registry (`lib/category-nav.ts`, `ROADMAP_CATEGORIES`) still backs 4 live call sites and duplicates canonical-slug logic that `category-tree.ts` already owns. Separately, the Shopify webhook handler never invalidates collection cache tags on a product save (only product tags), and every category-page render depends on a ~30-sequential-request full-catalog tag scan whose failure currently takes down the *entire* page instead of just the subcategory footer it feeds.

**Tech Stack:** Next.js App Router (Server Components), TypeScript, Shopify Storefront API (GraphQL), Vitest, Playwright (e2e).

**Spec:**
- `C:\Users\User\Downloads\MDSupplies_Sardor_Headless_Category_Navigation_Remediation_2026-08-24.md` (this plan's source ticket)
- `C:\Users\User\Downloads\MDSupplies_Izzy_Shopify_Catalog_Taxonomy_Audit_2026-08-24.md` (Izzy's companion ticket — coordinate on canonical handles per its §"Coordination With Sardor")

## Global Constraints

- Do not expose every Shopify collection indiscriminately in navigation — only the 25 approved `CATEGORY_TREE_L1` categories and their tag-derived subcategories.
- Do not rename Shopify collection handles or mutate Shopify catalog data as part of this work.
- Do not resolve a mapping ambiguity by picking whichever collection has products — flag it for Izzy instead.
- Coordinate canonical collection-handle questions with Izzy before changing them.
- Preserve route stability and SEO-relevant URLs/handles.
- One deterministic category mapping — do not add a second place that defines category membership.
- This dev environment's Storefront token only reaches the **QA store** (~1,100 products), not the production catalog Izzy audits (~7,000+). Every live count in this plan is QA-store-scale and is a stand-in for verifying the *mechanism*, not a claim about production data. Before shipping Task 5's nav content, re-run its audit script against production (or hand it to Izzy) and confirm with Sardor/Izzy together.
- AGENTS.md: this is a customized Next.js fork — check `node_modules/next/dist/docs/` before assuming stock Next.js behavior if something doesn't match expectations.

---

### Task 1: Stop one flaky full-catalog scan from blanking the entire category page

**Context:** `components/category/CategoryPageView.tsx` currently does:
```ts
const [data, summaries] = await Promise.all([
  storefrontFetch<{ collection: CollectionHero | null }>(GET_COLLECTION_HERO, ...),
  fetchProductTagSummaries(),
])
```
`fetchProductTagSummaries()` (`lib/category-tree-data.server.ts`) makes ~30 sequential paginated Storefront requests (250 products/page across the whole active catalog) to build the L2 subcategory tree used ONLY for the "Browse X subcategories" footer list and `relatedCategories`. If any single one of those ~30 requests throws (timeout, transient 5xx, rate limit), `Promise.all` rejects, the whole `CategoryPageView` render throws, and the visitor gets the generic `app/category/[slug]/error.tsx` boundary instead of a working page with products — for a page whose products and hero loaded fine. This is the highest-probability explanation for "category page blank/broken on desktop, then works again later": the failure surface for a single category-page render is ~31 sequential Storefront requests, not 1.

This task (a) isolates that fetch so its failure degrades gracefully instead of failing the page, (b) adds a bounded retry to the paginated scan itself so one transient blip doesn't cost a whole 30-request walk, and (c) adds the diagnostics item 9 of the ticket asks for.

**Files:**
- Modify: `lib/category-tree-data.server.ts`
- Modify: `components/category/CategoryPageView.tsx`
- Modify: `lib/log-error.ts`
- Test: `lib/__tests__/category-tree-data.test.ts`
- Test: `components/category/__tests__/CategoryPageView.test.tsx` (new)

**Interfaces:**
- Produces: `logCategoryEvent(event: CategoryDiagnosticEvent): void` from `lib/log-error.ts`, where `CategoryDiagnosticEvent = { route: string; handle: string; outcome: 'ok' | 'collection_missing' | 'fetch_error' | 'subcategory_scan_failed'; productCount?: number }`.
- Produces: `fetchProductTagSummaries()` keeps its existing signature/return type (`Promise<ProductTagSummary[]>`) — only its internal resilience changes, so every existing caller (`app/product/[slug]/page.tsx`, `app/category/[slug]/[product]/page.tsx`, `scripts/audit-category-tree.ts`) is unaffected.

- [ ] **Step 1: Write the failing test for the retry behavior**

```ts
// lib/__tests__/category-tree-data.test.ts (add to existing describe block)
it('retries a single failed page once before giving up', async () => {
  mockFetch
    .mockResolvedValueOnce({
      products: { nodes: [{ handle: 'a', tags: ['category:gloves'] }], pageInfo: { hasNextPage: true, endCursor: 'cursor-1' } },
    })
    .mockRejectedValueOnce(new Error('storefront timeout'))
    .mockResolvedValueOnce({
      products: { nodes: [{ handle: 'b', tags: ['category:dental'] }], pageInfo: { hasNextPage: false, endCursor: null } },
    })

  const { fetchProductTagSummaries } = await import('../category-tree-data.server')
  const summaries = await fetchProductTagSummaries()

  expect(summaries).toEqual([
    { handle: 'a', categories: ['gloves'], subcategories: [] },
    { handle: 'b', categories: ['dental'], subcategories: [] },
  ])
  expect(mockFetch).toHaveBeenCalledTimes(3)
})

it('still throws after a page fails twice in a row', async () => {
  mockFetch
    .mockResolvedValueOnce({
      products: { nodes: [{ handle: 'a', tags: [] }], pageInfo: { hasNextPage: true, endCursor: 'cursor-1' } },
    })
    .mockRejectedValueOnce(new Error('storefront timeout'))
    .mockRejectedValueOnce(new Error('storefront timeout'))

  const { fetchProductTagSummaries } = await import('../category-tree-data.server')
  await expect(fetchProductTagSummaries()).rejects.toThrow('storefront timeout')
  expect(mockFetch).toHaveBeenCalledTimes(3)
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run lib/__tests__/category-tree-data.test.ts`
Expected: FAIL — current implementation has no retry, so the first new test calls `mockFetch` only twice (no 3rd call) and the assertion on 3 calls fails.

- [ ] **Step 3: Add a bounded per-page retry to the scan**

```ts
// lib/category-tree-data.server.ts
import 'server-only'

import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_ALL_PRODUCT_TAGS } from '@/lib/shopify/queries/products'
import { parseProductTags, type ProductTagSummary } from '@/lib/category-tree'

type ProductTagsResponse = {
  products: {
    nodes: { handle: string; tags: string[] }[]
    pageInfo: { hasNextPage: boolean; endCursor: string | null }
  }
}

// One retry per page: this scan makes ~30 sequential requests, so without a
// retry the probability of the WHOLE scan failing is ~30x a single request's
// transient-failure rate. A single immediate retry absorbs one-off timeouts
// and 5xx blips without masking a genuinely down API (two failures in a row
// on the same page still throws).
async function fetchTagPage(cursor: string | null): Promise<ProductTagsResponse> {
  try {
    return await storefrontFetch<ProductTagsResponse>(
      GET_ALL_PRODUCT_TAGS,
      { first: 250, after: cursor },
      { next: { revalidate: 3600, tags: ['shopify', 'category-tree'] } },
    )
  } catch {
    return await storefrontFetch<ProductTagsResponse>(
      GET_ALL_PRODUCT_TAGS,
      { first: 250, after: cursor },
      { next: { revalidate: 3600, tags: ['shopify', 'category-tree'] } },
    )
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
    const data = await fetchTagPage(cursor)

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

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run lib/__tests__/category-tree-data.test.ts`
Expected: PASS (all tests, including the two pre-existing ones)

- [ ] **Step 5: Add the diagnostic logging helper**

```ts
// lib/log-error.ts
import 'server-only'

export function logServerError(context: string, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err)
  console.error(JSON.stringify({
    level: 'error',
    context,
    message,
    ts: new Date().toISOString(),
  }))
}

/**
 * Structured diagnostic for a category-page render, distinguishing WHY a page
 * came back empty/degraded (item 8/9 of the nav-remediation ticket): a
 * legitimate empty collection is not the same failure as an invalid handle,
 * a Storefront error, or a subcategory-scan failure that only lost the
 * footer list. Never includes stack traces or internal error text — this is
 * a customer-facing-route diagnostic, not an error dump.
 */
export type CategoryDiagnosticOutcome =
  | 'ok'
  | 'collection_missing'
  | 'fetch_error'
  | 'subcategory_scan_failed'

export function logCategoryEvent(event: {
  route: string
  handle: string
  outcome: CategoryDiagnosticOutcome
  productCount?: number
}): void {
  console.log(JSON.stringify({
    level: event.outcome === 'ok' ? 'info' : 'warn',
    context: 'category-page',
    ...event,
    ts: new Date().toISOString(),
  }))
}
```

- [ ] **Step 6: Isolate the subcategory-tree fetch in CategoryPageView so its failure degrades instead of failing the page**

In `components/category/CategoryPageView.tsx`, replace the `Promise.all` that couples the hero fetch to the tag scan:

```ts
// Before (both awaited together — a tag-scan failure kills the whole page):
// const [data, summaries] = await Promise.all([
//   storefrontFetch<{ collection: CollectionHero | null }>(GET_COLLECTION_HERO, ...),
//   fetchProductTagSummaries(),
// ])

// After: the hero/product fetch stays on the critical path (a real failure
// there SHOULD show the error boundary — the page has no products to show).
// The tag scan only feeds the subcategory footer list and Related Categories
// sourcing is independent of it (CATEGORY_TREE_L1 is static), so its failure
// degrades to "no subcategory footer" rather than no page at all.
const [data, summaries] = await Promise.all([
  storefrontFetch<{ collection: CollectionHero | null }>(
    GET_COLLECTION_HERO,
    { handle: shopifyHandle },
    collectionFetchOptions(shopifyHandle),
  ),
  fetchProductTagSummaries().catch((err) => {
    logServerError('category-subcategory-scan', err)
    logCategoryEvent({ route: `/category/${slug}`, handle: shopifyHandle, outcome: 'subcategory_scan_failed' })
    return [] as ProductTagSummary[]
  }),
])

if (!data.collection) {
  logCategoryEvent({ route: `/category/${slug}`, handle: shopifyHandle, outcome: 'collection_missing' })
  notFound()
}

logCategoryEvent({
  route: `/category/${slug}`,
  handle: shopifyHandle,
  outcome: 'ok',
  productCount: data.collection.products?.nodes?.length,
})
```

Add the two new imports at the top of the file:
```ts
import { logServerError, logCategoryEvent } from '@/lib/log-error'
import type { ProductTagSummary } from '@/lib/category-tree'
```

- [ ] **Step 7: Write the component-level regression test**

```tsx
// components/category/__tests__/CategoryPageView.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/shopify/storefront', () => ({ storefrontFetch: vi.fn() }))
vi.mock('@/lib/category-tree-data.server', () => ({ fetchProductTagSummaries: vi.fn() }))
vi.mock('next/navigation', () => ({ notFound: vi.fn(() => { throw new Error('NEXT_NOT_FOUND') }), redirect: vi.fn() }))

import { storefrontFetch } from '@/lib/shopify/storefront'
import { fetchProductTagSummaries } from '@/lib/category-tree-data.server'
import { CategoryPageView } from '../CategoryPageView'

const mockStorefront = vi.mocked(storefrontFetch)
const mockSummaries = vi.mocked(fetchProductTagSummaries)

beforeEach(() => {
  mockStorefront.mockReset()
  mockSummaries.mockReset()
})

describe('CategoryPageView — subcategory-scan resilience', () => {
  it('still renders the category when the subcategory tag scan fails', async () => {
    mockStorefront.mockImplementation(async (query: string) => {
      if (query.includes('GET_COLLECTION_HERO') || query.includes('collection(')) {
        return { collection: { title: 'Mobility', handle: 'mobility', description: '', descriptionHtml: '', image: null, seo: {} } }
      }
      return { collection: { title: 'Mobility', handle: 'mobility', products: { nodes: [], pageInfo: {}, filters: [] } } }
    })
    mockSummaries.mockRejectedValue(new Error('storefront timeout'))

    const result = await CategoryPageView({ slug: 'mobility', sp: {} })
    // A React element tree came back rather than the function throwing —
    // the page rendered even though the tag scan failed.
    expect(result).toBeTruthy()
  })
})
```

- [ ] **Step 8: Run the full test file and confirm it passes; run the whole suite to check nothing else broke**

Run: `npx vitest run components/category/__tests__/CategoryPageView.test.tsx`
Expected: PASS

Run: `npx vitest run`
Expected: PASS (no regressions in the rest of the suite)

- [ ] **Step 9: Commit**

```bash
git add lib/category-tree-data.server.ts lib/log-error.ts components/category/CategoryPageView.tsx lib/__tests__/category-tree-data.test.ts components/category/__tests__/CategoryPageView.test.tsx
git commit -m "fix(category): isolate the subcategory tag scan so its failure degrades instead of blanking the page

Retries one transient page failure in fetchProductTagSummaries and adds
structured diagnostics distinguishing a missing collection from a fetch
error from a subcategory-scan failure, per the client-reported
intermittent-blank-category defect."
```

---

### Task 2: Fix the Shopify-save → storefront staleness gap

**Context:** `app/api/revalidate/route.ts` handles Shopify webhooks. On any `products/*` topic it invalidates the `products` and `product:<handle>` cache tags but — by explicit design comment — never touches `collections`/`collection:<handle>`, because "per-collection membership isn't in the payload." Every category page's product listing is cached under `collection:<handle>` (`lib/category-results-source.ts`, `components/category/CategoryPageView.tsx`). Concretely: editing a product's tags/category in Shopify so it now belongs to (or leaves) a collection does **not** trigger any collection revalidation — the storefront only picks it up on the next 300-second background revalidate. This matches the meeting anecdote ("a product save appeared to make a previously-missing product show") — the causal trigger was very likely hitting that 5-minute window, not the save itself.

The fix: a product webhook can't know which collections it affects, but it can cheaply invalidate the *broad* `collections` tag (not per-handle) on every product create/update/delete, forcing every category page's next request to revalidate instead of waiting up to 5 minutes. This is the "simpler correct path" the ticket asks for — one more `revalidateTag` call, no new infrastructure.

**Files:**
- Modify: `app/api/revalidate/route.ts`
- Test: `__tests__/api-revalidate.test.ts` (new — check whether an existing test file for this route already exists first with `Glob "**/*revalidate*"`; if one exists, extend it instead)

**Interfaces:**
- No exported signature changes — `POST` keeps its existing `(request: Request) => Promise<Response>` shape.

- [ ] **Step 1: Check for an existing test file**

Run: `ls __tests__ | grep -i revalidate` (or the Windows equivalent `Get-ChildItem __tests__ | Select-String revalidate`)

If found, read it and extend it with the steps below instead of creating a new file.

- [ ] **Step 2: Write the failing test**

```ts
// __tests__/api-revalidate.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import crypto from 'node:crypto'

vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }))
vi.mock('@/lib/env.server', () => ({ serverEnv: { shopifyWebhookSecret: 'test-secret' } }))

import { revalidateTag } from 'next/cache'
const mockRevalidateTag = vi.mocked(revalidateTag)

function signBody(body: string): string {
  return crypto.createHmac('sha256', 'test-secret').update(body, 'utf8').digest('base64')
}

beforeEach(() => {
  mockRevalidateTag.mockReset()
})

describe('POST /api/revalidate — products/* also invalidates the broad collections tag', () => {
  it('invalidates products, product:<handle>, AND the broad collections tag on products/update', async () => {
    const { POST } = await import('../app/api/revalidate/route')
    const body = JSON.stringify({ handle: 'wheelchair-transport-17' })
    const request = new Request('https://example.com/api/revalidate', {
      method: 'POST',
      headers: {
        'x-shopify-hmac-sha256': signBody(body),
        'x-shopify-topic': 'products/update',
      },
      body,
    })

    const res = await POST(request)
    const json = await res.json()

    expect(json.revalidated).toEqual(
      expect.arrayContaining(['products', 'product:wheelchair-transport-17', 'collections']),
    )
    expect(mockRevalidateTag).toHaveBeenCalledWith('collections', 'max')
  })

  it('does not invalidate a specific collection:<handle> tag — the payload has no collection membership', async () => {
    const { POST } = await import('../app/api/revalidate/route')
    const body = JSON.stringify({ handle: 'wheelchair-transport-17' })
    const request = new Request('https://example.com/api/revalidate', {
      method: 'POST',
      headers: {
        'x-shopify-hmac-sha256': signBody(body),
        'x-shopify-topic': 'products/update',
      },
      body,
    })

    const res = await POST(request)
    const json = await res.json()
    expect(json.revalidated).not.toEqual(expect.arrayContaining([expect.stringMatching(/^collection:/)]))
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run __tests__/api-revalidate.test.ts`
Expected: FAIL — `json.revalidated` currently only contains `['products', 'product:wheelchair-transport-17']`, missing `'collections'`.

- [ ] **Step 4: Add the broad collections invalidation to the products branch**

```ts
// app/api/revalidate/route.ts — change only the `products/*` branch
  if (topic.startsWith('products/')) {
    invalidate('products')
    if (handle) invalidate(`product:${handle}`)
    // A product save can change which collections it belongs to (tag/category
    // edits), but the webhook payload never carries collection membership —
    // only collections/* webhooks name a handle. Invalidating the broad
    // 'collections' tag (not a specific collection:<handle>) is the cheap,
    // correct fallback: every category page's next request revalidates
    // instead of waiting up to the 300s background window. Previously this
    // gap meant a tag/category edit could take up to 5 minutes to appear on
    // the storefront, which read to the client as the SAVE causing a delayed
    // appearance rather than the cache window.
    invalidate('collections')
  } else if (topic.startsWith('collections/')) {
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run __tests__/api-revalidate.test.ts`
Expected: PASS

- [ ] **Step 6: Run the whole suite**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add app/api/revalidate/route.ts __tests__/api-revalidate.test.ts
git commit -m "fix(revalidate): invalidate the broad collections tag on every product webhook

A product save changing tag/category membership previously wasn't reflected
on category pages until the 300s background revalidate — the webhook only
invalidated the product-specific tags. Product webhooks can't know which
collections were affected, so this invalidates the collections tag broadly
rather than guessing a specific handle."
```

---

### Task 3: Document Product Type usage (no code defect — a written conclusion + a regression guard)

**Context:** Per the ticket, determine exactly where Product Type (`productType`/`product_type`) is or isn't used. Confirmed by exhaustive grep across `*.ts`/`*.tsx`: the only real (non-test, non-script) reference is `lib/filter-registry.ts`, where `PRODUCT_TYPE` is declared as a `FacetRule` matching `filter.p.type`/`filter.p.product_type`, and is used in exactly two places:
1. `SEARCH_FACET_RULES` — the global `/search` page's facet allowlist (search only, not category pages).
2. `INPUT_VALIDATORS.productType` — validates a hand-crafted `?filter={"productType":"..."}` value if the search page's rail ever renders one.

It is **not** referenced by any per-collection entry in `filterRegistry` (every category route's `cat(...)` call uses `M.type`, a `custom.type` *metafield* — a different field with a different label, "Type," that happens to look similar). It has zero role in `lib/category-tree.ts` or `lib/category-nav.ts` — both are built entirely from `category:`/`subcategory:` **product tags** (confirmed by `category-tree.ts`'s own header comment: "sourced from live category:/subcategory: product tags, never from the Shopify collection list"). So Product Type cannot affect category routing, membership display, subcategory grouping, navigation, or fallback categorization anywhere in this codebase today — its only live effect is as an optional, currently-unrendered facet source on `/search`.

This explains the meeting anecdote: a Product Type edit "appeared to coincide" with a product becoming visible, but Product Type cannot cause that in this codebase. The far more likely cause is Task 2's cache-invalidation gap — the save (whatever else it changed, e.g. a tag) landed inside the 5-minute stale window, and Product Type was incidental to what the person editing happened to touch in the same save.

**Files:**
- Create: `docs/audits/2026-08-25-product-type-usage-conclusion.md`
- Test: `lib/__tests__/filter-registry.test.ts` (extend existing file — read it first)

**Interfaces:** None — this task adds a guard test and a written deliverable, no production code changes.

- [ ] **Step 1: Read the existing filter-registry test file to match its conventions**

Run: Read `lib/__tests__/filter-registry.test.ts` before writing the new test, so the new `describe` block matches existing import/mock style exactly.

- [ ] **Step 2: Add the regression guard — Product Type must never appear in a per-collection registry entry**

```ts
// lib/__tests__/filter-registry.test.ts (add to the file)
import { filterRegistry, industryFilterRegistry } from '../filter-registry'

describe('Product Type usage conclusion (docs/audits/2026-08-25-product-type-usage-conclusion.md)', () => {
  it('is never referenced by a per-category or per-industry facet registry entry', () => {
    // PRODUCT_TYPE (filter.p.type / filter.p.product_type) is a distinct rule
    // from M.type (the custom.type metafield) used throughout filterRegistry.
    // This test pins the conclusion that Product Type has no role in any
    // category or industry route's rendered filters — only in global search.
    const allCategoryRules = Object.values(filterRegistry).flat()
    const allIndustryRules = Object.values(industryFilterRegistry).flat()
    const productTypeRuleName = 'productType'
    expect(allCategoryRules.some((r) => r.name === productTypeRuleName)).toBe(false)
    expect(allIndustryRules.some((r) => r.name === productTypeRuleName)).toBe(false)
  })
})
```

- [ ] **Step 3: Run the test — it should already pass (this is a guard, not a fix)**

Run: `npx vitest run lib/__tests__/filter-registry.test.ts`
Expected: PASS. If it fails, someone has since added `PRODUCT_TYPE` to a category/industry entry — stop and re-investigate before continuing, since that would contradict this task's documented conclusion.

- [ ] **Step 4: Write the conclusion document**

```markdown
<!-- docs/audits/2026-08-25-product-type-usage-conclusion.md -->
# Product Type usage conclusion — 2026-08-25

**Ticket:** MDSupplies Headless Category Navigation Remediation, item 5 ("Determine Whether Product Type Affects the Frontend").

## Conclusion

Product Type (Shopify's `productType`/`product_type` field) has **no effect** on
category routing, category membership, subcategory grouping, navigation, or
fallback categorization anywhere in this codebase.

Its only live reference is `lib/filter-registry.ts`'s `PRODUCT_TYPE` rule, used in
exactly two places:
- `SEARCH_FACET_RULES` — the allowlist for the global `/search` page's facets.
- `INPUT_VALIDATORS.productType` — validates a hand-crafted filter input for that
  same search facet, if rendered.

No category route (`filterRegistry[handle]` in the same file) references it — every
category's "Type" filter is `custom.type`, a *metafield*, which is a different field
despite the similar label. `lib/category-tree.ts` and `lib/category-nav.ts`, which
own all category membership/routing/navigation, are built entirely from
`category:`/`subcategory:` **product tags** and never read Product Type.

## Why this matters for the meeting anecdote

A Product Type edit was reported as coinciding with a previously-missing product
becoming visible. Given the above, Product Type cannot have caused that in this
codebase. The far more likely explanation is the cache-invalidation gap fixed in
this plan's Task 2: the webhook handler didn't invalidate collection cache tags on
a product save, so a tag/category change could take up to 5 minutes (the background
revalidate window) to appear — coincidentally around the time someone might notice
a save "finally" taking effect, regardless of which field was actually edited.

## Regression guard

`lib/__tests__/filter-registry.test.ts` — "Product Type usage conclusion" — asserts
Product Type is never added to a per-category or per-industry facet registry entry.
If this test starts failing, this conclusion is stale and should be re-verified
before merging whatever added the reference.
```

- [ ] **Step 5: Commit**

```bash
git add docs/audits/2026-08-25-product-type-usage-conclusion.md lib/__tests__/filter-registry.test.ts
git commit -m "docs(catalog): document Product Type has no role in category routing/nav

Confirms via exhaustive grep + a regression guard test that Product Type
only ever reaches the /search facet allowlist, never category membership,
navigation, or fallback categorization — addresses ticket item 5."
```

---

### Task 4: Consolidate the duplicate category registry (`lib/category-nav.ts` → `lib/category-tree.ts`)

**Context:** Two independently-maintained category registries exist. `lib/category-tree.ts` is the current one — its own header comment declares it "ONE registry ... sourced from live category:/subcategory: product tags, never from the Shopify collection list" — and is what `Header.tsx`, `Footer.tsx`, `lib/seo/sitemap.ts`, and `app/categories/page.tsx` already use. `lib/category-nav.ts` (`ROADMAP_CATEGORIES`) is the legacy Shopify-collection-list-based registry it superseded (per `docs/superpowers/plans/2026-07-16-category-tree-registry-phase1.md`), but 4 real (non-test, non-doc) call sites still depend on it:

| Consumer | What it uses | Why |
|---|---|---|
| `lib/bunnycdn.ts` | `ROADMAP_CATEGORIES` (`matchedHandles`, `placeholderSlug`) | Artwork fallback across a *family* of historical/synonym handles per category (e.g. Apparel's 7 handles) — `category-tree.ts` only carries one `collectionHandle` per L1, so this is genuinely broader than a duplicate. |
| `lib/category-utils.ts` | `getAllowedHandles()` | Filters the live collection list down to the approved set for `getRelatedCategories`/`getPrimaryCollection`. |
| `app/api/search/predictive/route.ts` | `getAllowedHandles()` | Same allowlist gate, for predictive search results. |
| `components/category/CategoryPageView.tsx` | `getShopifyHandle(slug)` | Resolves a canonical public slug (e.g. `face-masks`) back to its real Shopify handle (`face-coverings`) — `category-tree.ts` already implements the **inverse** of this (`getCategorySlug`/`CANONICAL_SLUG_BY_HANDLE`) independently, which is the exact "duplicating category definitions in multiple places" the ticket's item 4 warns against. |

This task ports what `bunnycdn.ts` genuinely needs into `category-tree.ts` as a new optional field, adds the missing forward-direction helper (`getShopifyHandle`) to `category-tree.ts` next to its existing inverse (`getCategorySlug`), migrates all 4 real consumers, deletes `lib/category-nav.ts` and its test file, and fixes the two test files that still import from it.

**Files:**
- Modify: `lib/category-tree.ts`
- Modify: `lib/bunnycdn.ts`
- Modify: `lib/category-utils.ts`
- Modify: `app/api/search/predictive/route.ts`
- Modify: `components/category/CategoryPageView.tsx`
- Modify: `lib/__tests__/category-utils.test.ts`
- Modify: `lib/__tests__/seo-route-audit.test.ts`
- Delete: `lib/category-nav.ts`
- Delete: `lib/__tests__/category-nav.test.ts` (its coverage is superseded by the new tests below)
- Test: `lib/__tests__/category-tree.test.ts` (extend existing file)

**Interfaces:**
- Produces (new, in `lib/category-tree.ts`): `getShopifyHandle(slug: string): string` — inverse of `getCategorySlug`; returns the real Shopify handle for a canonical public slug, or the input unchanged if it has no alias.
- Produces (new, in `lib/category-tree.ts`): `getAllowedHandles(): Set<string>` — `CATEGORY_TREE_L1` collection handles ∪ `FEATURED_SUBCATEGORIES` collection handles.
- Modifies `L1CategoryDef`: adds optional `artworkFallbackHandles?: readonly string[]` — the historical/synonym handle family `bunnycdn.ts` needs, ported verbatim from each `ROADMAP_CATEGORIES.matchedHandles`.

- [ ] **Step 1: Write the failing tests for the two new `category-tree.ts` exports**

```ts
// lib/__tests__/category-tree.test.ts (add to the file)
import { getShopifyHandle, getAllowedHandles } from '../category-tree'

describe('getShopifyHandle', () => {
  it('resolves the canonical face-masks slug back to the real face-coverings handle', () => {
    expect(getShopifyHandle('face-masks')).toBe('face-coverings')
  })

  it('returns the input unchanged for a slug with no canonical alias', () => {
    expect(getShopifyHandle('mobility')).toBe('mobility')
    expect(getShopifyHandle('some-unrelated-slug')).toBe('some-unrelated-slug')
  })
})

describe('getAllowedHandles', () => {
  it('contains every L1 collection handle', () => {
    const allowed = getAllowedHandles()
    expect(allowed.has('mobility')).toBe(true)
    expect(allowed.has('home-care')).toBe(true)
    expect(allowed.has('gloves')).toBe(true)
  })

  it('contains every featured-subcategory collection handle', () => {
    expect(getAllowedHandles().has('trocars-trocar-kits')).toBe(true)
  })

  it('does not contain an arbitrary non-registry handle', () => {
    expect(getAllowedHandles().has('random-nonexistent')).toBe(false)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run lib/__tests__/category-tree.test.ts`
Expected: FAIL with "getShopifyHandle is not a function" / "getAllowedHandles is not a function".

- [ ] **Step 3: Add the two functions and the artwork-fallback field to `category-tree.ts`**

Add near the existing `getCategorySlug`/`CANONICAL_SLUG_BY_HANDLE` (they are the inverse of each other and belong together):

```ts
// lib/category-tree.ts — add after getCategorySlug/CANONICAL_SLUG_BY_HANDLE

// Inverse of getCategorySlug/CANONICAL_SLUG_BY_HANDLE: resolves a PUBLIC URL
// slug back to the real Shopify collection handle for API calls. Only
// face-masks diverges today (see getCategorySlug's doc comment); every other
// slug already equals its handle, so this is a no-op for them.
export function getShopifyHandle(slug: string): string {
  for (const [handle, canonicalSlug] of Object.entries(CANONICAL_SLUG_BY_HANDLE)) {
    if (canonicalSlug === slug) return handle
  }
  return slug
}

// The approved-handle allowlist, replacing lib/category-nav.ts's
// getAllowedHandles(): every L1's canonical collection handle plus every
// featured subcategory's — the full set of Shopify collections this
// storefront intentionally links to.
export function getAllowedHandles(): Set<string> {
  return new Set([
    ...CATEGORY_TREE_L1.map((c) => c.collectionHandle),
    ...FEATURED_SUBCATEGORIES.map((s) => s.collectionHandle),
  ])
}
```

Add the new optional field to `L1CategoryDef` (near `productSet`):

```ts
export type L1CategoryDef = {
  // ...existing fields unchanged...
  /**
   * Historical/synonym Shopify collection handles for artwork resolution
   * ONLY (lib/bunnycdn.ts) — ported from the legacy lib/category-nav.ts
   * ROADMAP_CATEGORIES.matchedHandles list it replaced. NOT a
   * membership/routing signal (CATEGORY_TREE_L1's own `tag` field is that);
   * a handle here just means "if a product/collection page needs a hero image
   * under one of these handles and has no direct entry, use this L1's
   * artwork." Absent for L1s whose collectionHandle was always the only
   * handle in their roadmap family.
   */
  artworkFallbackHandles?: readonly string[]
}
```

Populate it only where `ROADMAP_CATEGORIES` had more than one handle (Surgery & Procedure, Apparel, Room Furniture — read the current `lib/category-nav.ts` list before deleting it in Step 6 to copy these exactly):

```ts
// In CATEGORY_TREE_L1, on the surgery-procedure row:
{ tag: 'surgery-procedure', displayName: 'Surgery & Procedure', collectionHandle: 'surgery-procedure', navGroup: 'primary', shortDescription: '...', artworkFallbackHandles: ['trocars-trocar-kits', 'disposable-3-2mm-3-5mm-trocars', 'disposable-4-5mm-trocars', 'reusable-3-2mm-3-5mm-trocars', 'reusable-4-5mm-trocars'] },

// On the apparel row:
{ tag: 'apparel', displayName: 'Apparel', collectionHandle: 'capes-gowns', productSet: 'tag', navGroup: 'primary', shortDescription: '...', artworkFallbackHandles: ['caps-headwear', 'coats-jackets', 'footwear', 'medical-scrubs', 'pants-shirts', 'undergarments-wraps'] },

// On the room-furniture row:
{ tag: 'room-furniture', displayName: 'Room Furniture', collectionHandle: 'seating', productSet: 'tag', navGroup: 'more', shortDescription: '...', artworkFallbackHandles: ['exam-tables'] },
```
(Keep every other field on those rows exactly as it is today — only add `artworkFallbackHandles`.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run lib/__tests__/category-tree.test.ts`
Expected: PASS

- [ ] **Step 5: Migrate `lib/bunnycdn.ts` off `ROADMAP_CATEGORIES`**

```ts
// lib/bunnycdn.ts
import { CATEGORY_TREE_L1 } from '@/lib/category-tree'
import {
  CATEGORY_IMAGE_CONFIG,
  CATEGORY_IMAGE_FALLBACK,
  DEFAULT_HERO_FOCAL,
  type CategoryImageEntry,
} from '@/lib/category-images'

// ...

function findRoadmapCategory(handle: string) {
  return CATEGORY_TREE_L1.find((category) =>
    (category.artworkFallbackHandles ?? []).some((h) => handle === h || handle.startsWith(`${h}-`))
    || handle === category.collectionHandle
    || handle.startsWith(`${category.collectionHandle}-`),
  )
}

function resolveEntry(handle: string): CategoryImageEntry {
  const direct = CATEGORY_IMAGE_CONFIG[handle]
  if (direct) return direct

  const category = findRoadmapCategory(handle)
  if (!category) return CATEGORY_IMAGE_FALLBACK
  // ROADMAP_CATEGORIES.placeholderSlug had no L1 equivalent — CATEGORY_TREE_L1's
  // `tag` is the same "short slug for the placeholder filename" concept
  // (e.g. tag 'surgery-procedure' -> file 'surgery-procedure-placeholder.webp').
  return CATEGORY_IMAGE_CONFIG[category.tag] ?? CATEGORY_IMAGE_FALLBACK
}
```

Run `npx vitest run lib/__tests__/category-assets.test.ts` after this change — that file exercises `bunnycdn.ts`'s artwork resolution and will catch any placeholder-slug mismatch (`ROADMAP_CATEGORIES.placeholderSlug` was identical to the L1 `tag` for every row except none — verify this by comparing the two lists before deleting `category-nav.ts`; if any row's `placeholderSlug` ever diverged from its `tag`, add an explicit mapping instead of assuming equality).

- [ ] **Step 6: Migrate the remaining 3 consumers**

`lib/category-utils.ts`:
```ts
import { getAllowedHandles } from '@/lib/category-tree'
```

`app/api/search/predictive/route.ts`:
```ts
import { getAllowedHandles } from '@/lib/category-tree'
```

`components/category/CategoryPageView.tsx`:
```ts
import { getShopifyHandle, /* ...existing category-tree imports... */ } from '@/lib/category-tree'
```
(Remove the old `import { getShopifyHandle } from '@/lib/category-nav'` line entirely — do not import the same name from two modules.)

- [ ] **Step 7: Fix the two test files that import from the legacy module**

`lib/__tests__/category-utils.test.ts` line 63: change `import { getAllowedHandles } from '@/lib/category-nav'` to `from '@/lib/category-tree'`.

`lib/__tests__/seo-route-audit.test.ts` — this file has exactly two references to the legacy module, both precisely identified by reading the file:

1. Line 2 + line 4 — merge the two import lines:
```ts
// Before:
// import { CATEGORY_TREE_L1, getCategorySlug } from '@/lib/category-tree'
// ...
// import { ROADMAP_CATEGORIES, getShopifyHandle } from '@/lib/category-nav'

// After (one import, no more category-nav reference):
import { CATEGORY_TREE_L1, getCategorySlug, getShopifyHandle } from '@/lib/category-tree'
```

2. Lines 71–76 — `ROADMAP_CATEGORIES.placeholderSlug` has no field on `CATEGORY_TREE_L1`; Task 4 Step 5 established that `bunnycdn.ts` now resolves artwork via each L1's `tag` (identical string to every row's old `placeholderSlug` — verify this equality across all 25 rows before editing this test; if any ever diverged, this test is exactly the place that would have caught it):
```ts
// Before:
//   it('has an image entry for every placeholderSlug the nav registry references', () => {
//     const missing = ROADMAP_CATEGORIES
//       .filter((c) => !(c.placeholderSlug in CATEGORY_IMAGE_CONFIG))
//       .map((c) => c.displayName)
//     expect(missing).toEqual([])
//   })

// After:
  it('has an image entry for every tag the category registry references', () => {
    const missing = CATEGORY_TREE_L1
      .filter((c) => !(c.tag in CATEGORY_IMAGE_CONFIG))
      .map((c) => c.displayName)
    expect(missing).toEqual([])
  })
```

The remaining assertion in this file (`'resolves every public slug back to a real Shopify handle'`, lines 104–108) already calls `getShopifyHandle(getCategorySlug(l1))` and expects it to equal `l1.collectionHandle` for all 25 categories — this is a pre-existing round-trip property test that Task 4's new `getShopifyHandle` must satisfy unchanged; no edit needed to this `it` block, only to where `getShopifyHandle` is imported from (item 1 above).

- [ ] **Step 8: Delete the legacy module and its test**

```bash
git rm lib/category-nav.ts lib/__tests__/category-nav.test.ts
```

- [ ] **Step 9: Run the full suite and typecheck**

Run: `npx vitest run`
Expected: PASS — no remaining imports of `@/lib/category-nav` (grep to confirm: `Grep "from '@/lib/category-nav'"` should return zero non-doc matches).

Run: `npx tsc --noEmit`
Expected: PASS — no dangling type errors from the deleted module.

- [ ] **Step 10: Commit**

```bash
git add lib/category-tree.ts lib/bunnycdn.ts lib/category-utils.ts app/api/search/predictive/route.ts components/category/CategoryPageView.tsx lib/__tests__/category-utils.test.ts lib/__tests__/seo-route-audit.test.ts lib/__tests__/category-tree.test.ts
git rm lib/category-nav.ts lib/__tests__/category-nav.test.ts
git commit -m "refactor(catalog): consolidate the legacy category-nav registry into category-tree

lib/category-nav.ts (ROADMAP_CATEGORIES) independently re-implemented slug
aliasing and an allowed-handle set that lib/category-tree.ts already owns —
two places defining the same category mapping, which is exactly what the
nav-remediation ticket's item 4 flags as a root-cause pattern. Ports the one
thing category-tree.ts didn't have (bunnycdn.ts's multi-handle artwork
fallback) as a new optional field, migrates the 4 real consumers, and
deletes the legacy file."
```

---

### Task 5: Wire real subcategory data into the header's mega-dropdown (fixes the Mobility/Home Care complaint)

**Context — root cause, confirmed from git history:** Mobility, Home Care, Needles/Syringes, and Testing used to be their OWN top-level nav items (not nested under "Categories"), each with a real dropdown populated by filtering the live collection list for a handle prefix (e.g. `mobility-wheelchairs`). That mechanism was added in commit `1a1d7f2` (2026-06-02) and removed 6 days later in commit `1764594` ("api integration", 2026-06-08) when the nav was folded into the flat "Categories" mega-dropdown grid — which is the version still live today. **This is a ~2.5-month-old architectural gap, not a recent regression** — worth saying plainly to the client rather than "restoring" a claim of recent breakage. Since then, exactly one category (Surgery & Procedure) has ever had dropdown children, via the unrelated `FEATURED_SUBCATEGORIES` mechanism (added for Trocars, a real Shopify collection with its own route).

Meanwhile `lib/category-tree.ts` already computes a full, tag-derived L2 subcategory tree (`buildL2Tree` + `getSubcategoriesForParent`) that the category page's own footer list and `CategoryTabs` already use, and `ROUTES.subcategory(cat, sub)` already resolves to a real, working, tested route (`app/category/[slug]/[product]/page.tsx`, which renders `SubcategoryNavigator`). Verified live against the QA store: Mobility has 15 tag-derived subcategories (Walkers, Rollators, Canes, Crutches, Wheelchair Parts, etc.) and Home Care has 17 (Bath Bench, Grab Bars, Bed Pans, Lifts, etc.) — the exact kind of content the client expects under those dropdowns. The header just never reads this data.

This task plumbs `l2Nodes` down to `Header.tsx` (root layout → prop, following the existing `.catch(() => [])` fail-soft convention every other root-layout fetch already uses, so a scan failure degrades the dropdown to today's flat-tile behavior instead of breaking the header sitewide) and extends every L1 cell — not just Surgery & Procedure — to show its top subcategories, capped so the panel stays scannable.

**Files:**
- Modify: `app/layout.tsx`
- Modify: `components/layout/Header.tsx`
- Test: `components/layout/__tests__/Header.test.tsx` (new — check with `Glob "components/layout/__tests__/**"` first in case one already exists)

**Interfaces:**
- Produces (new, in `lib/category-tree.ts`): `getTopSubcategoriesForParent(parentTag: string, l2Nodes: L2Node[], limit: number): L2Node[]` — `getSubcategoriesForParent` sorted by `productCount` descending, sliced to `limit`.
- `Header` gets a new required prop: `l2Nodes: L2Node[]` (empty array is a valid, already-handled input — same shape `CategoryPageView` already passes around).

- [ ] **Step 1: Add the capped-top-N helper to `category-tree.ts`, with a test**

```ts
// lib/__tests__/category-tree.test.ts (add to the file)
import { getTopSubcategoriesForParent } from '../category-tree'

describe('getTopSubcategoriesForParent', () => {
  const l2Nodes = [
    { tag: 'walkers', parentTag: 'mobility', productCount: 3 },
    { tag: 'rollators', parentTag: 'mobility', productCount: 7 },
    { tag: 'canes', parentTag: 'mobility', productCount: 5 },
    { tag: 'bed-pans', parentTag: 'home-care', productCount: 4 },
  ]

  it('returns only the requested parent, ordered by product count descending', () => {
    const top = getTopSubcategoriesForParent('mobility', l2Nodes, 2)
    expect(top.map((n) => n.tag)).toEqual(['rollators', 'canes'])
  })

  it('returns fewer than the limit if the parent has fewer subcategories', () => {
    const top = getTopSubcategoriesForParent('home-care', l2Nodes, 5)
    expect(top.map((n) => n.tag)).toEqual(['bed-pans'])
  })

  it('returns an empty array for a parent with no subcategories', () => {
    expect(getTopSubcategoriesForParent('gloves', l2Nodes, 4)).toEqual([])
  })
})
```

Run: `npx vitest run lib/__tests__/category-tree.test.ts` — Expected: FAIL (function doesn't exist yet).

Add to `lib/category-tree.ts`, right after the existing `getSubcategoriesForParent`:

```ts
/** Top N subcategories for a parent by live product count — for surfaces
 *  (like the header dropdown) that need a curated preview rather than the
 *  full L2 list the category page's own footer/tabs already show in full. */
export function getTopSubcategoriesForParent(
  parentTag: string,
  l2Nodes: L2Node[],
  limit: number,
): L2Node[] {
  return getSubcategoriesForParent(parentTag, l2Nodes)
    .slice()
    .sort((a, b) => b.productCount - a.productCount)
    .slice(0, limit)
}
```

Run: `npx vitest run lib/__tests__/category-tree.test.ts` — Expected: PASS.

- [ ] **Step 2: Fetch and pass `l2Nodes` from the root layout, fail-soft**

In `app/layout.tsx`, add to the existing `Promise.all` (matching the file's established `.catch(() => [])` convention for every other layout-level fetch):

```ts
import { buildL2Tree, type L2Node } from '@/lib/category-tree'
import { fetchProductTagSummaries } from '@/lib/category-tree-data.server'

// ...

const [localization, collectionsData, menuData, l2Nodes] = await Promise.all([
  storefrontFetch<{ localization: LocalizationData }>(/* unchanged */),
  fetchAllCollectionHandles().catch(() => [] as CollectionHandle[]),
  storefrontFetch<{ menu: ShopifyMenu }>(/* unchanged */),
  // Nav-dropdown subcategory preview (nav remediation, item 1/2). Reuses the
  // SAME 1-hour-cached scan CategoryPageView already runs — Next's data cache
  // dedupes concurrent identical requests, so this is normally a cache hit,
  // not a second full scan. Fails soft to an empty tree so a cold-cache
  // Storefront hiccup degrades the header to today's flat-tile dropdown
  // instead of breaking navigation sitewide.
  fetchProductTagSummaries().then(buildL2Tree).catch(() => [] as L2Node[]),
])
```

Pass it to `Header`:
```tsx
<Header menuItems={menuItems} collections={collections} l2Nodes={l2Nodes} />
```

- [ ] **Step 3: Write the Header test for the new nested-children behavior**

```tsx
// components/layout/__tests__/Header.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('next/navigation', () => ({ usePathname: () => '/' }))
vi.mock('@/components/store/CartProvider', () => ({ useCart: () => ({ cart: null, openCart: vi.fn() }) }))

import { Header } from '../Header'

const COLLECTIONS = [{ handle: 'mobility' }, { handle: 'home-care' }, { handle: 'gloves' }]
const L2_NODES = [
  { tag: 'walkers', parentTag: 'mobility', productCount: 3 },
  { tag: 'rollators', parentTag: 'mobility', productCount: 7 },
  { tag: 'bed-pans', parentTag: 'home-care', productCount: 4 },
]

describe('Header — mega-dropdown subcategory children', () => {
  it('renders Mobility with its top live subcategories as nested links', () => {
    render(<Header menuItems={[]} collections={COLLECTIONS} l2Nodes={L2_NODES} />)
    const rollatorsLink = screen.getByRole('link', { name: /rollators/i })
    expect(rollatorsLink).toHaveAttribute('href', '/category/mobility/rollators')
  })

  it('renders Home Care with its subcategory too', () => {
    render(<Header menuItems={[]} collections={COLLECTIONS} l2Nodes={L2_NODES} />)
    expect(screen.getByRole('link', { name: /bed pans/i })).toHaveAttribute('href', '/category/home-care/bed-pans')
  })

  it('degrades to a flat tile (no children) when l2Nodes is empty', () => {
    render(<Header menuItems={[]} collections={COLLECTIONS} l2Nodes={[]} />)
    expect(screen.queryByRole('link', { name: /rollators/i })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^Mobility$/i })).toBeInTheDocument()
  })
})
```

Run: `npx vitest run components/layout/__tests__/Header.test.tsx` — Expected: FAIL (`l2Nodes` prop doesn't exist yet; no nested links render).

- [ ] **Step 4: Wire `l2Nodes` into `Header.tsx`'s children resolution and simplify the panel-ordering hack**

```tsx
// components/layout/Header.tsx
import {
  buildCategoryTreeNav,
  CATEGORY_TREE_L1,
  getCategorySlug,
  getTopSubcategoriesForParent,
  humanizeTag,
  FEATURED_SUBCATEGORIES,
  type L2Node,
} from '@/lib/category-tree'
import { ROUTES } from '@/lib/routes'

interface HeaderProps {
  menuItems: MenuItem[]
  collections: { handle: string }[]
  /** Tag-derived L2 subcategory tree (nav remediation) — empty array degrades
   *  every dropdown to a flat tile, same as before this prop existed. */
  l2Nodes: L2Node[]
}

/** Cap on how many tag-derived subcategories a header dropdown cell shows
 *  before pointing shoppers to the full list on the category page itself
 *  (the footer link list + CategoryTabs already show everything). */
const MAX_DROPDOWN_CHILDREN = 4
```

Replace the existing `childrenByParentHref` construction (currently FEATURED_SUBCATEGORIES-only) with one that merges featured (curated, route-owning) entries first, then fills remaining slots with top tag-derived subcategories:

```tsx
  const childrenByParentHref = new Map<string, { displayName: string; href: string }[]>()
  for (const l1 of CATEGORY_TREE_L1) {
    const parentHref = ROUTES.category(getCategorySlug(l1))
    const featuredChildren = FEATURED_SUBCATEGORIES
      .filter((sub) => sub.parentTag === l1.tag)
      .filter((sub) => validHandles.size === 0 || validHandles.has(sub.collectionHandle))
      .map((sub) => ({ displayName: sub.displayName, href: ROUTES.category(sub.slug) }))

    const remainingSlots = MAX_DROPDOWN_CHILDREN - featuredChildren.length
    const tagChildren = remainingSlots > 0
      ? getTopSubcategoriesForParent(l1.tag, l2Nodes, remainingSlots).map((n) => ({
          displayName: humanizeTag(n.tag),
          href: ROUTES.subcategory(getCategorySlug(l1), n.tag),
        }))
      : []

    const children = [...featuredChildren, ...tagChildren]
    if (children.length > 0) childrenByParentHref.set(parentHref, children)
  }
  const navChildren = (parentHref: string) => childrenByParentHref.get(parentHref) ?? []
```

Remove the old FEATURED_SUBCATEGORIES-only loop this replaces (the block starting `// Featured subcategories (lib/category-tree.ts), keyed by their PARENT's nav href...`).

Since most primary categories can now have children (not just one outlier), the `primaryDesktopOrder` reordering hack built for exactly one tall cell no longer fits its own justification — replace it with plain registry order, which is simpler and matches this codebase's stated "one deterministic mapping" preference:

```tsx
  // Registry order — every category can now carry its own children inline
  // (nav remediation), so the "push the one tall cell to the end" special
  // case built for the single pre-existing Surgery & Procedure/Trocars
  // outlier no longer applies to a general N-children-per-cell layout.
  const primaryDesktopOrder = categoryNav.primary
```

Leave the JSX that renders `primaryDesktopOrder`/`navChildren` as-is — it already handles a variable-height cell per category (the `children.length > 0 ? 'col-start-1' : undefined` conditional and the nested `<ul>` are generic, not Surgery-specific), so no further JSX change is required here.

- [ ] **Step 5: Update every other `<Header ... />` call site to pass the new required prop**

Run: `Grep "<Header" -A3` across the repo to find every call site beyond `app/layout.tsx` (test files, Storybook-style fixtures if any). Add `l2Nodes={[]}` (or real data where available) to each.

- [ ] **Step 6: Run the Header test to verify it passes**

Run: `npx vitest run components/layout/__tests__/Header.test.tsx`
Expected: PASS

- [ ] **Step 7: Run the full suite and typecheck**

Run: `npx vitest run`
Expected: PASS

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 8: Visual/manual verification — start the dev server and check the actual dropdown**

Per AGENTS.md's UI-change rule, this step must happen in a real browser before calling the task done:

Run: `npm run dev` (or the project's dev script from `package.json`), then in a browser (or via the `claude-in-chrome` skill):
- Open the site, hover/focus "Categories" in the header.
- Confirm Mobility shows its top subcategories nested underneath, each linking to `/category/mobility/<sub>` and rendering a real page.
- Confirm Home Care shows its subcategories too.
- Confirm the panel still fits on screen and doesn't visually break at the widths the existing comments call out (check ~1280px and ~1440px, where the panel width/column comments in `Header.tsx` were tuned).
- Repeat on mobile width (drawer, not hover panel) and verify keyboard tab/Escape behavior per the ticket's acceptance criteria (desktop hover/focus, mobile expandable nav, keyboard accessibility).
- Take the screenshots the client explicitly asked for.

- [ ] **Step 9: Commit**

```bash
git add lib/category-tree.ts lib/__tests__/category-tree.test.ts app/layout.tsx components/layout/Header.tsx components/layout/__tests__/Header.test.tsx
git commit -m "fix(nav): show real subcategories under every header category, not just one

Mobility/Home Care/etc. lost their dropdown children when the nav moved off
the old handle-prefix convention on 2026-06-08 (commit 1764594) and were
never re-wired to the tag-derived L2 tree that already powers the in-page
subcategory list. Plumbs that tree into the header (fail-soft, per the root
layout's existing convention) and shows each category's top subcategories
inline, addressing the client-reported missing Mobility/Home Care dropdowns."
```

---

### Task 6: Nav/collection reconciliation table, remaining department audit, and P1 regression QA

**Context:** This task covers the ticket's remaining audit/QA items that need either live data beyond this task's earlier code fixes, or a manual pass in a browser: the frontend-category-to-Shopify-collection reconciliation table (item 3), auditing every top-level department beyond Mobility (item 2), and the P1 focused regression QA (items 10–11). Because this dev environment only reaches the QA store (~1,100 products vs. production's ~7,000+, per this plan's Global Constraints), the reconciliation table's "Live Shopify Collection Exists?" column can only be verified here against QA — flag it as QA-verified and hand the same script to Izzy (or re-run with production credentials) before treating a row as production-confirmed.

**Files:**
- Modify: `scripts/audit-category-tree.ts` (extend with a per-L1 reconciliation section)
- Create: `docs/audits/2026-08-25-nav-reconciliation-table.md` (generated output, committed as the deliverable)
- Modify: `e2e/responsive.spec.ts` or a new `e2e/category-nav-regression.spec.ts` (check `Glob "e2e/**"` first for the closest existing category-nav coverage to extend rather than duplicate)

**Interfaces:** None new — this task consumes Task 4/5's exports (`getAllowedHandles`, `getTopSubcategoriesForParent`) and existing exports (`buildL1Tiles`, `buildL2Tree`) to produce a report; no new library code contracts.

- [ ] **Step 1: Extend the audit script with the reconciliation table**

Add to `scripts/audit-category-tree.ts`, after the existing L1-tiles section (reuses `buildCategoryTreeNav` from Task 4's consolidated registry and the live collection handles already fetched elsewhere in the codebase's pattern — fetch them here the same way `lib/shopify/collection-handles.server.ts`'s `fetchAllCollectionHandles` does):

```ts
import { fetchAllCollectionHandles } from '../lib/shopify/collection-handles.server'
import { getCategorySlug } from '../lib/category-tree'

// ...inside main(), after the existing sections...

const liveHandles = new Set((await fetchAllCollectionHandles()).map((c) => c.handle))

lines.push('')
lines.push('## Frontend category → Shopify collection reconciliation')
lines.push('')
lines.push('| Frontend Category | Route | Configured Shopify Handle | Live Collection Exists? | Parent | Children (top 4) | Status |')
lines.push('|---|---|---|---|---|---|---|')
for (const l1 of CATEGORY_TREE_L1) {
  const slug = getCategorySlug(l1)
  const exists = liveHandles.has(l1.collectionHandle) ? 'YES' : 'NO — MISSING'
  const children = getTopSubcategoriesForParent(l1.tag, l2Nodes, 4).map((n) => n.tag).join(', ') || '_none_'
  const status = liveHandles.has(l1.collectionHandle) ? 'OK' : 'FLAG — configured handle not found live'
  lines.push(`| ${l1.displayName} | /category/${slug} | ${l1.collectionHandle} | ${exists} | — | ${children} | ${status} |`)
}
```

(Import `getTopSubcategoriesForParent` from Task 5 alongside the other `category-tree` imports at the top of the script.)

- [ ] **Step 2: Run the script against the QA store and commit the generated report**

Run: `NODE_OPTIONS='--conditions=react-server' npx tsx scripts/audit-category-tree.ts`

Copy the generated `audit/category-tree-audit-report.md` reconciliation section into `docs/audits/2026-08-25-nav-reconciliation-table.md`, prefixed with:

```markdown
# Nav Reconciliation Table — 2026-08-25

**Source:** `scripts/audit-category-tree.ts`, run against the QA store (this dev
environment's only reachable Storefront token). Re-run against production (or hand
this script to Izzy) before treating any row below as production-confirmed —
see this plan's Global Constraints.

<!-- paste the generated "Frontend category -> Shopify collection reconciliation" table here -->
```

Review the table for any `NO — MISSING` or `FLAG` rows. For each one found, do **not** change the registry unilaterally — per the ticket's guardrails, flag it in the document for Izzy and Sardor to resolve together, and do not guess a replacement handle.

- [ ] **Step 3: Audit the remaining top-level departments beyond Mobility (item 2)**

For every `CATEGORY_TREE_L1` row, using the reconciliation table from Step 2 plus a manual pass in the browser (dev server running):
- Confirm the category's tile links to a route that resolves (no 404).
- Confirm desktop hover/focus and mobile expandable behavior work (Task 5 already covers the mechanism generically, but verify per-category rendering doesn't overflow or truncate — Housekeeping & Janitorial and Patient Therapy & Rehab are the longest labels called out in existing `Header.tsx` comments as truncation risks).
- Note any department whose live QA product count is 0 (`room-furniture` and `face-masks` were both 0 in this environment's audit run — confirm whether that's QA-store sparsity or a real production issue by checking with Izzy, since this plan's guardrails forbid treating a zero-count collection as automatically defective).

Record findings inline in `docs/audits/2026-08-25-nav-reconciliation-table.md` under a "Department audit notes" section.

- [ ] **Step 4: Write the P1 regression e2e coverage**

Check for existing category-nav e2e coverage first:

Run: `Glob "e2e/**/*categor*"` and `Glob "e2e/**/*nav*"`

Extend the closest existing spec (most likely `e2e/responsive.spec.ts`, which already references `SubcategoryNavigator` per the earlier grep) rather than creating a parallel one, adding cases for:
- Direct navigation to `/category/mobility` and `/category/mobility/<a-real-subcategory-from-step-1's-table>` — both resolve, no runtime error.
- Header dropdown hover (desktop) and tap-to-expand (mobile) reveal the new nested subcategory links from Task 5.
- Repeated navigation between two categories, then browser back/forward, confirms no blank/stuck state (regression guard for Task 1's fix).
- Hard refresh on a category page.

```ts
// Example case shape — adapt to the existing spec file's Playwright conventions
test('Mobility dropdown exposes real subcategories and they resolve', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Categories' }).hover()
  const mobilitySubLink = page.getByRole('link', { name: /rollators|walkers|canes/i }).first()
  await expect(mobilitySubLink).toBeVisible()
  await mobilitySubLink.click()
  await expect(page).not.toHaveURL(/\/categories$/)
  await expect(page.locator('main')).not.toBeEmpty()
})
```

- [ ] **Step 5: Run the e2e suite**

Run: `npx playwright test` (or the project's configured e2e script from `package.json`)
Expected: PASS. If the dev/preview server needs to be running first, check `playwright.config.ts`'s `webServer` config before assuming a manual server start is required.

- [ ] **Step 6: Commit**

```bash
git add scripts/audit-category-tree.ts docs/audits/2026-08-25-nav-reconciliation-table.md e2e/
git commit -m "test(catalog): add nav reconciliation table and P1 regression e2e coverage

Extends the category-tree audit script with a frontend-to-Shopify
reconciliation table (QA-store-verified; flagged for production re-check
with Izzy) and adds e2e coverage for the header dropdown subcategories and
repeated-navigation/back-forward/hard-refresh scenarios from the ticket's P1
regression QA section."
```

---

## Self-Review Notes (for whoever executes this plan)

- **Task 5 is the highest-risk task.** It touches a component with a lot of carefully-tuned layout comments (panel width, column ordering, truncation fixes). Do not skip Step 8's manual browser verification — the existing code comments in `Header.tsx` document real regressions from past layout attempts (a "blank block ... between Mobility and Hygiene" was explicitly fixed once already by the exact reordering hack this task removes). Take it slow, screenshot before/after, and if the new N-children-per-cell layout looks visually broken at the widths called out in Step 8, stop and redesign the panel (e.g., a true multi-column mega-menu) rather than forcing the old 2-column tile grid to fit.
- **Do not add any FEATURED_SUBCATEGORIES rows for Mobility/Home Care as a "fix"** — Task 5 deliberately uses the already-correct, tag-derived L2 mechanism instead, avoiding a second hand-maintained subcategory list.
- Tasks 1–4 have no live-data dependency and can be fully implemented and tested from this environment. Task 5's mechanism is fully implementable and testable here too; only its *content* (whether the QA-store subcategory counts match production) needs Izzy's confirmation before calling the client-facing fix final. Task 6 is explicitly QA-store-scoped and says so in its own output.
- Coordinate with Izzy before this branch's final QA pass, per both tickets' "Coordination" sections — specifically on any `NO — MISSING`/`FLAG` row Task 6 surfaces, and on whether the QA-store subcategory tag structure Task 5 is built from matches production closely enough to ship as-is.
