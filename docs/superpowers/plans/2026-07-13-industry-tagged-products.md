# Industry Pages: Real Tagged Products via Category Product Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Populate industry detail pages' "Popular Products" section from real `industry:*`-tagged Shopify products (where a tag mapping exists) and render them with the same `ShopifyProductCard` used on category detail pages.

**Architecture:** Add an explicit `tag` field to the 5 industries with a confirmed Shopify tag; branch the industry detail page's product fetch on whether that field is set (tag-query fetch vs. existing collection fetch); widen `Industry.relevantProducts` to the richer `CollectionProduct` shape so `IndustryPage` can render `ShopifyProductCard` instead of the lightweight `FeaturedProductCard`.

**Tech Stack:** Next.js App Router (server components), Shopify Storefront API (GraphQL), TypeScript, Vitest + Testing Library.

## Global Constraints

- Exactly these 5 industries get a `tag` (verbatim, no others): `urgent-care` → `industry:urgent-care`, `hrt-clinics` → `industry:hrt-surgery`, `home-health` → `industry:home-care`, `clinics-doctors-offices` → `industry:clinic`, `pharmacies` → `industry:pharmacy`.
- `industry:occ-charities` stays unmapped — no page absorbs it.
- Product count/sort stays as-is: `first: 6`, `sortKey: 'BEST_SELLING'`, `reverse: false`. No pagination added.
- Do not modify `FeaturedProductCard`, `PartnerDetail.tsx`, `ArticlePage.tsx`, or `AnimatedOCCProducts.tsx` — they are unrelated consumers of the sibling lightweight product-card pattern.
- Do not modify `lib/cluster-links.ts` or the 7 untagged industries' existing collection-based fetch behavior.
- Test runner: `npm test` (`vitest run`). Follow existing mocking conventions (`vi.mock('@/lib/shopify/storefront', () => ({ storefrontFetch: vi.fn() }))`, `vi.mocked(storefrontFetch)`).

---

## File Structure

- **Modify `lib/industries.ts`** — add `tag?: string` to the `Industry` type; set it on the 5 mapped entries.
- **Modify `lib/shopify/queries/products.ts`** — add `GET_PRODUCTS_BY_TAG` query (reuses `PRODUCT_CARD_FRAGMENT`).
- **Modify `types/industry.ts`** — remove the now-unused `IndustryProduct` interface; change `Industry.relevantProducts` to `CollectionProduct[]` (imported from `@/lib/shopify/types`).
- **Modify `app/industries/[industry-slug]/page.tsx`** — branch the product fetch on `industryStatic.tag`; drop the down-mapping to the lightweight shape.
- **Modify `components/b2b/IndustryPage.tsx`** — swap `FeaturedProductCard` for `ShopifyProductCard`, align grid classes with the category page, add `ViewItemListTracker`.
- **Create `lib/__tests__/industries.test.ts` additions** (existing file, new `describe` block) — verify the tag mapping.
- **Create `app/industries/__tests__/product-fetch.test.ts`** — verify the fetch branch (tag query vs. collection fallback).
- **Create `components/b2b/__tests__/IndustryPage.test.tsx`** — verify the render swap.

---

### Task 1: Tag mapping in `lib/industries.ts`

**Files:**
- Modify: `lib/industries.ts:6-14` (type), and the 5 matching entries in the `INDUSTRIES` array (`urgent-care` ~line 18, `hrt-clinics` ~line 45, `home-health` ~line 79, `clinics-doctors-offices` ~line 153, `pharmacies` ~line 179)
- Test: `lib/__tests__/industries.test.ts`

**Interfaces:**
- Produces: `Industry.tag?: string` field on the type exported from `lib/industries.ts`, used by Task 2's fetch branch as `industryStatic.tag`.

- [ ] **Step 1: Write the failing test**

Add this `describe` block to the end of `lib/__tests__/industries.test.ts` (after the existing `describe('isIndustryComplete', ...)` block, still inside the same file, same imports):

