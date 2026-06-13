# T2 SEO Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the MDSupplies headless storefront fully crawlable — dynamic sitemap from Shopify, complete metadata/OG/schema on every public page, no private routes indexable.

**Architecture:** Extend the existing `lib/seo/` library: `getSitemapUrls` becomes async and fetches collections + paginated products + blog articles from Shopify via `storefrontFetch`; static partner/industry slugs come from their canonical lib files. OG/schema gaps are fixed by wiring up existing components (`buildOg`, `ProductSchema`, `BreadcrumbSchema`, `BlogPostingSchema`, `WebPageSchema`) to pages that currently skip them. The `/b2b` duplicate is resolved by adding noindex and a robots disallow.

**Tech Stack:** Next.js 16 App Router, `storefrontFetch` (Shopify Storefront API), Vitest, TypeScript, `lib/seo/*`, `lib/schema/*`, `components/schema/*`

---

## File Map

| File | Change |
|---|---|
| `lib/shopify/queries/products.ts` | Add `GET_ALL_PRODUCT_HANDLES` query |
| `lib/seo/sitemap.ts` | Make `getSitemapUrls` async; add dynamic collection/product/article/partner/industry fetches |
| `lib/seo/__tests__/sitemap.test.ts` | Replace with async-aware tests using `storefrontFetch` mock |
| `app/sitemap.ts` | `export default async function sitemap()` — await the result |
| `lib/seo/robots-config.ts` | Add `/b2b` to production `disallow` list |
| `lib/seo/__tests__/robots-config.test.ts` | Add assertion that `/b2b` is disallowed |
| `app/b2b/page.tsx` | Add `robots: { index: false, follow: false }` to metadata |
| `lib/seo/index.ts` | Export `buildOg` |
| `app/about/page.tsx` | Spread `buildOg(...)` into metadata |
| `app/contact/page.tsx` | Spread `buildOg(...)` into metadata |
| `app/faq/page.tsx` | Spread `buildOg(...)` into metadata |
| `app/returns/page.tsx` | Spread `buildOg(...)` into metadata |
| `app/industries/page.tsx` | Spread `buildOg(...)` into metadata |
| `app/blog/[handle]/page.tsx` | Fix `generateMetadata` → use `buildMetadata`; add `BlogPostingSchema` + `BreadcrumbSchema` |
| `app/category/[slug]/[product]/page.tsx` | Fix `generateMetadata` → use `buildMetadata` |
| `app/product/[slug]/page.tsx` | Render `ProductSchema` + `BreadcrumbSchema` |
| `app/solutions/occ/page.tsx` | Render `WebPageSchema` + `BreadcrumbSchema` |

---

## Task 1: Add `GET_ALL_PRODUCT_HANDLES` Shopify query

**Files:**
- Modify: `lib/shopify/queries/products.ts`

- [ ] **Step 1: Add the query at the bottom of the file**

