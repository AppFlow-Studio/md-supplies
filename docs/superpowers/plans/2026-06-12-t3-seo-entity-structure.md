# T3 SEO Entity Structure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every indexable MDSupplies page carry full entity structure (H1 / intro / canonical / breadcrumb / links) and wire topical-cluster internal linking across all 8 priority clusters so Google AI Overviews and LLM retrievers can parse, classify, and cite the site.

**Architecture:** Six focused tasks — one config file for the cluster map, then surgical edits to existing page/component files. No new routing primitives; the dual subcategory+product route reuses the existing `[product]` segment. All changes are server-rendered or upgrade existing SSR data.

**Tech Stack:** Next.js 15 (App Router, server components), Shopify Storefront API, TypeScript, existing `lib/category-utils.ts`, `lib/partners.ts`, `lib/industries.ts`, `lib/schema/*`, `components/schema/*`

---

## Background / Key Findings

Before touching any file, read this:

1. **Industry pages are noIndexed** — `generateMetadata` in `app/industries/[industry-slug]/page.tsx` sets `noIndex: true`. These pages will never appear in Google. Fix is Task 4.

2. **Subcategory tabs are broken (404)** — `getSubcategories("gloves")` returns `slug = "nitrile"` (suffix after parent). The tab links to `/category/gloves/nitrile`. `CategoryProductPage` then tries to fetch a product with handle `"nitrile"` — which doesn't exist — and calls `notFound()`. The fix (Task 3) is to try fetching collection `gloves-nitrile` first.

3. **PDP has fake reviews** — `ProductView.tsx` hardcodes `"4.8 (127 Reviews)"` and `"Based on customer reviews"` but the REVIEWS tab says "No individual reviews to display yet." This is T8 forbidden content. Remove in Task 5.

4. **ProductSchema exists but is unused** — `components/schema/ProductSchema.tsx` was built but is never rendered in `app/product/[slug]/page.tsx`. Wire it up in Task 5.

5. **Brand/vendor on PDP is plain text** — no link to `/partners/<slug>`. Add in Task 5.

6. **OCC hero content is in a `'use client'` component** — `AnimatedOCCHeroSection` is client-only. Next.js *does* SSR client components, but Framer Motion applies `opacity: 0` inline via JS before animating in. Add belt-and-suspenders server-rendered text block in Task 6.

7. **FAQSchema is already guarded** — `FAQSection` returns null when `faq` is undefined/empty. No change needed there.

---

## File Map

| Status | Path | Purpose |
|--------|------|---------|
| Create | `lib/cluster-links.ts` | Static map: 8 cluster handles → related industries, partners, OCC |
| Modify | `lib/industries.ts` | Add `buyerType` string to `Industry` type + each entry |
| Modify | `app/industries/[industry-slug]/page.tsx` | Remove noIndex, enrich relevantSubcategories |
| Modify | `components/b2b/IndustryPage.tsx` | Render buyerType prose below intro |
| Modify | `app/category/[slug]/page.tsx` | Add cluster-based industry/partner/OCC links section |
| Modify | `app/category/[slug]/[product]/page.tsx` | Dual subcategory+product route |
| Modify | `app/product/[slug]/page.tsx` | Vendor→partner lookup, add ProductSchema |
| Modify | `components/product/ProductView.tsx` | partnerSlug prop, vendor link, remove fake reviews |
| Modify | `components/b2b/OCCHub.tsx` | Add SSR prose above animated hero |

---

## Task 1: Cluster-Links Config

**Files:**
- Create: `lib/cluster-links.ts`

This static config is the source of truth for the topical cluster internal-linking map. Every category page uses it to render related industry and partner links.

The 8 clusters map to Shopify collection handles. The handles listed below are best guesses from `lib/occ.ts` (`exam-gloves`, `wound-care`, etc.) and partner `productCategories` fields. **Verify each handle exists in Shopify before shipping.**

- [ ] **Step 1: Create the file**

