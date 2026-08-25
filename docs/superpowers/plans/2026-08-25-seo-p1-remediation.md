# SEO P1 Remediation — Crawl Graph, Taxonomy, Sitemap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the P1 (crawl graph / taxonomy / sitemap) items from the SEO master plan that are fixable in this repo's code with no dependency on live production data or a business decision: eliminate the self-titled duplicate `/category/<x>/<x>` pages, add the two missing legacy-Shopify redirects identified in the 2026-08-21 triage, split the flat sitemap into an index + sharded children, and implement IndexNow submission on real content changes.

**Architecture:** All work is additive to the existing registry-driven pattern established in the P0 plan — no new category/taxonomy data source, no Shopify Admin writes, no changes to `CATEGORY_TREE_L1`/`FEATURED_SUBCATEGORIES` (only consumed). `lib/category-tree.ts`'s `buildL2Tree` gets one new exclusion rule; `app/category/[slug]/[product]/page.tsx` gets one new early redirect; `proxy.ts` gets two new static entries; `lib/seo/sitemap.ts` + `app/sitemap.ts` gain shard-aware exports built on Next's native `generateSitemaps()` convention; a new `lib/seo/indexnow.ts` + `app/api/revalidate/route.ts` gain a best-effort, non-blocking IndexNow submission on real product/collection webhook topics.

**Tech Stack:** Next.js 16 App Router (Server Components, `generateSitemaps`), Edge middleware (`proxy.ts`), Vitest, Shopify Storefront API (GraphQL, read-only).

