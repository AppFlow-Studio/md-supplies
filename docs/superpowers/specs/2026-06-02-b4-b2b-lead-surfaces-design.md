# B4 · B2B Lead Surfaces Design Spec

**Date:** 2026-06-02
**Status:** Approved
**Depends on:** B1 (lib/seo), B2 (product page patterns), B3 (ProductCard)

---

## Overview

Three B2B lead surface templates — Partners directory+detail, Industry pages, OCC hub — targeting high-intent buyer audiences (clinics, pharmacies, facilities). All server-rendered with proper SEO, structured data, and internal linking. Mock data now; real data later.

---

## File Structure

All paths are relative to project root (no `src/` prefix).

```
app/
  partners/
    page.tsx                          # /partners directory
    [partner-slug]/
      page.tsx                        # /partners/[slug] detail
  industries/
    [industry-slug]/
      page.tsx                        # /industries/[slug]
  solutions/
    occ/
      page.tsx                        # /solutions/occ

components/
  b2b/
    PartnerCard.tsx                   # server — logo, name, type badge, description
    PartnerDirectory.tsx              # 'use client' — grid + Brand/Vendor/All filter
    PartnerDetail.tsx                 # server — full partner page layout
    IndustryPage.tsx                  # server — industry page layout
    OCCHub.tsx                        # server — OCC hub layout
    FAQSection.tsx                    # server — FAQ list + FAQSchema; renders nothing if no data
  schema/
    WebPageSchema.tsx                 # JSON-LD <script> for WebPage
    BreadcrumbSchema.tsx              # JSON-LD <script> for BreadcrumbList
    FAQSchema.tsx                     # JSON-LD <script> for FAQPage

lib/
  mock/
    partners.ts                       # 6 partners: 3 brands, 3 vendors; 1 inactive
    industries.ts                     # 4 industries: 2 populated, 2 thin (noindex)
    occ.ts                            # OCC hub data with FAQ

types/
  partner.ts                          # Partner interface
  industry.ts                         # Industry interface
  occ.ts                              # OCCHub interface
```

---

## SEO Helper Fix

Update `lib/seo/metadata.ts` `resolvePath` — change `'occ'` case from `/occ` to `/solutions/occ`.

```typescript
case 'occ': return '/solutions/occ'
```

---

## Types

### `types/partner.ts`

```typescript
interface Partner {
  slug: string
  name: string
  type: 'brand' | 'vendor'
  isActive: boolean
  description: string
  logo: { url: string; altText: string; width: number; height: number }
  intro: string
  productCategories: string[]
  featuredProducts: { handle: string; title: string; image: string; price: number }[]
  relatedBrands?: string[]
  relatedCategories: { handle: string; title: string }[]
  seoTitle?: string
  seoDescription?: string
}
```

### `types/industry.ts`

```typescript
interface Industry {
  slug: string
  name: string
  isPopulated: boolean
  intro: string
  heroImage?: { url: string; altText: string }
  relevantCategories: { handle: string; title: string }[]
  relevantSubcategories: { handle: string; title: string }[]
  relevantProducts: { handle: string; title: string; image: string; price: number }[]
  relatedGuides: { slug: string; title: string }[]
  ctaText: string
  ctaLink: string
  faq?: { question: string; answer: string }[]
  seoTitle?: string
  seoDescription?: string
}
```

### `types/occ.ts`

```typescript
interface OCCHub {
  title: string
  intro: string
  programExplanation: string
  freeShippingMessage: string
  eligibleCategories: { handle: string; title: string }[]
  eligibleProducts: { handle: string; title: string; image: string; price: number }[]
  faq?: { question: string; answer: string }[]
  seoTitle?: string
  seoDescription?: string
}
```

---

## Mock Data

### `lib/mock/partners.ts`

6 partners total:
- **Brands (3):** Dawn Mist, Lumex, DynaO2
- **Vendors (3):** Dukal, Graham Field, Dynarex
- **1 inactive** (Dukal `isActive: false`) — excluded from `/partners` directory

### `lib/mock/industries.ts`

4 industries:
- **Populated (2):** Pharmacy (`isPopulated: true`), Urgent Care (`isPopulated: true`) — these get `index,follow`
- **Thin (2):** Dental (`isPopulated: false`), Long-Term Care (`isPopulated: false`) — these get `noindex,follow`

### `lib/mock/occ.ts`

Full OCCHub object with program explanation, free-shipping message, 4 eligible categories, 6 eligible products, and a FAQ array.

---