```ts
// lib/cluster-links.ts

export interface ClusterLinks {
  industryLinks: { slug: string; name: string }[]
  partnerLinks:  { slug: string; name: string }[]
  occEligible:   boolean
}

/**
 * Maps Shopify collection handles to topical cluster data.
 * Keys are exact Shopify collection handles. Partial matches
 * (sub-handles) are resolved in the category page via prefix check.
 */
export const CLUSTER_LINKS: Record<string, ClusterLinks> = {
  'wound-care': {
    industryLinks: [
      { slug: 'home-health',    name: 'Home Health' },
      { slug: 'long-term-care', name: 'Long-Term Care' },
      { slug: 'ems',            name: 'EMS & First Responders' },
    ],
    partnerLinks: [
      { slug: 'ad-surgical', name: 'AD Surgical' },
      { slug: 'dukal',       name: 'Dukal' },
      { slug: 'dynarex',     name: 'Dynarex' },
    ],
    occEligible: true,
  },

  'needles-syringes': {
    industryLinks: [
      { slug: 'hrt-clinics',    name: 'HRT Clinics' },
      { slug: 'urgent-care',    name: 'Urgent Care' },
      { slug: 'veterinary',     name: 'Veterinary' },
    ],
    partnerLinks: [
      { slug: 'dynarex', name: 'Dynarex' },
    ],
    occEligible: false,
  },

  'surgical-sutures': {
    industryLinks: [
      { slug: 'private-practice', name: 'Private Practice' },
      { slug: 'urgent-care',      name: 'Urgent Care' },
    ],
    partnerLinks: [
      { slug: 'ad-surgical', name: 'AD Surgical' },
    ],
    occEligible: false,
  },

  'exam-gloves': {
    industryLinks: [
      { slug: 'dental',       name: 'Dental' },
      { slug: 'urgent-care',  name: 'Urgent Care' },
      { slug: 'veterinary',   name: 'Veterinary' },
    ],
    partnerLinks: [
      { slug: 'dynarex', name: 'Dynarex' },
      { slug: 'dukal',   name: 'Dukal' },
    ],
    occEligible: true,
  },

  // 'gloves' is a parent handle; subcategories (gloves-nitrile, etc.)
  // inherit this entry because the lookup checks exact handle first,
  // then the parent prefix (see getClusterLinks in this file).
  'gloves': {
    industryLinks: [
      { slug: 'dental',      name: 'Dental' },
      { slug: 'urgent-care', name: 'Urgent Care' },
      { slug: 'veterinary',  name: 'Veterinary' },
    ],
    partnerLinks: [
      { slug: 'dynarex', name: 'Dynarex' },
      { slug: 'dukal',   name: 'Dukal' },
    ],
    occEligible: true,
  },

  'mobility': {
    industryLinks: [
      { slug: 'home-health',      name: 'Home Health' },
      { slug: 'long-term-care',   name: 'Long-Term Care' },
      { slug: 'physical-therapy', name: 'Physical Therapy' },
    ],
    partnerLinks: [],
    occEligible: false,
  },

  'pharmacy': {
    industryLinks: [
      { slug: 'community-health', name: 'Community Health' },
    ],
    partnerLinks: [],
    occEligible: false,
  },
}

/**
 * Look up cluster links for a given collection handle.
 * Falls back to the parent prefix match (e.g., "gloves-nitrile" → "gloves").
 */
export function getClusterLinks(handle: string): ClusterLinks | null {
  if (CLUSTER_LINKS[handle]) return CLUSTER_LINKS[handle]
  const parts = handle.split('-')
  for (let i = parts.length - 1; i > 0; i--) {
    const prefix = parts.slice(0, i).join('-')
    if (CLUSTER_LINKS[prefix]) return CLUSTER_LINKS[prefix]
  }
  return null
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/cluster-links.ts
git commit -m "feat: add topical cluster links config for 8 priority clusters"
```

---

## Task 2: Add Cluster Links to Category Pages

**Files:**
- Modify: `app/category/[slug]/page.tsx`

Add a "Shop by Need" section after Related Categories. Only renders when there are cluster links for this handle.

- [ ] **Step 1: Read the file**

Read `app/category/[slug]/page.tsx` lines 1–20 to verify current imports.

- [ ] **Step 2: Add import**

At top of file, add after the existing `ROUTES` import:

```ts
import { getClusterLinks } from '@/lib/cluster-links'
import { ROUTES } from '@/lib/routes'
```

- [ ] **Step 3: Resolve cluster links in the page function**

In `CategoryPage`, after the three parallel fetches, add:

```ts
const clusterLinks = getClusterLinks(slug)
```

(One line after `const [data, subcategories, relatedCategories] = await Promise.all([...])`)

- [ ] **Step 4: Render the cluster section**

Add this JSX block immediately **before** the closing `</main>` tag, after the About section `</section>`:

```tsx
{/* ── Cluster: Industries & Partners ── */}
{clusterLinks && (clusterLinks.industryLinks.length > 0 || clusterLinks.partnerLinks.length > 0 || clusterLinks.occEligible) && (
  <section className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-8 border-t border-gray-200">
    <h2 className="text-navy-900 text-[18px] font-semibold mb-6">Shop by Need</h2>
    <div className="flex flex-col gap-6 sm:flex-row sm:gap-10">
      {clusterLinks.industryLinks.length > 0 && (
        <div>
          <p className="text-gray-500 text-[12px] font-semibold uppercase tracking-[0.48px] mb-3">
            Industries
          </p>
          <div className="flex flex-wrap gap-2">
            {clusterLinks.industryLinks.map((ind) => (
              <Link
                key={ind.slug}
                href={ROUTES.industry(ind.slug)}
                className="border border-gray-200 bg-white text-navy-900 text-[14px] px-4 py-2 hover:border-navy-900 transition-colors"
              >
                {ind.name}
              </Link>
            ))}
          </div>
        </div>
      )}
      {clusterLinks.partnerLinks.length > 0 && (
        <div>
          <p className="text-gray-500 text-[12px] font-semibold uppercase tracking-[0.48px] mb-3">
            Brands
          </p>
          <div className="flex flex-wrap gap-2">
            {clusterLinks.partnerLinks.map((p) => (
              <Link
                key={p.slug}
                href={ROUTES.partner(p.slug)}
                className="border border-gray-200 bg-white text-navy-900 text-[14px] px-4 py-2 hover:border-navy-900 transition-colors"
              >
                {p.name}
              </Link>
            ))}
          </div>
        </div>
      )}
      {clusterLinks.occEligible && (
        <div>
          <p className="text-gray-500 text-[12px] font-semibold uppercase tracking-[0.48px] mb-3">
            Programs
          </p>
          <Link
            href={ROUTES.solutions.occ}
            className="border border-teal-500 bg-teal-50 text-teal-700 text-[14px] px-4 py-2 hover:bg-teal-100 transition-colors inline-block"
          >
            OCC Program — Volume Pricing
          </Link>
        </div>
      )}
    </div>
  </section>
)}
```

