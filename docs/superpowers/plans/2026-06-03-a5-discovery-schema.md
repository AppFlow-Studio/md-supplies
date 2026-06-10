# A5 · Discovery Schema Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Inject server-rendered structured data (Organization/OnlineStore sitewide, WebSite+SearchAction on the homepage, CollectionPage on category/subcategory pages, BreadcrumbList wherever breadcrumbs are visible) so Google can earn rich results.

**Architecture:** A new `lib/schema/` module mirrors the existing `lib/seo/` structure — one pure builder function per file. Each builder returns a plain JS object (no `JSON.stringify` inside), which the page/layout converts to a `<script type="application/ld+json">` tag via `dangerouslySetInnerHTML`. The schema builders are imported and called in RSC page components (no client code required). The builders import `SITE_URL` and `SITE_NAME` from `lib/seo/constants.ts` to keep a single source of truth.

**Tech Stack:** Vitest (tests), TypeScript, Next.js App Router RSC (injection), schema.org vocabulary

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `lib/schema/organization.ts` | `buildOrganizationSchema()` → OnlineStore |
| Create | `lib/schema/website.ts` | `buildWebSiteSchema()` → WebSite + SearchAction |
| Create | `lib/schema/collection.ts` | `buildCollectionPageSchema()` → CollectionPage |
| Create | `lib/schema/breadcrumb.ts` | `buildBreadcrumbListSchema()` → BreadcrumbList |
| Create | `lib/schema/index.ts` | Barrel re-export |
| Create | `lib/schema/__tests__/organization.test.ts` | Vitest for organization builder |
| Create | `lib/schema/__tests__/website.test.ts` | Vitest for website builder |
| Create | `lib/schema/__tests__/collection.test.ts` | Vitest for collection builder |
| Create | `lib/schema/__tests__/breadcrumb.test.ts` | Vitest for breadcrumb builder |
| Modify | `app/layout.tsx` | Add Organization `<script>` tag sitewide |
| Modify | `app/page.tsx` | Add WebSite+SearchAction `<script>` tag |
| Modify | `app/category/[slug]/page.tsx` | Replace empty schema slot with CollectionPage + BreadcrumbList |
| Modify | `app/category/[slug]/[sub]/page.tsx` | Replace empty schema slot with CollectionPage + BreadcrumbList |
| Modify | `app/categories/page.tsx` | Add BreadcrumbList `<script>` tag |

---

## Task 1: `buildOrganizationSchema` — OnlineStore (TDD)

**Files:**
- Create: `lib/schema/__tests__/organization.test.ts`
- Create: `lib/schema/organization.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/schema/__tests__/organization.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildOrganizationSchema } from '../organization'

describe('buildOrganizationSchema', () => {
  it('@context is https://schema.org', () => {
    expect(buildOrganizationSchema()['@context']).toBe('https://schema.org')
  })

  it('@type is OnlineStore', () => {
    expect(buildOrganizationSchema()['@type']).toBe('OnlineStore')
  })

  it('name defaults to MDSupplies', () => {
    expect(buildOrganizationSchema().name).toBe('MDSupplies')
  })

  it('url defaults to https://mdsupplies.com', () => {
    expect(buildOrganizationSchema().url).toBe('https://mdsupplies.com')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/schema/__tests__/organization.test.ts`
Expected: FAIL — `Cannot find module '../organization'`

- [ ] **Step 3: Implement `organization.ts`**

Create `lib/schema/organization.ts`:

```ts
import { SITE_NAME, SITE_URL } from '@/lib/seo/constants'

export function buildOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'OnlineStore',
    name: SITE_NAME,
    url: SITE_URL,
  } as const
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/schema/__tests__/organization.test.ts`
Expected: PASS — 4 passing

- [ ] **Step 5: Commit**

```bash
git add lib/schema/organization.ts lib/schema/__tests__/organization.test.ts
git commit -m "feat(a5): add buildOrganizationSchema (OnlineStore)"
```

---

## Task 2: `buildWebSiteSchema` — WebSite + SearchAction (TDD)