## Component Specs

### `PartnerCard.tsx` (server)

- Logo (`next/image`), name, type badge ("Brand" — teal | "Vendor" — navy), short description
- Entire card is an `<a href="/partners/[slug]">` anchor
- No JS required

### `PartnerDirectory.tsx` (`'use client'`)

- Receives full active partners list as prop
- Local state for active filter: `'all' | 'brand' | 'vendor'`
- Filters client-side; no server round-trip
- Renders `PartnerCard` grid

### `PartnerDetail.tsx` (server)

- Partner logo, name, type badge (same as card but larger)
- Intro + description
- Featured products grid — uses `ProductCard` from `components/product/ProductCard.tsx`
- Related categories as anchor links to `/category/[handle]`
- Related brands links (vendor pages only)
- `WebPageSchema` + `BreadcrumbSchema` output

### `IndustryPage.tsx` (server)

- Breadcrumb: Home > Industries > {Name}
- H1: `{Name} Supplies`
- Hero image (if present)
- Intro copy
- Category + subcategory linked grid
- Product card grid (reuses `ProductCard`)
- Related guides as anchor links to `/blog/[slug]`
- CTA button as `<a href={ctaLink}>`
- `FAQSection` (renders only if `faq` array is non-empty)
- `WebPageSchema` + `BreadcrumbSchema`

### `OCCHub.tsx` (server)

- Breadcrumb: Home > Solutions > OCC
- H1: "OCC Solutions"
- Program explanation block
- Free-shipping messaging (exact text from data — no copy added by component)
- OCC-eligible categories as anchor links
- Product card grid (reuses `ProductCard`)
- `FAQSection` (renders only if `faq` array is non-empty)
- `WebPageSchema` + `BreadcrumbSchema`

### `FAQSection.tsx` (server)

- Returns `null` if `faq` is undefined or `faq.length === 0` — no empty container
- Renders visible `<dl>` or accordion list of Q&A
- Renders `FAQSchema` only when visible FAQ is present

### `WebPageSchema.tsx` / `BreadcrumbSchema.tsx` / `FAQSchema.tsx` (server)

- Each emits a `<script type="application/ld+json">` tag
- Accepts typed props; no internal data fetching

---

## Page-Level SEO

### `/partners`
```typescript
generateMetadata: () => buildMetadata({ pageType: 'partners' })
robots: buildRobots({ pageType: 'partners' })
```

### `/partners/[partner-slug]`
```typescript
generateMetadata: (partner) => buildMetadata({
  pageType: 'partner-detail',
  title: partner.seoTitle || partner.name,
  description: partner.seoDescription || partner.description,
  slug: partner.slug,
  image: partner.logo.url,
})
```

### `/industries/[industry-slug]`
```typescript
generateMetadata: (industry) => buildMetadata({
  pageType: 'industry',
  title: industry.seoTitle || industry.name,
  description: industry.seoDescription || industry.intro,
  slug: industry.slug,
  noIndex: !industry.isPopulated,
})
```

### `/solutions/occ`
```typescript
generateMetadata: () => buildMetadata({
  pageType: 'occ',
  title: occ.seoTitle,
  description: occ.seoDescription || occ.intro,
})
```

---

## Indexation Rules

| Page | Condition | Robots |
|------|-----------|--------|
| `/partners` | always | `index,follow` |
| `/partners/[slug]` | always | `index,follow` |
| `/industries/[slug]` | `isPopulated: true` | `index,follow` |
| `/industries/[slug]` | `isPopulated: false` | `noindex,follow` |
| `/solutions/occ` | always | `index,follow` |

---

## Internal Link Rules

- All internal links are `<a href="...">` or `<Link href="...">` — never `<button onClick>` or JS navigation
- Category links → `/category/[handle]`
- Product links → `/products/[handle]`
- Blog links → `/blog/[slug]`
- Partner links → `/partners/[slug]`

---

## FAQ Rules

- `FAQSection` renders nothing if `faq` is absent or empty
- `FAQSchema` is only emitted inside `FAQSection` (never standalone)
- No hidden FAQ, no schema without visible content

---

## OCC Badge Rules

- `isOCC` badge on `ProductCard` only when `product.isOCC === true`
- Free-shipping claim only from `occ.freeShippingMessage` field — component adds no copy
- Private/internal ordering workflows: `noindex` (not part of this task)

---

## Out of Scope

- Real data (data team)
- Cart/checkout integration
- `/solutions` hub index page
- HRT Clinics industry page (pending approval)