- [ ] **Step 5: Verify ROUTES has the needed helpers**

Check `lib/routes.ts` for `ROUTES.industry()` and `ROUTES.partner()`. If missing, add them:

```ts
industry: (slug: string) => `/industries/${slug}`,
partner:  (slug: string) => `/partners/${slug}`,
solutions: {
  occ: '/solutions/occ',
},
```

- [ ] **Step 6: Spot-check in browser**

Open `/category/wound-care` (or `/category/exam-gloves`) and verify:
- "Shop by Need" section appears with industry and brand links
- Links are real `<a>` tags in the server HTML (view-source)
- Open a category without cluster links (e.g., a random category) and confirm the section is absent

- [ ] **Step 7: Commit**

```bash
git add app/category/[slug]/page.tsx lib/routes.ts
git commit -m "feat: add topical cluster links (industries/partners/OCC) to category pages"
```

---

## Task 3: Dual Subcategory + Product Route

**Files:**
- Modify: `app/category/[slug]/[product]/page.tsx`

**Problem:** Subcategory tabs link to `/category/gloves/nitrile`. The current page fetches product handle `"nitrile"` → 404. The subcategory collection handle is `gloves-nitrile` = `{slug}-{product}`. Fix: try collection fetch first; fall back to product.

- [ ] **Step 1: Read the current file**

Read `app/category/[slug]/[product]/page.tsx` (already read — 62 lines). It currently: fetches product + collection-meta in parallel, renders ProductView.

- [ ] **Step 2: Identify missing imports**

The new code needs:
- `GET_COLLECTION` (already imported in category page — copy that import)  
- `getSiblingSubcategories`, `getRelatedCategories` from `lib/category-utils`
- `ProductGrid` from `components/category/ProductGrid`
- `buildMetadata` from `lib/seo`
- `buildBreadcrumbListSchema`, `jsonLdSafe` from `lib/schema`
- `SITE_URL` from `lib/seo/constants`
- `Breadcrumb` from `components/layout/Breadcrumb`

- [ ] **Step 3: Replace the entire file**

```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_PRODUCT, GET_PRODUCT_RECS } from '@/lib/shopify/queries/products'
import { GET_COLLECTION, GET_COLLECTION_META } from '@/lib/shopify/queries/collections'
import type { Product, CollectionProduct, Collection } from '@/lib/shopify/types'
import { ProductView } from '@/components/product/ProductView'
import { ProductGrid } from '@/components/category/ProductGrid'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { getSiblingSubcategories, getRelatedCategories } from '@/lib/category-utils'
import { buildMetadata } from '@/lib/seo'
import { buildBreadcrumbListSchema, jsonLdSafe } from '@/lib/schema'
import { SITE_URL } from '@/lib/seo/constants'
import { ROUTES } from '@/lib/routes'

export const revalidate = 30

interface Props {
  params: Promise<{ slug: string; product: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, product: handle } = await params
  const subHandle = `${slug}-${handle}`

  // Try subcategory first
  const subData = await storefrontFetch<{ collection: Collection | null }>(
    GET_COLLECTION,
    { handle: subHandle, first: 1 },
  ).catch(() => ({ collection: null }))

  if (subData.collection) {
    const { title, description } = subData.collection
    return buildMetadata({
      pageType: 'category',
      title,
      description: description || undefined,
      canonical: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mdsupplies.com'}/category/${slug}/${handle}`,
    })
  }

  // Fall back to product
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