```ts
describe('industry -> Shopify tag mapping', () => {
  const expectedTags: Record<string, string> = {
    'urgent-care': 'industry:urgent-care',
    'hrt-clinics': 'industry:hrt-surgery',
    'home-health': 'industry:home-care',
    'clinics-doctors-offices': 'industry:clinic',
    pharmacies: 'industry:pharmacy',
  }

  it('maps exactly the 5 industries with a confirmed Shopify tag', () => {
    for (const [slug, tag] of Object.entries(expectedTags)) {
      const industry = INDUSTRIES.find((i) => i.slug === slug)
      expect(industry?.tag).toBe(tag)
    }
  })

  it('leaves every other industry without a tag', () => {
    const mapped = new Set(Object.keys(expectedTags))
    for (const i of INDUSTRIES) {
      if (!mapped.has(i.slug)) {
        expect(i.tag).toBeUndefined()
      }
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/industries.test.ts`
Expected: FAIL — `industry?.tag` is `undefined` for all 5 (property doesn't exist yet), so `toBe('industry:urgent-care')` etc. fail.

- [ ] **Step 3: Add the `tag` field to the type and the 5 entries**

In `lib/industries.ts`, change the type (currently lines 6-14):

```ts
export type Industry = {
  name: string
  slug: string
  collectionHandle: string
  tag?: string
  description: string
  image: string
  buyerType: string
  faq?: FAQ[]
}
```

Then add `tag: 'industry:urgent-care',` right after `collectionHandle: 'urgent-care',` in the `Urgent Care` entry; `tag: 'industry:hrt-surgery',` right after `collectionHandle: 'hrt-clinics',` in the `HRT Clinics` entry; `tag: 'industry:home-care',` right after `collectionHandle: 'home-health',` in the `Home Health` entry; `tag: 'industry:clinic',` right after `collectionHandle: 'clinics-doctors-offices',` in the `Clinics & Doctor's Offices` entry; and `tag: 'industry:pharmacy',` right after `collectionHandle: 'pharmacies',` in the `Pharmacies` entry. Every other entry (`ems`, `long-term-care`, `physical-therapy`, `private-practice`, `dental`, `veterinary`, `community-health`) is left unchanged (no `tag` field).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/__tests__/industries.test.ts`
Expected: PASS (all tests in the file, including pre-existing `isIndustryComplete` tests)

- [ ] **Step 5: Commit**

```bash
git add lib/industries.ts lib/__tests__/industries.test.ts
git commit -m "Add Shopify industry-tag mapping to the 5 tagged industries"
```

---

### Task 2: Tag-based fetch in the industry detail page

**Files:**
- Modify: `lib/shopify/queries/products.ts` (add `GET_PRODUCTS_BY_TAG`, after `GET_PRODUCTS_BY_VENDOR`)
- Modify: `types/industry.ts` (remove `IndustryProduct`, widen `relevantProducts`)
- Modify: `app/industries/[industry-slug]/page.tsx` (branch fetch logic)
- Test: `app/industries/__tests__/product-fetch.test.ts` (new)

**Interfaces:**
- Consumes: `Industry.tag` from Task 1 (`lib/industries.ts`); `CollectionProduct` from `@/lib/shopify/types` (`{id, title, handle, vendor, availableForSale, tags, priceRange, images, variants}`).
- Produces: `GET_PRODUCTS_BY_TAG` export from `lib/shopify/queries/products.ts` (variables: `query: string`, `first: number`, `sortKey?: string`, `reverse?: boolean`; response shape `{ products: { nodes: CollectionProduct[] } }`). `Industry.relevantProducts: CollectionProduct[]` (from `types/industry.ts`), consumed by Task 3's `IndustryPage`.

- [ ] **Step 1: Write the failing test**

Create `app/industries/__tests__/product-fetch.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ReactElement } from 'react'
import type { CollectionProduct } from '@/lib/shopify/types'
import type { Industry } from '@/types/industry'

vi.mock('@/lib/shopify/storefront', () => ({
  storefrontFetch: vi.fn(),
}))
vi.mock('@/lib/category-utils', () => ({
  getSubcategories: vi.fn().mockResolvedValue([]),
}))

import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_PRODUCTS_BY_TAG } from '@/lib/shopify/queries/products'
import { GET_COLLECTION } from '@/lib/shopify/queries/collections'
import IndustryDetailPage from '../[industry-slug]/page'

