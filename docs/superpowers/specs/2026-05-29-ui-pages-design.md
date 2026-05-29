# UI Pages Design Spec
**Date:** 2026-05-29
**Stack:** Next.js 16 · React 19 · Tailwind CSS v4 · TypeScript · Shopify Storefront API 2026-04

---

## 1. Scope

Four UI features added on top of the existing phase 2 foundation:

| Feature | Routes |
|---------|--------|
| Shop by Industry | `/industries`, `/industries/[slug]` |
| Shop by Brand | `/brands`, `/brands/[slug]` |
| Partners page | `/partners` |
| Related blog posts | `/blog/[handle]` (improved), `/product/[slug]` (new section) |

Navigation SEO (hierarchical URL structure) is explicitly out of scope for this spec — deferred pending Shopify collection naming convention decision.

---

## 2. Shared Decisions

- **ISR revalidation:** listing pages use `revalidate = 3600`, detail pages use `revalidate = 30` (consistent with existing category pages).
- **Page shell:** all new pages follow the existing pattern — breadcrumb → hero → content → `WholesalePricing` CTA.
- **Static data vs API:** industry and partner data is hardcoded in lib config files; brand data is derived from live Shopify `product.vendor` fields.
- **Reuse existing layouts:** `/industries/[slug]` and `/brands/[slug]` reuse the category page layout (filters, sort, pagination) rather than inventing new layouts.
- **Shared blog card:** a new `RelatedArticles` component replaces inline markup in the blog article page and is also used on product pages.

---

## 3. Shop by Industry

### 3A. Shared Config — `lib/industries.ts`

Exports a typed `INDUSTRIES` array:

```ts
export type Industry = {
  name: string
  slug: string
  collectionHandle: string
  description: string
  image: string
}

export const INDUSTRIES: Industry[] = [
  { name: 'Urgent Care', slug: 'urgent-care', collectionHandle: 'urgent-care', description: '...', image: '...' },
  { name: 'EMS', slug: 'ems', collectionHandle: 'ems', description: '...', image: '...' },
  { name: 'Pharmacy', slug: 'pharmacy', collectionHandle: 'pharmacy', description: '...', image: '...' },
  { name: 'Physical Therapy', slug: 'physical-therapy', collectionHandle: 'physical-therapy', description: '...', image: '...' },
  // add more industries here
]
```

`components/home/ShopByIndustry.tsx` is updated to import from this config instead of its current hardcoded array.

### 3B. `/industries` — Listing Page

**Rendering:** Server Component, `revalidate = 3600`.

**Data:** Static — reads `INDUSTRIES` from `lib/industries.ts`, no API call.

**Sections (top → bottom):**
1. Hero header — teal label "Shop by Specialty", large H1 "Industries We Serve", subtitle
2. Full industry grid — 2 cols mobile / 3–4 cols desktop, same tall card style as the homepage `ShopByIndustry` section (portrait aspect ratio image, gradient overlay, name on bottom-left)
3. `WholesalePricing` CTA

### 3C. `/industries/[slug]` — Individual Industry Page

**Rendering:** Server Component, `revalidate = 30`.

**Data:** `storefrontFetch(GET_COLLECTION, { handle: industry.collectionHandle, first: 24, ... })` — same call signature as `/category/[slug]`.

**Sections:** Identical to `/category/[slug]` — breadcrumb, hero, sidebar filters, sort bar, product grid, cursor pagination, about section.

**Breadcrumb:** Home › Industries › {industry.name}

**`generateStaticParams`:** maps `INDUSTRIES` to `{ slug: industry.slug }`.

**404 handling:** if `slug` is not in `INDUSTRIES` or Shopify collection returns null → `notFound()`.

---

## 4. Shop by Brand

### 4A. Shared Helpers — `lib/brands.ts`

```ts
export function slugifyVendor(vendor: string): string
export function unslugifyVendor(slug: string, vendors: string[]): string | undefined
```

`slugifyVendor` lowercases and replaces spaces/special chars with hyphens. `unslugifyVendor` finds the original vendor string from a known list by comparing slugified forms.

### 4B. `/brands` — Listing Page

**Rendering:** Server Component, `revalidate = 3600`.

**Data:** `storefrontFetch(GET_PRODUCTS, { first: 250 })` → deduplicate by `product.vendor` → count products per brand → sort alphabetically.