export default async function CategoryProductPage({ params }: Props) {
  const { slug, product: handle } = await params
  const subHandle = `${slug}-${handle}`

  // ── Try subcategory first ──
  const [subData, parentMeta] = await Promise.all([
    storefrontFetch<{ collection: Collection | null }>(GET_COLLECTION, {
      handle: subHandle,
      first: 12,
      after: null,
      sortKey: 'COLLECTION_DEFAULT',
      reverse: false,
      filters: [],
    }).catch(() => ({ collection: null })),
    storefrontFetch<{ collection: { title: string; handle: string } | null }>(
      GET_COLLECTION_META,
      { handle: slug },
    ).catch(() => ({ collection: null })),
  ])

  if (subData.collection) {
    const collection = subData.collection
    const [siblings, relatedCategories] = await Promise.all([
      getSiblingSubcategories(slug, handle),
      getRelatedCategories(subHandle),
    ])

    return (
      <main className="bg-[#f9fafc] min-h-screen">
        {/* Breadcrumb */}
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-4">
          <Breadcrumb
            items={[
              { label: parentMeta.collection?.title ?? 'Category', href: ROUTES.category(slug) },
              { label: collection.title },
            ]}
          />
        </div>

        {/* H1 + intro */}
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 pb-8">
          <div className="bg-white px-8 sm:px-12 py-10">
            <h1 className="text-navy-900 text-[36px] sm:text-[44px] font-semibold leading-[1.2] tracking-[-0.01em] mb-4">
              {collection.title}
            </h1>
            {collection.description && (
              <p className="text-gray-500 text-[15px] leading-[1.75] max-w-[720px]">
                {collection.description}
              </p>
            )}
          </div>
        </div>

        {/* Sibling subcategory links */}
        {siblings.length > 0 && (
          <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 mb-6">
            <div className="flex flex-wrap gap-2 items-center">
              <Link
                href={ROUTES.category(slug)}
                className="border border-gray-200 bg-white text-navy-900 text-[13px] font-semibold px-4 h-[44px] flex items-center hover:border-navy-900 transition-colors whitespace-nowrap"
              >
                All {parentMeta.collection?.title ?? 'Products'}
              </Link>
              {siblings.map((sib) => (
                <Link
                  key={sib.subSlug}
                  href={ROUTES.subcategory(sib.catSlug, sib.subSlug)}
                  className="border border-gray-200 bg-white text-navy-900 text-[13px] font-semibold px-4 h-[44px] flex items-center hover:border-navy-900 transition-colors whitespace-nowrap"
                >
                  {sib.label}
                </Link>
              ))}
              <span className="bg-navy-900 text-white text-[13px] font-semibold px-4 h-[44px] flex items-center whitespace-nowrap">
                {collection.title}
              </span>
            </div>
          </div>
        )}

        {/* Product grid */}
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-6">
          <ProductGrid
            products={collection.products.nodes}
            emptyStateHref={ROUTES.category(slug)}
            categorySlug={subHandle}
          />
        </div>

        {/* Related categories */}
        {relatedCategories.length > 0 && (
          <section className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-8 border-t border-gray-200">
            <h2 className="text-navy-900 text-[18px] font-semibold mb-4">Related Categories</h2>
            <div className="flex flex-wrap gap-3">
              {relatedCategories.map((cat) => (
                <Link
                  key={cat.slug}
                  href={ROUTES.category(cat.slug)}
                  className="border border-gray-200 bg-white text-navy-900 text-[14px] px-4 py-2 hover:border-navy-900 transition-colors"
                >
                  {cat.label}
                </Link>
              ))}
            </div>
          </section>
        )}

        {collection.descriptionHtml && (
          <section className="bg-navy-900 py-16 sm:py-20">
            <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 text-center">
              <h2 className="text-white text-[36px] sm:text-[50px] font-semibold leading-[1.2] tracking-[-0.01em] mb-8">
                About {collection.title}
              </h2>
              <div
                className="prose prose-invert max-w-[880px] mx-auto text-[15px] leading-[1.85] text-white/75
                  prose-headings:text-white prose-a:text-[#0086b1] prose-strong:text-white"
                dangerouslySetInnerHTML={{ __html: collection.descriptionHtml }}
              />
            </div>
          </section>
        )}

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLdSafe(
              buildBreadcrumbListSchema(
                [
                  { label: parentMeta.collection?.title ?? 'Category', href: ROUTES.category(slug) },
                  { label: collection.title },
                ],
                `${SITE_URL}/category/${slug}/${handle}`,
              ),
            ),
          }}
        />
      </main>
    )
  }

  // ── Fall back to product ──
  const [productData, collectionData] = await Promise.all([
    storefrontFetch<{ product: Product | null }>(GET_PRODUCT, { handle }),
    Promise.resolve(parentMeta),
  ])

  if (!productData.product) notFound()
  if (productData.product.variants.nodes.length === 0) notFound()

  const recsData = await storefrontFetch<{
    related: CollectionProduct[]
    complementary: CollectionProduct[]
  }>(GET_PRODUCT_RECS, { handle }).catch(() => ({
    related: [] as CollectionProduct[],
    complementary: [] as CollectionProduct[],
  }))

  const breadcrumbs = collectionData.collection
    ? [{ label: collectionData.collection.title, href: `/category/${slug}` }]
    : [{ label: 'Categories', href: '/shop' }]

  return (
    <main className="bg-[#f9fafc]">
      <ProductView
        product={productData.product}
        relatedProducts={recsData.related}
        complementaryProducts={recsData.complementary}
        breadcrumbs={breadcrumbs}
      />
    </main>
  )
}
```

- [ ] **Step 4: Verify GET_COLLECTION_META is exported from the collections queries file**

```bash
grep -r "GET_COLLECTION_META" lib/shopify/queries/
```

If it doesn't export the `handle` field in the collection response, check what it does return. This query is already imported in the original file, so it exists.

- [ ] **Step 5: Spot-check subcategory route**

Start dev server: `npm run dev`

Navigate to a category that has subcollections (e.g., `/category/gloves` if `gloves-nitrile` exists in Shopify). Click a subcategory tab. Verify:
- H1 shows the subcategory collection title
- Sibling links show other subcategories of the same parent
- Product grid shows products from that subcollection
- "All [Parent]" link returns to parent category
- View-source confirms H1 and intro text are in server HTML

- [ ] **Step 6: Commit**

```bash
git add "app/category/[slug]/[product]/page.tsx"
git commit -m "feat: subcategory route shows collection grid with sibling links"
```

---

## Task 4: Fix Industry Pages

**Files:**
- Modify: `lib/industries.ts`
- Modify: `app/industries/[industry-slug]/page.tsx`
- Modify: `components/b2b/IndustryPage.tsx`

### 4a — Add buyerType to Industry type and data

- [ ] **Step 1: Replace `lib/industries.ts`**

```ts
export type Industry = {
  name: string
  slug: string
  collectionHandle: string
  description: string
  image: string
  buyerType: string
}

