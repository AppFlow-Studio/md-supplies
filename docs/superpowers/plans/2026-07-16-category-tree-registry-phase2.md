# Category Tree Registry — Phase 2 (L2 Subcategory Pages, Boundary Cross-Links, Breadcrumbs) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-point L2 subcategory pages and product breadcrumbs at the tag-derived registry built in Phase 1 (`lib/category-tree.ts`), replacing the legacy `{parent}-{sub}` Shopify-collection-handle convention — giving every boundary subcategory exactly one canonical URL with a cross-link from the other parent, and making every product's breadcrumb follow its own `category:`/`subcategory:` tags instead of raw collection membership.

**Architecture:** Phase 1 already built `buildL2Tree()` (subcategory → canonical/cross-link parent, pure and tested) but nothing consumes it yet. This phase adds a handful of pure registry helpers (Task 1), a data-source abstraction that lets the existing, heavily-tested `CategoryResults` pagination/filter/sort component pull products from either a Shopify collection (unchanged L1 behavior) or a raw tag query (new L2 behavior) (Tasks 2–3), then rewires the existing `/category/[slug]/[product]` route's subcategory branch onto the registry with a redirect for the non-canonical boundary URL (Task 5), and finally re-sources product breadcrumbs from each product's own tags instead of `collections.nodes` (Task 6). L1 page URLs and Shopify collection handles are untouched — subcategory URLs still nest under the existing `/category/<collectionHandle>/<subTag>` shape, only the L2 identifier changes from a collection handle to a tag.

**Tech Stack:** Next.js App Router (server components), Shopify Storefront API (GraphQL, root `products(query:...)` connection), Vitest.

## Global Constraints