**Files:**
- Create: `lib/schema/__tests__/website.test.ts`
- Create: `lib/schema/website.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/schema/__tests__/website.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildWebSiteSchema } from '../website'

describe('buildWebSiteSchema', () => {
  it('@context is https://schema.org', () => {
    expect(buildWebSiteSchema()['@context']).toBe('https://schema.org')
  })

  it('@type is WebSite', () => {
    expect(buildWebSiteSchema()['@type']).toBe('WebSite')
  })

  it('name is MDSupplies', () => {
    expect(buildWebSiteSchema().name).toBe('MDSupplies')
  })

  it('url is site root', () => {
    expect(buildWebSiteSchema().url).toBe('https://mdsupplies.com')
  })

  it('potentialAction @type is SearchAction', () => {
    expect(buildWebSiteSchema().potentialAction['@type']).toBe('SearchAction')
  })

  it('SearchAction urlTemplate points to /search?q=', () => {
    const schema = buildWebSiteSchema()
    expect(schema.potentialAction.target.urlTemplate).toBe(
      'https://mdsupplies.com/search?q={search_term_string}',
    )
  })

  it('query-input is required name=search_term_string', () => {
    expect(buildWebSiteSchema().potentialAction['query-input']).toBe(
      'required name=search_term_string',
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/schema/__tests__/website.test.ts`
Expected: FAIL — `Cannot find module '../website'`

- [ ] **Step 3: Implement `website.ts`**

Create `lib/schema/website.ts`:

```ts
import { SITE_NAME, SITE_URL } from '@/lib/seo/constants'

export function buildWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/schema/__tests__/website.test.ts`
Expected: PASS — 7 passing

- [ ] **Step 5: Commit**

```bash
git add lib/schema/website.ts lib/schema/__tests__/website.test.ts
git commit -m "feat(a5): add buildWebSiteSchema (WebSite + SearchAction)"
```

---

## Task 3: `buildCollectionPageSchema` — CollectionPage (TDD)

**Files:**
- Create: `lib/schema/__tests__/collection.test.ts`
- Create: `lib/schema/collection.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/schema/__tests__/collection.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildCollectionPageSchema } from '../collection'

const BASE_URL = 'https://mdsupplies.com/category/exam-gloves'

describe('buildCollectionPageSchema', () => {
  it('@context is https://schema.org', () => {
    expect(buildCollectionPageSchema({ name: 'Exam Gloves', url: BASE_URL })['@context']).toBe(
      'https://schema.org',
    )
  })

  it('@type is CollectionPage', () => {
    expect(buildCollectionPageSchema({ name: 'Exam Gloves', url: BASE_URL })['@type']).toBe(
      'CollectionPage',
    )
  })

  it('name is set from input', () => {
    expect(buildCollectionPageSchema({ name: 'Exam Gloves', url: BASE_URL }).name).toBe(
      'Exam Gloves',
    )
  })

  it('url is set from input', () => {
    expect(buildCollectionPageSchema({ name: 'Gloves', url: BASE_URL }).url).toBe(BASE_URL)
  })

  it('description is included when provided', () => {
    const schema = buildCollectionPageSchema({
      name: 'Gloves',
      url: BASE_URL,
      description: 'Wholesale exam gloves',
    })
    expect(schema.description).toBe('Wholesale exam gloves')
  })

  it('description is absent when not provided', () => {
    const schema = buildCollectionPageSchema({ name: 'Gloves', url: BASE_URL })
    expect('description' in schema).toBe(false)
  })

  it('image is included when provided', () => {
    const schema = buildCollectionPageSchema({
      name: 'Gloves',
      url: BASE_URL,
      image: 'https://cdn.example.com/gloves.jpg',
    })
    expect(schema.image).toBe('https://cdn.example.com/gloves.jpg')
  })

  it('image is absent when not provided', () => {
    const schema = buildCollectionPageSchema({ name: 'Gloves', url: BASE_URL })
    expect('image' in schema).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/schema/__tests__/collection.test.ts`
Expected: FAIL — `Cannot find module '../collection'`

- [ ] **Step 3: Implement `collection.ts`**

Create `lib/schema/collection.ts`:

```ts
interface CollectionPageInput {
  name: string
  url: string
  description?: string
  image?: string
}

export function buildCollectionPageSchema(input: CollectionPageInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: input.name,
    url: input.url,
    ...(input.description ? { description: input.description } : {}),
    ...(input.image ? { image: input.image } : {}),
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/schema/__tests__/collection.test.ts`
Expected: PASS — 8 passing

- [ ] **Step 5: Commit**

```bash
git add lib/schema/collection.ts lib/schema/__tests__/collection.test.ts
git commit -m "feat(a5): add buildCollectionPageSchema (CollectionPage)"
```

---

## Task 4: `buildBreadcrumbListSchema` — BreadcrumbList (TDD)

**Files:**
- Create: `lib/schema/__tests__/breadcrumb.test.ts`
- Create: `lib/schema/breadcrumb.ts`