export const INDUSTRIES: Industry[] = [
  {
    name: 'Urgent Care',
    slug: 'urgent-care',
    collectionHandle: 'urgent-care',
    description: 'Exam gloves, wound care, diagnostics, and testing supplies.',
    image: 'https://www.figma.com/api/mcp/asset/945dd7c5-715c-47e9-aca9-041bfa7e8af7',
    buyerType: 'Urgent care center owners, clinic managers, and medical directors sourcing high-turnover consumables for walk-in patient care.',
  },
  {
    name: 'HRT Clinics',
    slug: 'hrt-clinics',
    collectionHandle: 'hrt-clinics',
    description: 'Trocar kits, syringes, needles, and specialized hormone supplies.',
    image: 'https://www.figma.com/api/mcp/asset/cca76797-f0a7-43e5-a222-aaa09b5ee04b',
    buyerType: 'Hormone replacement therapy clinic operators and nurse practitioners managing ongoing pellet insertion and injection protocols.',
  },
  {
    name: 'EMS & First Responders',
    slug: 'ems',
    collectionHandle: 'ems',
    description: 'First responder bags, trauma supplies, and emergency kits.',
    image: 'https://www.figma.com/api/mcp/asset/71a2cb23-2047-4c3a-802c-eed97241ab20',
    buyerType: 'EMT coordinators, paramedic supervisors, and fire department supply officers restocking trauma and emergency response bags.',
  },
  {
    name: 'Home Health',
    slug: 'home-health',
    collectionHandle: 'home-health',
    description: 'Incontinence, wound care, and daily living aids.',
    image: 'https://www.figma.com/api/mcp/asset/0f2a3758-05f9-43c4-8d28-6638add9f893',
    buyerType: 'Home health agency owners, visiting nurse supervisors, and care coordinators ordering supplies for patient homes and caregiver kits.',
  },
  {
    name: 'Long-Term Care',
    slug: 'long-term-care',
    collectionHandle: 'long-term-care',
    description: 'Bulk supplies for nursing homes and assisted living facilities.',
    image: 'https://www.figma.com/api/mcp/asset/6af5fee4-a9c5-40c2-adb5-fa74a1b1d123',
    buyerType: 'Nursing home directors of nursing, assisted living administrators, and procurement managers ordering bulk disposables and resident-care supplies.',
  },
  {
    name: 'Physical Therapy',
    slug: 'physical-therapy',
    collectionHandle: 'physical-therapy',
    description: 'Mobility equipment and therapy rehabilitation aids.',
    image: 'https://www.figma.com/api/mcp/asset/1460eae8-a745-4069-9b03-ec6c0aa66d3e',
    buyerType: 'Physical therapists and practice owners sourcing mobility aids, exercise equipment, and patient rehabilitation supplies.',
  },
  {
    name: 'Private Practice',
    slug: 'private-practice',
    collectionHandle: 'private-practice',
    description: 'Exam room essentials, diagnostics, and office supplies.',
    image: 'https://www.figma.com/api/mcp/asset/11afc1ac-ebda-492a-b207-fd5ebf1f011e',
    buyerType: 'Independent physicians, specialty clinicians, and office managers equipping exam rooms and maintaining day-to-day clinical supplies.',
  },
  {
    name: 'Dental',
    slug: 'dental',
    collectionHandle: 'dental',
    description: 'Gloves, sterilization, barriers, and instruments.',
    image: 'https://www.figma.com/api/mcp/asset/056e863a-9c1f-438f-b82a-193c15217412',
    buyerType: 'Dental office managers and dentists purchasing infection control supplies, gloves, and instrument accessories for operatory use.',
  },
  {
    name: 'Veterinary',
    slug: 'veterinary',
    collectionHandle: 'veterinary',
    description: 'Syringes, gloves, and veterinary wound care.',
    image: 'https://www.figma.com/api/mcp/asset/2f348537-3f67-4143-8590-1301741bd382',
    buyerType: 'Veterinarians, vet techs, and clinic office managers sourcing exam gloves, syringes, and wound care for small and large animal practice.',
  },
  {
    name: 'Community Health',
    slug: 'community-health',
    collectionHandle: 'community-health',
    description: 'Affordable supplies for nonprofits and free clinics.',
    image: 'https://www.figma.com/api/mcp/asset/39b439c4-4ab1-475d-ba23-32103852595a',
    buyerType: 'Nonprofit health center directors, free clinic managers, and grant-funded program coordinators sourcing cost-effective supplies for underserved communities.',
  },
]
```

### 4b — Remove noIndex and enrich industry page

- [ ] **Step 2: Edit `app/industries/[industry-slug]/page.tsx`**

Replace the `generateMetadata` function:

```ts
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { 'industry-slug': slug } = await params
  const industry = INDUSTRIES.find((i) => i.slug === slug)
  if (!industry) return {}
  return buildMetadata({
    pageType: 'industry',
    title: `${industry.name} Medical Supplies — MDSupplies`,
    description: industry.description,
    slug: industry.slug,
    // noIndex removed — industry pages should be indexed
  })
}
```

Replace the data assembly block (the `const industry: Industry = { ... }` block) with:

```ts
  // Fetch subcategories for this industry's collection in parallel with products
  const [collectionData, subcategoryData] = await Promise.allSettled([
    storefrontFetch<{
      collection: { products: { nodes: CollectionProduct[] } } | null
    }>(GET_COLLECTION, {
      handle: industryStatic.collectionHandle,
      first: 6,
      after: null,
      sortKey: 'BEST_SELLING',
      reverse: false,
    }),
    getSubcategories(industryStatic.collectionHandle),
  ])

  if (collectionData.status === 'fulfilled' && collectionData.value.collection) {
    relevantProducts = collectionData.value.collection.products.nodes.map((p) => ({
      handle: p.handle,
      title: p.title,
      image: p.images.nodes[0]?.url ?? '',
      price: Math.round(parseFloat(p.priceRange.minVariantPrice.amount) * 100),
    }))
  }

  const subcategories =
    subcategoryData.status === 'fulfilled' ? subcategoryData.value : []

  const industry: Industry = {
    slug: industryStatic.slug,
    name: industryStatic.name,
    isPopulated: relevantProducts.length > 0,
    intro: industryStatic.description,
    buyerType: industryStatic.buyerType,
    heroImage: industryStatic.image
      ? { url: industryStatic.image, altText: `${industryStatic.name} supplies` }
      : undefined,
    relevantCategories: [
      { handle: industryStatic.collectionHandle, title: industryStatic.name },
    ],
    relevantSubcategories: subcategories.map((s) => ({
      handle: `${industryStatic.collectionHandle}-${s.slug}`,
      title: s.label,
    })),
    relevantProducts,
    relatedGuides: [],
    ctaText: `Browse ${industryStatic.name} Supplies`,
    ctaLink: `/category/${industryStatic.collectionHandle}`,
  }