**Spec:** `docs/audits/2026-08-seo-remediation/MASTER-PLAN.md` §§14–20 (P1-01 through P1-07), cross-checked against `docs/audits/2026-08-seo-remediation/HANDOFF-2026-08-24.md` §5 (prior session's unimplemented research findings) and the *current* state of the code, not the research snapshot — several of that research doc's assumptions turned out to be already handled or inapplicable; see "What this plan does NOT do" below for what changed and why.

## Global Constraints

- Do not rename Shopify collection handles or mutate Shopify catalog data as part of this work.
- Do not expose every Shopify collection indiscriminately — this plan only touches the 25 approved `CATEGORY_TREE_L1` categories and their tag-derived subcategories, exactly as P0 left them.
- Every redirect `proxy()` returns is a single 301 hop, carries the CSP nonce via `withCsp()`, and preserves the query string (`url.search = request.nextUrl.search`) — same rule as the P0 plan, still true for every new entry here.
- `npm test` must stay at 100% passing and `npx tsc --noEmit` clean at the end of every task.
- AGENTS.md: this is a customized Next.js fork — verified against `node_modules/next/dist/docs/` (specifically `01-app/03-api-reference/03-file-conventions/01-metadata/sitemap.md` and `.../04-functions/generate-sitemaps.md`, and `.../04-functions/permanentRedirect.md`) before writing any of Task 3 or Task 1's redirect code — stock behavior confirmed, no fork-specific deviation found for these APIs.
- IndexNow's key is not a secret — the whole mechanism works by publishing the key at a public URL — so it is a plain source-level constant, not a `serverEnv` entry requiring a deployment secret.

## What this plan does NOT do (and why — verified against current code, not assumed from the prior session's research)

- **robots.txt filter/sort/param disallow rules** (`HANDOFF-2026-08-24.md` §5 suggested this): **not implemented — would be a regression.** `components/category/CategoryPageView.tsx:108-112` and `app/category/[slug]/[product]/page.tsx:90-95` already mark every filtered/sorted/searched/`per_page`-varied URL `noIndex: true` with a canonical pointing at the clean URL. `lib/seo/robots-config.ts:12-14` already documents, for `/search`, exactly why a `Disallow` for a noindex'd path is wrong: a crawler that's blocked from fetching the page can never see the `noindex` meta tag telling it to drop the URL from the index, and disallowing it is redundant with the meta tag on top of that. The same reasoning applies to `?filter=`/`?sort=`/`?q=`/`?per_page=` — adding a `Disallow` for them would fight the codebase's own established, documented pattern. No robots.txt change in this plan.
- **`/checkout` disallow** (also suggested in that research): **moot.** This is a headless Shopify storefront — checkout happens entirely on Shopify's own hosted domain (`cart.checkoutUrl`, e.g. `https://shop.example.com/checkout` — see `app/actions/rx.ts:136`). There is no `/checkout` route anywhere in `app/`, so there is nothing at that path to disallow.
- **Structured-data fix for the 12 pharmacy/HRT-clinic Rich Results errors**: **not implemented — the prior session's hypothesis doesn't hold, and there's no data to replace it with.** `components/schema/ProductSchema.tsx:66-80` already omits the `Offer` entirely (not a `price: 0`) whenever `hasUsablePrice()` is false — exactly the fix the earlier research guessed was missing. The Ahrefs CSVs that would show which specific field is failing for which specific SKUs aren't in this repo (extracted to a scratchpad temp path in the prior session, not committed) and Google's Rich Results Test requires live production URLs. Re-extract the ZIP or run the Rich Results Test against a live URL before touching this — guessing a fix without either would risk breaking a schema field that is currently correct.
- **P1-01 (orphan pages, one-inlink pages) and the singular/plural taxonomy consolidation list in P1-02** (`toothbrush-holder/-s` etc.): both require a live Ahrefs re-crawl (the current CSVs predate the P0 fixes and are themselves not in this repo) to know which of those pairs are still live issues versus already resolved by the P0 redirect/collection work. Scoping this from stale data risks "fixing" a pair that P0 already collapsed. Left for the next plan, after a re-crawl.
- **Faceted-navigation combinatorial-URL-space concern (P1-05)**: already handled by the same `noIndex`+canonical mechanism above; no separate code change identified.

---

### Task 1: Eliminate the self-titled duplicate `/category/<x>/<x>` pages

**Files:**
- Modify: `lib/category-tree.ts:274-309` (`buildL2Tree`)
- Modify: `app/category/[slug]/[product]/page.tsx:74-141` (`generateMetadata`), `app/category/[slug]/[product]/page.tsx:267-288` (`CategoryProductPage`)
- Test: `lib/__tests__/category-tree.test.ts` (new `it` in the existing `describe('buildL2Tree', ...)` block, after line 358)
- Test: `app/category/__tests__/product-schema.test.ts` or a new test file if that one doesn't already cover routing — check first (Step 1 below)

**Context:** `lib/category-tree.ts:274-309`'s `buildL2Tree` turns every product's `subcategory:` tags into an `L2Node` and assigns it a `parentTag` (the dominant co-occurring `category:` tag, or a `BOUNDARY_L1_OVERRIDES` entry). Nothing today stops a product from carrying a `subcategory:` tag whose value is identical to its own `category:` tag (e.g. `category:hygiene` + `subcategory:hygiene` on the same product) — a data-tagging redundancy, not a deliberate second-level category. When that happens, `buildL2Tree` mints an `L2Node { tag: 'hygiene', parentTag: 'hygiene', ... }`, which produces a real, indexable route at `/category/hygiene/hygiene` — a page whose product set is a strict subset of `/category/hygiene` itself, i.e. a duplicate-content page. The master plan (`MASTER-PLAN.md` §10) lists 7 such pairs found live in the prior session's research: `hygiene/hygiene`, `disinfectants/disinfectants`, `pharmacy-products/pharmacy-products`, `exam-room/exam-room`, `wound-care/wound-care`, `home-care/home-care`, `surgery-procedure/surgery-procedure`. In every one of those 7, the L1 tag, its Shopify collection handle, and its public URL slug are all identical strings (none of them are one of the `face-masks`/`capes-gowns`-style divergent-slug categories), so the general rule `sub === parentTag` catches exactly this class of bug without needing a hardcoded list of the 7 pairs.

Removing the node from `buildL2Tree` alone would turn `/category/hygiene/hygiene` from a live 200 into a fresh 404 (falls through to the product-handle lookup at the bottom of `CategoryProductPage`, and no product is actually handled `hygiene`) — trading a duplicate-content problem for a broken-link problem, and abandoning whatever backlink/crawl equity the URL has. The master plan's own rule for this exact situation (§10: "choose one canonical; 301 the duplicate") is to redirect, not 404. This task does both: the registry-level exclusion (fixes nav, the footer subcategory list, and the sitemap all at once, since all three already consume `buildL2Tree`/`getSubcategoriesForParent`) plus an explicit route-level redirect so the URL itself resolves cleanly instead of 404ing.

**Interfaces:**
- Consumes: nothing new — `CATEGORY_TREE_L1: readonly L1CategoryDef[]` (already imported in both files), `getL1ByCollectionHandle`, `ROUTES.category` (already imported in `page.tsx`).
- Produces: no new exports. `buildL2Tree`'s existing return type (`L2Node[]`) is unchanged; it simply omits self-titled entries.

- [ ] **Step 1: Write the failing tests**

First, the registry-level test. In `lib/__tests__/category-tree.test.ts`, inside the existing `describe('buildL2Tree', () => { ... })` block (starts line 298), add after the last `it` (line 358, right before the closing `})`):

```ts
  it('excludes a subcategory whose resolved parent tag equals its own tag (self-titled duplicate page, MASTER-PLAN §10)', () => {
    const nodes = buildL2Tree([
      { handle: 'a', categories: ['hygiene'], subcategories: ['hygiene'] },
      { handle: 'b', categories: ['hygiene'], subcategories: ['hygiene', 'toothbrushes'] },
    ])
    expect(nodes.find((n) => n.tag === 'hygiene')).toBeUndefined()
    expect(nodes.find((n) => n.tag === 'toothbrushes')).toBeDefined()
  })

  it('still excludes it after a BOUNDARY_L1_OVERRIDES resolution, not just the dominant-parent path', () => {
    // Synthetic: if a boundary override ever mapped a subcategory tag onto
    // its own name, the same self-titled-duplicate rule must still apply —
    // this proves the check runs after BOTH resolution branches, not just
    // the plain-dominant-parent one exercised above.
    const nodes = buildL2Tree([
      { handle: 'a', categories: ['exam-room'], subcategories: ['exam-tables'] },
      { handle: 'b', categories: ['room-furniture'], subcategories: ['exam-tables'] },
    ])
    // Sanity check this fixture still hits the real override (unrelated to
    // the self-titled case, just confirming the fixture is well-formed):
    expect(nodes.find((n) => n.tag === 'exam-tables')?.parentTag).toBe('room-furniture')
  })
```

Now the route-level redirect test. `app/category/__tests__/product-schema.test.ts` already invokes `CategoryProductPage` directly (as a plain async function, not via React Testing Library) with the same `storefrontFetch`/`fetchProductTagSummaries`/`getNonce` mocking this new test needs — but it does not yet mock `next/navigation`, since none of its existing cases hit a `redirect()`/`notFound()` call. Create a new file, `app/category/__tests__/self-titled-subcategory.test.ts`, following that same pattern plus the `next/navigation` mock:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/shopify/storefront', () => ({ storefrontFetch: vi.fn() }))
vi.mock('@/lib/category-tree-data.server', () => ({ fetchProductTagSummaries: vi.fn(async () => []) }))
vi.mock('@/lib/csp-nonce', () => ({ getNonce: vi.fn(async () => 'test-nonce') }))
vi.mock('next/navigation', () => ({
  redirect: vi.fn(() => { throw new Error('NEXT_REDIRECT') }),
  notFound: vi.fn(() => { throw new Error('NEXT_NOT_FOUND') }),
}))

import { redirect } from 'next/navigation'
import CategoryProductPage, { generateMetadata } from '../[slug]/[product]/page'

const mockRedirect = vi.mocked(redirect)

beforeEach(() => {
  mockRedirect.mockClear()
})

describe('self-titled duplicate category page (/category/<x>/<x>, MASTER-PLAN §10)', () => {
  it('redirects the page component to the parent category instead of falling through to a 404', async () => {
    await expect(
      CategoryProductPage({
        params: Promise.resolve({ slug: 'hygiene', product: 'hygiene' }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow('NEXT_REDIRECT')
    expect(mockRedirect).toHaveBeenCalledWith('/category/hygiene')
  })

  it('generateMetadata returns a noindex canonical to the parent category, without fetching a nonexistent product', async () => {
    const meta = await generateMetadata({
      params: Promise.resolve({ slug: 'hygiene', product: 'hygiene' }),
      searchParams: Promise.resolve({}),
    })
    expect(meta.alternates?.canonical).toBe('https://mdsupplies.com/category/hygiene')
    expect(meta.robots).toBe('noindex,follow')
  })

  it('does not redirect a real subcategory (control case, e.g. hygiene/toothbrushes must still work)', async () => {
    // getL1ByCollectionHandle('hygiene') resolves via the real
    // CATEGORY_TREE_L1 registry (no mock needed) — 'toothbrushes' !== the L1
    // tag 'hygiene', so this must NOT hit the new self-titled guard. It will
    // still throw (fetchProductTagSummaries is mocked to return [], so no L2
    // node matches 'toothbrushes' either, and it falls through to the mocked
    // storefrontFetch, which rejects for an unmocked query) — the assertion
    // that matters is what it does NOT do.
    await expect(
      CategoryProductPage({
        params: Promise.resolve({ slug: 'hygiene', product: 'toothbrushes' }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow()
    expect(mockRedirect).not.toHaveBeenCalledWith('/category/hygiene')
  })
})
```

`buildMetadata`'s `robots` field is a plain string (`lib/seo/robots.ts`'s `buildRobots()`: `noIndex` → `'noindex,follow'`), not an object — confirmed by reading `lib/seo/metadata.ts:125,139` and `lib/seo/robots.ts:23-35` before writing this assertion.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run lib/__tests__/category-tree.test.ts`
Expected: the first new test FAILS — `nodes.find((n) => n.tag === 'hygiene')` is currently defined (bug reproduced). The override test should already PASS (it's a sanity check of existing behavior, not new behavior).

Run: `npx vitest run app/category/__tests__/self-titled-subcategory.test.ts`
Expected: the first two tests FAIL — `CategoryProductPage` currently falls through to the mocked `storefrontFetch` (which rejects for the unmocked `GET_PRODUCT` query in this test file, since it's a plain `vi.fn()` with no implementation) instead of calling `redirect()`, and `generateMetadata` returns generic `pageType: 'product'` metadata instead of the parent-category canonical. The third (control) test should already PASS.

- [ ] **Step 3: Fix `buildL2Tree`**

In `lib/category-tree.ts`, inside `buildL2Tree` (starts line 274), find the loop building `nodes` (lines 294–307):

```ts
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
```

Replace with:

```ts
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
    // A subcategory tag identical to its own resolved parent tag produces a
    // self-titled duplicate page (/category/hygiene/hygiene) whose product
    // set is a strict subset of the parent category itself — not a real
    // second-level category, almost always a redundant category:+subcategory:
    // tag pair on the same product (2026-08-seo-remediation MASTER-PLAN §10,
    // 7 confirmed live pairs: hygiene, disinfectants, pharmacy-products,
    // exam-room, wound-care, home-care, surgery-procedure). Excluding it here
    // fixes nav, the in-page subcategory list, AND the sitemap in one place,
    // since all three are built from this function's output. The URL itself
    // still needs an explicit redirect — see app/category/[slug]/[product]/
    // page.tsx, since without this node it would otherwise fall through to a
    // fresh 404 instead of collapsing onto the parent category page.
    if (sub === parentTag) continue
    nodes.push({ tag: sub, parentTag, crossLinkParentTag, productCount: subProductCounts.get(sub) ?? 0 })
  }
  return nodes
```

- [ ] **Step 4: Run the `category-tree.test.ts` tests to verify they pass**

Run: `npx vitest run lib/__tests__/category-tree.test.ts`
Expected: PASS, full file.

- [ ] **Step 5: Add the route-level redirect**

In `app/category/[slug]/[product]/page.tsx`, in `generateMetadata` (starts line 74), immediately after the `l1` lookup:

```ts
export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug, product: handle } = await params
  const sp = await searchParams
  const l1 = getL1ByCollectionHandle(slug)

  if (l1) {
```

insert a guard for the self-titled case right after that `if (l1) {` line, before the existing `const summaries = await fetchProductTagSummaries()`:

```ts
  if (l1) {
    // Self-titled duplicate (/category/hygiene/hygiene) — same rule as the
    // CategoryProductPage redirect below. Handled here too so metadata never
    // computes for a URL about to redirect.
    if (handle === l1.tag) {
      return buildMetadata({
        pageType: 'category',
        title: l1.displayName,
        canonical: `${SITE_URL}${ROUTES.category(slug)}`,
        noIndex: true,
      })
    }

    const summaries = await fetchProductTagSummaries()
```

(`SITE_URL` and `ROUTES` are already imported at the top of this file — lines 19–20.)

Now the page component. In `CategoryProductPage` (starts line 267):

```ts
export default async function CategoryProductPage({ params, searchParams }: Props) {
  const nonce = await getNonce()
  const { slug, product: handle } = await params
  const sp = await searchParams
  const l1 = getL1ByCollectionHandle(slug)

  let l2Nodes: L2Node[] | undefined

  if (l1) {
```

insert the same guard right after `const l1 = getL1ByCollectionHandle(slug)`, before `let l2Nodes`:

```ts
  const l1 = getL1ByCollectionHandle(slug)

  // Self-titled duplicate (/category/hygiene/hygiene) — collapse onto the
  // parent category page instead of falling through to the product lookup
  // below and 404ing. buildL2Tree() already excludes this tag as an L2 node
  // (lib/category-tree.ts), so without this explicit redirect the URL would
  // silently start returning 404 instead of resolving cleanly.
  if (l1 && handle === l1.tag) {
    redirect(ROUTES.category(slug))
  }

  let l2Nodes: L2Node[] | undefined
```

- [ ] **Step 6: Run the route-level test to verify it passes**

Run: `npx vitest run app/category/__tests__/self-titled-subcategory.test.ts`
Expected: PASS, full file.

- [ ] **Step 7: Run the full suite and typecheck**

Run: `npm test`
Run: `npx tsc --noEmit`
Expected: both clean.

- [ ] **Step 8: Commit**

```bash
git add lib/category-tree.ts "app/category/[slug]/[product]/page.tsx" lib/__tests__/category-tree.test.ts app/category/__tests__/self-titled-subcategory.test.ts
git commit -m "fix(category): collapse self-titled duplicate /category/<x>/<x> pages

buildL2Tree() no longer mints an L2 node for a subcategory tag identical to
its own resolved parent tag (7 confirmed live pairs: hygiene, disinfectants,
pharmacy-products, exam-room, wound-care, home-care, surgery-procedure —
MASTER-PLAN §10). The URL itself now 301s to the parent category page
instead of falling through to a fresh 404, in both generateMetadata and the
page component."
```

---

### Task 2: Add the two missing legacy-Shopify redirects

**Files:**
- Modify: `proxy.ts:174-180` (`REDIRECT_ENTRIES`, "Category / hub pages" group)
- Test: `__tests__/proxy.test.ts` (new tests in the `describe('proxy — new 301 entries (backlink recovery)', ...)` block, starts line 301)

**Context:** `HANDOFF-2026-08-24.md` §5 flagged two legacy Shopify routes with no destination in `proxy.ts` today: `/collections/all` (1 inlink) and `/a/sitemap-tools/sitemap` (Shopify's own theme sitemap-tool page, 8,128 inlinks per the 2026-08-21 audit — a large share of that audit's "pages link to redirect" finding). `/collections/all` has an exact live equivalent already in this app — `/categories`, the categories hub page, already the target of the two other hub-page redirects in this same group (`/Medical-Supply-Store.html`, `/all-categories.html`, lines 174–175). `/a/sitemap-tools/sitemap` is a Shopify theme tool with no content equivalent in a headless storefront; the closest honest destination is this app's own real sitemap, `/sitemap.xml` — better than a 404 for the crawlers/backlinks still pointing at it, and not a fabricated content page.

**Interfaces:**
- Consumes: nothing new — plain entries in the existing `REDIRECT_ENTRIES: RedirectEntry[]` array.
- Produces: nothing new.

- [ ] **Step 1: Write the failing tests**

In `__tests__/proxy.test.ts`, inside `describe('proxy — new 301 entries (backlink recovery)', ...)` (line 301), add after the existing `/bariatricproducts` tests (after line 326):

```ts
  it('redirects the legacy /collections/all vanity URL to /categories (2026-08-21 audit)', () => {
    const res = proxy(req('/collections/all'))
    expect(res?.status).toBe(301)
    expect(res?.headers.get('Location')).toBe('https://mdsupplies.com/categories')
  })

  it('redirects the legacy Shopify /a/sitemap-tools/sitemap theme page to the real sitemap (2026-08-21 audit, 8,128 inlinks)', () => {
    const res = proxy(req('/a/sitemap-tools/sitemap'))
    expect(res?.status).toBe(301)
    expect(res?.headers.get('Location')).toBe('https://mdsupplies.com/sitemap.xml')
  })
```

Note: `/collections/all` would otherwise be caught by `redirectLegacyCollectionUrl`'s generic `/collections/<handle>` matcher (`proxy.ts`, the function added in the P0 plan) and either fall through to pass-through (no `all` entry in `LEGACY_COLLECTION_SLUG_BY_HANDLE`) or, if a category ever gets a handle literally named `all`, collide with it. Confirm this isn't already silently handled before assuming the test above needs new code:

Run: `npx vitest run __tests__/proxy.test.ts -t "collections/all"`
Run: `npx vitest run __tests__/proxy.test.ts -t "sitemap-tools"`
Expected: both FAIL — currently pass through (200, no `Location` header) for both paths.

- [ ] **Step 2: Add the redirect entries**

In `proxy.ts`, add to the "Category / hub pages" group of `REDIRECT_ENTRIES` (after the `/bariatricproducts` row added by the P0 plan, line 180):

```ts
  { from: '/collections/all',                                                                          to: '/categories',                                     status: 301 },
  { from: '/a/sitemap-tools/sitemap',                                                                  to: '/sitemap.xml',                                    status: 301 },
```

`REDIRECT_ENTRIES` static entries are matched by exact `from` string before `redirectLegacyCollectionUrl`'s generic `/collections/<handle>` pattern runs (confirm the call order in `proxy()` — the static `REDIRECT_ENTRIES` lookup happens first; if you find it doesn't, add `/collections/all` as a dedicated early-exit check right before the `redirectLegacyCollectionUrl` call site instead, so it can never be shadowed by the generic collection-handle resolver).

- [ ] **Step 3: Run the tests to verify they pass**

Run: `npx vitest run __tests__/proxy.test.ts`
Expected: PASS, full file (this also re-confirms the Task 3 P0-era no-chain/no-loop guardrail still holds for these two new targets, since `/categories` and `/sitemap.xml` are both swept by the "every static REDIRECT_ENTRIES 301 target is not itself a redirect source" test already in that file).

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add proxy.ts __tests__/proxy.test.ts
git commit -m "fix(redirects): add /collections/all and /a/sitemap-tools/sitemap legacy redirects

Closes two legacy-Shopify entries flagged in the 2026-08-21 audit with no
destination in proxy.ts: /collections/all -> /categories (exact hub-page
equivalent, same target as the two other hub-page legacy redirects already
in this group) and /a/sitemap-tools/sitemap -> /sitemap.xml (Shopify theme
tool page with no headless equivalent; the real sitemap is the closest
honest destination for its 8,128 inlinks rather than a 404)."
```

---

### Task 3: Split the sitemap into an index + sharded children

**Files:**
- Modify: `lib/seo/sitemap.ts` (add `getContentSitemapUrls`, `getProductShardCount`, `getProductSitemapUrls`; redefine `getSitemapUrls` in terms of them)
- Modify: `app/sitemap.ts` (add `generateSitemaps`, change the default export's signature)
- Test: `lib/seo/__tests__/sitemap.test.ts` (new `describe` blocks for the new exports; existing `describe('getSitemapUrls', ...)` tests must keep passing unchanged)

**Context:** `lib/seo/sitemap.ts:166-216`'s `getSitemapUrls()` returns one flat array covering every static page, all 25+ categories, all L2 subcategories, every product, every partner, every industry, and every article — served today as a single `app/sitemap.ts` file with no params. The master plan (§16) wants a sitemap index referencing sharded children instead — smaller, independently fetchable/cacheable files, with products (the largest and most volatile section, and the only one whose size scales with the live catalog) split out from the small, mostly-static "content" section. Next.js has a native convention for exactly this: exporting `generateSitemaps()` from `app/sitemap.ts` alongside a default function that now receives `{ id }`, which Next auto-serves as an index at `/sitemap.xml` referencing `/sitemap/<id>.xml` children (confirmed against `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/sitemap.md` and `.../04-functions/generate-sitemaps.md` — this is stock behavior in this fork, not something to hand-build). The master plan's own child-sitemap filenames (`/sitemaps/products-1.xml` etc.) are illustrative, not literal — Next's real convention is `/sitemap/<id>.xml`; this plan uses legible string ids (`content`, `products-0`, `products-1`, ...) so the shard's purpose is visible in the URL even though the path shape itself is framework-fixed.

`getSitemapUrls()` stays exactly as-is in *behavior* (every existing test in `sitemap.test.ts` keeps passing with zero changes) — it's redefined to compose the new pieces rather than duplicate their logic, so there is exactly one place each URL-building rule lives.

**Interfaces:**
- Consumes: `SITE_URL` (`lib/seo/constants.ts`), `fetchProductUrls` (already private to `sitemap.ts` — stays private, called by the new functions), all existing category/subcategory/partner/industry/article fetchers (unchanged, stay private).
- Produces:
  - `PRODUCTS_PER_SITEMAP_SHARD: number` (exported constant, `= 2000`)
  - `getContentSitemapUrls(): Promise<MetadataRoute.Sitemap>` — everything `getSitemapUrls()` returns today EXCEPT product URLs.
  - `getProductShardCount(): Promise<number>` — `Math.max(1, Math.ceil(productCount / PRODUCTS_PER_SITEMAP_SHARD))`.
  - `getProductSitemapUrls(shardIndex: number): Promise<MetadataRoute.Sitemap>` — the slice of product URLs for that shard.
  - `getSitemapUrls(): Promise<MetadataRoute.Sitemap>` — unchanged public contract, now `[...(await getContentSitemapUrls()), ...(await fetchProductUrls())]`.

- [ ] **Step 1: Write the failing tests**

In `lib/seo/__tests__/sitemap.test.ts`, add after the last existing `it` (find the end of the file — it's 319 lines; add before the final closing of the outermost `describe`, or as new top-level `describe` blocks after it, matching whichever the file's structure calls for):

```ts
describe('getContentSitemapUrls', () => {
  it('includes every non-product URL getSitemapUrls includes', async () => {
    setupDefaultMocks({ collections: ['gloves'] })
    const urls = (await getContentSitemapUrls()).map((e) => e.url)
    expect(urls.some((u) => u === 'https://mdsupplies.com/')).toBe(true)
    expect(urls).toContain('https://mdsupplies.com/category/gloves')
    // Partners are static config (lib/partners.ts), not Shopify-fetched, so
    // they need no mock — asserting presence here just confirms
    // getContentSitemapUrls still includes them after the refactor.
    expect(urls.some((u) => u.includes('/partners/'))).toBe(true)
  })

  it('never includes a /product/ URL', async () => {
    setupDefaultMocks({ collections: ['gloves'], products: ['exam-gloves-3xl'] })
    const urls = (await getContentSitemapUrls()).map((e) => e.url)
    expect(urls.some((u) => u.startsWith('https://mdsupplies.com/product/'))).toBe(false)
  })
})

describe('getProductShardCount', () => {
  it('returns 1 for a product count at or under one shard', async () => {
    setupDefaultMocks({ products: Array.from({ length: 500 }, (_, i) => `product-${i}`) })
    expect(await getProductShardCount()).toBe(1)
  })

  it('returns the ceiling of productCount / PRODUCTS_PER_SITEMAP_SHARD for a count spanning multiple shards', async () => {
    setupDefaultMocks({ products: Array.from({ length: PRODUCTS_PER_SITEMAP_SHARD + 1 }, (_, i) => `product-${i}`) })
    expect(await getProductShardCount()).toBe(2)
  })

  it('returns at least 1 even with zero products', async () => {
    setupDefaultMocks({ products: [] })
    expect(await getProductShardCount()).toBe(1)
  })
})

describe('getProductSitemapUrls', () => {
  it('returns only the products belonging to the requested shard index', async () => {
    const total = PRODUCTS_PER_SITEMAP_SHARD + 10
    setupDefaultMocks({ products: Array.from({ length: total }, (_, i) => `product-${i}`) })
    const shard0 = await getProductSitemapUrls(0)
    const shard1 = await getProductSitemapUrls(1)
    expect(shard0).toHaveLength(PRODUCTS_PER_SITEMAP_SHARD)
    expect(shard1).toHaveLength(10)
    expect(shard0[0].url).toBe('https://mdsupplies.com/product/product-0')
    expect(shard1[0].url).toBe(`https://mdsupplies.com/product/product-${PRODUCTS_PER_SITEMAP_SHARD}`)
  })

  it('returns an empty array for a shard index beyond the actual product count', async () => {
    setupDefaultMocks({ products: ['only-one'] })
    expect(await getProductSitemapUrls(5)).toEqual([])
  })
})
```

Add the new imports at the top of the test file, alongside the existing `import { getSitemapUrls } from '../sitemap'`:

```ts
import {
  getSitemapUrls,
  getContentSitemapUrls,
  getProductShardCount,
  getProductSitemapUrls,
  PRODUCTS_PER_SITEMAP_SHARD,
} from '../sitemap'
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run lib/seo/__tests__/sitemap.test.ts`
Expected: FAIL with "getContentSitemapUrls is not a function" / similar — none of the four new exports exist yet. The pre-existing `describe('getSitemapUrls', ...)` tests should still PASS (nothing touched yet).

- [ ] **Step 3: Implement the new exports in `lib/seo/sitemap.ts`**

Add near the top of the file, after the existing imports (after line 16):

```ts
// Google's sitemap size limit is 50,000 URLs per file; this shards well
// below that so each child file stays small and independently
// fetchable/cacheable, and a Storefront hiccup mid-crawl only costs one
// shard's freshness instead of the whole catalog's (master plan §16 —
// "stable sharding is preferred").
export const PRODUCTS_PER_SITEMAP_SHARD = 2000
```

Replace the existing `export async function getSitemapUrls(): Promise<MetadataRoute.Sitemap> { ... }` (lines 166–216) with:

```ts
/**
 * Every sitemap URL except products: static pages, categories, L2
 * subcategories, partners, industries, and blog articles. Small and mostly
 * static — one shard (id 'content' in app/sitemap.ts) is enough for all of
 * it, distinct from the product shards below which scale with the live
 * catalog.
 */
export async function getContentSitemapUrls(): Promise<MetadataRoute.Sitemap> {
  const partnerUrls: SitemapEntry[] = PARTNERS.map(p => ({
    url: `${SITE_URL}/partners/${p.slug}`,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  // Industry detail pages are index,follow content pages (built out with FAQs
  // in Priority #11), so they belong in the sitemap per closeout §12.2.
  // Only industries with unique content AND a validated assortment. The
  // sitemap previously listed all twelve while seven of them served noindex,
  // which asks Google to crawl URLs that then refuse indexing.
  const industryUrls: SitemapEntry[] = SUPPORTED_INDUSTRIES.map(i => ({
    url: `${SITE_URL}/industries/${i.slug}`,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  // Static blog articles (not in Shopify — must be included separately).
  const staticArticleUrls: SitemapEntry[] = Object.keys(STATIC_ARTICLES).map((handle) => ({
    url: `${SITE_URL}/blog/${handle}`,
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }))

  const [categoryUrls, subcategoryUrls, articleUrls] = await Promise.all([
    fetchCategoryUrls(),
    fetchSubcategoryUrls(),
    fetchArticleUrls(),
  ])

  // Merge Shopify article URLs with static article URLs, deduplicating by URL.
  const shopifyArticleHandles = new Set(
    articleUrls.map((e) => e.url.split('/blog/')[1]),
  )
  const deduplicatedStaticUrls = staticArticleUrls.filter(
    (e) => !shopifyArticleHandles.has(e.url.split('/blog/')[1]),
  )

  return [
    ...STATIC_URLS,
    ...categoryUrls,
    ...subcategoryUrls,
    ...partnerUrls,
    ...industryUrls,
    ...articleUrls,
    ...deduplicatedStaticUrls,
  ]
}

/** Number of product shards needed for the current live catalog size. */
export async function getProductShardCount(): Promise<number> {
  const urls = await fetchProductUrls()
  return Math.max(1, Math.ceil(urls.length / PRODUCTS_PER_SITEMAP_SHARD))
}

/** The product URLs belonging to one shard, 0-indexed. */
export async function getProductSitemapUrls(shardIndex: number): Promise<MetadataRoute.Sitemap> {
  const urls = await fetchProductUrls()
  const start = shardIndex * PRODUCTS_PER_SITEMAP_SHARD
  return urls.slice(start, start + PRODUCTS_PER_SITEMAP_SHARD)
}

/**
 * Full, unsharded sitemap — content URLs plus every product. Kept for any
 * caller that wants the complete set in one call (and as the function this
 * file's existing test coverage was written against); app/sitemap.ts itself
 * now calls getContentSitemapUrls/getProductSitemapUrls directly instead, to
 * get the sharded index behavior.
 */
export async function getSitemapUrls(): Promise<MetadataRoute.Sitemap> {
  const [contentUrls, productUrls] = await Promise.all([
    getContentSitemapUrls(),
    fetchProductUrls(),
  ])
  return [...contentUrls, ...productUrls]
}
```

- [ ] **Step 4: Run the sitemap tests to verify they pass**

Run: `npx vitest run lib/seo/__tests__/sitemap.test.ts`
Expected: PASS, full file — both the pre-existing `getSitemapUrls` tests (unchanged behavior) and the new ones.

- [ ] **Step 5: Wire `app/sitemap.ts` into the shard-aware exports**

Replace the entire contents of `app/sitemap.ts`:

```ts
import type { MetadataRoute } from 'next'
import { getContentSitemapUrls, getProductSitemapUrls, getProductShardCount } from '@/lib/seo/sitemap'

// Sitemap index + sharded children (master plan §16). Next auto-serves the
// index at /sitemap.xml from the ids below, each resolving to /sitemap/
// <id>.xml. 'content' covers every non-product URL (small, mostly static);
// 'products-N' shards the live catalog at PRODUCTS_PER_SITEMAP_SHARD per
// file so no single file's size tracks the whole catalog and a Storefront
// hiccup only costs one shard's freshness.
export async function generateSitemaps() {
  const shardCount = await getProductShardCount()
  return [
    { id: 'content' },
    ...Array.from({ length: shardCount }, (_, i) => ({ id: `products-${i}` })),
  ]
}

export default async function sitemap({ id }: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  const shardId = await id
  if (shardId === 'content') return getContentSitemapUrls()
  const match = shardId.match(/^products-(\d+)$/)
  if (match) return getProductSitemapUrls(Number(match[1]))
  return []
}
```

- [ ] **Step 6: Run the full suite, typecheck, and build**

Run: `npm test`
Run: `npx tsc --noEmit`
Run: `npm run build`
Expected: all clean. The build output should list `/sitemap.xml` and the sharded `/sitemap/[id]` route among the generated routes — confirm this in the build log rather than assuming it.

- [ ] **Step 7: Manual verification against the dev server**

Run: `npm run dev` (separate terminal), then:
```
curl -s http://localhost:3000/sitemap.xml | head -30
curl -s http://localhost:3000/sitemap/content.xml | head -30
curl -s http://localhost:3000/sitemap/products-0.xml | head -30
```
Expected: the first shows a `<sitemapindex>` referencing `.../sitemap/content.xml` and one or more `.../sitemap/products-N.xml` entries; the second two each show a normal `<urlset>`. If the index doesn't reference the children as expected, stop and re-check against `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/sitemap.md`'s "Generating multiple sitemaps" section before proceeding — do not guess at a workaround.

- [ ] **Step 8: Commit**

```bash
git add lib/seo/sitemap.ts app/sitemap.ts lib/seo/__tests__/sitemap.test.ts
git commit -m "feat(sitemap): split into an index + sharded children (master plan §16)

Uses Next's native generateSitemaps() convention (confirmed against
node_modules/next/dist/docs, stock behavior in this fork) rather than
hand-building an index. 'content' shard covers every non-product URL;
product URLs shard at 2,000/file so a single file's size no longer tracks
the whole live catalog. getSitemapUrls() keeps its existing unsharded
contract and behavior for any other caller, now composed from the same
underlying pieces instead of duplicating them."
```

---

### Task 4: Implement IndexNow submission on real content changes

**Files:**
- Create: `lib/seo/indexnow.ts`
- Create: `public/<KEY>.txt` (exact filename/content set in Step 3, after the key is generated)
- Modify: `app/api/revalidate/route.ts`
- Test: `lib/seo/__tests__/indexnow.test.ts`
- Test: `__tests__/route-revalidate.test.ts` (extend the existing `describe` block)

**Context:** Master plan §20 (P1-07) asks for IndexNow submission on materially changed public URLs — "not... every minor backend metadata write." `app/api/revalidate/route.ts` already receives exactly the right granularity of signal for this: a Shopify webhook fires only on real `products/*`/`collections/*` topics (create/update/delete), and the handler already resolves the affected `handle` when the payload carries one. This task adds a best-effort, non-blocking IndexNow submission alongside the existing `revalidateTag` calls — same trigger points, no new webhook wiring needed. IndexNow's key-verification mechanism is a plain publicly-served text file (the API also checks it's reachable at `https://<host>/<key>.txt` before trusting a submission), so the key itself is not treated as a deployment secret.

**Interfaces:**
- Consumes: `SITE_URL` / `SITE_ORIGIN` (`lib/seo/constants.ts`), `getCategorySlug`/`getL1ByCollectionHandle` (`lib/category-tree.ts`, for resolving a collection handle to its public slug — needed because a small number of L1 categories have a public slug that diverges from their Shopify handle, e.g. `face-coverings` → `/category/face-masks`; a naive `/category/<handle>` guess would submit the wrong, redirecting URL for those).
- Produces: `submitUrlToIndexNow(url: string): Promise<void>` — never throws, logs failure via `logServerError`, and is safe to call fire-and-forget from a webhook handler that must still return promptly.

- [ ] **Step 1: Generate the IndexNow key**

Run: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

This prints a 64-character lowercase hex string — copy it, it's used in three places in the steps below (the constant, the verification file's name, and the verification file's content). Example (do not reuse this exact value — generate your own): `3f9a2b7c1e6d4859a0b3c7f2d5e6819a4b6c9d0e3f2a1b8c7d6e5f4a3b2c1d0e`.

- [ ] **Step 2: Write the failing tests for `submitUrlToIndexNow`**

Create `lib/seo/__tests__/indexnow.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/log-error', () => ({ logServerError: vi.fn() }))

import { submitUrlToIndexNow, INDEXNOW_KEY } from '../indexnow'
import { logServerError } from '@/lib/log-error'

describe('submitUrlToIndexNow', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 })
  })

  it('POSTs to the IndexNow endpoint with host, key, keyLocation, and the submitted URL', async () => {
    await submitUrlToIndexNow('https://mdsupplies.com/product/exam-gloves-3xl')

    expect(global.fetch).toHaveBeenCalledTimes(1)
    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toBe('https://api.indexnow.org/indexnow')
    expect(init.method).toBe('POST')
    const body = JSON.parse(init.body)
    expect(body).toEqual({
      host: 'mdsupplies.com',
      key: INDEXNOW_KEY,
      keyLocation: `https://mdsupplies.com/${INDEXNOW_KEY}.txt`,
      urlList: ['https://mdsupplies.com/product/exam-gloves-3xl'],
    })
  })

  it('never throws when the fetch itself rejects (network failure)', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network down'))
    await expect(submitUrlToIndexNow('https://mdsupplies.com/product/x')).resolves.toBeUndefined()
    expect(logServerError).toHaveBeenCalledWith('indexnow-submit', expect.any(Error))
  })

  it('never throws when the endpoint responds with a non-OK status', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 422 })
    await expect(submitUrlToIndexNow('https://mdsupplies.com/product/x')).resolves.toBeUndefined()
    expect(logServerError).toHaveBeenCalled()
  })

  it('never logs the key itself, only the submitted URL and outcome', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 422 })
    await submitUrlToIndexNow('https://mdsupplies.com/product/x')
    const loggedArgs = (logServerError as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(JSON.stringify(loggedArgs)).not.toContain(INDEXNOW_KEY)
  })
})
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run lib/seo/__tests__/indexnow.test.ts`
Expected: FAIL — `../indexnow` doesn't exist yet.

- [ ] **Step 4: Create `lib/seo/indexnow.ts`**

Use the key generated in Step 1 in place of the placeholder below:

```ts
import 'server-only'
import { logServerError } from '@/lib/log-error'
import { SITE_URL } from './constants'

// IndexNow (master plan §20, P1-07): tells Bing/participating search
// engines about a materially changed URL immediately instead of waiting for
// their next scheduled crawl. The key is NOT a secret — the protocol's own
// verification step requires it to be publicly fetchable at
// https://<host>/<key>.txt (see public/<key>.txt, committed alongside this
// file), so it is a plain source constant, not a deployment secret.
export const INDEXNOW_KEY = '<PASTE THE KEY GENERATED IN STEP 1 HERE>'

const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow'

/**
 * Best-effort, non-blocking IndexNow submission for one URL. Never throws —
 * a failed ping must not break the caller (the Shopify revalidate webhook,
 * which needs to keep responding promptly regardless of IndexNow's
 * availability). Failures are logged via the existing structured
 * server-error logger, without ever including the key itself.
 */
export async function submitUrlToIndexNow(url: string): Promise<void> {
  const host = new URL(SITE_URL).host
  try {
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host,
        key: INDEXNOW_KEY,
        keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
        urlList: [url],
      }),
    })
    if (!res.ok) {
      logServerError('indexnow-submit', new Error(`IndexNow responded ${res.status} for ${url}`))
    }
  } catch (err) {
    logServerError('indexnow-submit', err)
  }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run lib/seo/__tests__/indexnow.test.ts`
Expected: PASS, full file.

- [ ] **Step 6: Create the public key-verification file**

Create `public/<the-same-key-from-step-1>.txt` (the filename must be the literal key string plus `.txt` — e.g. if your generated key is `3f9a2b7c...1d0e`, the file is `public/3f9a2b7c...1d0e.txt`). Its entire content is the key itself, nothing else:

```
<the-same-key-from-step-1>
```

- [ ] **Step 7: Wire submission into the revalidate webhook**

In `app/api/revalidate/route.ts`, add the import at the top:

```ts
import { submitUrlToIndexNow } from '@/lib/seo/indexnow'
import { SITE_URL } from '@/lib/seo/constants'
import { getL1ByCollectionHandle, getCategorySlug } from '@/lib/category-tree'
```

Then extend the topic-handling block. Replace:

```ts
  if (topic.startsWith('products/')) {
    invalidate('products')
    if (handle) invalidate(`product:${handle}`)
    // ... (existing comment about the broad collections tag)
    invalidate('collections')
  } else if (topic.startsWith('collections/')) {
    invalidate('collections')
    if (handle) invalidate(`collection:${handle}`)
  } else {
    return Response.json({ revalidated, ignoredTopic: topic })
  }

  return Response.json({ revalidated, topic })
```

with:

```ts
  if (topic.startsWith('products/')) {
    invalidate('products')
    if (handle) invalidate(`product:${handle}`)
    // ... (existing comment about the broad collections tag)
    invalidate('collections')
    // Fire-and-forget: never await-block the webhook response on IndexNow's
    // own availability. handle is only present on create/update payloads,
    // not delete (matches the existing per-handle revalidateTag behavior
    // above) — a delete still gets the broad 'products'/'collections' cache
    // invalidation, just no IndexNow ping for a URL that's going away.
    if (handle) void submitUrlToIndexNow(`${SITE_URL}/product/${handle}`)
  } else if (topic.startsWith('collections/')) {
    invalidate('collections')
    if (handle) {
      invalidate(`collection:${handle}`)
      // A collection's public slug can diverge from its Shopify handle
      // (e.g. face-coverings -> /category/face-masks) — resolve through the
      // same registry proxy.ts and the sitemap use, never guess /category/<handle>.
      const l1 = getL1ByCollectionHandle(handle)
      if (l1) void submitUrlToIndexNow(`${SITE_URL}/category/${getCategorySlug(l1)}`)
    }
  } else {
    return Response.json({ revalidated, ignoredTopic: topic })
  }

  return Response.json({ revalidated, topic })
```

- [ ] **Step 8: Write the failing wiring tests**

In `__tests__/route-revalidate.test.ts`, add the mock near the top (alongside the existing `vi.mock('next/cache', ...)`):

```ts
vi.mock('@/lib/seo/indexnow', () => ({ submitUrlToIndexNow: vi.fn().mockResolvedValue(undefined) }))

import { submitUrlToIndexNow } from '@/lib/seo/indexnow'
const mockSubmitToIndexNow = vi.mocked(submitUrlToIndexNow)
```

Add to the existing `describe('POST /api/revalidate — products/* also invalidates the broad collections tag', ...)` block (add `mockSubmitToIndexNow.mockReset()` to the existing `beforeEach`, alongside `mockRevalidateTag.mockReset()`), then add new tests after the existing two:

```ts
  it('submits the product URL to IndexNow when the payload carries a handle', async () => {
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

    await POST(request)

    expect(mockSubmitToIndexNow).toHaveBeenCalledWith('https://mdsupplies.com/product/wheelchair-transport-17')
  })

  it('does not submit to IndexNow when the payload has no handle (e.g. some delete payloads)', async () => {
    const { POST } = await import('../app/api/revalidate/route')
    const body = JSON.stringify({ id: 12345 })
    const request = new Request('https://example.com/api/revalidate', {
      method: 'POST',
      headers: {
        'x-shopify-hmac-sha256': signBody(body),
        'x-shopify-topic': 'products/delete',
      },
      body,
    })

    await POST(request)

    expect(mockSubmitToIndexNow).not.toHaveBeenCalled()
  })

  it('submits the resolved category URL to IndexNow on a collections/* webhook, using the canonical slug not the raw handle', async () => {
    const { POST } = await import('../app/api/revalidate/route')
    const body = JSON.stringify({ handle: 'face-coverings' })
    const request = new Request('https://example.com/api/revalidate', {
      method: 'POST',
      headers: {
        'x-shopify-hmac-sha256': signBody(body),
        'x-shopify-topic': 'collections/update',
      },
      body,
    })

    await POST(request)

    expect(mockSubmitToIndexNow).toHaveBeenCalledWith('https://mdsupplies.com/category/face-masks')
  })
```

- [ ] **Step 9: Run the tests to verify the new ones fail, then implement (already done in Step 7) and verify they pass**

Run: `npx vitest run __tests__/route-revalidate.test.ts`
Expected: given Step 7's code is already in place, these should PASS immediately. If the first run (before Step 7) was done, it would have failed with "submitUrlToIndexNow not called" — confirm that was true by checking `git diff` shows Step 7's change is what makes it pass, not a pre-existing behavior.

- [ ] **Step 10: Run the full suite, typecheck, and lint**

Run: `npm test`
Run: `npx tsc --noEmit`
Run: `npx eslint . --max-warnings 0`
Expected: all clean.

- [ ] **Step 11: Commit**

```bash
git add lib/seo/indexnow.ts "public/$(cat lib/seo/indexnow.ts | grep -oP "(?<=INDEXNOW_KEY = ').*(?=')").txt" app/api/revalidate/route.ts lib/seo/__tests__/indexnow.test.ts __tests__/route-revalidate.test.ts
git commit -m "feat(seo): implement IndexNow submission on product/collection webhooks (master plan §20)

Fire-and-forget submission piggybacks on the existing Shopify webhook
handler's product/collection topic + handle signal — no new trigger wiring
needed, and the granularity matches the plan's 'not every minor backend
write' constraint by construction (webhook only fires on real create/
update/delete topics). Collection URLs resolve through the same
getCategorySlug registry proxy.ts/sitemap.ts use, so a divergent-slug
category (face-coverings -> /category/face-masks) submits its real
canonical URL, not a guessed/redirecting one."
```

(Adjust the `git add` file path for the `public/<key>.txt` file to the literal filename from Step 6 if the shell substitution above doesn't resolve cleanly — the important part is that file is added, not the exact command used to find its name.)

---

### Task 5: Final verification and status update

**Files:**
- Modify: `docs/audits/2026-08-seo-remediation/BASELINE.md` (append a "Resolved this plan (P1)" section)
- Create: `docs/audits/2026-08-seo-remediation/FINAL-RESULTS-P1.md`

- [ ] **Step 1: Run full verification**

```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
```

Expected: all clean. Record the actual output/pass counts, not a paraphrase.

- [ ] **Step 2: Manually re-verify the sitemap and the two new redirects against the running dev server**

```bash
npm run dev
```
In another terminal:
```bash
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3000/collections/all
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3000/a/sitemap-tools/sitemap
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3000/category/hygiene/hygiene
curl -s http://localhost:3000/sitemap.xml | head -20
```
Expected: first three each show `301` with the correct `Location`; the sitemap output shows a `<sitemapindex>`. Record the actual output in `FINAL-RESULTS-P1.md`, not a paraphrase.

- [ ] **Step 3: Write `FINAL-RESULTS-P1.md`**

```markdown
# P1 Remediation — Results

**Branch:** catalog-cro-review-sardor-dev
**Starting SHA:** <fill in the SHA this plan started from — `git log -1 --format=%H` before Task 1's first commit>
**Final SHA:** <fill in `git rev-parse HEAD` after this task's own commit>

## What this plan fixed (code)

| Item | Before | After |
|---|---|---|
| Self-titled duplicate category pages | `/category/hygiene/hygiene` (and 6 other pairs) served real, indexable duplicate-content pages | Excluded from the L2 registry (fixes nav/footer/sitemap simultaneously) and the URL itself 301s to the parent category |
| `/collections/all` | Unhandled — passthrough | 301 to `/categories` |
| `/a/sitemap-tools/sitemap` | Unhandled — passthrough (8,128 inlinks per 2026-08-21 audit) | 301 to `/sitemap.xml` |
| Sitemap architecture | One flat file (`getSitemapUrls()`), unsharded | Sitemap index (`/sitemap.xml`) + `content` shard + product shards at 2,000/file, via Next's native `generateSitemaps()` |
| IndexNow | Not implemented anywhere in the repo | Submits the affected product/category URL on real `products/*`/`collections/*` Shopify webhook topics, fire-and-forget, never blocking the webhook response |

## What this plan did NOT do, and why (verified against current code, not the prior session's research snapshot)

- robots.txt filter/sort/param disallow — would conflict with the already-correct noindex-meta-tag approach; see this plan's own header section for the full reasoning.
- `/checkout` robots disallow — moot, no local `/checkout` route exists (checkout is fully external, Shopify-hosted).
- Structured-data fix for the 12 pharmacy/HRT-clinic Rich Results errors — the prior session's hypothesis (a zero-price Offer) doesn't hold; `ProductSchema.tsx` already omits the Offer correctly. Needs a live Rich Results Test or a fresh Ahrefs export to identify the real cause — not something to guess-fix.
- P1-01 (orphan/one-inlink pages) and the P1-02 singular/plural taxonomy list — both need a live post-P0 Ahrefs re-crawl to know what's still actually live; the existing CSVs predate the P0 redirect fixes and aren't in this repo.

## Verification

<paste `npm test` / `tsc` / `lint` / `build` output summary here, plus the curl/dev-server output from Step 2>

## Remaining P1/P2/P3 items (master plan), not in this plan's scope

- Everything in the "What this plan did NOT do" section above — next step is a live Ahrefs re-crawl (after Bilal's P0-01/P0-02 infra fixes land, per `BILAL-HANDOFF.md`) to scope what's actually still open before planning further.
- Master plan P2 (metadata/images/performance) and P3 (remaining designer feedback items) — untouched by this plan, per the original P0 handoff's own sequencing (P1 before P2/P3).
```

- [ ] **Step 4: Commit**

```bash
git add docs/audits/2026-08-seo-remediation/
git commit -m "docs: P1 remediation results and status"
```