**Sections (top → bottom):**
1. Hero — teal label "Browse by Manufacturer", H1 "Shop by Brand", subtitle
2. Brand grid — alphabetically sorted, 2 cols mobile / 3–4 cols desktop. Each card: brand name (large), product count badge, "View Products →" link to `/brands/[slug]`
3. `WholesalePricing` CTA

### 4C. `/brands/[slug]` — Brand Product Page

**Rendering:** Server Component, `revalidate = 30`.

**Data:** `storefrontFetch(GET_PRODUCTS_BY_VENDOR, { vendor: brandName, first: 24, ... })`. Requires a new query `GET_PRODUCTS_BY_VENDOR` in `lib/shopify/queries/products.ts` using Shopify's `query` argument with `vendor:"{name}"` syntax on `products`.

**Sections:** Same layout as `/category/[slug]` but without the sidebar collection filters (vendor pages use a simpler sort-only bar).

**Breadcrumb:** Home › Brands › {brandName}

**404 handling:** If vendor slug maps to no known vendor or zero products → `notFound()`.

---

## 5. Partners Page (`/partners`)

**Rendering:** Server Component, no revalidation (fully static).

**Data:** All hardcoded — no Shopify API calls.

**Sections (top → bottom):**
1. **Hero** — H1 "Our Partners", subtitle describing MD Supplies' partner ecosystem
2. **Trusted Brands** — grid of brand logo cards (hardcoded). Each card: logo/brand name, one-line description, "Shop [Brand] →" link to `/brands/[slug]`
3. **Business Partners & Distributors** — 2-column card grid. Each card: partner name, description of what they offer, contact CTA
4. **Become a Partner CTA** — full-width teal banner: "Interested in partnering with MD Supplies?" + "Contact Us" button → `/b2b`
5. `WholesalePricing` at bottom

---

## 6. Related Blog Posts

### 6A. `components/blog/RelatedArticles.tsx`

New shared component replacing the inline "More Articles" markup.

**Props:**
```ts
interface RelatedArticlesProps {
  articles: BlogArticleSummary[]
  heading?: string  // default: "More Articles"
}
```

**Card design (improved from current):**
- 16:9 image with hover scale transition
- Category tag pill (teal, from `article.tags[0]` if present)
- Date (formatted: "January 1, 2026")
- Title — 2-line clamp, hover color change to teal
- Excerpt — 2-line clamp (if `article.excerpt` exists)
- Author name — small gray text

### 6B. Blog Article Page (`/blog/[handle]`)

Replace the existing inline "More Articles" grid with `<RelatedArticles articles={moreArticles} />`. No change to data fetching — still fetches 3 articles excluding the current one.

### 6C. Product Pages (`/product/[slug]`)

**Data:** Add blog fetch to `app/product/[slug]/page.tsx`:
```ts
const blogsData = await storefrontFetch(GET_BLOGS_WITH_ARTICLES, { first: 3 })
const relatedArticles = blogsData.blogs.nodes.flatMap(b => b.articles.nodes).slice(0, 3)
```

**Rendering:** Pass `relatedArticles` as prop to `ProductView`. `ProductView` renders `<RelatedArticles articles={relatedArticles} heading="From Our Blog" />` below the specs/tabs section, above `WholesalePricing`.

---

## 7. New Files Summary

```
app/
  industries/
    page.tsx
    [slug]/page.tsx
  brands/
    page.tsx
    [slug]/page.tsx
  partners/
    page.tsx

lib/
  industries.ts
  brands.ts

lib/shopify/queries/
  products.ts              ← add GET_PRODUCTS_BY_VENDOR query

components/
  blog/
    RelatedArticles.tsx    ← new shared component
```

### Modified Files

```
components/home/ShopByIndustry.tsx        ← import from lib/industries.ts
components/blog/BlogCard.tsx              ← update card design to match improved style (used by BlogGrid on /blog listing)
app/blog/[handle]/page.tsx                ← use RelatedArticles component
app/product/[slug]/page.tsx               ← fetch relatedArticles, pass to ProductView
components/product/ProductView.tsx        ← accept relatedArticles prop, render section
```

---

## 8. Out of Scope

- Navigation SEO / hierarchical URL structure (deferred)
- Industry pages beyond the initial 4 in `lib/industries.ts` (config can be extended)
- Brand logo images (brand cards on `/partners` use text-only fallback until assets are provided)
- Quote/contact form on Partners page (links to existing `/b2b`)
- Individual partner detail pages