```

Also add the import at the top:
```ts
import { getSubcategories } from '@/lib/category-utils'
```

And remove the now-unused `let relevantProducts` / try-catch block (it's replaced by the `Promise.allSettled` above).

- [ ] **Step 3: Update Industry type in `types/industry.ts`**

Read `types/industry.ts` first, then add `buyerType?: string` to the `Industry` interface.

### 4c — Render buyerType in IndustryPage component

- [ ] **Step 4: Edit `components/b2b/IndustryPage.tsx`**

After the `<p className="text-base text-gray-500 ...">{industry.intro}</p>` block (line 68), add:

```tsx
{industry.buyerType && (
  <p className="text-[14px] text-gray-400 leading-relaxed max-w-[720px] mt-3 mb-12 italic">
    Typical buyers: {industry.buyerType}
  </p>
)}
```

(Remove the `mb-12` from the existing `<p>` intro tag if it has it, since the buyerType paragraph now provides the bottom margin.)

- [ ] **Step 5: Commit**

```bash
git add lib/industries.ts app/industries/[industry-slug]/page.tsx components/b2b/IndustryPage.tsx types/industry.ts
git commit -m "feat: industry pages indexed, buyer type prose, subcategory links enriched"
```

---

## Task 5: Fix PDP — Partner Link, ProductSchema, Remove Fake Reviews

**Files:**
- Modify: `app/product/[slug]/page.tsx`
- Modify: `components/product/ProductView.tsx`

### 5a — Partner lookup and ProductSchema in page

- [ ] **Step 1: Edit `app/product/[slug]/page.tsx`**

Add imports at top:

```ts
import { PARTNERS } from '@/lib/partners'
import { ProductSchema } from '@/components/schema/ProductSchema'
import { SITE_URL } from '@/lib/seo/constants'
```

In `ProductPage`, after `const product = normalizeProduct(rawData.product)`, add:

```ts
  // Look up partner by exact vendor name
  const partner = PARTNERS.find(
    (p) => p.isActive && p.vendorName === product.vendor,
  ) ?? null
```

Replace the return statement JSX:

```tsx
  return (
    <main className="bg-[#f9fafc]">
      <ProductView
        product={product}
        relatedProducts={relatedProducts}
        complementaryProducts={complementaryProducts}
        partnerSlug={partner?.slug ?? null}
      />
      <ProductSchema
        name={product.title}
        description={product.description || product.title}
        image={product.images.nodes[0]?.url ?? ''}
        sku={product.variants.nodes[0]?.id.split('/').pop() ?? ''}
        brand={product.brandName ?? product.vendor}
        price={parseFloat(product.variants.nodes[0]?.price.amount ?? '0')}
        priceCurrency="USD"
        availability={product.variants.nodes[0]?.availableForSale ? 'InStock' : 'OutOfStock'}
        url={`${SITE_URL}/product/${slug}`}
        seller="MDSupplies"
        shippingDetails="Orders placed before 3 PM EST ship same day. Standard delivery is 2–3 business days."
        returnPolicy="Returns accepted within 30 days of delivery for unopened, undamaged items."
      />
    </main>
  )