The function mirrors the `Breadcrumb` component from `components/layout/Breadcrumb.tsx` — it takes the same `items` array (which starts AFTER "Home"; "Home" is always prepended automatically). An optional `currentUrl` absolute URL is passed to populate the `item` property on the last element when it has no `href`.

- [ ] **Step 1: Write the failing test**

Create `lib/schema/__tests__/breadcrumb.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildBreadcrumbListSchema } from '../breadcrumb'

describe('buildBreadcrumbListSchema', () => {
  it('@context is https://schema.org', () => {
    expect(
      buildBreadcrumbListSchema([{ label: 'Exam Gloves' }])['@context'],
    ).toBe('https://schema.org')
  })

  it('@type is BreadcrumbList', () => {
    expect(
      buildBreadcrumbListSchema([{ label: 'Exam Gloves' }])['@type'],
    ).toBe('BreadcrumbList')
  })

  it('first element is always Home at position 1 with site URL', () => {
    const schema = buildBreadcrumbListSchema([{ label: 'Exam Gloves' }])
    const first = schema.itemListElement[0]
    expect(first.position).toBe(1)
    expect(first.name).toBe('Home')
    expect(first.item).toBe('https://mdsupplies.com/')
  })

  it('single item at position 2 with href', () => {
    const schema = buildBreadcrumbListSchema([
      { label: 'Exam Gloves', href: '/category/exam-gloves' },
    ])
    const second = schema.itemListElement[1]
    expect(second.position).toBe(2)
    expect(second.name).toBe('Exam Gloves')
    expect(second.item).toBe('https://mdsupplies.com/category/exam-gloves')
  })

  it('last item uses currentUrl when item has no href', () => {
    const schema = buildBreadcrumbListSchema(
      [{ label: 'Exam Gloves' }],
      'https://mdsupplies.com/category/exam-gloves',
    )
    const last = schema.itemListElement[schema.itemListElement.length - 1]
    expect(last.item).toBe('https://mdsupplies.com/category/exam-gloves')
  })

  it('last item has no item property when href absent and no currentUrl', () => {
    const schema = buildBreadcrumbListSchema([{ label: 'Exam Gloves' }])
    const last = schema.itemListElement[schema.itemListElement.length - 1]
    expect('item' in last).toBe(false)
  })

  it('three-level L2 breadcrumb is correct', () => {
    const schema = buildBreadcrumbListSchema(
      [
        { label: 'Exam Gloves', href: '/category/exam-gloves' },
        { label: 'Nitrile' },
      ],
      'https://mdsupplies.com/category/exam-gloves/nitrile',
    )
    expect(schema.itemListElement).toHaveLength(3)
    expect(schema.itemListElement[0].name).toBe('Home')
    expect(schema.itemListElement[1].name).toBe('Exam Gloves')
    expect(schema.itemListElement[1].item).toBe('https://mdsupplies.com/category/exam-gloves')
    expect(schema.itemListElement[2].name).toBe('Nitrile')
    expect(schema.itemListElement[2].item).toBe(
      'https://mdsupplies.com/category/exam-gloves/nitrile',
    )
  })

  it('positions are sequential starting at 1', () => {
    const schema = buildBreadcrumbListSchema([
      { label: 'A', href: '/a' },
      { label: 'B', href: '/b' },
      { label: 'C' },
    ])
    expect(schema.itemListElement.map((e) => e.position)).toEqual([1, 2, 3, 4])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/schema/__tests__/breadcrumb.test.ts`
Expected: FAIL — `Cannot find module '../breadcrumb'`

- [ ] **Step 3: Implement `breadcrumb.ts`**

Create `lib/schema/breadcrumb.ts`:

```ts
import { SITE_URL } from '@/lib/seo/constants'

interface BreadcrumbItem {
  label: string
  href?: string
}

export function buildBreadcrumbListSchema(
  items: BreadcrumbItem[],
  currentUrl?: string,
) {
  const allItems: BreadcrumbItem[] = [{ label: 'Home', href: '/' }, ...items]

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: allItems.map((item, i) => {
      const isLast = i === allItems.length - 1
      const itemUrl = item.href
        ? `${SITE_URL}${item.href}`
        : isLast && currentUrl
          ? currentUrl
          : undefined

      return {
        '@type': 'ListItem',
        position: i + 1,
        name: item.label,
        ...(itemUrl !== undefined ? { item: itemUrl } : {}),
      }
    }),
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/schema/__tests__/breadcrumb.test.ts`
Expected: PASS — 8 passing

- [ ] **Step 5: Commit**

```bash
git add lib/schema/breadcrumb.ts lib/schema/__tests__/breadcrumb.test.ts
git commit -m "feat(a5): add buildBreadcrumbListSchema (BreadcrumbList)"
```