```typescript
// lib/shopify/queries/products.ts  (append after existing exports)

export const GET_ALL_PRODUCT_HANDLES = `#graphql
  query GetAllProductHandles($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      nodes {
        handle
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`
```

- [ ] **Step 2: Commit**

```bash
git add lib/shopify/queries/products.ts
git commit -m "feat(seo): add GET_ALL_PRODUCT_HANDLES query for sitemap pagination"
```

---

## Task 2: Make sitemap dynamic

**Files:**
- Modify: `lib/seo/sitemap.ts`
- Modify: `lib/seo/__tests__/sitemap.test.ts`
- Modify: `app/sitemap.ts`

> `getSitemapUrls` signature changes from `() => MetadataRoute.Sitemap` to `() => Promise<MetadataRoute.Sitemap>`. `app/sitemap.ts` already calls it, so that file also needs `async`.

- [ ] **Step 1: Write failing tests first**

Replace `lib/seo/__tests__/sitemap.test.ts` with:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSitemapUrls } from '../sitemap'

vi.mock('@/lib/shopify/storefront', () => ({
  storefrontFetch: vi.fn(),
}))

import { storefrontFetch } from '@/lib/shopify/storefront'
const mockFetch = vi.mocked(storefrontFetch)

function setupDefaultMocks(overrides: {
  collections?: string[]
  products?: string[]
  articles?: string[]
} = {}) {
  const collections = overrides.collections ?? []
  const products = overrides.products ?? []
  const articles = overrides.articles ?? []

  mockFetch.mockImplementation((query: string) => {
    if (query.includes('GetCollections(')) {
      return Promise.resolve({ collections: { nodes: collections.map(h => ({ handle: h })) } })
    }
    if (query.includes('GetAllProductHandles')) {
      return Promise.resolve({
        products: {
          nodes: products.map(h => ({ handle: h })),
          pageInfo: { hasNextPage: false, endCursor: '' },
        },
      })
    }
    if (query.includes('GetAllArticleHandles')) {
      return Promise.resolve({
        blogs: {
          nodes: [
            {
              handle: 'news',
              articles: { nodes: articles.map(h => ({ handle: h })) },
            },
          ],
        },
      })
    }
    return Promise.reject(new Error(`Unexpected query: ${String(query).slice(0, 60)}`))
  })
}

beforeEach(() => {
  mockFetch.mockReset()
})

describe('getSitemapUrls', () => {
  it('returns empty array on staging without calling Shopify', async () => {
    expect(await getSitemapUrls(true)).toHaveLength(0)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('includes all static URLs on production', async () => {
    setupDefaultMocks()
    const urls = (await getSitemapUrls(false)).map(e => e.url)
    expect(urls.some(u => u === 'https://mdsupplies.com/')).toBe(true)
    expect(urls.some(u => u.endsWith('/categories'))).toBe(true)
    expect(urls.some(u => u.endsWith('/industries'))).toBe(true)
    expect(urls.some(u => u.endsWith('/partners'))).toBe(true)
    expect(urls.some(u => u.endsWith('/blog'))).toBe(true)
  })

  it('emits /category/<handle> for each Shopify collection', async () => {
    setupDefaultMocks({ collections: ['gloves', 'masks', 'exam-gloves-nitrile'] })
    const urls = (await getSitemapUrls(false)).map(e => e.url)
    expect(urls).toContain('https://mdsupplies.com/category/gloves')
    expect(urls).toContain('https://mdsupplies.com/category/masks')
    expect(urls).toContain('https://mdsupplies.com/category/exam-gloves-nitrile')
  })

  it('excludes brands and brands-* collection handles', async () => {
    setupDefaultMocks({ collections: ['brands', 'brands-dynarex', 'gloves'] })
    const urls = (await getSitemapUrls(false)).map(e => e.url)
    expect(urls.every(u => !u.includes('/brands'))).toBe(true)
    expect(urls).toContain('https://mdsupplies.com/category/gloves')
  })

  it('emits /product/<handle> for each Shopify product', async () => {
    setupDefaultMocks({ products: ['exam-gloves-3xl', 'surgical-mask-50pk'] })
    const urls = (await getSitemapUrls(false)).map(e => e.url)
    expect(urls).toContain('https://mdsupplies.com/product/exam-gloves-3xl')
    expect(urls).toContain('https://mdsupplies.com/product/surgical-mask-50pk')
  })

  it('paginates products across multiple pages', async () => {
    let productCallCount = 0
    mockFetch.mockImplementation((query: string) => {
      if (query.includes('GetCollections(')) {
        return Promise.resolve({ collections: { nodes: [] } })
      }
      if (query.includes('GetAllProductHandles')) {
        productCallCount++
        if (productCallCount === 1) {
          return Promise.resolve({
            products: {
              nodes: [{ handle: 'p1' }, { handle: 'p2' }],
              pageInfo: { hasNextPage: true, endCursor: 'cursor-abc' },
            },
          })
        }
        return Promise.resolve({
          products: {
            nodes: [{ handle: 'p3' }],
            pageInfo: { hasNextPage: false, endCursor: '' },
          },
        })
      }
      if (query.includes('GetAllArticleHandles')) {
        return Promise.resolve({ blogs: { nodes: [] } })
      }
      return Promise.reject(new Error('Unexpected query'))
    })

    const urls = (await getSitemapUrls(false)).map(e => e.url)
    expect(urls).toContain('https://mdsupplies.com/product/p1')
    expect(urls).toContain('https://mdsupplies.com/product/p2')
    expect(urls).toContain('https://mdsupplies.com/product/p3')
  })

  it('emits /partners/<slug> for every partner in static config', async () => {
    setupDefaultMocks()
    const urls = (await getSitemapUrls(false)).map(e => e.url)
    expect(urls.filter(u => u.includes('/partners/')).length).toBeGreaterThan(0)
  })

  it('emits /industries/<slug> for every industry in static config', async () => {
    setupDefaultMocks()
    const urls = (await getSitemapUrls(false)).map(e => e.url)
    expect(urls.filter(u => u.includes('/industries/')).length).toBeGreaterThan(0)
  })

  it('emits /blog/<handle> for each article', async () => {
    setupDefaultMocks({ articles: ['best-exam-gloves-2025', 'hrt-supply-guide'] })
    const urls = (await getSitemapUrls(false)).map(e => e.url)
    expect(urls).toContain('https://mdsupplies.com/blog/best-exam-gloves-2025')
    expect(urls).toContain('https://mdsupplies.com/blog/hrt-supply-guide')
  })

  it('degrades gracefully when Shopify is unreachable — returns static list only', async () => {
    mockFetch.mockRejectedValue(new Error('Network timeout'))
    const urls = await getSitemapUrls(false)
    expect(urls.length).toBeGreaterThan(0)
    const paths = urls.map(e => new URL(e.url).pathname)
    expect(paths).toContain('/')
    expect(paths).toContain('/categories')
  })

  it('never emits /b2b, /account, /cart, /search, /api URLs', async () => {
    setupDefaultMocks()
    const NEVER = ['/b2b', '/account', '/cart', '/search', '/api']
    const urls = (await getSitemapUrls(false)).map(e => e.url)
    for (const excluded of NEVER) {
      const match = urls.find(u => new URL(u).pathname.startsWith(excluded))
      expect(match, `Sitemap must not contain ${excluded}`).toBeUndefined()
    }
  })

  it('homepage has priority 1', async () => {
    setupDefaultMocks()
    const entry = (await getSitemapUrls(false)).find(e => e.url === 'https://mdsupplies.com/')
    expect(entry?.priority).toBe(1)
  })

  it('all URLs use production SITE_URL', async () => {
    setupDefaultMocks({ collections: ['gloves'], products: ['exam-gloves'], articles: ['guide'] })
    const urls = (await getSitemapUrls(false)).map(e => e.url)
    for (const url of urls) {
      expect(url.startsWith('https://mdsupplies.com')).toBe(true)
    }
  })
})
```

- [ ] **Step 2: Run tests — confirm they all FAIL (sitemap is still sync)**

```bash
npx vitest run lib/seo/__tests__/sitemap.test.ts
```

Expected: multiple failures about `getSitemapUrls` not returning a Promise.

- [ ] **Step 3: Replace `lib/seo/sitemap.ts` with the async implementation**

```typescript
import type { MetadataRoute } from 'next'
import { SITE_URL } from './constants'
import { STAGING_GUARD } from './robots'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_COLLECTIONS } from '@/lib/shopify/queries/collections'
import { GET_ALL_PRODUCT_HANDLES } from '@/lib/shopify/queries/products'
import { GET_ALL_ARTICLE_HANDLES } from '@/lib/shopify/queries/blog'
import { PARTNERS } from '@/lib/partners'
import { INDUSTRIES } from '@/lib/industries'

type SitemapEntry = MetadataRoute.Sitemap[number]

const STATIC_URLS: SitemapEntry[] = [
  { url: `${SITE_URL}/`,                changeFrequency: 'weekly',  priority: 1   },
  { url: `${SITE_URL}/categories`,      changeFrequency: 'weekly',  priority: 0.9 },
  { url: `${SITE_URL}/industries`,      changeFrequency: 'monthly', priority: 0.8 },
  { url: `${SITE_URL}/partners`,        changeFrequency: 'monthly', priority: 0.7 },
  { url: `${SITE_URL}/solutions/occ`,   changeFrequency: 'monthly', priority: 0.7 },
  { url: `${SITE_URL}/blog`,            changeFrequency: 'weekly',  priority: 0.7 },
  { url: `${SITE_URL}/about`,           changeFrequency: 'monthly', priority: 0.5 },
  { url: `${SITE_URL}/contact`,         changeFrequency: 'monthly', priority: 0.5 },
  { url: `${SITE_URL}/faq`,             changeFrequency: 'monthly', priority: 0.5 },
  { url: `${SITE_URL}/returns`,         changeFrequency: 'monthly', priority: 0.4 },
]

function isExcludedCollectionHandle(handle: string): boolean {
  return handle === 'brands' || handle.startsWith('brands-')
}

async function fetchCategoryUrls(): Promise<SitemapEntry[]> {
  try {
    const data = await storefrontFetch<{ collections: { nodes: { handle: string }[] } }>(
      GET_COLLECTIONS,
      { first: 250 },
    )
    return data.collections.nodes
      .filter(c => !isExcludedCollectionHandle(c.handle))
      .map(c => ({
        url: `${SITE_URL}/category/${c.handle}`,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }))
  } catch {
    return []
  }
}

async function fetchProductUrls(): Promise<SitemapEntry[]> {
  const handles: string[] = []
  let cursor: string | null = null

  try {
    while (true) {
      const data = await storefrontFetch<{
        products: {
          nodes: { handle: string }[]
          pageInfo: { hasNextPage: boolean; endCursor: string }
        }
      }>(GET_ALL_PRODUCT_HANDLES, { first: 250, after: cursor })

      for (const p of data.products.nodes) handles.push(p.handle)

      if (!data.products.pageInfo.hasNextPage) break
      cursor = data.products.pageInfo.endCursor
    }
  } catch {
    return []
  }

  return handles.map(h => ({
    url: `${SITE_URL}/product/${h}`,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))
}

async function fetchArticleUrls(): Promise<SitemapEntry[]> {
  try {
    const data = await storefrontFetch<{
      blogs: { nodes: { handle: string; articles: { nodes: { handle: string }[] } }[] }
    }>(GET_ALL_ARTICLE_HANDLES)

    return data.blogs.nodes.flatMap(blog =>
      blog.articles.nodes.map(a => ({
        url: `${SITE_URL}/blog/${a.handle}`,
        changeFrequency: 'monthly' as const,
        priority: 0.5,
      })),
    )
  } catch {
    return []
  }
}

export async function getSitemapUrls(
  isStaging: boolean = STAGING_GUARD,
): Promise<MetadataRoute.Sitemap> {
  if (isStaging) return []

  const partnerUrls: SitemapEntry[] = PARTNERS.map(p => ({
    url: `${SITE_URL}/partners/${p.slug}`,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  const industryUrls: SitemapEntry[] = INDUSTRIES.map(i => ({
    url: `${SITE_URL}/industries/${i.slug}`,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

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
}
```

- [ ] **Step 4: Update `app/sitemap.ts` to be async**

```typescript
import type { MetadataRoute } from 'next'
import { getSitemapUrls } from '@/lib/seo/sitemap'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return getSitemapUrls()
}
```

- [ ] **Step 5: Run tests — confirm they all PASS**

```bash
npx vitest run lib/seo/__tests__/sitemap.test.ts
```

Expected: all green.

- [ ] **Step 6: Confirm TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add lib/shopify/queries/products.ts lib/seo/sitemap.ts lib/seo/__tests__/sitemap.test.ts app/sitemap.ts
git commit -m "feat(seo): make sitemap dynamic — collections, paginated products, articles, partners, industries"
```

---

## Task 3: Robots.txt verification + /b2b noindex

**Files:**
- Modify: `lib/seo/robots-config.ts`
- Modify: `lib/seo/__tests__/robots-config.test.ts`
- Modify: `app/b2b/page.tsx`

> The existing production disallow list (`/api/ /account/ /cart /search /internal/`) is missing `/b2b`. The `/b2b` page also lacks `robots: noindex` in its metadata — fix both.

- [ ] **Step 1: Add failing test for `/b2b` disallow**

In `lib/seo/__tests__/robots-config.test.ts`, add inside the existing `describe('getRobotsConfig')` block (after the last `it` before the closing `})`):

```typescript
  it('disallows /b2b on production', () => {
    const cfg = getRobotsConfig(false)
    const rules = Array.isArray(cfg.rules) ? cfg.rules[0] : cfg.rules
    const disallowed = Array.isArray(rules.disallow) ? rules.disallow : [rules.disallow ?? '']
    expect(disallowed).toContain('/b2b')
  })
```

- [ ] **Step 2: Run — confirm it FAILS**

```bash
npx vitest run lib/seo/__tests__/robots-config.test.ts
```

Expected: `AssertionError: expected [ '/api/', '/account/', '/cart', '/search', '/internal/' ] to contain '/b2b'`

- [ ] **Step 3: Add `/b2b` to the disallow list in `lib/seo/robots-config.ts`**

Change the `disallow` array from:
```typescript
disallow: ['/api/', '/account/', '/cart', '/search', '/internal/'],
```
to:
```typescript
disallow: ['/api/', '/account/', '/cart', '/search', '/internal/', '/b2b'],
```

- [ ] **Step 4: Run — confirm test PASSES**

```bash
npx vitest run lib/seo/__tests__/robots-config.test.ts
```

Expected: all green.

- [ ] **Step 5: Add noindex to `/b2b` page metadata**

In `app/b2b/page.tsx`, the current `metadata` object is:
```typescript
export const metadata: Metadata = {
  title: "My Account | MD Supplies",
  description:
    "Manage your MD Supplies account — track orders, save addresses, and view invoices.",
};
```

Replace with:
```typescript
export const metadata: Metadata = {
  title: "My Account | MD Supplies",
  description:
    "Manage your MD Supplies account — track orders, save addresses, and view invoices.",
  robots: { index: false, follow: false },
};
```

- [ ] **Step 6: Compile check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add lib/seo/robots-config.ts lib/seo/__tests__/robots-config.test.ts app/b2b/page.tsx
git commit -m "fix(seo): disallow /b2b in robots.txt; add noindex to /b2b page metadata"
```

---

## Task 4: Add OG/Twitter to static metadata pages

**Files:**
- Modify: `lib/seo/index.ts`
- Modify: `app/about/page.tsx`
- Modify: `app/contact/page.tsx`
- Modify: `app/faq/page.tsx`
- Modify: `app/returns/page.tsx`
- Modify: `app/industries/page.tsx`

> `buildOg` exists in `lib/seo/og.ts` but is not exported from `lib/seo/index.ts`. About/contact/faq/returns/industries have correct title + description + canonical + robots but no OG/Twitter. We spread `buildOg(...)` into each metadata object.

- [ ] **Step 1: Export `buildOg` from `lib/seo/index.ts`**

Add the following export line after `export { buildRobots, STAGING_GUARD } from './robots'`:

```typescript
export { buildOg } from './og'
```

The full `lib/seo/index.ts` should now read:
```typescript
export { buildMetadata } from './metadata'
export { buildCanonical } from './canonical'
export { buildRobots, STAGING_GUARD } from './robots'
export { buildOg } from './og'
export { getSitemapUrls } from './sitemap'
export { getRobotsConfig } from './robots-config'
export type {
  PageType,
  MetadataInput,
  CanonicalInput,
  CanonicalStrategy,
  RobotsInput,
} from './types'
```

- [ ] **Step 2: Update `app/about/page.tsx`**

Change the import at the top from:
```typescript
import { buildCanonical, buildRobots } from '@/lib/seo'
```
to:
```typescript
import { buildCanonical, buildRobots, buildOg } from '@/lib/seo'
```

Change the `metadata` export from:
```typescript
export const metadata = {
  title: 'About Us | MDSupplies',
  description: 'MDSupplies serves clinics, urgent care centers, HRT practices, and first responders with wholesale pricing, same-day shipping, and trusted brands.',
  robots: buildRobots({ pageType: 'homepage' }), // non-utility type → index,follow; staging guard applied
  alternates: { canonical: buildCanonical({ path: '/about' }) },
}
```
to:
```typescript
const _aboutCanonical = buildCanonical({ path: '/about' })
export const metadata = {
  title: 'About Us | MDSupplies',
  description: 'MDSupplies serves clinics, urgent care centers, HRT practices, and first responders with wholesale pricing, same-day shipping, and trusted brands.',
  robots: buildRobots({ pageType: 'homepage' }),
  alternates: { canonical: _aboutCanonical },
  ...buildOg({
    pageType: 'homepage',
    title: 'About Us | MDSupplies',
    description: 'MDSupplies serves clinics, urgent care centers, HRT practices, and first responders with wholesale pricing, same-day shipping, and trusted brands.',
    url: _aboutCanonical,
  }),
}
```

- [ ] **Step 3: Update `app/contact/page.tsx`**

Change import:
```typescript
import { buildCanonical, buildRobots, buildOg } from '@/lib/seo'
```

Change metadata:
```typescript
const _contactCanonical = buildCanonical({ path: '/contact' })
export const metadata = {
  title: 'Contact Us | MDSupplies',
  description: 'Get in touch with the MD Supplies team for wholesale inquiries.',
  robots: buildRobots({ pageType: 'homepage' }),
  alternates: { canonical: _contactCanonical },
  ...buildOg({
    pageType: 'homepage',
    title: 'Contact Us | MDSupplies',
    description: 'Get in touch with the MD Supplies team for wholesale inquiries.',
    url: _contactCanonical,
  }),
}
```

- [ ] **Step 4: Update `app/faq/page.tsx`**

Change import (it currently imports `buildCanonical, buildRobots`):
```typescript
import { buildCanonical, buildRobots, buildOg } from '@/lib/seo'
```

Change metadata:
```typescript
const _faqCanonical = buildCanonical({ path: '/faq' })
export const metadata = {
  title: 'FAQ | MDSupplies',
  description: 'Frequently asked questions about MD Supplies — shipping, returns, product authenticity, and wholesale pricing.',
  robots: buildRobots({ pageType: 'homepage' }),
  alternates: { canonical: _faqCanonical },
  ...buildOg({
    pageType: 'homepage',
    title: 'FAQ | MDSupplies',
    description: 'Frequently asked questions about MD Supplies — shipping, returns, product authenticity, and wholesale pricing.',
    url: _faqCanonical,
  }),
}
```

- [ ] **Step 5: Update `app/returns/page.tsx`**

Change import:
```typescript
import { buildCanonical, buildRobots, buildOg } from '@/lib/seo'
```

Change metadata:
```typescript
const _returnsCanonical = buildCanonical({ path: '/returns' })
export const metadata = {
  title: 'Returns | MDSupplies',
  description: 'MD Supplies return policy and return request instructions.',
  robots: buildRobots({ pageType: 'homepage' }),
  alternates: { canonical: _returnsCanonical },
  ...buildOg({
    pageType: 'homepage',
    title: 'Returns | MDSupplies',
    description: 'MD Supplies return policy and return request instructions.',
    url: _returnsCanonical,
  }),
}
```

- [ ] **Step 6: Update `app/industries/page.tsx`**

Change import:
```typescript
import { buildCanonical, buildRobots, buildOg } from '@/lib/seo'
```

Change metadata:
```typescript
const _industriesCanonical = buildCanonical({ path: '/industries' })
export const metadata = {
  title: 'Shop by Industry | MDSupplies',
  description: 'Medical supplies curated for your specialty — urgent care, EMS, pharmacy, physical therapy, and more.',
  robots: buildRobots({ pageType: 'homepage' }),
  alternates: { canonical: _industriesCanonical },
  ...buildOg({
    pageType: 'homepage',
    title: 'Shop by Industry | MDSupplies',
    description: 'Medical supplies curated for your specialty — urgent care, EMS, pharmacy, physical therapy, and more.',
    url: _industriesCanonical,
  }),
}
```

- [ ] **Step 7: Compile check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 8: Commit**

```bash
git add lib/seo/index.ts app/about/page.tsx app/contact/page.tsx app/faq/page.tsx app/returns/page.tsx app/industries/page.tsx
git commit -m "fix(seo): add OG/Twitter cards to about, contact, faq, returns, industries pages"
```

---

## Task 5: Fix blog article page metadata + add schema

**Files:**
- Modify: `app/blog/[handle]/page.tsx`

> The blog article `generateMetadata` builds metadata manually — missing canonical URL and `pageType`-based robots. Also, the page renders no `BlogPostingSchema` or `BreadcrumbSchema`. Fix all three in one pass.

- [ ] **Step 1: Update imports in `app/blog/[handle]/page.tsx`**

The current imports start with:
```typescript
import type { Metadata } from "next";
import Link from "next/link";
```

Add/update so the following imports are present (merge with existing, don't duplicate):
```typescript
import { buildMetadata } from "@/lib/seo";
import { BlogPostingSchema } from "@/components/schema/BlogPostingSchema";
import { BreadcrumbSchema } from "@/components/schema/BreadcrumbSchema";
```

- [ ] **Step 2: Replace the `generateMetadata` function**

Find and replace the entire `generateMetadata` function:
```typescript
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  try {
    const found = await findArticle(handle);
    if (!found) return { title: "Article | MD Supplies Blog" };
    const { article } = found;
    return {
      title: `${article.title} | MD Supplies Blog`,
      description: article.excerpt?.slice(0, 155) ?? undefined,
      openGraph: article.image
        ? { images: [{ url: article.image.url, alt: article.image.altText ?? article.title }] }
        : undefined,
    };
  } catch {
    return { title: "Article | MD Supplies Blog" };
  }
}
```

Replace with:
```typescript
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  try {
    const found = await findArticle(handle);
    if (!found) return buildMetadata({ pageType: 'blog-article', slug: handle });
    const { article } = found;
    return buildMetadata({
      pageType: 'blog-article',
      title: article.title,
      description: article.excerpt?.slice(0, 155) ?? undefined,
      slug: handle,
      image: article.image?.url,
    });
  } catch {
    return buildMetadata({ pageType: 'blog-article', slug: handle });
  }
}
```

- [ ] **Step 3: Add `BlogPostingSchema` and `BreadcrumbSchema` to the JSX return**

In the `return (` block of the default export function, find the opening `<main className="bg-white">` line. Add the schema components immediately after it, before the hero div:

```tsx
  return (
    <main className="bg-white">
      <BlogPostingSchema
        headline={article.title}
        description={article.excerpt ?? ''}
        image={heroSrc}
        datePublished={article.publishedAt}
        authorName={article.author.name}
        url={`https://mdsupplies.com/blog/${article.handle}`}
      />
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://mdsupplies.com' },
          { name: 'Blog', url: 'https://mdsupplies.com/blog' },
          { name: article.title, url: `https://mdsupplies.com/blog/${article.handle}` },
        ]}
      />
      {/* ── Hero image with breadcrumb overlay ── */}
```

> **Note:** Check `components/schema/BlogPostingSchema.tsx` prop names before finalising — use the exact prop names the component expects. If the component uses different prop names (e.g. `author` vs `authorName`), match them.

- [ ] **Step 4: Verify `BlogPostingSchema` prop interface**

Read `components/schema/BlogPostingSchema.tsx` and confirm the prop names. The schema component in Step 3 uses:
- `headline` — article title
- `description` — excerpt
- `image` — image URL
- `datePublished` — ISO string
- `authorName` — author's name
- `url` — canonical article URL

If the component has different prop names, update the JSX in Step 3 to match.

- [ ] **Step 5: Compile check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add "app/blog/[handle]/page.tsx"
git commit -m "fix(seo): blog article — buildMetadata canonical, BlogPostingSchema, BreadcrumbSchema"
```

---

## Task 6: Fix category-product page metadata

**Files:**
- Modify: `app/category/[slug]/[product]/page.tsx`

> This page (`/category/gloves/product-handle`) is a product detail in a category context. Its `generateMetadata` builds metadata manually — missing canonical URL and OG/Twitter.

- [ ] **Step 1: Update imports**

At the top of `app/category/[slug]/[product]/page.tsx`, add `buildMetadata` to imports:
```typescript
import { buildMetadata } from '@/lib/seo'
```

- [ ] **Step 2: Replace `generateMetadata`**

Find the current:
```typescript
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { product: handle } = await params
  try {
    const data = await storefrontFetch<{ product: Product | null }>(GET_PRODUCT, { handle })
    if (!data.product) return { title: 'Product | MD Supplies' }
    return {
      title: `${data.product.title} | MD Supplies`,
      description: data.product.description.slice(0, 155) || `Buy ${data.product.title} at wholesale prices`,
    }
  } catch {
    return { title: 'Product | MD Supplies' }
  }
}
```

Replace with:
```typescript
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { product: handle } = await params
  try {
    const data = await storefrontFetch<{ product: Product | null }>(GET_PRODUCT, { handle })
    if (!data.product) return buildMetadata({ pageType: 'product', slug: handle })
    const p = data.product
    const brand = (p as unknown as { brandName?: string | null }).brandName ?? p.vendor
    return buildMetadata({
      pageType: 'product',
      title: p.title,
      description: `${brand} — ${p.description.slice(0, 140)}`,
      slug: handle,
      image: p.images.nodes[0]?.url,
    })
  } catch {
    return buildMetadata({ pageType: 'product', slug: handle })
  }
}
```

- [ ] **Step 3: Compile check**

```bash
npx tsc --noEmit
```

Expected: 0 errors. If `Product` type doesn't expose `brandName`, adjust the cast. The standalone PDP (`app/product/[slug]/page.tsx`) uses `RawProduct` that includes `brandName` — the category-product page uses `Product` directly. Use `p.vendor` as the brand fallback if `brandName` is not on `Product`.

Simplified safe version if there are type errors:
```typescript
    return buildMetadata({
      pageType: 'product',
      title: p.title,
      description: p.description.slice(0, 155) || `Buy ${p.title} at wholesale prices from MDSupplies`,
      slug: handle,
      image: p.images.nodes[0]?.url,
    })
```

- [ ] **Step 4: Commit**

```bash
git add "app/category/[slug]/[product]/page.tsx"
git commit -m "fix(seo): category-product page — use buildMetadata for canonical + OG"
```

---

## Task 7: Add ProductSchema + BreadcrumbSchema to standalone PDP

**Files:**
- Modify: `app/product/[slug]/page.tsx`

> The `ProductSchema` component exists at `components/schema/ProductSchema.tsx` but is never rendered. The standalone PDP at `/product/<slug>` (distinct from the category-context PDP) renders `ProductView` but emits no JSON-LD. Add both `ProductSchema` and `BreadcrumbSchema`.

- [ ] **Step 1: Add imports to `app/product/[slug]/page.tsx`**

Add to the existing imports:
```typescript
import { ProductSchema } from '@/components/schema/ProductSchema'
import { BreadcrumbSchema } from '@/components/schema/BreadcrumbSchema'
import { SITE_URL } from '@/lib/seo/constants'
```

- [ ] **Step 2: Add schemas to the JSX return**

The current return is:
```tsx
  return (
    <main className="bg-[#f9fafc]">
      <ProductView
        product={product}
        relatedProducts={relatedProducts}
        complementaryProducts={complementaryProducts}
      />
    </main>
  )
```

Replace with:
```tsx
  const firstVariant = product.variants.nodes[0]
  const price = parseFloat(firstVariant?.price?.amount ?? '0')
  const isAvailable = firstVariant?.availableForSale ?? product.availableForSale
  const productUrl = `${SITE_URL}/product/${slug}`

  return (
    <main className="bg-[#f9fafc]">
      <ProductSchema
        name={product.title}
        description={product.description}
        image={product.images.nodes[0]?.url ?? ''}
        sku={product.variants.nodes[0]?.id ?? slug}
        brand={product.brandName ?? product.vendor}
        price={price}
        priceCurrency={firstVariant?.price?.currencyCode ?? 'USD'}
        availability={isAvailable ? 'InStock' : 'OutOfStock'}
        url={productUrl}
        seller="MDSupplies"
      />
      <BreadcrumbSchema
        items={[
          { name: 'Home',     url: SITE_URL },
          { name: 'Products', url: `${SITE_URL}/categories` },
          { name: product.title, url: productUrl },
        ]}
      />
      <ProductView
        product={product}
        relatedProducts={relatedProducts}
        complementaryProducts={complementaryProducts}
      />
    </main>
  )
```

- [ ] **Step 3: Check `BreadcrumbSchema` prop interface**

Read `components/schema/BreadcrumbSchema.tsx` to confirm the prop is `items: { name: string; url: string }[]`. Adjust the JSX if the prop names differ.

- [ ] **Step 4: Compile check**

```bash
npx tsc --noEmit
```

Expected: 0 errors. If `product.brandName` is `null | string` (from `normalizeProduct`) and `ProductSchema` expects `string`, coerce it: `product.brandName ?? product.vendor`.

- [ ] **Step 5: Commit**

```bash
git add "app/product/[slug]/page.tsx"
git commit -m "feat(seo): add ProductSchema + BreadcrumbSchema to standalone PDP"
```

---

## Task 8: Add WebPageSchema + BreadcrumbSchema to OCC page

**Files:**
- Modify: `app/solutions/occ/page.tsx`

> The OCC page has correct `buildMetadata` but no JSON-LD schema. It's a solutions page so use `WebPageSchema`.

- [ ] **Step 1: Add imports to `app/solutions/occ/page.tsx`**

Add to existing imports:
```typescript
import { WebPageSchema } from '@/components/schema/WebPageSchema'
import { BreadcrumbSchema } from '@/components/schema/BreadcrumbSchema'
import { SITE_URL } from '@/lib/seo/constants'
```

- [ ] **Step 2: Check `WebPageSchema` prop interface**

Read `components/schema/WebPageSchema.tsx` to confirm its props. It likely expects `name`, `description`, `url`. Note the exact props.

- [ ] **Step 3: Update the default export JSX in `app/solutions/occ/page.tsx`**

The current return is:
```tsx
  return <OCCHubPage hub={{ ...OCC_HUB, eligibleProducts: liveProducts }} />
```

Replace with:
```tsx
  return (
    <>
      <WebPageSchema
        name={OCC_HUB.seoTitle}
        description={OCC_HUB.seoDescription || OCC_HUB.intro}
        url={`${SITE_URL}/solutions/occ`}
      />
      <BreadcrumbSchema
        items={[
          { name: 'Home',      url: SITE_URL },
          { name: 'Solutions', url: `${SITE_URL}/solutions/occ` },
          { name: 'OCC',       url: `${SITE_URL}/solutions/occ` },
        ]}
      />
      <OCCHubPage hub={{ ...OCC_HUB, eligibleProducts: liveProducts }} />
    </>
  )
```

> If `WebPageSchema` or `BreadcrumbSchema` have different prop names, adjust to match what you found in Step 2.

- [ ] **Step 4: Check `OCC_HUB` shape for `seoTitle` and `seoDescription`**

Read `lib/occ.ts` to confirm the object has `seoTitle: string` and `seoDescription: string | undefined`. If the field names differ, update the JSX accordingly.

- [ ] **Step 5: Compile check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add "app/solutions/occ/page.tsx"
git commit -m "feat(seo): add WebPageSchema + BreadcrumbSchema to OCC page"
```

---

## Task 9: Metafield access audit (documentation)

**Files:**
- Read: `lib/shopify/types.ts` — see all defined metafields
- Read: `app/product/[slug]/page.tsx` — see `normalizeProduct` which maps raw metafields

> No code changes in this task. The goal is to produce a list of metafields that may return `null` due to Shopify Storefront API access gates, so the team can enable "Read access" in the Shopify Admin for each definition.

- [ ] **Step 1: List all metafields in `ProductMetafields` type**

Read `lib/shopify/types.ts` and find the `ProductMetafields` interface. Note every field name:
```
brandName, unitsPerOrder, quantityOfUnits, orderSize, material, use, features,
color, sterility, thickness, gloveSize, needleGauge, needleLength, sizeLength,
estimatedRestockDate, testsFor, detectableDrugs, adulterants, otherFeatures,
typeList, customBadge1, customBadge2, customBadge3
```
(Verify this list against the actual file.)

- [ ] **Step 2: Identify which metafields surface in UI or schema**

Scan `components/product/` for any metafield consumption. Note which ones are rendered in the UI (and therefore visible to Google) vs hidden.

- [ ] **Step 3: Document the gate requirements**

For each metafield surfaced in schema or visible UI, the Shopify token must have:
1. `unauthenticated_read_metafields` scope on the Storefront API key
2. Each metafield definition must have **Storefront API access → Read** toggled on in Shopify Admin (`Settings → Custom data → Products → [metafield] → Storefront access: enabled`)

- [ ] **Step 4: Flag any that currently return null**

In a dev environment, add a temporary `console.log` to `normalizeProduct` to log which metafields return `null` for a real product. Or inspect the Shopify response in the Network tab. Any field consistently returning `null` despite having real data is behind a closed gate.

- [ ] **Step 5: Report**

Write a comment in `lib/shopify/queries/products.ts` above `GET_PRODUCT`:
```typescript
// Metafield gate requirements — each field needs Storefront "Read access" enabled in Shopify Admin.
// Run a GET_PRODUCT fetch and check which return null to identify closed gates.
```

No commit needed for this task unless you find null-returning metafields that need a code-level workaround.

---

## Spec → Task Coverage

| T2 spec requirement | Covered by |
|---|---|
| Dynamic sitemap (collections, products, articles) | Task 2 |
| Exclude noindex/brands/redirected from sitemap | Task 2 |
| Robots disallow list complete | Task 3 |
| Metadata coverage sweep (canonical + description) | Tasks 4, 5, 6 |
| OG/Twitter cards where missing | Tasks 4, 5 |
| Schema — Product, Breadcrumb, CollectionPage, Organization/OnlineStore | Tasks 7, 8 (Org/WebSite already in `app/layout.tsx`) |
| Noindex on private routes | Task 3 (/b2b), existing (search/cart/account via `buildMetadata`/`(noindex)` group) |
| Fix `/b2b` duplicate | Task 3 |
| Metafield storefront-access check | Task 9 |