- **Never match on collection title or ID** — only tag value / product handle / the `CATEGORY_TREE_L1.collectionHandle` field (already an approved, explicit mapping, not a title lookup).
- **L1 URLs are unchanged.** `/category/<collectionHandle>` keeps using the Shopify collection exactly as before Phase 1/2 (`CategoryPageView`/`GET_COLLECTION_HERO`). This phase only changes what a subcategory URL's second segment (`/category/<collectionHandle>/<subTag>`) is keyed on and how its products are fetched.
- **Subcategory URL shape:** `/category/<L1.collectionHandle>/<L2.tag>` (unchanged route shape, `lib/routes.ts`'s existing `ROUTES.subcategory(cat, sub)`). The first segment stays a Shopify collection handle (for L1 URL stability); the second segment is now the L2 tag value itself, not a collection handle.
- **Boundary subcategory URL strategy (3 subcategories: `barrier-sleeves`, `vital-sign-monitors`, `exam-tables`):** exactly one canonical URL — `/category/<canonicalL1.collectionHandle>/<subTag>`. Requesting `/category/<crossLinkL1.collectionHandle>/<subTag>` issues a 301 redirect to the canonical URL. The canonical page renders a small cross-link callout pointing at the cross-link parent's L1 page.
- **Breadcrumbs are product-tag-derived, never from the cross-linked branch:** a product's breadcrumb always uses its own `resolveCanonicalCategory` result and the subcategory node whose `parentTag` (never `crossLinkParentTag`) matches that category — regardless of which URL the visitor arrived from.
- **CollectionPage + ItemList schema on L2 pages,** matching what L1 pages already emit (`buildCollectionPageSchema`, `buildCollectionItemListSchema` from `lib/schema`).
- **Full pagination/sort/filter parity with L1** (per project decision): L2 pages get the same `CategoryResults`/`CategoryPagination`/`CategoryFilters`/`CategorySort` experience as L1, not a stripped-down listing. Facet gating (`lib/filter-registry.ts`) is keyed by the L1 tag (e.g. `needles-syringes`, `mobility`) for L2 pages — no changes to `lib/filter-registry.ts` itself in this phase (that registry is already keyed by strings that coincide with `CATEGORY_TREE_L1` tags for the 3 categories with facet rules today).
- **No sitemap, nav, or facet-allowlist-content changes in this phase** (Phase 3 scope, unchanged from the Phase 1 plan's deferral list).
- **No trocar standalone-collection unpublish/merge** (Phase 3 scope).

---

## Task 1: Registry helpers for Phase 2 consumers

**Files:**
- Modify: `lib/category-tree.ts`
- Test: `lib/__tests__/category-tree.test.ts`

**Interfaces:**
- Consumes: `CATEGORY_TREE_L1`, `L1CategoryDef`, `L2Node`, `resolveCanonicalCategory`, `ProductTagSummary` (Phase 1)
- Produces: `getL1ByCollectionHandle(handle: string): L1CategoryDef | undefined`, `humanizeTag(tag: string): string`, `buildSubcategoryTagQuery(categoryTag: string, subTag: string): string`, `getSubcategoriesForParent(parentTag: string, l2Nodes: L2Node[]): L2Node[]`, `getProductCategoryPath(summary: ProductTagSummary, l2Nodes: L2Node[]): { category: L1CategoryDef; subcategory: L2Node | null } | null`

- [ ] **Step 1: Write the failing tests**

Append to `lib/__tests__/category-tree.test.ts`:

```ts
import {
  getL1ByCollectionHandle,
  humanizeTag,
  buildSubcategoryTagQuery,
  getSubcategoriesForParent,
  getProductCategoryPath,
} from '../category-tree'

describe('getL1ByCollectionHandle', () => {
  it('finds an L1 whose collectionHandle differs from its tag', () => {
    const l1 = getL1ByCollectionHandle('testing-screening')
    expect(l1?.tag).toBe('testing')
  })

  it('finds an L1 whose collectionHandle matches its tag', () => {
    const l1 = getL1ByCollectionHandle('gloves')
    expect(l1?.tag).toBe('gloves')
  })

  it('returns undefined for an unknown handle', () => {
    expect(getL1ByCollectionHandle('not-a-real-handle')).toBeUndefined()
  })
})

describe('humanizeTag', () => {
  it('title-cases a kebab-case tag', () => {
    expect(humanizeTag('exam-gloves')).toBe('Exam Gloves')
  })

  it('handles a single-word tag', () => {
    expect(humanizeTag('sutures')).toBe('Sutures')
  })
})

describe('buildSubcategoryTagQuery', () => {
  it('combines category and subcategory tags into a Storefront query string', () => {
    expect(buildSubcategoryTagQuery('needles-syringes', 'iv-catheters')).toBe(
      'tag:"category:needles-syringes" AND tag:"subcategory:iv-catheters"',
    )
  })
})

describe('getSubcategoriesForParent', () => {
  it('returns only nodes whose parentTag matches, excluding a given tag', () => {
    const l2Nodes = [
      { tag: 'exam-gloves', parentTag: 'gloves', productCount: 10 },
      { tag: 'surgical-gloves', parentTag: 'gloves', productCount: 5 },
      { tag: 'wound-dressings', parentTag: 'wound-care', productCount: 8 },
    ]
    const result = getSubcategoriesForParent('gloves', l2Nodes)
    expect(result.map((n) => n.tag).sort()).toEqual(['exam-gloves', 'surgical-gloves'])
  })
})

describe('getProductCategoryPath', () => {
  const l2Nodes = [
    { tag: 'exam-tables', parentTag: 'room-furniture', crossLinkParentTag: 'exam-room', productCount: 28 },
    { tag: 'exam-gloves', parentTag: 'gloves', productCount: 10 },
  ]

  it('resolves category and subcategory from the product\'s own canonical tags', () => {
    const path = getProductCategoryPath(
      { handle: 'some-glove', categories: ['gloves'], subcategories: ['exam-gloves'] },
      l2Nodes,
    )
    expect(path?.category.tag).toBe('gloves')
    expect(path?.subcategory?.tag).toBe('exam-gloves')
  })

  it('always resolves to the canonical parent for a boundary subcategory, never the cross-link parent', () => {
    const path = getProductCategoryPath(
      { handle: 'some-exam-table', categories: ['room-furniture'], subcategories: ['exam-tables'] },
      l2Nodes,
    )
    expect(path?.category.tag).toBe('room-furniture')
    expect(path?.subcategory?.tag).toBe('exam-tables')
  })

  it('returns a null subcategory when the product carries no matching subcategory tag', () => {
    const path = getProductCategoryPath(
      { handle: 'some-glove', categories: ['gloves'], subcategories: [] },
      l2Nodes,
    )
    expect(path?.category.tag).toBe('gloves')
    expect(path?.subcategory).toBeNull()
  })

  it('returns null when the product has no resolvable category at all', () => {
    const path = getProductCategoryPath(
      { handle: 'untagged', categories: [], subcategories: [] },
      l2Nodes,
    )
    expect(path).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/__tests__/category-tree.test.ts`
Expected: FAIL with "getL1ByCollectionHandle is not a function" (or similar for each new export)

- [ ] **Step 3: Write the implementation**

Append to `lib/category-tree.ts`:

```ts
export function getL1ByCollectionHandle(handle: string): L1CategoryDef | undefined {
  return CATEGORY_TREE_L1.find((c) => c.collectionHandle === handle)
}

export function humanizeTag(tag: string): string {
  return tag
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function buildSubcategoryTagQuery(categoryTag: string, subTag: string): string {
  return `tag:"category:${categoryTag}" AND tag:"subcategory:${subTag}"`
}

export function getSubcategoriesForParent(parentTag: string, l2Nodes: L2Node[]): L2Node[] {
  return l2Nodes.filter((n) => n.parentTag === parentTag)
}

export function getProductCategoryPath(
  summary: ProductTagSummary,
  l2Nodes: L2Node[],
): { category: L1CategoryDef; subcategory: L2Node | null } | null {
  const categoryTag = resolveCanonicalCategory(summary)
  if (!categoryTag) return null

  const category = CATEGORY_TREE_L1.find((c) => c.tag === categoryTag)
  if (!category) return null

  const subcategory =
    l2Nodes.find((n) => n.parentTag === categoryTag && summary.subcategories.includes(n.tag)) ?? null

  return { category, subcategory }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/__tests__/category-tree.test.ts`
Expected: PASS (all tests, Phase 1's 18 plus this task's new ones)

- [ ] **Step 5: Commit**

```bash
git add lib/category-tree.ts lib/__tests__/category-tree.test.ts
git commit -m "feat: add L2 registry helpers for subcategory pages and product breadcrumbs"
```

---

## Task 2: Root-level tag-filtered products query

**Files:**
- Modify: `lib/shopify/queries/products.ts`

**Interfaces:**
- Produces: `GET_PRODUCTS_BY_TAG_FILTERED` (exported GraphQL query string)

- [ ] **Step 1: Add the query**

Add to `lib/shopify/queries/products.ts` (after `GET_PRODUCTS_BY_TAG`):

```ts
// Root-level equivalent of GET_COLLECTION's products connection, for
// tag-derived listings (L2 subcategory pages) that have no backing Shopify
// collection to query. Mirrors GET_COLLECTION's product field selection and
// its pageInfo/filters shape exactly, so callers can treat the two
// connections identically (see lib/category-results-source.ts).
export const GET_PRODUCTS_BY_TAG_FILTERED = `#graphql
  query GetProductsByTagFiltered(
    $query: String!
    $first: Int!
    $after: String
    $sortKey: ProductSortKeys
    $reverse: Boolean
    $filters: [ProductFilter!]
  ) {
    products(
      query: $query
      first: $first
      after: $after
      sortKey: $sortKey
      reverse: $reverse
      filters: $filters
    ) {
      nodes {
        id
        title
        handle
        vendor
        availableForSale
        tags
        priceRange {
          minVariantPrice { amount currencyCode }
          maxVariantPrice { amount currencyCode }
        }
        images(first: 6) {
          nodes { id url altText width height }
        }
        variants(first: 10) {
          nodes {
            id
            title
            price { amount currencyCode }
            compareAtPrice { amount currencyCode }
            availableForSale
          }
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      filters {
        id
        label
        type
        values { id label count input }
      }
    }
  }
`;
```

- [ ] **Step 2: Commit**

```bash
git add lib/shopify/queries/products.ts
git commit -m "feat: add root-level tag-filtered products query for L2 pages"
```

---

## Task 3: Product-source abstraction for CategoryResults

**Files:**
- Create: `lib/category-results-source.ts`
- Test: `lib/__tests__/category-results-source.test.ts`

**Interfaces:**
- Consumes: `storefrontFetch` (`@/lib/shopify/storefront`), `GET_COLLECTION` (`@/lib/shopify/queries/collections`), `GET_PRODUCTS_BY_TAG_FILTERED` (Task 2), `Collection` (`@/lib/shopify/types`)
- Produces: `type ProductSource = { kind: 'collection'; handle: string } | { kind: 'tag'; query: string; title: string; slug: string }`, `type ProductConnectionResult = { products: Collection['products']; title: string; handle: string } | null`, `fetchProductConnection(source: ProductSource, opts: { first: number; sortKey: string; reverse: boolean; filters: Record<string, unknown>[] }): Promise<ProductConnectionResult>`

- [ ] **Step 1: Write the failing tests**

Create `lib/__tests__/category-results-source.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/shopify/storefront', () => ({ storefrontFetch: vi.fn() }))
import { storefrontFetch } from '@/lib/shopify/storefront'
const mockFetch = vi.mocked(storefrontFetch)

beforeEach(() => {
  mockFetch.mockReset()
})

describe('fetchProductConnection', () => {
  it('fetches via GET_COLLECTION for a collection source and returns its products/title/handle', async () => {
    mockFetch.mockResolvedValue({
      collection: {
        id: '1',
        title: 'Gloves',
        handle: 'gloves',
        description: '',
        descriptionHtml: '',
        image: null,
        seo: { title: null, description: null },
        products: { nodes: [], pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null }, filters: [] },
      },
    })

    const { fetchProductConnection } = await import('../category-results-source')
    const result = await fetchProductConnection(
      { kind: 'collection', handle: 'gloves' },
      { first: 10, sortKey: 'COLLECTION_DEFAULT', reverse: false, filters: [] },
    )

    expect(result?.title).toBe('Gloves')
    expect(result?.handle).toBe('gloves')
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [query, variables] = mockFetch.mock.calls[0]
    expect(query).toContain('GetCollection')
    expect(variables).toMatchObject({ handle: 'gloves', sortKey: 'COLLECTION_DEFAULT' })
  })

  it('returns null when the collection source resolves to no collection', async () => {
    mockFetch.mockResolvedValue({ collection: null })
    const { fetchProductConnection } = await import('../category-results-source')
    const result = await fetchProductConnection(
      { kind: 'collection', handle: 'does-not-exist' },
      { first: 10, sortKey: 'COLLECTION_DEFAULT', reverse: false, filters: [] },
    )
    expect(result).toBeNull()
  })

  it('fetches via GET_PRODUCTS_BY_TAG_FILTERED for a tag source, using the source\'s title/slug', async () => {
    mockFetch.mockResolvedValue({
      products: { nodes: [], pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null }, filters: [] },
    })

    const { fetchProductConnection } = await import('../category-results-source')
    const result = await fetchProductConnection(
      { kind: 'tag', query: 'tag:"category:gloves" AND tag:"subcategory:exam-gloves"', title: 'Exam Gloves', slug: 'exam-gloves' },
      { first: 10, sortKey: 'COLLECTION_DEFAULT', reverse: false, filters: [] },
    )

    expect(result?.title).toBe('Exam Gloves')
    expect(result?.handle).toBe('exam-gloves')
    const [query, variables] = mockFetch.mock.calls[0]
    expect(query).toContain('GetProductsByTagFiltered')
    expect(variables).toMatchObject({ query: 'tag:"category:gloves" AND tag:"subcategory:exam-gloves"' })
  })

  it('maps the COLLECTION_DEFAULT sort key to BEST_SELLING for a tag source, since the root products() query has no such sort key', async () => {
    mockFetch.mockResolvedValue({
      products: { nodes: [], pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null }, filters: [] },
    })

    const { fetchProductConnection } = await import('../category-results-source')
    await fetchProductConnection(
      { kind: 'tag', query: 'tag:"category:gloves"', title: 'Gloves', slug: 'gloves' },
      { first: 10, sortKey: 'COLLECTION_DEFAULT', reverse: false, filters: [] },
    )

    const [, variables] = mockFetch.mock.calls[0]
    expect(variables).toMatchObject({ sortKey: 'BEST_SELLING' })
  })

  it('passes non-default sort keys through unchanged for a tag source', async () => {
    mockFetch.mockResolvedValue({
      products: { nodes: [], pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null }, filters: [] },
    })

    const { fetchProductConnection } = await import('../category-results-source')
    await fetchProductConnection(
      { kind: 'tag', query: 'tag:"category:gloves"', title: 'Gloves', slug: 'gloves' },
      { first: 10, sortKey: 'PRICE', reverse: true, filters: [] },
    )

    const [, variables] = mockFetch.mock.calls[0]
    expect(variables).toMatchObject({ sortKey: 'PRICE', reverse: true })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/__tests__/category-results-source.test.ts`
Expected: FAIL with "Cannot find module '../category-results-source'"

- [ ] **Step 3: Write the implementation**

Create `lib/category-results-source.ts`:

```ts
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_COLLECTION } from '@/lib/shopify/queries/collections'
import { GET_PRODUCTS_BY_TAG_FILTERED } from '@/lib/shopify/queries/products'
import type { Collection } from '@/lib/shopify/types'

// Lets CategoryResults pull products from either a Shopify collection (L1
// pages, unchanged behavior) or a raw tag query (L2 subcategory pages, which
// have no backing collection — a boundary subcategory can't be one Shopify
// collection shared by two parent categories).
export type ProductSource =
  | { kind: 'collection'; handle: string }
  | { kind: 'tag'; query: string; title: string; slug: string }

export type ProductConnectionResult = {
  products: Collection['products']
  title: string
  handle: string
} | null

// The root products() query has no COLLECTION_DEFAULT sort key (that only
// exists on a collection's own products connection) — BEST_SELLING is the
// closest equivalent "sensible default" for a tag-derived listing.
function mapSortKeyForTagQuery(sortKey: string): string {
  return sortKey === 'COLLECTION_DEFAULT' ? 'BEST_SELLING' : sortKey
}

export async function fetchProductConnection(
  source: ProductSource,
  opts: { first: number; sortKey: string; reverse: boolean; filters: Record<string, unknown>[] },
): Promise<ProductConnectionResult> {
  if (source.kind === 'collection') {
    const data = await storefrontFetch<{ collection: Collection | null }>(
      GET_COLLECTION,
      {
        handle: source.handle,
        first: opts.first,
        after: null,
        sortKey: opts.sortKey,
        reverse: opts.reverse,
        filters: opts.filters,
      },
      { next: { revalidate: 300, tags: ['shopify', 'products', 'collections', `collection:${source.handle}`] } },
    )
    if (!data.collection) return null
    return { products: data.collection.products, title: data.collection.title, handle: data.collection.handle }
  }

  const data = await storefrontFetch<{ products: Collection['products'] }>(
    GET_PRODUCTS_BY_TAG_FILTERED,
    {
      query: source.query,
      first: opts.first,
      after: null,
      sortKey: mapSortKeyForTagQuery(opts.sortKey),
      reverse: opts.reverse,
      filters: opts.filters,
    },
    { next: { revalidate: 300, tags: ['shopify', 'products', 'category-tree'] } },
  )
  return { products: data.products, title: source.title, handle: source.slug }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/__tests__/category-results-source.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/category-results-source.ts lib/__tests__/category-results-source.test.ts
git commit -m "feat: add collection/tag product-source abstraction for CategoryResults"
```

---

## Task 4: Generalize CategoryResults to consume either product source

**Files:**
- Modify: `components/category/CategoryResults.tsx`
- Modify: `components/category/CategoryPageView.tsx`

**Interfaces:**
- Consumes: `ProductSource`, `fetchProductConnection` (Task 3)
- Produces: `CategoryResults` now takes `source: ProductSource`, `baseUrl: string`, `facetKey: string` instead of `slug: string`; `CategoryPageView.tsx` exports `parseSortKey` and `parseFilterParam` for reuse by the L2 route (Task 5)

This task must not change L1 page behavior — the new `CategoryPageView` call site passes exactly the same effective values (`source: { kind: 'collection', handle: slug }`, `baseUrl: ROUTES.category(slug)`, `facetKey: slug`) that produced today's behavior.

- [ ] **Step 1: Update CategoryResults.tsx's props and fetch call**

In `components/category/CategoryResults.tsx`, replace the imports:

```ts
import { storefrontFetch } from '@/lib/shopify/storefront'
import { buildCollectionItemListSchema, jsonLdSafe } from '@/lib/schema'
import { SITE_URL } from '@/lib/seo/constants'
import { GET_COLLECTION } from '@/lib/shopify/queries/collections'
import type { Collection } from '@/lib/shopify/types'
import { getVisibleFilters } from '@/lib/shopify/filters'
```

with:

```ts
import { buildCollectionItemListSchema, jsonLdSafe } from '@/lib/schema'
import { SITE_URL } from '@/lib/seo/constants'
import { fetchProductConnection, type ProductSource } from '@/lib/category-results-source'
import { getVisibleFilters } from '@/lib/shopify/filters'
```

Replace the `Props` interface:

```ts
interface Props {
  source: ProductSource
  baseUrl: string
  facetKey: string
  sortKey: string
  reverse: boolean
  sortParam?: string
  activeFilterStrings: string[]
  currentPage: number
  trackingParamsSource: TrackingParamSource
}
```

Replace the function signature and the fetch/derivation block (from `export async function CategoryResults({ slug, ... })` through the `if (!data.collection) notFound()` line and its immediate derivations) with:

```ts
export async function CategoryResults({
  source,
  baseUrl,
  facetKey,
  sortKey,
  reverse,
  sortParam,
  activeFilterStrings,
  currentPage,
  trackingParamsSource,
}: Props) {
  const isFiltered = activeFilterStrings.length > 0 || Boolean(sortParam)

  const persistParams = new URLSearchParams()
  if (sortParam) persistParams.set('sort', sortParam)
  activeFilterStrings.forEach((f) => persistParams.append('filter', f))
  withTrackingParams(persistParams, trackingParamsSource)
  const page1Qs = persistParams.toString()
  const page1Url = page1Qs ? `${baseUrl}?${page1Qs}` : baseUrl

  const first = currentPage * CATEGORY_PAGE_SIZE + 1

  let result: Awaited<ReturnType<typeof fetchProductConnection>>
  try {
    result = await fetchProductConnection(source, {
      first,
      sortKey,
      reverse,
      filters: parseFilters(activeFilterStrings),
    })
  } catch (err) {
    if (currentPage > 1) {
      redirect(page1Url)
    }
    throw err
  }

  if (!result) notFound()

  const { products: connection, title, handle } = result
  const allNodes = connection.nodes
  const startIndex = (currentPage - 1) * CATEGORY_PAGE_SIZE
  const products = allNodes.slice(startIndex, startIndex + CATEGORY_PAGE_SIZE)
  const hasNext = allNodes.length > currentPage * CATEGORY_PAGE_SIZE

  if (!isFiltered && currentPage > 1 && products.length === 0) notFound()

  const allowedFacets = getAllowedFacets(facetKey, connection.filters ?? [])
  const filters = getVisibleFilters(allowedFacets, activeFilterStrings)

  const removeFilterUrl = (filterToRemove: string) => {
    const next = activeFilterStrings.filter((f) => f !== filterToRemove)
    const p = new URLSearchParams()
    if (sortParam) p.set('sort', sortParam)
    next.forEach((f) => p.append('filter', f))
    withTrackingParams(p, trackingParamsSource)
    const qs = p.toString()
    return qs ? `${baseUrl}?${qs}` : baseUrl
  }
```

- [ ] **Step 2: Update the JSX to use `title`/`handle`/`baseUrl` instead of `collection`/`slug`**

In the same file, replace every remaining reference in the JSX below that block:
- `collection.handle` → `handle`
- `collection.title` → `title`
- `ROUTES.category(slug)` (in `emptyStateHref` on `ProductGrid`) → `baseUrl`
- `baseUrl={ROUTES.category(slug)}` (on `CategoryPagination`) → `baseUrl={baseUrl}`

The `ROUTES` import stays as-is — it's still used by the ItemList schema's product URLs (`(handle) => \`${SITE_URL}${ROUTES.product(handle)}\``), unrelated to this task's changes.

- [ ] **Step 3: Update CategoryPageView.tsx's call site and export the two parse helpers**

In `components/category/CategoryPageView.tsx`, add `export` to the two existing function declarations so Task 5 can reuse them:

```ts
export function parseSortKey(sort?: string): { sortKey: string; reverse: boolean } {
```

```ts
export function parseFilterParam(filter?: string | string[]): string[] {
```

Then replace the `<CategoryResults .../>` call site:

```tsx
        <CategoryResults
          source={{ kind: 'collection', handle: slug }}
          baseUrl={ROUTES.category(slug)}
          facetKey={slug}
          sortKey={sortKey}
          reverse={reverse}
          sortParam={sp.sort}
          activeFilterStrings={activeFilterStrings}
          currentPage={currentPage}
          trackingParamsSource={sp}
        />
```

- [ ] **Step 4: Run the existing test suites for both files**

Run: `npx vitest run components/category/__tests__/CategoryResults.test.tsx components/category/__tests__/buildCategoryMetadata.test.tsx`
Expected: These pre-existing tests may reference the old `slug` prop directly — if so, update their `CategoryResults` invocations in the test file to the new `source`/`baseUrl`/`facetKey` props (same effective values: `source={{ kind: 'collection', handle: 'gloves' }}`, `baseUrl="/category/gloves"`, `facetKey="gloves"` in place of `slug="gloves"`, mirroring whatever slug value each existing test used). All tests must still pass with the same assertions.

- [ ] **Step 5: Typecheck and full test suite**

Run: `npx tsc --noEmit`
Expected: no errors

Run: `npx vitest run`
Expected: same pass/fail counts as the Phase 1 baseline (686 passed / 19 pre-existing unrelated failures), plus this task's suites passing

- [ ] **Step 6: Manual L1 regression check**

Run: `npm run dev`, visit `http://localhost:3000/category/gloves` and `http://localhost:3000/category/gloves?sort=PRICE_ASC`. Confirm both render products, pagination, and filters exactly as before this change (no visual or functional regression). Stop the dev server when done.

- [ ] **Step 7: Commit**

```bash
git add components/category/CategoryResults.tsx components/category/CategoryPageView.tsx components/category/__tests__/CategoryResults.test.tsx
git commit -m "refactor: generalize CategoryResults to consume a collection- or tag-based product source"
```

---

## Task 5: L1 page subcategory chips and related categories from the registry

**Files:**
- Modify: `components/category/CategoryPageView.tsx`

**Interfaces:**
- Consumes: `fetchProductTagSummaries`, `buildL2Tree`, `getSubcategoriesForParent`, `getL1ByCollectionHandle`, `humanizeTag`, `CATEGORY_TREE_L1` (Task 1, Phase 1)

The L1 page's "subcategory tabs" and "Related Categories" sections currently call `getSubcategories(slug)`/`getRelatedCategories(slug)` from `lib/category-utils.ts`, which derive both from the `{parent}-{sub}` Shopify collection-handle convention. Replace both with registry-derived data so an L1 page's subcategory tabs link to the new tag-based L2 pages (Task 6) instead of the old collection-handle subcategory pages.

- [ ] **Step 1: Replace the imports and the two data calls**

In `components/category/CategoryPageView.tsx`, replace:

```ts
import { getSubcategories, getRelatedCategories, MAX_CATEGORY_PAGE } from '@/lib/category-utils'
```

with:

```ts
import { MAX_CATEGORY_PAGE } from '@/lib/category-utils'
import {
  fetchProductTagSummaries,
  buildL2Tree,
  getSubcategoriesForParent,
  getL1ByCollectionHandle,
  humanizeTag,
  CATEGORY_TREE_L1,
} from '@/lib/category-tree'
```

Replace the `Promise.all` block that currently fetches `data`, `subcategories`, `relatedCategories`:

```ts
  const l1 = getL1ByCollectionHandle(slug)

  const [data, summaries] = await Promise.all([
    storefrontFetch<{ collection: CollectionHero | null }>(
      GET_COLLECTION_HERO,
      { handle: slug },
      collectionFetchOptions(slug),
    ),
    fetchProductTagSummaries(),
  ])

  if (!data.collection) notFound()

  const l2Nodes = buildL2Tree(summaries)
  const subcategories = l1
    ? getSubcategoriesForParent(l1.tag, l2Nodes).map((n) => ({ label: humanizeTag(n.tag), slug: n.tag }))
    : []
  const relatedCategories = CATEGORY_TREE_L1
    .filter((c) => c.tag !== l1?.tag)
    .slice(0, 6)
    .map((c) => ({ label: c.displayName, slug: c.collectionHandle }))
```

- [ ] **Step 2: Confirm the JSX below needs no further changes**

The subcategory tabs section already does `ROUTES.subcategory(slug, sub.slug)` and the related-categories section already does `ROUTES.category(cat.slug)` — both now correctly receive `sub.slug` as an L2 tag and `cat.slug` as an L1 collection handle respectively, matching the Global Constraints' URL shape. No JSX changes needed.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, visit `http://localhost:3000/category/gloves`. Confirm the subcategory tabs row renders tag-derived subcategories (title-cased, e.g. "Exam Gloves") and the Related Categories row renders 6 other L1 categories by their `displayName`. Stop the dev server when done.

- [ ] **Step 5: Commit**

```bash
git add components/category/CategoryPageView.tsx
git commit -m "feat: source L1 subcategory tabs and related categories from the tag registry"
```

---

## Task 6: Rebuild the L2 subcategory route on the registry, with boundary redirects

**Files:**
- Modify: `app/category/[slug]/[product]/page.tsx`

**Interfaces:**
- Consumes: `getL1ByCollectionHandle`, `fetchProductTagSummaries`, `buildL2Tree`, `getSubcategoriesForParent`, `humanizeTag`, `CATEGORY_TREE_L1`, `buildSubcategoryTagQuery` (Task 1), `ProductSource` (Task 3), `CategoryResults` (Task 4), `parseSortKey`/`parseFilterParam` (Task 4), `buildCollectionPageSchema`/`buildCollectionItemListSchema` (`@/lib/schema`)

This task replaces ONLY the subcategory-detection branch of this route (the part that currently looks up a `${slug}-${handle}` Shopify collection) with the tag registry, adds the boundary redirect, and upgrades the subcategory listing from a plain 12-product grid to the full paginated/filterable `CategoryResults` experience. The product-fallback branch (when `handle` isn't a real subcategory tag) is untouched by this task — its breadcrumb source is re-wired separately in Task 7.

- [ ] **Step 1: Update imports and Props**

In `app/category/[slug]/[product]/page.tsx`, replace the imports block with:

```ts
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_PRODUCT, GET_PRODUCT_RECS } from '@/lib/shopify/queries/products'
import type { Product, CollectionProduct } from '@/lib/shopify/types'
import { ProductView } from '@/components/product/ProductView'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { CategoryResults } from '@/components/category/CategoryResults'
import { parseSortKey, parseFilterParam, type CategorySearchParams } from '@/components/category/CategoryPageView'
import { buildMetadata, trimDescription } from '@/lib/seo'
import { buildBreadcrumbListSchema, buildCollectionPageSchema, jsonLdSafe } from '@/lib/schema'
import { BreadcrumbSchema } from '@/components/schema/BreadcrumbSchema'
import { SITE_URL } from '@/lib/seo/constants'
import { ROUTES } from '@/lib/routes'
import { PARTNERS } from '@/lib/partners'
import {
  getL1ByCollectionHandle,
  fetchProductTagSummaries,
  buildL2Tree,
  getSubcategoriesForParent,
  humanizeTag,
  CATEGORY_TREE_L1,
  buildSubcategoryTagQuery,
  type L2Node,
} from '@/lib/category-tree'
import { getNonce } from '@/lib/csp-nonce'
```

(`getSiblingSubcategories`/`getRelatedCategories`/`GET_COLLECTION`/`GET_COLLECTION_META`/`Collection`/`ProductGrid`/`getSubcategoryBannerPath`/`CategoryImage` are no longer used by the rewritten subcategory branch — remove those imports. `ProductGrid`, `CategoryImage`, and `getSubcategoryBannerPath` are still unused by the (untouched) product-fallback branch after this task, so they can be dropped now; if the product-fallback branch's JSX still references any of them, keep the corresponding import.)

Update `Props` to include `searchParams`, matching `CategoryPageView`'s shape:

```ts
interface Props {
  params: Promise<{ slug: string; product: string }>
  searchParams: Promise<CategorySearchParams>
}
```

- [ ] **Step 2: Rewrite `generateMetadata`**

Replace the function body:

```ts
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, product: handle } = await params
  const l1 = getL1ByCollectionHandle(slug)

  if (l1) {
    const summaries = await fetchProductTagSummaries()
    const l2Nodes = buildL2Tree(summaries)
    const node = l2Nodes.find((n) => n.tag === handle)

    if (node && (node.parentTag === l1.tag || node.crossLinkParentTag === l1.tag)) {
      const canonicalL1 = CATEGORY_TREE_L1.find((c) => c.tag === node.parentTag)!
      const title = humanizeTag(node.tag)
      return buildMetadata({
        pageType: 'subcategory',
        title,
        description: `Shop ${title} within ${canonicalL1.displayName} at MDSupplies — fast shipping, bulk pricing available.`,
        canonical: `${SITE_URL}${ROUTES.subcategory(canonicalL1.collectionHandle, node.tag)}`,
      })
    }
  }

  try {
    const data = await storefrontFetch<{ product: Product | null }>(GET_PRODUCT, { handle }, productFetchOptions(handle))
    if (!data.product) return buildMetadata({ pageType: 'product', slug: handle })
    const p = data.product
    return buildMetadata({
      pageType: 'product',
      title: p.seo?.title || p.title,
      description: p.seo?.description || (p.description ? trimDescription(p.description, 155) : `Buy ${p.title} from MDSupplies`),
      slug: handle,
      image: p.images.nodes[0]?.url,
    })
  } catch {
    return buildMetadata({ pageType: 'product', slug: handle })
  }
}
```

- [ ] **Step 3: Rewrite the component's subcategory branch**

Replace the component from its signature through the end of the `if (subData.collection) { ... }` block (i.e. everything up to the `// Fall back to product` comment) with:

```tsx
export default async function CategoryProductPage({ params, searchParams }: Props) {
  const nonce = await getNonce()
  const { slug, product: handle } = await params
  const sp = await searchParams
  const l1 = getL1ByCollectionHandle(slug)

  if (l1) {
    const summaries = await fetchProductTagSummaries()
    const l2Nodes = buildL2Tree(summaries)
    const node = l2Nodes.find((n) => n.tag === handle)

    if (node && node.crossLinkParentTag === l1.tag && node.parentTag !== l1.tag) {
      const canonicalL1 = CATEGORY_TREE_L1.find((c) => c.tag === node.parentTag)!
      redirect(ROUTES.subcategory(canonicalL1.collectionHandle, node.tag))
    }

    if (node && node.parentTag === l1.tag) {
      return renderSubcategoryPage(nonce, l1, node, l2Nodes, sp, slug, handle)
    }
  }

  // Fall back to product — everything from here to the end of the file is
  // the file's EXISTING code (the `// Fall back to product` comment through
  // the closing `</main>`/function brace), untouched by this step, with ONE
  // required exception below: this step's rewrite above deletes the
  // `parentMeta` fetch entirely, so the one existing line downstream that
  // reads `parentMeta.collection` would otherwise reference an undefined
  // variable and fail to compile.
```

This step's rewrite deletes the `parentMeta`/`GET_COLLECTION_META` fetch (it was only ever used for this one crumb and the now-removed subcategory branch), so the file will no longer compile unless the one remaining reference to it is fixed in this same step. Find this existing line further down in the "Fall back to product" section:

```ts
  const breadcrumbs = parentMeta.collection
    ? [{ label: parentMeta.collection.title, href: `/category/${slug}` }]
    : [{ label: 'Categories', href: '/shop' }]
```

Replace it with the `l1` lookup this step already computed above (same information — an approved L1's display name and its collection handle — just sourced from the registry instead of a second Shopify fetch):

```ts
  const breadcrumbs = l1
    ? [{ label: l1.displayName, href: `/category/${slug}` }]
    : [{ label: 'Categories', href: '/shop' }]
```

Nothing else in the "Fall back to product" section changes in this task — the `productData`/`partner`/`recsData` fetches and the returned JSX stay exactly as they are today. Task 7 revisits this exact `breadcrumbs` line again, upgrading it from "just the L1 parent" to the product's own full category → subcategory path.

Step 1's import replacement above already dropped the `GET_COLLECTION_META` and `Collection` imports (they existed only to build `parentMeta`) — nothing further to remove for those two.

Add this new function above `CategoryProductPage` in the same file (it renders the subcategory listing page):

```tsx
async function renderSubcategoryPage(
  nonce: string,
  l1: { tag: string; displayName: string; collectionHandle: string },
  node: L2Node,
  l2Nodes: L2Node[],
  sp: CategorySearchParams,
  slug: string,
  handle: string,
) {
  const title = humanizeTag(node.tag)
  const activeFilterStrings = parseFilterParam(sp.filter)
  const { sortKey, reverse } = parseSortKey(sp.sort)
  const currentPage = parseInt(sp.page ?? '1', 10)
  if (isNaN(currentPage) || currentPage < 1) notFound()

  const siblings = getSubcategoriesForParent(l1.tag, l2Nodes).filter((n) => n.tag !== node.tag)
  const crossLinkL1 = node.crossLinkParentTag
    ? CATEGORY_TREE_L1.find((c) => c.tag === node.crossLinkParentTag)
    : undefined

  const canonicalUrl = `${SITE_URL}${ROUTES.subcategory(slug, handle)}`

  return (
    <main id="main-content" className="bg-[#f9fafc] min-h-screen">
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-4">
        <Breadcrumb
          items={[
            { label: l1.displayName, href: ROUTES.category(slug) },
            { label: title },
          ]}
        />
      </div>

      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 pb-6">
        <h1 className="text-navy-900 text-[36px] sm:text-[44px] font-semibold leading-[1.2] tracking-[-0.01em] mb-2">
          {title}
        </h1>
        <p className="text-gray-500 text-[15px]">Part of {l1.displayName}</p>
        {crossLinkL1 && (
          <p className="text-gray-500 text-[14px] mt-2">
            Also relevant to{' '}
            <Link href={ROUTES.category(crossLinkL1.collectionHandle)} className="text-[#0086b1] hover:underline">
              {crossLinkL1.displayName}
            </Link>
          </p>
        )}
      </div>

      {siblings.length > 0 && (
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 mb-6">
          <div className="flex flex-wrap gap-2 items-center">
            <Link
              href={ROUTES.category(slug)}
              className="border border-gray-200 bg-white text-navy-900 text-[13px] font-semibold px-4 h-[44px] flex items-center hover:border-navy-900 transition-colors whitespace-nowrap"
            >
              All {l1.displayName}
            </Link>
            {siblings.map((sib) => (
              <Link
                key={sib.tag}
                href={ROUTES.subcategory(slug, sib.tag)}
                className="border border-gray-200 bg-white text-navy-900 text-[13px] font-semibold px-4 h-[44px] flex items-center hover:border-navy-900 transition-colors whitespace-nowrap"
              >
                {humanizeTag(sib.tag)}
              </Link>
            ))}
            <span className="bg-navy-900 text-white text-[13px] font-semibold px-4 h-[44px] flex items-center whitespace-nowrap">
              {title}
            </span>
          </div>
        </div>
      )}

      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-6 flex gap-0 items-start">
        <CategoryResults
          source={{ kind: 'tag', query: buildSubcategoryTagQuery(l1.tag, node.tag), title, slug: node.tag }}
          baseUrl={ROUTES.subcategory(slug, handle)}
          facetKey={l1.tag}
          sortKey={sortKey}
          reverse={reverse}
          sortParam={sp.sort}
          activeFilterStrings={activeFilterStrings}
          currentPage={currentPage}
          trackingParamsSource={sp}
        />
      </div>

      <script
        type="application/ld+json"
        nonce={nonce}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: jsonLdSafe(buildCollectionPageSchema({ name: title, url: canonicalUrl })),
        }}
      />
      <script
        type="application/ld+json"
        nonce={nonce}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: jsonLdSafe(
            buildBreadcrumbListSchema(
              [{ label: l1.displayName, href: ROUTES.category(slug) }, { label: title }],
              canonicalUrl,
            ),
          ),
        }}
      />
    </main>
  )
}
```

- [ ] **Step 4: Typecheck and lint**

Run: `npx tsc --noEmit`
Expected: no errors (fix any unused-import errors from Step 1's import cleanup)

Run: `npx eslint app/category/[slug]/[product]/page.tsx`
Expected: no errors

- [ ] **Step 5: Manual verification — canonical page, cross-link, and redirect**

Run: `npm run dev`.

1. Visit `http://localhost:3000/category/seating/exam-tables` (canonical URL for the `exam-tables` boundary subcategory — `seating` is Room Furniture's `collectionHandle`). Confirm it renders a product listing with pagination/filters, and shows "Also relevant to Exam Room" linking to `/category/exam-room`.
2. Visit `http://localhost:3000/category/exam-room/exam-tables` (the non-canonical combination). Confirm it 301-redirects to `/category/seating/exam-tables`.
3. Visit a non-boundary subcategory, e.g. `http://localhost:3000/category/gloves/exam-gloves` (or whichever tag actually resolves under `gloves` in the live catalog — check via the audit report at `audit/category-tree-audit-report.md` if unsure which tags exist). Confirm it renders normally with no cross-link callout and no redirect.
4. Visit an existing product URL through this route, e.g. whatever product handle previously worked via `/category/gloves/<some-product-handle>`, and confirm it still falls through to the product view unchanged.

Stop the dev server when done.

- [ ] **Step 6: Commit**

```bash
git add app/category/[slug]/[product]/page.tsx
git commit -m "feat: rebuild L2 subcategory pages on the tag registry with boundary redirects"
```

---

## Task 7: Product breadcrumbs from the product's own tags

**Files:**
- Modify: `app/product/[slug]/page.tsx`
- Modify: `app/category/[slug]/[product]/page.tsx`

**Interfaces:**
- Consumes: `getProductCategoryPath`, `fetchProductTagSummaries`, `buildL2Tree`, `parseProductTags` (Task 1, Phase 1)

Replaces `getPrimaryCollection(product.collections.nodes)` (collection-membership-derived) with a tag-derived breadcrumb built from the product's own `category:`/`subcategory:` tags, on both routes that render a product view.

- [ ] **Step 1: Update `app/product/[slug]/page.tsx`**

Replace the import (currently line 14):

```ts
import { getPrimaryCollection } from '@/lib/category-utils'
```

with:

```ts
import { getProductCategoryPath, fetchProductTagSummaries, buildL2Tree, parseProductTags, humanizeTag } from '@/lib/category-tree'
```

Replace the existing breadcrumb-building block (currently lines 150-156):

```ts
  // Contextual middle crumb (audit L12): the product's primary approved
  // collection, matching what the nested /category/<slug>/<product> route
  // shows. Falls back to the generic Shop crumb when none qualifies.
  const primaryCollection = getPrimaryCollection(product.collections?.nodes ?? [])
  const categoryCrumb = primaryCollection
    ? { label: primaryCollection.title, href: ROUTES.category(primaryCollection.handle) }
    : { label: 'Shop', href: '/categories' }
```

with:

```ts
  // Contextual middle crumb(s) (audit L12, superseded by the tag-derived
  // registry): the product's own resolveCanonicalCategory result, plus the
  // matching L2 subcategory when its tags carry one — always the canonical
  // parent, never a boundary subcategory's cross-link parent, regardless of
  // which URL the visitor arrived from. Falls back to the generic Shop crumb
  // when the product resolves no category at all.
  const summaries = await fetchProductTagSummaries()
  const l2Nodes = buildL2Tree(summaries)
  const { categories, subcategories } = parseProductTags(product.tags)
  const categoryPath = getProductCategoryPath({ handle: product.handle, categories, subcategories }, l2Nodes)
  const categoryCrumbs = categoryPath
    ? [
        { label: categoryPath.category.displayName, href: ROUTES.category(categoryPath.category.collectionHandle) },
        ...(categoryPath.subcategory
          ? [{
              label: humanizeTag(categoryPath.subcategory.tag),
              href: ROUTES.subcategory(categoryPath.category.collectionHandle, categoryPath.subcategory.tag),
            }]
          : []),
      ]
    : [{ label: 'Shop', href: '/categories' }]
```

Then update the two usages below (currently lines 164-172) from the single `categoryCrumb` to spreading `categoryCrumbs`:

```tsx
      <BreadcrumbSchema
        items={[categoryCrumb, { label: product.title }]}
        currentUrl={productUrl}
      />
      <ProductView
        product={product}
        relatedProducts={relatedProducts}
        complementaryProducts={complementaryProducts}
        breadcrumbs={[categoryCrumb]}
        partnerSlug={partner?.slug ?? null}
      />
```

becomes:

```tsx
      <BreadcrumbSchema
        items={[...categoryCrumbs, { label: product.title }]}
        currentUrl={productUrl}
      />
      <ProductView
        product={product}
        relatedProducts={relatedProducts}
        complementaryProducts={complementaryProducts}
        breadcrumbs={categoryCrumbs}
        partnerSlug={partner?.slug ?? null}
      />
```

This upgrades the breadcrumb from always showing exactly one crumb (the primary collection) to showing both the category and, when the product carries a matching subcategory tag, the subcategory too — matching the spec's "category: → subcategory: path" requirement, which a single collection-derived crumb could never represent.

- [ ] **Step 2: Update the product-fallback branch of `app/category/[slug]/[product]/page.tsx`**

In the same file touched by Task 6, find the product-fallback branch's breadcrumb construction — Task 6 left it in this L1-only form:

```ts
  const breadcrumbs = l1
    ? [{ label: l1.displayName, href: `/category/${slug}` }]
    : [{ label: 'Categories', href: '/shop' }]
```

Replace it with the full category → subcategory path, sourced from the product's own tags:

```ts
  const summaries = await fetchProductTagSummaries()
  const l2Nodes = buildL2Tree(summaries)
  const { categories, subcategories } = parseProductTags(productData.product.tags)
  const categoryPath = getProductCategoryPath(
    { handle: productData.product.handle, categories, subcategories },
    l2Nodes,
  )

  const breadcrumbs = categoryPath
    ? [
        { label: categoryPath.category.displayName, href: ROUTES.category(categoryPath.category.collectionHandle) },
        ...(categoryPath.subcategory
          ? [{
              label: humanizeTag(categoryPath.subcategory.tag),
              href: ROUTES.subcategory(categoryPath.category.collectionHandle, categoryPath.subcategory.tag),
            }]
          : []),
      ]
    : [{ label: 'Categories', href: '/categories' }]
```

Add `getProductCategoryPath` and `parseProductTags` to this file's existing `@/lib/category-tree` import (added in Task 6), alongside `humanizeTag` (already imported there).

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Manual verification — breadcrumb via a cross-linked branch**

Run: `npm run dev`. Find a product tagged `category:room-furniture` + `subcategory:exam-tables` (check `audit/category-tree-audit-report.md` or query the live catalog for one, e.g. via the same product-tag pull technique used in Phase 1 planning) and visit it at `/product/<its-handle>`. Confirm the breadcrumb reads "Room Furniture > Exam Tables" — the canonical branch — even though `exam-tables` is also cross-linked from Exam Room. This directly satisfies the spec's acceptance criterion: "BreadcrumbList follows each product's own category: path, verified on a product reached via a cross-linked branch." Stop the dev server when done.

- [ ] **Step 5: Commit**

```bash
git add app/product/[slug]/page.tsx app/category/[slug]/[product]/page.tsx
git commit -m "feat: source product breadcrumbs from the product's own category/subcategory tags"
```

---

## Task 8: Full verification pass

- [ ] **Step 1: Run the full test suite**

Run: `npm run test`
Expected: all tests pass except the same pre-existing, unrelated baseline failures documented in Phase 1 (19 failures across `app/api/sourcing/__tests__/route.test.ts`, `__tests__/route-revalidate.test.ts`, `lib/seo/__tests__/route-guardrails.test.ts`) — no new failures anywhere this phase touched.

- [ ] **Step 2: Run the production build**

Run: `npm run build`
Expected: build succeeds with no type errors.

- [ ] **Step 3: Screenshot evidence**

With `npm run dev` running, capture screenshots for the ticket's QA checklist:
- A boundary subcategory page and its cross-link callout (`/category/seating/exam-tables`).
- The redirect behavior from the non-canonical boundary URL (`/category/exam-room/exam-tables` → confirm final URL is `/category/seating/exam-tables`).
- A product breadcrumb on a product reached via the cross-linked branch (a `room-furniture`/`exam-tables`-tagged product's `/product/<handle>` page, breadcrumb reading "Room Furniture > Exam Tables").

---

## What Phase 2 deliberately does not do (tracked for Phase 3)

- No facet-allowlist content changes (the ~114 attribute collections / 80 attribute subcategory values still render as facets only via the existing `lib/filter-registry.ts`, unchanged by this phase).
- No sitemap changes — `lib/seo/sitemap.ts` still emits `/category/*` URLs from the old collection allowlist; L2 URLs aren't in the sitemap yet.
- No trocar standalone-collection unpublish/merge.
- No nav (`lib/category-nav.ts`) changes.
- No `app/category-browse/[slug]/[product]` dynamic-query-variant twin route — unnecessary because the whole app already renders dynamically per-request (CSP nonce forces `headers()` reads site-wide), so the L2 route reads `searchParams` directly rather than needing the legacy proxy-rewrite split that L1 still carries as unremoved vestige.