---

## Task 5: Barrel export `lib/schema/index.ts`

**Files:**
- Create: `lib/schema/index.ts`

- [ ] **Step 1: Create the barrel**

Create `lib/schema/index.ts`:

```ts
export { buildOrganizationSchema } from './organization'
export { buildWebSiteSchema } from './website'
export { buildCollectionPageSchema } from './collection'
export { buildBreadcrumbListSchema } from './breadcrumb'
```

- [ ] **Step 2: Run all schema tests**

Run: `npx vitest run lib/schema/__tests__/`
Expected: all 4 test files pass, 0 failures

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add lib/schema/index.ts
git commit -m "feat(a5): add lib/schema barrel export"
```

---

## Task 6: Wire Organization schema into `app/layout.tsx`

**Files:**
- Modify: `app/layout.tsx`

The Organization schema goes in the `<body>` before CartProvider so it appears on every page.

- [ ] **Step 1: Add import and script tag**

Open `app/layout.tsx`. Add import after the last existing import:

```ts
import { buildOrganizationSchema } from '@/lib/schema'
```

In the JSX, add the script tag as the first child of `<body>`, before `<CartProvider>`:

```tsx
<body className="min-h-full flex flex-col">
  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{ __html: JSON.stringify(buildOrganizationSchema()) }}
  />
  <CartProvider initialCart={initialCart}>
```

The full updated `<body>` block:

```tsx
return (
  <html lang="en" className={`${manrope.variable} h-full antialiased`}>
    <body className="min-h-full flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildOrganizationSchema()) }}
      />
      <CartProvider initialCart={initialCart}>
        <Header collections={collections} />
        {children}
        <Footer
          collections={collections}
          availableCountries={availableCountries}
          currentCountry={currentCountry}
        />
        <CartPopup />
      </CartProvider>
    </body>
  </html>
)
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "feat(a5): add Organization JSON-LD sitewide in layout"
```

---

## Task 7: Wire WebSite + SearchAction schema into `app/page.tsx`

**Files:**
- Modify: `app/page.tsx`

The WebSite schema only belongs on the homepage. The site has search (the Header search overlay routes to `/search?q=…`), so SearchAction is valid.

- [ ] **Step 1: Add import and script tag**

Open `app/page.tsx`. Add import after existing imports:

```ts
import { buildWebSiteSchema } from '@/lib/schema'
```

In the JSX, add the script tag as the first child of `<main>`:

```tsx
export default async function Home() {
  const [productsData, collectionsData] = await Promise.all([
    storefrontFetch<{ products: { nodes: CollectionProduct[] } }>(GET_PRODUCTS, {
      first: 4,
      sortKey: 'BEST_SELLING',
    }),
    storefrontFetch<{ collections: { nodes: CollectionSummary[] } }>(GET_COLLECTIONS, {
      first: 8,
    }),
  ])

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildWebSiteSchema()) }}
      />
      <HeroSection />
      <TrustedBrands />
      <ShopByIndustry />
      <PopularCategories collections={collectionsData.collections.nodes} />
      <PopularProducts products={productsData.products.nodes} />
      <WhyChooseUs />
      <WholesalePricing />
    </main>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat(a5): add WebSite+SearchAction JSON-LD on homepage"