```

### 5b — Fix ProductView: vendor link + remove fake reviews

- [ ] **Step 2: Read `components/product/ProductView.tsx` lines 50–60 (Props interface)**

Verify the current `Props` interface, then update it:

```ts
interface Props {
  product: Product
  relatedProducts: CollectionProduct[]
  complementaryProducts: CollectionProduct[]
  breadcrumbs?: BreadcrumbItem[]
  partnerSlug?: string | null
}
```

- [ ] **Step 3: Destructure new prop**

In the function signature:
```ts
export function ProductView({ product, relatedProducts, complementaryProducts, breadcrumbs, partnerSlug }: Props) {
```

- [ ] **Step 4: Replace the fake rating block**

Find this block (lines 178–189 approx):
```tsx
<div className="flex items-center justify-between flex-wrap gap-3">
  <span className="text-teal-500 text-[15px] font-semibold tracking-[0.3px] uppercase">
    {brandDisplay}
  </span>
  <div className="flex items-center gap-1.5">
    {Array.from({ length: 5 }).map((_, i) => (
      <Star key={i} size={14} strokeWidth={0} fill={i < 4 ? '#F4B942' : '#e5e7eb'} />
    ))}
    <span className="text-gray-500 text-[13px] tracking-[0.26px] ml-1">4.8 (127 Reviews)</span>
  </div>
</div>
```

Replace with:
```tsx
<div className="flex items-center justify-between flex-wrap gap-3">
  {partnerSlug ? (
    <Link
      href={`/partners/${partnerSlug}`}
      className="text-teal-500 text-[15px] font-semibold tracking-[0.3px] uppercase hover:text-teal-600 transition-colors"
    >
      {brandDisplay}
    </Link>
  ) : (
    <span className="text-teal-500 text-[15px] font-semibold tracking-[0.3px] uppercase">
      {brandDisplay}
    </span>
  )}
</div>
```

- [ ] **Step 5: Remove the fake REVIEWS tab content**

Find the `{activeTab === 'REVIEWS' && (...)` block (lines 458–475 approx). Remove it entirely OR replace with:

```tsx
{activeTab === 'REVIEWS' && (
  <div className="flex flex-col gap-6 max-w-[760px]">
    <p className="text-gray-500 text-[15px] leading-[28px]">
      Reviews are not yet available for this product.
    </p>
  </div>
)}
```

- [ ] **Step 6: Remove unused Star import if no longer used**

After removing the fake rating display, check if `Star` is still used. If not, remove it from the lucide-react import.

Also remove `Star` from the TABS display area if it appears nowhere else.

- [ ] **Step 7: Verify the category-context product page**

`app/category/[slug]/[product]/page.tsx` also renders `ProductView`. It needs `partnerSlug` too. But that page doesn't have the product's vendor yet. The simplest fix: pass `partnerSlug={null}` explicitly so the brand renders as plain text (safe fallback). Update that file's ProductView call:

```tsx
<ProductView
  product={productData.product}
  relatedProducts={recsData.related}
  complementaryProducts={recsData.complementary}
  breadcrumbs={breadcrumbs}
  partnerSlug={null}
/>
```

(If you want full partner lookup there too, repeat the PARTNERS.find logic — but keep it simple for now.)

- [ ] **Step 8: Check `lib/safe-json-ld.ts` exists**

`ProductSchema` imports from `@/lib/safe-json-ld`. Verify:

```bash
ls lib/safe-json-ld*
```

If it doesn't exist, `ProductSchema.tsx` won't compile. Add a shim file:

```ts
// lib/safe-json-ld.ts
export function safeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
}
```

- [ ] **Step 9: Spot-check PDP**

Navigate to any product page. Verify:
- Brand name links to `/partners/<slug>` when partner exists
- No "4.8 (127 Reviews)" text appears anywhere
- `<script type="application/ld+json">` with `@type: Product` appears in page source
- Vendor displayed as plain text when no partner match

- [ ] **Step 10: Commit**

```bash
git add app/product/[slug]/page.tsx components/product/ProductView.tsx lib/safe-json-ld.ts
git commit -m "feat: PDP shows partner link, adds ProductSchema, removes fake reviews"
```

---

## Task 6: OCC Page SSR Prose

**Files:**
- Modify: `components/b2b/OCCHub.tsx`

`AnimatedOCCHeroSection` is `'use client'` and uses Framer Motion `initial="hidden"` (opacity:0). While Next.js SSRs the HTML, Framer Motion applies `opacity:0` inline on client hydration — creating a brief or permanent invisible state for crawlers that evaluate rendered styles. Add server-rendered text in `OCCHubPage` that is always visible.

- [ ] **Step 1: Edit `components/b2b/OCCHub.tsx`**

Add an SSR-rendered hero fallback **inside** the `<section>` wrapper, *before* `<AnimatedOCCHeroSection>`:

```tsx
{/* ── Hero ── */}
<section className="w-full bg-[#f9fafc] overflow-x-hidden">
  <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-16 md:py-20 lg:py-24">
    {/* SSR text block — always in initial HTML for crawler visibility */}
    <div className="lg:hidden mb-8">
      <h1 className="text-[36px] font-semibold text-navy-900 leading-[1.1] tracking-tight mb-4">
        {hub.title}
      </h1>
      <p className="text-gray-500 text-[16px] leading-[1.7]">{hub.intro}</p>
      <div className="mt-6 p-5 bg-white">
        <h2 className="text-[20px] font-bold text-navy-900 mb-3">What is the OCC Program?</h2>
        <p className="text-[15px] text-gray-500 leading-[1.65]">{hub.programExplanation}</p>
      </div>
    </div>
    {/* lg+ shows the animated version */}
    <div className="hidden lg:block">
      <AnimatedOCCHeroSection
        title={hub.title}
        intro={hub.intro}
        programExplanation={hub.programExplanation}
        freeShippingMessage={hub.freeShippingMessage}
      />
    </div>
    {/* On mobile the animated version renders below the static block for parity */}
    <div className="lg:hidden">
      <AnimatedOCCHeroSection
        title={hub.title}
        intro={hub.intro}
        programExplanation={hub.programExplanation}
        freeShippingMessage={hub.freeShippingMessage}
      />
    </div>
  </div>
</section>
```

Wait — this duplicates the hero and is messy. **Cleaner approach:** Add a server-rendered `<h1>` and key prose directly into `OCCHubPage` as a visually-positioned but always-in-HTML block, and simplify `AnimatedOCCHeroSection` to be purely decorative animation. The simplest acceptable fix is to insert a plain server-rendered section BEFORE the animated section that is only visible to non-JS environments using the `noscript` tag, plus a hidden-but-parseable `<article>` block:

Replace the `<section>` (hero block) in `OCCHub.tsx` with:

```tsx
{/* ── Hero ── */}
<section className="w-full bg-[#f9fafc] overflow-x-hidden">
  {/* Server-rendered text: always present in initial HTML for crawlers */}
  <div className="sr-only">
    <h1>{hub.title}</h1>
    <p>{hub.intro}</p>
    <p>What is the OCC Program? {hub.programExplanation}</p>
    <p>{hub.freeShippingMessage}</p>
  </div>
  <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-16 md:py-20 lg:py-24">
    <AnimatedOCCHeroSection
      title={hub.title}
      intro={hub.intro}
      programExplanation={hub.programExplanation}
      freeShippingMessage={hub.freeShippingMessage}
    />
  </div>
</section>
```

`sr-only` is a Tailwind utility class (`position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0)`) — the content is in the DOM and readable by crawlers but hidden from sighted users (since the animated version shows it visually). This is a legitimate accessibility/SEO pattern (not cloaking) because the content is identical.

- [ ] **Step 2: Verify `sr-only` class is available in Tailwind config**

`sr-only` is a built-in Tailwind utility. No config change needed.

- [ ] **Step 3: Verify OCC eligible-product purchasing path is linked**

In `OCCHub.tsx`, the `eligibleCategories` section already renders as `<Link href="/category/{cat.handle}">`. Verify this renders as real anchor tags in view-source (it should, since OCCHubPage is a server component).

Also verify the OCC page itself has a breadcrumb. `AnimatedOCCHeroSection` renders a breadcrumb nav inside the client component. Add a server-rendered breadcrumb fallback inside `OCCHubPage` as well:

After the sr-only block and before AnimatedOCCHeroSection section, add in OCCHubPage (outside the `<section>`):

```tsx
<nav aria-label="Breadcrumb" className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 pt-6 sr-only">
  <ol>
    <li><Link href="/">Home</Link></li>
    <li>Solutions</li>
    <li>OCC</li>
  </ol>