const mockFetch = vi.mocked(storefrontFetch)

function mockProduct(handle: string): CollectionProduct {
  return {
    id: `gid://shopify/Product/${handle}`,
    title: handle,
    handle,
    vendor: 'Acme',
    availableForSale: true,
    tags: [],
    priceRange: {
      minVariantPrice: { amount: '10.00', currencyCode: 'USD' },
      maxVariantPrice: { amount: '10.00', currencyCode: 'USD' },
    },
    images: { nodes: [] },
    variants: { nodes: [] },
  }
}

function industryOf(element: ReactElement): Industry {
  return (element.props as { industry: Industry }).industry
}

beforeEach(() => {
  mockFetch.mockReset()
})

describe('industry detail page product fetch', () => {
  it('fetches by Storefront tag query for a tag-mapped industry (urgent-care)', async () => {
    mockFetch.mockResolvedValue({ products: { nodes: [mockProduct('p1')] } })

    const element = await IndustryDetailPage({
      params: Promise.resolve({ 'industry-slug': 'urgent-care' }),
    })

    expect(mockFetch).toHaveBeenCalledWith(
      GET_PRODUCTS_BY_TAG,
      expect.objectContaining({
        query: 'tag:"industry:urgent-care"',
        first: 6,
        sortKey: 'BEST_SELLING',
        reverse: false,
      }),
    )
    expect(industryOf(element).relevantProducts).toEqual([mockProduct('p1')])
  })

  it('falls back to the collection fetch for an untagged industry (dental)', async () => {
    mockFetch.mockResolvedValue({ collection: { products: { nodes: [mockProduct('p2')] } } })

    const element = await IndustryDetailPage({
      params: Promise.resolve({ 'industry-slug': 'dental' }),
    })

    expect(mockFetch).toHaveBeenCalledWith(
      GET_COLLECTION,
      expect.objectContaining({
        handle: 'dental',
        first: 6,
        sortKey: 'BEST_SELLING',
        reverse: false,
      }),
    )
    expect(industryOf(element).relevantProducts).toEqual([mockProduct('p2')])
  })

  it('returns an empty array (not a throw) when the collection fetch resolves null', async () => {
    mockFetch.mockResolvedValue({ collection: null })

    const element = await IndustryDetailPage({
      params: Promise.resolve({ 'industry-slug': 'dental' }),
    })

    expect(industryOf(element).relevantProducts).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/industries/__tests__/product-fetch.test.ts`
Expected: FAIL — `GET_PRODUCTS_BY_TAG` doesn't exist yet (import error), and the current page code always calls `GET_COLLECTION` regardless of industry.

- [ ] **Step 3: Add `GET_PRODUCTS_BY_TAG` query**

In `lib/shopify/queries/products.ts`, add this export directly after `GET_PRODUCTS_BY_VENDOR` (after line 116):

```ts
export const GET_PRODUCTS_BY_TAG = `#graphql
  ${PRODUCT_CARD_FRAGMENT}
  query GetProductsByTag(
    $query: String!
    $first: Int!
    $sortKey: ProductSortKeys
    $reverse: Boolean
  ) {
    products(first: $first, sortKey: $sortKey, reverse: $reverse, query: $query) {
      nodes { ...ProductCard }
    }
  }
`;
```

- [ ] **Step 4: Widen `Industry.relevantProducts` and drop the unused lightweight type**

In `types/industry.ts`, remove the `IndustryProduct` interface (lines 6-11) and its use, and import `CollectionProduct`:

```ts
import type { CollectionProduct } from '@/lib/shopify/types'

export interface FAQ {
  question: string
  answer: string
}

export interface IndustryCategory {
  handle: string
  title: string
}

export interface IndustryGuide {
  slug: string
  title: string
}

export interface Industry {
  slug: string
  name: string
  isPopulated: boolean
  intro: string
  buyerType?: string
  heroImage?: { url: string; altText: string }
  relevantCategories: IndustryCategory[]
  relevantSubcategories: IndustryCategory[]
  relevantProducts: CollectionProduct[]
  relatedGuides: IndustryGuide[]
  ctaText: string
  ctaLink: string
  faq?: FAQ[]
  seoTitle?: string
  seoDescription?: string
}
```

- [ ] **Step 5: Branch the fetch in the industry detail page**

In `app/industries/[industry-slug]/page.tsx`, replace the imports and the fetch block. Imports (replace lines 7-11):

```ts
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_COLLECTION } from '@/lib/shopify/queries/collections'
import { GET_PRODUCTS_BY_TAG } from '@/lib/shopify/queries/products'
import { getSubcategories } from '@/lib/category-utils'
import type { Industry } from '@/types/industry'
import type { CollectionProduct } from '@/lib/shopify/types'
```

Replace the fetch block (currently lines 44-65, from `let relevantProducts` through the `if (collectionResult...)` block) with:

```ts
  const productsPromise: Promise<CollectionProduct[]> = industryStatic.tag
    ? storefrontFetch<{ products: { nodes: CollectionProduct[] } }>(GET_PRODUCTS_BY_TAG, {
        query: `tag:"${industryStatic.tag}"`,
        first: 6,
        sortKey: 'BEST_SELLING',
        reverse: false,
      }).then((data) => data.products.nodes)
    : storefrontFetch<{ collection: { products: { nodes: CollectionProduct[] } } | null }>(GET_COLLECTION, {
        handle: industryStatic.collectionHandle,
        first: 6,
        after: null,
        sortKey: 'BEST_SELLING',
        reverse: false,
      }).then((data) => data.collection?.products.nodes ?? [])

  const [productsResult, subcategoryResult] = await Promise.allSettled([
    productsPromise,
    getSubcategories(industryStatic.collectionHandle),
  ])

  const relevantProducts: Industry['relevantProducts'] =
    productsResult.status === 'fulfilled' ? productsResult.value : []
```

(The rest of the function — subcategory mapping and the `industry` object construction — is unchanged; `relevantProducts` is now assigned directly, no more `.map(...)` down to the lightweight shape.)

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run app/industries/__tests__/product-fetch.test.ts`
Expected: PASS (all 3 tests)

- [ ] **Step 7: Run the full existing industries test suite to check for regressions**

Run: `npx vitest run lib/__tests__/industries.test.ts app/industries/__tests__`
Expected: PASS (Task 1's tests, `metadata.test.ts`, and the new `product-fetch.test.ts` all green — `metadata.test.ts` doesn't touch `relevantProducts` so it's unaffected)

- [ ] **Step 8: Commit**

```bash
git add lib/shopify/queries/products.ts types/industry.ts app/industries/[industry-slug]/page.tsx app/industries/__tests__/product-fetch.test.ts
git commit -m "Fetch industry products by Shopify tag when a mapping exists"
```

---

### Task 3: Render swap to `ShopifyProductCard`

**Files:**
- Modify: `components/b2b/IndustryPage.tsx`
- Test: `components/b2b/__tests__/IndustryPage.test.tsx` (new)

**Interfaces:**
- Consumes: `Industry.relevantProducts: CollectionProduct[]` from Task 2; `ShopifyProductCard` (`@/components/store/ShopifyProductCard`, props `{product, categorySlug?, itemListId?, itemListName?, index?, imagePriority?}`); `ViewItemListTracker` (`@/components/category/ViewItemListTracker`, props `{products, itemListId, itemListName}`).

- [ ] **Step 1: Write the failing test**

Create `components/b2b/__tests__/IndustryPage.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import type { CollectionProduct } from '@/lib/shopify/types'
import type { Industry } from '@/types/industry'

vi.mock('@/components/store/ShopifyProductCard', () => ({
  ShopifyProductCard: ({
    product,
    categorySlug,
    itemListId,
    itemListName,
    index,
  }: {
    product: CollectionProduct
    categorySlug?: string
    itemListId?: string
    itemListName?: string
    index?: number
  }) => (
    <div
      data-testid="card"
      data-category-slug={categorySlug ?? ''}
      data-item-list-id={itemListId}
      data-item-list-name={itemListName}
      data-index={index}
    >
      {product.title}
    </div>
  ),
}))

vi.mock('@/components/category/ViewItemListTracker', () => ({
  ViewItemListTracker: () => null,
}))

import { IndustryPage } from '../IndustryPage'

function mockProduct(handle: string): CollectionProduct {
  return {
    id: `gid://shopify/Product/${handle}`,
    title: handle,
    handle,
    vendor: 'Acme',
    availableForSale: true,
    tags: [],
    priceRange: {
      minVariantPrice: { amount: '10.00', currencyCode: 'USD' },
      maxVariantPrice: { amount: '10.00', currencyCode: 'USD' },
    },
    images: { nodes: [] },
    variants: { nodes: [] },
  }
}

function baseIndustry(overrides: Partial<Industry> = {}): Industry {
  return {
    slug: 'urgent-care',
    name: 'Urgent Care',
    isPopulated: true,
    intro: 'Intro copy.',
    relevantCategories: [],
    relevantSubcategories: [],
    relevantProducts: [mockProduct('p1'), mockProduct('p2')],
    relatedGuides: [],
    ctaText: 'Browse',
    ctaLink: '/category/urgent-care',
    ...overrides,
  }
}

afterEach(cleanup)

describe('IndustryPage products section', () => {
  it('renders one ShopifyProductCard per relevant product', () => {
    render(<IndustryPage industry={baseIndustry()} />)

    expect(screen.getAllByTestId('card')).toHaveLength(2)
    expect(screen.getByText('p1')).toBeInTheDocument()
    expect(screen.getByText('p2')).toBeInTheDocument()
  })

  it('does not pass a categorySlug (tag-matched products can span categories)', () => {
    render(<IndustryPage industry={baseIndustry()} />)

    for (const card of screen.getAllByTestId('card')) {
      expect(card.dataset.categorySlug).toBe('')
    }
  })

  it('passes an industry-scoped itemListId and itemListName', () => {
    render(<IndustryPage industry={baseIndustry()} />)

    const [card] = screen.getAllByTestId('card')
    expect(card.dataset.itemListId).toBe('industry-urgent-care-featured')
    expect(card.dataset.itemListName).toBe('Urgent Care Featured Products')
  })

  it('renders nothing in the products section when there are no relevant products', () => {
    render(<IndustryPage industry={baseIndustry({ relevantProducts: [] })} />)

    expect(screen.queryByTestId('card')).toBeNull()
    expect(screen.queryByText('Popular Products')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/b2b/__tests__/IndustryPage.test.tsx`
Expected: FAIL — `IndustryPage` currently renders `FeaturedProductCard` (no `data-testid="card"`), so `getAllByTestId('card')` finds nothing.

- [ ] **Step 3: Swap the card and grid in `IndustryPage.tsx`**

Replace the import (line 3):

```tsx
import { ShopifyProductCard } from '@/components/store/ShopifyProductCard'
import { ViewItemListTracker } from '@/components/category/ViewItemListTracker'
```

Replace the "Products" section (currently lines 108-118):

```tsx
        {/* Products */}
        {industry.relevantProducts.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-bold text-navy-900 mb-6">Popular Products</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-[23px]">
              <ViewItemListTracker
                products={industry.relevantProducts}
                itemListId={`industry-${industry.slug}-featured`}
                itemListName={`${industry.name} Featured Products`}
              />
              {industry.relevantProducts.map((product, index) => (
                <ShopifyProductCard
                  key={product.id}
                  product={product}
                  itemListId={`industry-${industry.slug}-featured`}
                  itemListName={`${industry.name} Featured Products`}
                  index={index}
                  imagePriority={index < 3}
                />
              ))}
            </div>
          </section>
        )}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/b2b/__tests__/IndustryPage.test.tsx`
Expected: PASS (all 4 tests)

- [ ] **Step 5: Run the full test suite to check for regressions**

Run: `npm test`
Expected: PASS across the whole suite (no other file imports `FeaturedProductCard` via `IndustryPage`, and `IndustryProduct`/`Industry.relevantProducts` are only consumed by the files touched in this plan, per prior codebase verification)

- [ ] **Step 6: Commit**

```bash
git add components/b2b/IndustryPage.tsx components/b2b/__tests__/IndustryPage.test.tsx
git commit -m "Render industry featured products with the category page's ShopifyProductCard"
```