```

---

## Task 8: Wire CollectionPage + BreadcrumbList into L1 category page

**Files:**
- Modify: `app/category/[slug]/page.tsx`

The schema slot added by A2 (`<script ... dangerouslySetInnerHTML={{ __html: JSON.stringify({}) }} />`) gets replaced with two separate script tags. Data comes from the already-fetched `collection` object and the `slug` param.

- [ ] **Step 1: Add import**

Open `app/category/[slug]/page.tsx`. Add to the existing imports block:

```ts
import { buildCollectionPageSchema, buildBreadcrumbListSchema } from '@/lib/schema'
import { SITE_URL } from '@/lib/seo/constants'
```

- [ ] **Step 2: Replace the empty schema slot**

Find:
```tsx
      {/* Schema slot — A5 (Discovery Schema ticket) fills this with CollectionPage + BreadcrumbList JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({}) }}
      />
```

Replace with:
```tsx
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            buildCollectionPageSchema({
              name: collection.title,
              url: `${SITE_URL}/category/${slug}`,
              ...(collection.description ? { description: collection.description } : {}),
              ...(collection.image?.url ? { image: collection.image.url } : {}),
            }),
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            buildBreadcrumbListSchema(
              [{ label: collection.title }],
              `${SITE_URL}/category/${slug}`,
            ),
          ),
        }}
      />
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add app/category/[slug]/page.tsx
git commit -m "feat(a5): wire CollectionPage + BreadcrumbList JSON-LD into L1 category page"
```

---

## Task 9: Wire CollectionPage + BreadcrumbList into L2 subcategory page

**Files:**
- Modify: `app/category/[slug]/[sub]/page.tsx`

The L2 page breadcrumb shows: Home › {slug title-cased} › {collection.title}. The schema must match what's visible on the page. The parent label uses `.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())` — same transformation as the visible `<Breadcrumb>` component call in this file.

- [ ] **Step 1: Add import**

Open `app/category/[slug]/[sub]/page.tsx`. Add to the existing imports block:

```ts
import { buildCollectionPageSchema, buildBreadcrumbListSchema } from '@/lib/schema'
import { SITE_URL } from '@/lib/seo/constants'
```

- [ ] **Step 2: Replace the empty schema slot**

Find:
```tsx
      {/* Schema slot — A5 fills this with CollectionPage + BreadcrumbList JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({}) }}
      />
```

Replace with:
```tsx
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            buildCollectionPageSchema({
              name: collection.title,
              url: `${SITE_URL}/category/${slug}/${sub}`,
              ...(collection.description ? { description: collection.description } : {}),
              ...(collection.image?.url ? { image: collection.image.url } : {}),
            }),
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            buildBreadcrumbListSchema(
              [
                {
                  label: slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
                  href: `/category/${slug}`,
                },
                { label: collection.title },
              ],
              `${SITE_URL}/category/${slug}/${sub}`,
            ),
          ),
        }}
      />
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add "app/category/[slug]/[sub]/page.tsx"
git commit -m "feat(a5): wire CollectionPage + BreadcrumbList JSON-LD into L2 subcategory page"
```

---

## Task 10: Wire BreadcrumbList into `/categories` hub page

**Files:**
- Modify: `app/categories/page.tsx`

The hub page shows `<Breadcrumb items={[{ label: 'All Categories' }]} />` — one visible breadcrumb item after Home. The schema mirrors this exactly.

- [ ] **Step 1: Add import**

Open `app/categories/page.tsx`. Add to the existing imports block:

```ts
import { buildBreadcrumbListSchema } from '@/lib/schema'
import { SITE_URL } from '@/lib/seo/constants'
```

- [ ] **Step 2: Add BreadcrumbList script tag**

At the bottom of the `return` JSX (right before the closing `</main>`), add:

```tsx
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            buildBreadcrumbListSchema(
              [{ label: 'All Categories' }],
              `${SITE_URL}/categories`,
            ),
          ),
        }}
      />
    </main>
```

The full closing of `CategoriesPage` should look like:

```tsx
      {/* Shop by Industry */}
      <ShopByIndustry />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            buildBreadcrumbListSchema(
              [{ label: 'All Categories' }],
              `${SITE_URL}/categories`,
            ),
          ),
        }}
      />
    </main>
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add app/categories/page.tsx
git commit -m "feat(a5): add BreadcrumbList JSON-LD to categories hub page"
```

---

## Task 11: Final verification

- [ ] **Step 1: Run all schema tests**

Run: `npx vitest run lib/schema/__tests__/`
Expected: all 4 suites pass, 0 failures, ~27 passing tests total

- [ ] **Step 2: Full TypeScript check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Build check**

Run: `npm run build`
Expected: exits 0

- [ ] **Step 4: Spot-check output in browser**

Start dev server: `npm run dev`

Visit each URL and open DevTools → Elements → search for `application/ld+json`:

1. `http://localhost:3000` — two scripts: Organization (OnlineStore) + WebSite (SearchAction)
2. `http://localhost:3000/categories` — two scripts: Organization + BreadcrumbList (Home › All Categories)
3. `http://localhost:3000/category/<real-slug>` — three scripts: Organization + CollectionPage + BreadcrumbList (Home › {title})
4. `http://localhost:3000/category/<real-cat>/<real-sub>` — three scripts: Organization + CollectionPage + BreadcrumbList (Home › {cat} › {sub title})

Expected BreadcrumbList on L1 (`/category/exam-gloves`):
```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://mdsupplies.com/" },
    { "@type": "ListItem", "position": 2, "name": "Exam Gloves", "item": "https://mdsupplies.com/category/exam-gloves" }
  ]
}
```

- [ ] **Step 5: Final commit**

```bash
git commit --allow-empty -m "chore(a5): A5 discovery schema complete — verified"
```