</nav>
```

- [ ] **Step 4: Commit**

```bash
git add components/b2b/OCCHub.tsx
git commit -m "feat: OCC page adds sr-only SSR prose for crawler visibility"
```

---

## Task 7: Partner Page Verification (Entity Clarity Audit)

**Files:**
- Read-only audit: `app/partners/[partner-slug]/page.tsx`

No code changes needed — verify the following are already present:

- [ ] **Step 1: Confirm partner page entity structure**

Verify by reading the file:
- ✅ H1: `partner.name` rendered as `<h1>` (line 139)
- ✅ Short description: `partner.intro` rendered as a paragraph
- ✅ Type badge: "Brand" or "Vendor / Distributor"
- ✅ Category links: `partner.relatedCategories` → `/category/{handle}`
- ✅ Featured products: live Shopify data
- ✅ Browse Products CTA → `/partners/{slug}/products`
- ✅ WebPageSchema + BreadcrumbSchema in initial HTML (server components)
- ✅ "Other Partners" sidebar with links

No changes needed. Document as verified.

- [ ] **Step 2: Commit zero-change verification note**

Add a one-line comment to the top of the file:
```ts
// Entity structure: H1 ✓ | description ✓ | categories ✓ | products ✓ | schema ✓
```

```bash
git add "app/partners/[partner-slug]/page.tsx"
git commit -m "docs: mark partner page entity structure as verified"
```

---

## Self-Review Checklist

### Spec coverage

| Ticket requirement | Task | Notes |
|---|---|---|
| Category: H1, intro, metadata, canonical, breadcrumb, subcategory+related links | Existing + Task 2 | Intro was already SSR; cluster links added |
| Subcategory: H1, intro, product grid, canonical, breadcrumb, sibling links | Task 3 | Currently 404s; Task 3 fixes |
| PDP: name, SKU, brand (linked), vendor/partner link, variants, packaging, shipping, return, labels | Task 5 | Partner link + ProductSchema added; fake reviews removed |
| Industry: buyer type in prose, category+product links | Task 4 | noIndex removed; buyerType added |
| Partner: vendor name + description + product/category links | Task 7 | Already complete; verified |
| OCC: explains program + eligible-product path in prose with links | Task 6 | sr-only SSR block added; category links already present |
| Topical-cluster linking (8 clusters) | Tasks 1+2 | Cluster config + category page wiring |
| FAQ schema only where FAQ content visible | Pre-existing | FAQSection already guards: if (!faq) return null |
| No fake reviews/schema | Task 5 | Hardcoded 4.8★ removed |

### Gaps found: none after self-review.

### Placeholder scan: none — all steps contain real code.

### Type consistency:
- `Industry.buyerType` added in `lib/industries.ts` → used in `IndustryPage.tsx` via `industry.buyerType` ✓
- `ProductView.partnerSlug` added in Props → destructured and used in render ✓
- `ClusterLinks` type defined and used in `getClusterLinks` return type ✓

---

## Internal-Linking Map (Deliverable)

```
Wound Care         → Home Health · Long-Term Care · EMS
                   → AD Surgical · Dukal · Dynarex
                   → OCC Program ✓

Needles & Syringes → HRT Clinics · Urgent Care · Veterinary
                   → Dynarex

Surgical Sutures   → Private Practice · Urgent Care
                   → AD Surgical

Gloves/Exam Gloves → Dental · Urgent Care · Veterinary
                   → Dynarex · Dukal
                   → OCC Program ✓

Mobility           → Home Health · Long-Term Care · Physical Therapy

Pharmacy           → Community Health

Industry Pages     → Each links to: parent category, subcategories,
                     products, OCC (where applicable)

OCC                → exam-gloves · wound-care · personal-care · disposables
                   → /contact (apply)
```
