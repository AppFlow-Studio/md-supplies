# Mock Data Elimination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all `lib/mock/*` imports in `app/` with live Shopify data or canonical static config so every public template is launch-real.

**Architecture:** Three categories of replacement: (1) true mocks that die entirely (lib/mock/products, lib/mock/blog-articles); (2) static editorial config that moves to non-mock lib files (lib/mock/partners → lib/partners, lib/mock/occ → lib/occ); (3) pages that gain live Shopify queries to replace hardcoded handles/prices. The /brands route is absorbed into /partners with a products sub-page. Removed categories are blocked via a server-side deny-list in the categories hub.

**Tech Stack:** Next.js 16.2.6, React 19, Shopify Storefront API 2026-04, TypeScript, Tailwind v4

---

## File Map

### Created
- `lib/partners.ts` — canonical partner static config (replaces lib/mock/partners.ts)
- `lib/occ.ts` — canonical OCC static config (replaces lib/mock/occ.ts)
- `app/partners/[partner-slug]/products/page.tsx` — vendor product listing (moves functionality from app/brands/[slug]/page.tsx)
- `docs/data-gap-log.md` — running data-gap flag list

### Modified
- `components/product/ProductCard.tsx:23` — fix `/products/` → `/product/`
- `components/b2b/FeaturedProductCard.tsx:20` — fix `/products/` → `/product/`
- `app/partners/[partner-slug]/page.tsx` — import from lib/partners, fetch featured products live
- `app/partners/page.tsx` — import MANUFACTURERS from lib/partners
- `app/industries/[industry-slug]/page.tsx` — use lib/industries.ts + live Shopify, drop mock
- `app/solutions/occ/page.tsx` — import from lib/occ
- `app/categories/page.tsx` — add EXCLUDED_COLLECTION_HANDLES blocklist
- `components/layout/Footer.tsx` — remove Brands nav entry
- `lib/seo/sitemap.ts` — remove /brands entry
- `lib/routes.ts` — remove brands routes
- `types/partner.ts` — add vendorName field

### Deleted
- `app/products/[handle]/page.tsx`
- `components/product/ProductPage.tsx`
- `lib/mock/products.ts`
- `lib/mock/partners.ts`
- `lib/mock/occ.ts`
- `lib/mock/industries.ts`
- `lib/mock/blog-articles.ts`
- `app/brands/page.tsx`
- `app/brands/[slug]/page.tsx`
- `app/brands/BrandDirectory.tsx`
- `lib/brands.ts`
- `app/blog/types-of-needles/page.tsx`
- `app/blog/types-of-sutures/page.tsx`

---

## Task 1 — Fix `/products/` links in ProductCard and FeaturedProductCard

Both components hard-code `/products/${handle}`. The canonical PDP route is `/product/[slug]` via `ROUTES.product()`.

**Files:**
- Modify: `components/product/ProductCard.tsx:23`
- Modify: `components/b2b/FeaturedProductCard.tsx:20`

- [ ] **Step 1.1 — Fix ProductCard href**

In `components/product/ProductCard.tsx`, replace line 1 and line 23:

```tsx
// BEFORE (line 1–2 area):
import Link from 'next/link'
import type { ProductCardData } from '@/types/product'

// AFTER — add ROUTES import:
import Link from 'next/link'
import type { ProductCardData } from '@/types/product'
import { ROUTES } from '@/lib/routes'
```

```tsx
// BEFORE (line 23):
        href={`/products/${product.handle}`}

// AFTER:
        href={ROUTES.product(product.handle)}
```

- [ ] **Step 1.2 — Fix FeaturedProductCard href**

In `components/b2b/FeaturedProductCard.tsx`, replace line 1 and line 20:

```tsx
// BEFORE (line 1):
import Link from 'next/link'

// AFTER — add ROUTES import:
import Link from 'next/link'
import { ROUTES } from '@/lib/routes'
```

```tsx
// BEFORE (line 20):
      href={`/products/${product.handle}`}

// AFTER:
      href={ROUTES.product(product.handle)}
```

- [ ] **Step 1.3 — Verify no remaining `/products/` route links**

Run:
```powershell
Select-String -Path "app", "components", "lib" -Include "*.tsx","*.ts" -Pattern '"/products/' -Recurse
```

Expected: zero matches (any remaining hits are string literals in image paths or comments, not route hrefs).

- [ ] **Step 1.4 — Delete the orphaned mock route and its dependencies**

```powershell
Remove-Item "app\products\[handle]\page.tsx"
Remove-Item "app\products" -Recurse -Force
Remove-Item "components\product\ProductPage.tsx"
Remove-Item "lib\mock\products.ts"
Remove-Item "lib\mock\product-cards.ts"
```

`lib/mock/product-cards.ts` has zero imports in the codebase; delete it alongside products.ts.

- [ ] **Step 1.5 — Verify build**

```powershell
npm run build 2>&1 | Select-String "error|Error" | Select-Object -First 20
```

Expected: no TypeScript or build errors referencing ProductPage, getMockProduct, or /products/.

- [ ] **Step 1.6 — Commit**

```powershell
git add -A
git commit -m "fix: replace /products/ hrefs with ROUTES.product() and delete orphaned mock PDP route"
```

---

## Task 2 — Exclude removed categories from the categories hub

Categories that must never appear: Pharmaceuticals, Beds, Bariatric Beds, Maternity & Infant Care. Add a server-side deny-list applied immediately after the Shopify collection fetch.

**Files:**
- Modify: `app/categories/page.tsx`
- Modify: `lib/seo/sitemap.ts`

- [ ] **Step 2.1 — Add EXCLUDED_COLLECTION_HANDLES to categories page**

In `app/categories/page.tsx`, add the constant after the imports and apply it to the collections array. Replace lines 26–38:

```tsx
// Add after imports, before export const revalidate:
const EXCLUDED_COLLECTION_HANDLES = new Set([
  'pharmaceuticals',
  'beds',
  'bariatric-beds',
  'maternity-and-infant-care',
  'maternity-infant-care',
])

export const revalidate = 60
```

Replace the `collections = data.collections.nodes` line inside the try block:

```tsx
// BEFORE:
    collections = data.collections.nodes

// AFTER:
    collections = data.collections.nodes.filter(
      (c) => !EXCLUDED_COLLECTION_HANDLES.has(c.handle)
    )
```

- [ ] **Step 2.2 — Export the blocklist for reuse**

Create `lib/excluded-categories.ts`:

```ts
export const EXCLUDED_COLLECTION_HANDLES = new Set([
  'pharmaceuticals',
  'beds',
  'bariatric-beds',
  'maternity-and-infant-care',
  'maternity-infant-care',
])
```

Update `app/categories/page.tsx` to import from there instead (remove the inline constant you just added, replace with):

```tsx
import { EXCLUDED_COLLECTION_HANDLES } from '@/lib/excluded-categories'
```

- [ ] **Step 2.3 — Remove /brands from sitemap**

In `lib/seo/sitemap.ts`, delete the line:

```ts
  { url: `${SITE_URL}/brands`, changeFrequency: 'monthly', priority: 0.6 },
```

- [ ] **Step 2.4 — Verify build**

```powershell
npm run build 2>&1 | Select-String "error|Error" | Select-Object -First 20
```

Expected: clean build.

- [ ] **Step 2.5 — Commit**

```powershell
git add -A
git commit -m "feat: blocklist removed categories from hub and remove /brands from sitemap"
```

---

## Task 3 — Audit PDP variant pricing and optional field hiding

Read-only verification of `components/product/ProductView.tsx`. No code changes expected unless bugs are found.

**Files:**
- Read: `components/product/ProductView.tsx`

- [ ] **Step 3.1 — Read ProductView**

Open `components/product/ProductView.tsx` and confirm:

1. **Variant pricing** — the displayed price must come from `selectedVariant.price.amount`, not from `product.priceRange.minVariantPrice`. Search for `priceRange`:

```powershell
Select-String -Path "components\product\ProductView.tsx" -Pattern "priceRange"
```

Expected: zero matches. If any hits: replace with `selectedVariant.price.amount`.

2. **Optional metafield rendering** — every optional field rendered in ProductView (brandName, packaging, sterility, gloveSize, needleGauge, etc.) must be wrapped in a null-guard:

```powershell
Select-String -Path "components\product\ProductView.tsx" -Pattern '"N/A"|"null"|"undefined"|null\}" '
```

Expected: zero matches.

- [ ] **Step 3.2 — Fix any pricing issues found**

If `priceRange` is used for display price, locate the variant state and replace:

```tsx
// WRONG — shows minimum price regardless of selection:
{product.priceRange.minVariantPrice.amount}

// CORRECT — shows selected variant price:
{selectedVariant.price.amount}
```

Verify the selectedVariant state is initialized to `product.variants.nodes[0]` and updated on variant selector change.

- [ ] **Step 3.3 — Fix any missing null-guards**

For each optional metafield section that renders without a null-check, wrap it:

```tsx
// WRONG:
<p>{product.brandName}</p>

// CORRECT — omits the entire element when null:
{product.brandName && <p>{product.brandName}</p>}
```

Sections/blocks that contain only optional fields must be wrapped so the heading also disappears:

```tsx
// CORRECT — entire block hidden when all fields are null:
{(product.gloveSize || product.sterility || product.material) && (
  <section>
    <h3>Specifications</h3>
    {product.gloveSize && <dt>Glove Size</dt>}
    ...
  </section>
)}
```

- [ ] **Step 3.4 — Build and commit if any changes were made**

```powershell
npm run build 2>&1 | Select-String "error|Error" | Select-Object -First 20
git add -A
git commit -m "fix: use selectedVariant.price for display, guard all optional metafield sections"
```

---

## Task 4 — Create canonical lib/partners.ts (static config, not mock)

Move all partner static config out of lib/mock/ into a proper `lib/partners.ts`. The content (logos, descriptions, categories, SEO) is editorial — it stays static. What changes is that featured products will be fetched live in Task 5.

**Files:**
- Create: `lib/partners.ts`
- Modify: `types/partner.ts`

- [ ] **Step 4.1 — Add vendorName to Partner type**

In `types/partner.ts`, add `vendorName: string` to the `Partner` interface (this is the exact Shopify vendor string used in `GET_PRODUCTS_BY_VENDOR`):

```ts
export interface Partner {
  slug: string
  name: string
  vendorName: string          // exact Shopify product.vendor string (e.g. "Dynarex")
  type: 'brand' | 'vendor'
  isActive: boolean
  description: string
  logo: PartnerLogo
  intro: string
  productCategories: string[]
  featuredProducts: PartnerFeaturedProduct[]  // kept for type compat; live data replaces values
  relatedBrands?: string[]
  relatedCategories: PartnerRelatedCategory[]
  seoTitle?: string
  seoDescription?: string
}
```

- [ ] **Step 4.2 — Create lib/partners.ts**

Create `lib/partners.ts` with the same 15 partners from `lib/mock/partners.ts`, adding `vendorName` to each entry. Copy the full array from mock, then:

1. Add `vendorName` to every entry. For most, it equals `name`. Where Shopify vendor differs from display name, use the Shopify-exact string (data team to verify; use `name` as default):

```ts
import type { Partner } from '@/types/partner'

export const PARTNERS: Partner[] = [
  {
    slug: 'ad-surgical',
    name: 'AD Surgical',
    vendorName: 'AD Surgical',
    type: 'brand',
    isActive: true,
    description: 'Leading provider of surgical sutures, wound closure, and procedure kits.',
    logo: {
      url: 'https://www.figma.com/api/mcp/asset/8c489793-5cbe-4f61-8fcd-19ba4119eec9',
      altText: 'AD Surgical logo',
      width: 200,
      height: 80,
    },
    intro: 'AD Surgical is a trusted name in surgical wound management, offering a comprehensive portfolio of sutures, wound closure strips, staples, and procedure kits designed for clinical precision and consistent outcomes.',
    productCategories: ['surgical', 'wound-closure', 'sutures', 'procedure-kits'],
    featuredProducts: [],
    relatedCategories: [
      { handle: 'surgical', title: 'Surgical Supplies' },
      { handle: 'wound-care', title: 'Wound Care' },
    ],
    seoTitle: 'AD Surgical Products | MDSupplies',
    seoDescription: 'Shop AD Surgical sutures, wound closure, and procedure kits at wholesale prices through MDSupplies.',
  },
  {
    slug: 'cordx',
    name: 'CorDx',
    vendorName: 'CorDx',
    type: 'brand',
    isActive: true,
    description: 'Advanced rapid diagnostic testing solutions for clinical and point-of-care settings.',
    logo: {
      url: 'https://www.figma.com/api/mcp/asset/2ff04940-2487-4aa4-8daa-1f440301fc04',
      altText: 'CorDx logo',
      width: 200,
      height: 80,
    },
    intro: 'CorDx develops rapid diagnostic tests and point-of-care solutions trusted by clinics, urgent care centers, and public health agencies. Their portfolio spans infectious disease testing, flu panels, and molecular assays.',
    productCategories: ['diagnostics', 'rapid-tests', 'point-of-care'],
    featuredProducts: [],
    relatedCategories: [
      { handle: 'diagnostics', title: 'Diagnostics' },
      { handle: 'rapid-tests', title: 'Rapid Tests' },
    ],
    seoTitle: 'CorDx Rapid Diagnostic Products | MDSupplies',
    seoDescription: 'Shop CorDx rapid diagnostic testing solutions at wholesale prices through MDSupplies.',
  },
  {
    slug: 'dukal',
    name: 'Dukal',
    vendorName: 'Dukal',
    type: 'brand',
    isActive: true,
    description: 'High-quality disposable medical products for wound care, exam, and procedure use.',
    logo: {
      url: 'https://www.figma.com/api/mcp/asset/0d3ad4a5-6272-46a4-8120-e7e86dee0773',
      altText: 'Dukal logo',
      width: 200,
      height: 80,
    },
    intro: 'Dukal Corporation manufactures high-quality disposable medical products including gauze sponges, wound dressings, exam gloves, and surgical drapes trusted by healthcare facilities across the United States.',
    productCategories: ['wound-care', 'surgical', 'exam-room', 'gauze'],
    featuredProducts: [],
    relatedCategories: [
      { handle: 'wound-care', title: 'Wound Care' },
      { handle: 'surgical', title: 'Surgical Supplies' },
      { handle: 'exam-room', title: 'Exam Room' },
    ],
    seoTitle: 'Dukal Medical Products | MDSupplies',
    seoDescription: 'Shop Dukal wound care, surgical, and disposable medical products at wholesale prices through MDSupplies.',
  },
  {
    slug: 'dynarex',
    name: 'Dynarex',
    vendorName: 'Dynarex',
    type: 'brand',
    isActive: true,
    description: 'Dependable general medical products trusted by healthcare providers nationwide.',
    logo: {
      url: 'https://www.figma.com/api/mcp/asset/40c82316-c043-4b64-8be8-585ed3276f96',
      altText: 'Dynarex logo',
      width: 200,
      height: 80,
    },
    intro: 'Dynarex is one of the largest manufacturers of general medical products in the United States, offering thousands of SKUs across gloves, wound care, personal protective equipment, and exam room essentials.',
    productCategories: ['disposables', 'wound-care', 'ppe', 'exam-room'],
    featuredProducts: [],
    relatedCategories: [
      { handle: 'disposables', title: 'Disposables' },
      { handle: 'ppe', title: 'PPE' },
      { handle: 'wound-care', title: 'Wound Care' },
    ],
    seoTitle: 'Dynarex Medical Products | MDSupplies',
    seoDescription: 'Shop Dynarex gloves, wound care, and disposable medical supplies at wholesale prices through MDSupplies.',
  },
  {
    slug: 'kadara',
    name: 'Kadara',
    vendorName: 'Kadara',
    type: 'brand',
    isActive: true,
    description: 'Innovative medical supply solutions focused on quality and clinical performance.',
    logo: {
      url: 'https://www.figma.com/api/mcp/asset/57a084ab-54d3-4aac-bbb6-2230b7945506',
      altText: 'Kadara logo',
      width: 200,
      height: 80,
    },
    intro: 'Kadara designs innovative medical supplies built for clinical performance and reliability. Their product line emphasizes quality manufacturing standards and consistent delivery for healthcare providers.',
    productCategories: ['medical-supplies', 'clinical-products'],
    featuredProducts: [],
    relatedCategories: [
      { handle: 'medical-supplies', title: 'Medical Supplies' },
    ],
    seoTitle: 'Kadara Medical Supply Products | MDSupplies',
    seoDescription: 'Shop Kadara innovative medical supply solutions at wholesale prices through MDSupplies.',
  },
  {
    slug: 'kemp-usa',
    name: 'Kemp USA',
    vendorName: 'Kemp USA',
    type: 'brand',
    isActive: true,
    description: 'Professional-grade medical equipment and emergency response supplies.',
    logo: {
      url: 'https://www.figma.com/api/mcp/asset/4feee5b9-fc58-439f-9232-841240db91f2',
      altText: 'Kemp USA logo',
      width: 200,
      height: 80,
    },
    intro: 'Kemp USA manufactures professional-grade medical and emergency response equipment including stretchers, backboards, first aid kits, and AED supplies used by first responders and healthcare facilities.',
    productCategories: ['emergency', 'first-aid', 'stretchers', 'aed'],
    featuredProducts: [],
    relatedCategories: [
      { handle: 'emergency', title: 'Emergency Supplies' },
      { handle: 'first-aid', title: 'First Aid' },
    ],
    seoTitle: 'Kemp USA Emergency & Medical Equipment | MDSupplies',
    seoDescription: 'Shop Kemp USA medical equipment and emergency response supplies at wholesale prices through MDSupplies.',
  },
  {
    slug: 'graham-field',
    name: 'Graham Field',
    vendorName: 'Graham Field',
    type: 'brand',
    isActive: true,
    description: 'Comprehensive durable medical equipment and rehabilitation solutions.',
    logo: {
      url: 'https://www.figma.com/api/mcp/asset/1a1a19d2-e56f-4f27-9b46-e2cc7fffc8df',
      altText: 'Graham Field logo',
      width: 200,
      height: 80,
    },
    intro: 'Graham Field Health Products is a leading manufacturer and distributor of durable medical equipment and rehabilitation products. Their brands—including Lumex and Everest & Jennings—serve patients from acute care to home health settings.',
    productCategories: ['dme', 'rehabilitation', 'patient-care', 'mobility-aids'],
    featuredProducts: [],
    relatedCategories: [
      { handle: 'dme', title: 'Durable Medical Equipment' },
      { handle: 'rehabilitation', title: 'Rehabilitation' },
    ],
    seoTitle: 'Graham Field Medical Products | MDSupplies',
    seoDescription: 'Shop Graham Field durable medical equipment and rehabilitation solutions at wholesale prices through MDSupplies.',
  },
  {
    slug: 'medline',
    name: 'Medline',
    vendorName: 'Medline',
    type: 'brand',
    isActive: true,
    description: 'One of the largest manufacturers and distributors of healthcare supplies in the US.',
    logo: {
      url: 'https://www.figma.com/api/mcp/asset/9f893490-1d51-45bf-ba02-a012f9d5a8b3',
      altText: 'Medline logo',
      width: 200,
      height: 80,
    },
    intro: 'Medline Industries is one of the largest privately held manufacturers and distributors of healthcare products in the United States. With over 350,000 products across virtually every care setting, Medline partners with healthcare facilities to improve clinical and financial outcomes.',
    productCategories: ['gloves', 'wound-care', 'surgical', 'patient-care', 'ppe', 'disposables'],
    featuredProducts: [],
    relatedCategories: [
      { handle: 'gloves', title: 'Gloves' },
      { handle: 'wound-care', title: 'Wound Care' },
      { handle: 'surgical', title: 'Surgical Supplies' },
      { handle: 'ppe', title: 'PPE' },
    ],
    seoTitle: 'Medline Healthcare Products | MDSupplies',
    seoDescription: 'Shop Medline medical supplies, gloves, wound care, and more at wholesale prices through MDSupplies.',
  },
  {
    slug: 'systems',
    name: 'Systems',
    vendorName: 'Systems',
    type: 'brand',
    isActive: true,
    description: 'Integrated medical supply systems for streamlined clinical procurement.',
    logo: {
      url: 'https://www.figma.com/api/mcp/asset/bd49eacf-6f92-4512-b5fd-c795d35acbd2',
      altText: 'Systems logo',
      width: 200,
      height: 80,
    },
    intro: 'Systems provides integrated medical supply solutions that streamline procurement and inventory management for healthcare facilities. Their systems approach simplifies ordering and reduces supply chain complexity.',
    productCategories: ['medical-supplies', 'procurement', 'clinical-systems'],
    featuredProducts: [],
    relatedCategories: [
      { handle: 'medical-supplies', title: 'Medical Supplies' },
    ],
    seoTitle: 'Systems Medical Supply Solutions | MDSupplies',
    seoDescription: 'Shop Systems integrated medical supply solutions at wholesale prices through MDSupplies.',
  },
  {
    slug: 'philip-scalice',
    name: 'Philip Scalice',
    vendorName: 'Philip Scalice',
    type: 'brand',
    isActive: true,
    description: 'Specialty medical supplies and instruments for clinical and surgical use.',
    logo: {
      url: 'https://www.figma.com/api/mcp/asset/4f85d0fb-edfb-44c7-93d8-11f795a75e52',
      altText: 'Philip Scalice logo',
      width: 200,
      height: 80,
    },
    intro: 'Philip Scalice offers specialty medical supplies and instruments designed for clinical and surgical applications. Their product range supports precise procedural outcomes across multiple care disciplines.',
    productCategories: ['surgical', 'instruments', 'specialty-supplies'],
    featuredProducts: [],
    relatedCategories: [
      { handle: 'surgical', title: 'Surgical Supplies' },
      { handle: 'instruments', title: 'Medical Instruments' },
    ],
    seoTitle: 'Philip Scalice Specialty Medical Supplies | MDSupplies',
    seoDescription: 'Shop Philip Scalice specialty medical supplies and instruments at wholesale prices through MDSupplies.',
  },
  {
    slug: 'truecare',
    name: 'TrueCare',
    vendorName: 'TrueCare',
    type: 'brand',
    isActive: true,
    description: 'Patient-centered wound care and disposable medical supply solutions.',
    logo: {
      url: 'https://www.figma.com/api/mcp/asset/35a25913-e45f-40fb-bed3-02bfccad6b4e',
      altText: 'TrueCare logo',
      width: 200,
      height: 80,
    },
    intro: 'TrueCare develops patient-centered wound care and disposable medical supplies that prioritize comfort and clinical effectiveness. Their products are designed for consistent performance in wound management and daily patient care.',
    productCategories: ['wound-care', 'disposables', 'patient-care'],
    featuredProducts: [],
    relatedCategories: [
      { handle: 'wound-care', title: 'Wound Care' },
      { handle: 'disposables', title: 'Disposables' },
    ],
    seoTitle: 'TrueCare Wound Care & Disposable Supplies | MDSupplies',
    seoDescription: 'Shop TrueCare wound care and disposable medical supply solutions at wholesale prices through MDSupplies.',
  },
  {
    slug: 'vive-health',
    name: 'Vive Health',
    vendorName: 'Vive Health',
    type: 'brand',
    isActive: true,
    description: 'Daily living aids, mobility equipment, and home health supplies.',
    logo: {
      url: 'https://www.figma.com/api/mcp/asset/0b4afb00-deb5-4dc9-8a3e-bef93ff6f60d',
      altText: 'Vive Health logo',
      width: 200,
      height: 80,
    },
    intro: 'Vive Health designs daily living aids, mobility equipment, and home health supplies that empower patients to live independently. Their accessible product line serves individuals recovering from injury or managing chronic conditions.',
    productCategories: ['dme', 'mobility-aids', 'daily-living', 'home-health'],
    featuredProducts: [],
    relatedCategories: [
      { handle: 'dme', title: 'Durable Medical Equipment' },
      { handle: 'mobility-aids', title: 'Mobility Aids' },
      { handle: 'home-health', title: 'Home Health' },
    ],
    seoTitle: 'Vive Health Home Health & Mobility Products | MDSupplies',
    seoDescription: 'Shop Vive Health daily living aids and mobility equipment at wholesale prices through MDSupplies.',
  },
  {
    slug: 'dawn-mist',
    name: 'Dawn Mist',
    vendorName: 'Dawn Mist',
    type: 'brand',
    isActive: true,
    description: 'Premium personal care and hygiene products for healthcare facilities.',
    logo: {
      url: 'https://placehold.co/200x80/e5eff7/0086b1?text=Dawn+Mist',
      altText: 'Dawn Mist logo',
      width: 200,
      height: 80,
    },
    intro: 'Dawn Mist is a leading brand of personal care products trusted by hospitals and long-term care facilities across North America.',
    productCategories: ['personal-care', 'hygiene', 'bath-supplies'],
    featuredProducts: [],
    relatedCategories: [
      { handle: 'personal-care', title: 'Personal Care' },
      { handle: 'hygiene', title: 'Hygiene Supplies' },
    ],
    seoTitle: 'Dawn Mist Products | MDSupplies',
    seoDescription: 'Browse Dawn Mist personal care and hygiene products available at wholesale prices through MDSupplies.',
  },
  {
    slug: 'lumex',
    name: 'Lumex',
    vendorName: 'Lumex',
    type: 'brand',
    isActive: true,
    description: 'Durable medical equipment and mobility aids for patient care.',
    logo: {
      url: 'https://placehold.co/200x80/f0fdf4/166534?text=Lumex',
      altText: 'Lumex logo',
      width: 200,
      height: 80,
    },
    intro: 'Lumex specializes in durable medical equipment including walkers, wheelchairs, and patient lifts used in home care and clinical settings.',
    productCategories: ['dme', 'mobility-aids', 'patient-lifts'],
    featuredProducts: [],
    relatedCategories: [
      { handle: 'dme', title: 'Durable Medical Equipment' },
      { handle: 'mobility-aids', title: 'Mobility Aids' },
    ],
  },
  {
    slug: 'dynao2',
    name: 'DynaO2',
    vendorName: 'DynaO2',
    type: 'brand',
    isActive: true,
    description: 'Respiratory therapy and oxygen delivery products for clinical use.',
    logo: {
      url: 'https://placehold.co/200x80/fef9c3/854d0e?text=DynaO2',
      altText: 'DynaO2 logo',
      width: 200,
      height: 80,
    },
    intro: 'DynaO2 manufactures respiratory therapy products including nasal cannulas, oxygen masks, and nebulizer kits for hospitals and home health agencies.',
    productCategories: ['respiratory', 'oxygen-therapy'],
    featuredProducts: [],
    relatedCategories: [
      { handle: 'respiratory', title: 'Respiratory Supplies' },
      { handle: 'oxygen-therapy', title: 'Oxygen Therapy' },
    ],
  },
]

export function getPartnerBySlug(slug: string): Partner | undefined {
  return PARTNERS.find((p) => p.slug === slug)
}

export function getActivePartners(): Partner[] {
  return PARTNERS.filter((p) => p.isActive)
}
```

> **Data team:** After connecting to live Shopify, verify each partner's `vendorName` matches exactly the `product.vendor` field in Shopify for at least one product. Flag mismatches to the data-gap log.

- [ ] **Step 4.3 — Verify TypeScript**

```powershell
npx tsc --noEmit 2>&1 | Select-String "error" | Select-Object -First 20
```

Expected: zero errors.

- [ ] **Step 4.4 — Commit**

```powershell
git add lib/partners.ts types/partner.ts
git commit -m "feat: add canonical lib/partners.ts with vendorName field"
```

---

## Task 5 — Update partner detail page to use lib/partners + live featured products

Replace `getPartnerBySlug` / `mockPartners` imports from `lib/mock/partners` with `lib/partners`. Replace hardcoded featured products with a live Shopify fetch.

**Files:**
- Modify: `app/partners/[partner-slug]/page.tsx`
- Modify: `app/partners/page.tsx`
- Delete: `lib/mock/partners.ts`

- [ ] **Step 5.1 — Update partner detail page imports**

In `app/partners/[partner-slug]/page.tsx`, replace lines 7–8:

```ts
// BEFORE:
import { getPartnerBySlug, mockPartners } from '@/lib/mock/partners'

// AFTER:
import { getPartnerBySlug, PARTNERS } from '@/lib/partners'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_PRODUCTS_BY_VENDOR } from '@/lib/shopify/queries/products'
import type { CollectionProduct } from '@/lib/shopify/types'
```

- [ ] **Step 5.2 — Add live featured products fetch**

Replace the `generateStaticParams` export and add a fetch helper. After the imports, add:

```ts
export function generateStaticParams() {
  return PARTNERS
    .filter((p) => p.isActive)
    .map((p) => ({ 'partner-slug': p.slug }))
}

async function fetchFeaturedProducts(vendorName: string): Promise<CollectionProduct[]> {
  try {
    const data = await storefrontFetch<{
      products: { nodes: CollectionProduct[] }
    }>(GET_PRODUCTS_BY_VENDOR, {
      query: `vendor:"${vendorName}"`,
      first: 4,
      after: null,
      sortKey: 'BEST_SELLING',
      reverse: false,
    })
    return data.products.nodes
  } catch {
    return []
  }
}
```

- [ ] **Step 5.3 — Replace mock partner reference in page body**

In `PartnerDetailPage`, replace the `mockPartners.filter(...)` that builds `otherPartners` (line 48–51):

```ts
// BEFORE:
  const otherPartners = mockPartners
    .filter((p) => p.isActive && p.slug !== partner.slug)
    .slice(0, 3)

// AFTER:
  const otherPartners = PARTNERS
    .filter((p) => p.isActive && p.slug !== partner.slug)
    .slice(0, 3)
```

Add the live products fetch to the page function (make it async and fetch in parallel):

```ts
// BEFORE:
export default async function PartnerDetailPage({ params }: Props) {
  const { 'partner-slug': slug } = await params
  const partner = getPartnerBySlug(slug)
  if (!partner || !partner.isActive) notFound()

// AFTER:
export default async function PartnerDetailPage({ params }: Props) {
  const { 'partner-slug': slug } = await params
  const partner = getPartnerBySlug(slug)
  if (!partner || !partner.isActive) notFound()

  const [featuredProducts, otherPartners] = await Promise.all([
    fetchFeaturedProducts(partner.vendorName),
    Promise.resolve(
      PARTNERS.filter((p) => p.isActive && p.slug !== partner.slug).slice(0, 3)
    ),
  ])
```

Remove the old `otherPartners` const declaration (it's now initialized above).

- [ ] **Step 5.4 — Wire FeaturedProductCard to live products**

Find the FeaturedProducts section (around line 186) and update to use `featuredProducts` from Shopify:

```tsx
// BEFORE:
            {partner.featuredProducts.length > 0 && (
              <FadeIn delay={0.18}>
                <div className="mt-10 pt-10 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-6">
                    <p className="text-navy-900 text-[20px] font-semibold tracking-tight">
                      Featured Products
                    </p>
                    <Link
                      href={`/brands/${partner.slug}`}
                      className="group text-teal-500 text-[14px] font-semibold flex items-center gap-1"
                    >
                      View all <AnimatedArrow size={14} />
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {partner.featuredProducts.map((p) => (
                      <FeaturedProductCard key={p.handle} product={p} />
                    ))}
                  </div>
                </div>
              </FadeIn>
            )}

// AFTER:
            {featuredProducts.length > 0 && (
              <FadeIn delay={0.18}>
                <div className="mt-10 pt-10 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-6">
                    <p className="text-navy-900 text-[20px] font-semibold tracking-tight">
                      Featured Products
                    </p>
                    <Link
                      href={`/partners/${partner.slug}/products`}
                      className="group text-teal-500 text-[14px] font-semibold flex items-center gap-1"
                    >
                      View all <AnimatedArrow size={14} />
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {featuredProducts.map((p) => (
                      <FeaturedProductCard
                        key={p.handle}
                        product={{
                          handle: p.handle,
                          title: p.title,
                          image: p.images.nodes[0]?.url ?? '',
                          price: Math.round(
                            parseFloat(p.priceRange.minVariantPrice.amount) * 100
                          ),
                        }}
                      />
                    ))}
                  </div>
                </div>
              </FadeIn>
            )}
```

- [ ] **Step 5.5 — Update sidebar Browse Products button**

Find the "Browse Products" button (around line 239) and change its href:

```tsx
// BEFORE:
                <Link
                  href={`/brands/${partner.slug}`}
                  className="bg-teal-500 text-white text-[14px] font-semibold px-5 py-3 hover:bg-teal-400 transition-colors text-center"
                >
                  Browse Products
                </Link>

// AFTER:
                <Link
                  href={`/partners/${partner.slug}/products`}
                  className="bg-teal-500 text-white text-[14px] font-semibold px-5 py-3 hover:bg-teal-400 transition-colors text-center"
                >
                  Browse Products
                </Link>
```

Also fix the `relatedBrands` section (line 170) which uses `mockPartners.find`:

```tsx
// BEFORE:
                      const brand = mockPartners.find((p) => p.slug === brandSlug)

// AFTER:
                      const brand = PARTNERS.find((p) => p.slug === brandSlug)
```

- [ ] **Step 5.6 — Update partners hub (app/partners/page.tsx)**

The `MANUFACTURERS` array in `app/partners/page.tsx` (lines 17–90) is hardcoded. Replace the whole file header section:

```tsx
// BEFORE — lines 1–9 (imports) and 17–90 (MANUFACTURERS const):
import { ManufacturersGrid } from '@/components/b2b/ManufacturersGrid'
// ...
const MANUFACTURERS = [
  { name: 'AD Surgical', logo: 'https://...', description: '...', vendorSlug: 'ad-surgical' },
  // ... 11 more entries
]

// AFTER — replace the MANUFACTURERS const entirely (keep all other imports as-is):
import { ManufacturersGrid } from '@/components/b2b/ManufacturersGrid'
import { PARTNERS } from '@/lib/partners'

// Replace the `const MANUFACTURERS = [...]` block with:
const MANUFACTURERS = PARTNERS
  .filter((p) => p.isActive)
  .map((p) => ({
    name: p.name,
    logo: p.logo.url,        // ManufacturersGrid expects logo: string
    description: p.description,
    vendorSlug: p.slug,      // ManufacturersGrid links to /partners/${vendorSlug}
  }))
```

`ManufacturersGrid` prop shape is `{ name: string; logo: string; description: string; vendorSlug: string }` — the mapping above satisfies this exactly.

- [ ] **Step 5.7 — Delete lib/mock/partners.ts**

```powershell
Remove-Item "lib\mock\partners.ts"
```

- [ ] **Step 5.8 — Verify build**

```powershell
npx tsc --noEmit 2>&1 | Select-String "error" | Select-Object -First 20
npm run build 2>&1 | Select-String "error|Error" | Select-Object -First 20
```

Expected: clean build. Verify `/partners` and `/partners/dynarex` render at 200 in the browser.

- [ ] **Step 5.9 — Confirm /partners/drive-medical and /partners/dynarex resolve**

If `drive-medical` is not in PARTNERS, add it:

```ts
{
  slug: 'drive-medical',
  name: 'Drive Medical',
  vendorName: 'Drive Medical',
  type: 'brand',
  isActive: true,
  description: 'Durable medical equipment and mobility solutions for healthcare.',
  logo: {
    url: 'https://placehold.co/200x80/e0e7ff/4338ca?text=Drive+Medical',
    altText: 'Drive Medical logo',
    width: 200,
    height: 80,
  },
  intro: 'Drive Medical designs and manufactures durable medical equipment trusted by healthcare facilities and home health providers worldwide, including wheelchairs, walkers, and patient aids.',
  productCategories: ['dme', 'mobility-aids', 'home-health'],
  featuredProducts: [],
  relatedCategories: [
    { handle: 'dme', title: 'Durable Medical Equipment' },
    { handle: 'mobility-aids', title: 'Mobility Aids' },
  ],
  seoTitle: 'Drive Medical Products | MDSupplies',
  seoDescription: 'Shop Drive Medical durable medical equipment and mobility aids at wholesale prices.',
},
```

- [ ] **Step 5.10 — Commit**

```powershell
git add -A
git commit -m "feat: partners use lib/partners.ts canonical config with live Shopify featured products"
```

---

## Task 6 — Create /partners/[partner-slug]/products and retire /brands

Move the vendor product listing from `app/brands/[slug]/page.tsx` into a new sub-route. Remove all brands routes, update nav and routes.

**Files:**
- Create: `app/partners/[partner-slug]/products/page.tsx`
- Delete: `app/brands/page.tsx`, `app/brands/[slug]/page.tsx`, `app/brands/BrandDirectory.tsx`
- Delete: `lib/brands.ts`
- Modify: `components/layout/Footer.tsx`
- Modify: `lib/routes.ts`

- [ ] **Step 6.1 — Create app/partners/[partner-slug]/products/page.tsx**

```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_PRODUCTS_BY_VENDOR } from '@/lib/shopify/queries/products'
import { getPartnerBySlug, PARTNERS } from '@/lib/partners'
import { WholesalePricing } from '@/components/home/WholesalePricing'
import { ShopifyProductCard } from '@/components/store/ShopifyProductCard'
import { CategorySort } from '@/components/category/CategorySort'
import type { CollectionProduct, PageInfo } from '@/lib/shopify/types'

export const revalidate = 30

interface Props {
  params: Promise<{ 'partner-slug': string }>
  searchParams: Promise<{ sort?: string; after?: string }>
}

function parseSortKey(sort?: string): { sortKey: string; reverse: boolean } {
  switch (sort) {
    case 'PRICE_ASC':    return { sortKey: 'PRICE', reverse: false }
    case 'PRICE_DESC':   return { sortKey: 'PRICE', reverse: true }
    case 'BEST_SELLING': return { sortKey: 'BEST_SELLING', reverse: false }
    case 'CREATED':      return { sortKey: 'CREATED', reverse: true }
    default:             return { sortKey: 'RELEVANCE', reverse: false }
  }
}

export function generateStaticParams() {
  return PARTNERS.filter((p) => p.isActive).map((p) => ({ 'partner-slug': p.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { 'partner-slug': slug } = await params
  const partner = getPartnerBySlug(slug)
  if (!partner) return { title: 'Partner Products | MD Supplies' }
  return {
    title: `${partner.name} Products | MD Supplies`,
    description: `Shop all ${partner.name} medical supplies at wholesale prices.`,
  }
}

export default async function PartnerProductsPage({ params, searchParams }: Props) {
  const { 'partner-slug': slug } = await params
  const sp = await searchParams

  const partner = getPartnerBySlug(slug)
  if (!partner) notFound()

  const { sortKey, reverse } = parseSortKey(sp.sort)

  const data = await storefrontFetch<{
    products: { nodes: CollectionProduct[]; pageInfo: PageInfo }
  }>(GET_PRODUCTS_BY_VENDOR, {
    query: `vendor:"${partner.vendorName}"`,
    first: 24,
    after: sp.after ?? null,
    sortKey,
    reverse,
  })

  const products = data.products.nodes
  const { pageInfo } = data.products

  const buildPageUrl = (cursor: string | null | undefined) => {
    const p = new URLSearchParams()
    if (sp.sort) p.set('sort', sp.sort)
    if (cursor) p.set('after', cursor)
    const qs = p.toString()
    return qs ? `/partners/${slug}/products?${qs}` : `/partners/${slug}/products`
  }

  return (
    <main className="bg-[#f9fafc] min-h-screen">
      {/* Breadcrumb */}
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-5">
        <nav className="flex items-center gap-2 text-[15px] tracking-[0.3px] flex-wrap">
          <Link href="/" className="text-gray-500 hover:text-navy-900 transition-colors">Home</Link>
          <span className="text-gray-500">›</span>
          <Link href="/partners" className="text-gray-500 hover:text-navy-900 transition-colors">Partners</Link>
          <span className="text-gray-500">›</span>
          <Link href={`/partners/${slug}`} className="text-gray-500 hover:text-navy-900 transition-colors">{partner.name}</Link>
          <span className="text-gray-500">›</span>
          <span className="text-navy-900 font-semibold">All Products</span>
        </nav>
      </div>

      {/* Hero */}
      <div className="bg-navy-900 h-[180px] sm:h-[220px] flex items-center">
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 w-full">
          <h1 className="text-white text-[28px] sm:text-[36px] font-bold leading-tight">{partner.name}</h1>
          <p className="text-white/70 text-[15px] mt-2">
            {pageInfo.hasNextPage ? '24+' : products.length} products
          </p>
        </div>
      </div>

      {/* Product area */}
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-8">
        <div className="flex justify-end mb-6">
          <CategorySort currentSort={sp.sort} activeFilters={[]} />
        </div>

        {products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-[23px]">
            {products.map((product) => (
              <ShopifyProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <p className="text-navy-900 text-[20px] font-semibold">No products found</p>
          </div>
        )}

        {pageInfo.hasNextPage && (
          <div className="flex items-center justify-center pt-12">
            <Link
              href={buildPageUrl(pageInfo.endCursor)}
              className="flex items-center gap-2 border border-navy-900 text-navy-900 text-[14px] font-semibold px-5 h-[44px] hover:bg-neutral-50 transition-colors"
            >
              Load More<ChevronRight size={16} />
            </Link>
          </div>
        )}
      </div>

      <WholesalePricing />
    </main>
  )
}
```

- [ ] **Step 6.2 — Delete brands routes**

```powershell
Remove-Item "app\brands\page.tsx"
Remove-Item "app\brands\[slug]\page.tsx"
Remove-Item "app\brands\BrandDirectory.tsx"
Remove-Item "app\brands" -Recurse -Force
Remove-Item "lib\brands.ts"
```

- [ ] **Step 6.3 — Remove Brands from Footer**

In `components/layout/Footer.tsx`, delete the line:

```ts
  { label: 'Brands', href: ROUTES.brands },
```

- [ ] **Step 6.4 — Remove brands routes from lib/routes.ts**

In `lib/routes.ts`, remove the `brands` and `brand` entries:

```ts
// BEFORE (inside ROUTES):
  brands: '/brands',
  brand: (slug: string) => `/brands/${slug}`,

// AFTER — delete these two lines entirely
```

- [ ] **Step 6.5 — Verify no remaining /brands references**

```powershell
Select-String -Path "app","components","lib" -Include "*.tsx","*.ts" -Pattern "ROUTES\.brands|/brands/" -Recurse
```

Expected: zero matches (check `app/about/page.tsx` reference — it's an image path `/images/about/brands.png`, not a route, so it's acceptable).

- [ ] **Step 6.6 — Verify build**

```powershell
npm run build 2>&1 | Select-String "error|Error" | Select-Object -First 20
```

Expected: clean build.

- [ ] **Step 6.7 — Commit**

```powershell
git add -A
git commit -m "feat: add /partners/[slug]/products page, retire /brands entirely"
```

---

## Task 7 — Industries → real links

`app/industries/[industry-slug]/page.tsx` currently imports from `lib/mock/industries`. Replace with `lib/industries.ts` (the canonical 10-industry static list) and fetch the industry's live products from Shopify via `collectionHandle`.

The `IndustryPage` component expects the complex `types/industry.ts:Industry` type. We will adapt the page to construct the compatible shape from `lib/industries.ts` data + live Shopify products.

**Files:**
- Modify: `app/industries/[industry-slug]/page.tsx`
- Delete: `lib/mock/industries.ts`

- [ ] **Step 7.1 — Read IndustryPage component**

Read `components/b2b/IndustryPage.tsx` in full to understand all fields it renders. Specifically note which fields from `types/industry.ts:Industry` it accesses.

- [ ] **Step 7.2 — Update industry page imports**

In `app/industries/[industry-slug]/page.tsx`, replace all imports:

```ts
// BEFORE:
import { getIndustryBySlug, generateIndustrySlugs } from '@/lib/mock/industries'
import { IndustryPage } from '@/components/b2b/IndustryPage'

// AFTER:
import { INDUSTRIES } from '@/lib/industries'
import { IndustryPage } from '@/components/b2b/IndustryPage'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_COLLECTION } from '@/lib/shopify/queries/collections'
import type { Industry } from '@/types/industry'
import type { CollectionProduct } from '@/lib/shopify/types'
```

- [ ] **Step 7.3 — Replace generateStaticParams**

```ts
// BEFORE:
export function generateStaticParams() {
  return generateIndustrySlugs()
}

// AFTER:
export function generateStaticParams() {
  return INDUSTRIES.map((i) => ({ 'industry-slug': i.slug }))
}
```

- [ ] **Step 7.4 — Replace generateMetadata**

```ts
// BEFORE:
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { 'industry-slug': slug } = await params
  const industry = getIndustryBySlug(slug)
  if (!industry) return {}
  return buildMetadata({
    pageType: 'industry',
    title: industry.seoTitle || industry.name,
    description: industry.seoDescription || industry.intro,
    slug: industry.slug,
    noIndex: !industry.isPopulated,
  })
}

// AFTER:
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { 'industry-slug': slug } = await params
  const industry = INDUSTRIES.find((i) => i.slug === slug)
  if (!industry) return {}
  return buildMetadata({
    pageType: 'industry',
    title: `${industry.name} Medical Supplies — MDSupplies`,
    description: industry.description,
    slug: industry.slug,
    noIndex: true,
  })
}
```

- [ ] **Step 7.5 — Replace page body**

Replace the existing default export function entirely:

```ts
export default async function IndustryDetailPage({ params }: Props) {
  const { 'industry-slug': slug } = await params

  const industryStatic = INDUSTRIES.find((i) => i.slug === slug)
  if (!industryStatic) notFound()

  // Fetch top 6 live products from this industry's collection
  let relevantProducts: Industry['relevantProducts'] = []
  try {
    const data = await storefrontFetch<{
      collection: { products: { nodes: CollectionProduct[] } } | null
    }>(GET_COLLECTION, {
      handle: industryStatic.collectionHandle,
      first: 6,
      after: null,
      sortKey: 'BEST_SELLING',
      reverse: false,
    })
    if (data.collection) {
      relevantProducts = data.collection.products.nodes.map((p) => ({
        handle: p.handle,
        title: p.title,
        image: p.images.nodes[0]?.url ?? '',
        price: Math.round(parseFloat(p.priceRange.minVariantPrice.amount) * 100),
      }))
    }
  } catch {
    // degrade gracefully
  }

  // Build the Industry shape expected by IndustryPage component
  const industry: Industry = {
    slug: industryStatic.slug,
    name: industryStatic.name,
    isPopulated: relevantProducts.length > 0,
    intro: industryStatic.description,
    heroImage: industryStatic.image
      ? { url: industryStatic.image, altText: `${industryStatic.name} supplies` }
      : undefined,
    relevantCategories: [
      { handle: industryStatic.collectionHandle, title: industryStatic.name },
    ],
    relevantSubcategories: [],
    relevantProducts,
    relatedGuides: [],
    ctaText: `Browse ${industryStatic.name} Supplies`,
    ctaLink: `/category/${industryStatic.collectionHandle}`,
  }

  return <IndustryPage industry={industry} />
}
```

- [ ] **Step 7.6 — Delete lib/mock/industries.ts**

```powershell
Remove-Item "lib\mock\industries.ts"
```

- [ ] **Step 7.7 — Verify build**

```powershell
npm run build 2>&1 | Select-String "error|Error" | Select-Object -First 20
```

Expected: clean build.

- [ ] **Step 7.8 — Commit**

```powershell
git add -A
git commit -m "feat: industry pages use lib/industries.ts + live Shopify collection products"
```

---

## Task 8 — OCC → canonical lib/occ.ts (no mock)

The OCC page already fetches eligible products live from Shopify. The only mock usage is `mockOCCHub` for static content (title, intro, FAQ). Move it to `lib/occ.ts`.

**Files:**
- Create: `lib/occ.ts`
- Modify: `app/solutions/occ/page.tsx`
- Delete: `lib/mock/occ.ts`

- [ ] **Step 8.1 — Create lib/occ.ts**

```ts
import type { OCCHub } from '@/types/occ'

export const OCC_HUB: OCCHub = {
  title: 'OCC Solutions',
  intro: 'The MDSupplies OCC program connects qualifying healthcare organizations with streamlined ordering, preferred pricing, and dedicated account support.',
  programExplanation: 'Our Organized Customer Care (OCC) program is designed for healthcare facilities that order regularly and need reliable supply chain partnerships. OCC members receive dedicated account management, priority fulfillment, and access to volume-based pricing tiers.',
  freeShippingMessage: 'OCC members with qualifying order volumes receive free standard shipping on eligible product categories.',
  eligibleCategories: [
    { handle: 'exam-gloves', title: 'Exam Gloves' },
    { handle: 'wound-care', title: 'Wound Care' },
    { handle: 'personal-care', title: 'Personal Care' },
    { handle: 'disposables', title: 'Disposables' },
  ],
  eligibleProducts: [
    { handle: 'nitrile-exam-gloves-powder-free', title: 'Nitrile Exam Gloves', image: '', price: 0 },
    { handle: 'latex-exam-gloves-powder-free',   title: 'Latex Exam Gloves',  image: '', price: 0 },
    { handle: 'disposable-bed-pads',             title: 'Disposable Bed Pads', image: '', price: 0 },
    { handle: 'nasal-cannula-adult',             title: 'Nasal Cannula, Adult', image: '', price: 0 },
    { handle: 'simple-face-mask',                title: 'Simple Face Mask',   image: '', price: 0 },
    { handle: 'standard-walker',                 title: 'Standard Walker',    image: '', price: 0 },
  ],
  faq: [
    { question: 'Who qualifies for the OCC program?', answer: 'Licensed healthcare facilities including hospitals, clinics, urgent care centers, pharmacies, and home health agencies are eligible to apply for OCC membership.' },
    { question: 'How does OCC pricing work?', answer: 'OCC pricing is tiered based on annual spend. Your dedicated account manager will work with you to establish pricing tiers that reflect your order volume.' },
    { question: 'Does the OCC program include free shipping?', answer: 'Free shipping is available on eligible product categories for OCC members who meet minimum order thresholds. Your account manager will confirm which categories and thresholds apply to your account.' },
    { question: 'How do I apply for OCC membership?', answer: 'Contact our B2B team via the contact form or call our dedicated B2B line. We will verify your facility credentials and set up your account within 1–2 business days.' },
  ],
  seoTitle: 'OCC Solutions — MDSupplies',
  seoDescription: 'The MDSupplies OCC program offers healthcare organizations streamlined ordering, volume pricing, and dedicated account support for medical supplies.',
}
```

> **Note on eligibleProducts:** image and price are intentionally empty (`''` / `0`). The existing `fetchLiveProducts()` in `app/solutions/occ/page.tsx` always overwrites these with live Shopify data. If a product handle is not found in Shopify, the fallback gracefully keeps the empty values — in that case, add the missing handle to the data-gap log.

> **Data team:** Update `eligibleCategories` handles to match the approved category list from the mapping table (Task 10) once that's confirmed.

- [ ] **Step 8.2 — Update app/solutions/occ/page.tsx**

Replace the import on line 3:

```ts
// BEFORE:
import { mockOCCHub } from '@/lib/mock/occ'

// AFTER:
import { OCC_HUB } from '@/lib/occ'
```

Replace all four occurrences of `mockOCCHub` with `OCC_HUB`:

```powershell
(Get-Content "app\solutions\occ\page.tsx") -replace 'mockOCCHub', 'OCC_HUB' | Set-Content "app\solutions\occ\page.tsx"
```

- [ ] **Step 8.3 — Delete lib/mock/occ.ts**

```powershell
Remove-Item "lib\mock\occ.ts"
```

- [ ] **Step 8.4 — Verify build**

```powershell
npm run build 2>&1 | Select-String "error|Error" | Select-Object -First 20
```

Expected: clean build.

- [ ] **Step 8.5 — Commit**

```powershell
git add -A
git commit -m "feat: OCC config moved to canonical lib/occ.ts, delete lib/mock/occ.ts"
```

---

## Task 9 — Blog priority articles → Shopify Blog

`app/blog/types-of-needles/page.tsx` and `app/blog/types-of-sutures/page.tsx` are static routes backed by `lib/mock/blog-articles.ts`. The dynamic `app/blog/[handle]/page.tsx` already fully supports Shopify Blog API. **Decision: migrate to Shopify Blog.**

URL shape stays identical (`/blog/types-of-needles`, `/blog/types-of-sutures`) — no T4 redirect rows needed. Hand the final URL shape to T4 as: **no redirect required; these paths will resolve via `app/blog/[handle]/page.tsx` once articles are in Shopify**.

**Files:**
- Delete: `app/blog/types-of-needles/page.tsx`
- Delete: `app/blog/types-of-sutures/page.tsx`
- Delete: `lib/mock/blog-articles.ts`

**Prerequisite (content team, not a code step):** Publish two Shopify Blog articles with:
- Blog handle: `news` (or whatever the store's primary blog handle is — check in Shopify Admin → Online Store → Blog Posts)
- Article handle 1: `types-of-needles`
- Article handle 2: `types-of-sutures`
- Paste HTML body from `lib/mock/blog-articles.ts` into each article's content field
- Set author, tags, featured image, SEO title, SEO description

- [ ] **Step 9.1 — Confirm Shopify articles exist**

Check that at least one blog article is live in Shopify by hitting the existing dynamic route. If you see a 404 for `/blog/types-of-needles`, the content team has not yet published the articles. Do not proceed to step 9.2 until they exist.

- [ ] **Step 9.2 — Delete static priority article pages**

```powershell
Remove-Item "app\blog\types-of-needles\page.tsx"
Remove-Item "app\blog\types-of-needles" -Recurse -Force
Remove-Item "app\blog\types-of-sutures\page.tsx"
Remove-Item "app\blog\types-of-sutures" -Recurse -Force
```

- [ ] **Step 9.3 — Delete lib/mock/blog-articles.ts**

```powershell
Remove-Item "lib\mock\blog-articles.ts"
```

Check for any remaining imports:

```powershell
Select-String -Path "app","components","lib" -Include "*.tsx","*.ts" -Pattern "lib/mock/blog-articles" -Recurse
```

Expected: zero matches.

- [ ] **Step 9.4 — Verify build**

```powershell
npm run build 2>&1 | Select-String "error|Error" | Select-Object -First 20
```

Expected: clean build.

- [ ] **Step 9.5 — Commit**

```powershell
git add -A
git commit -m "feat: delete static blog article pages; /blog/[handle] serves all articles from Shopify"
```

---

## Task 10 — Category → Collection mapping table

Produce a verified mapping of approved categories to live Shopify collection handles, and flag any approved category with no matching collection.

**Files:**
- Create: `docs/category-mapping-audit.ts` (temporary script, deleted after audit)
- Create: `docs/category-collection-mapping.md` (the deliverable)

- [ ] **Step 10.1 — Create the audit script**

Create `scripts/audit-collections.ts`:

```ts
import { storefrontFetch } from '../lib/shopify/storefront'
import { GET_COLLECTIONS } from '../lib/shopify/queries/collections'

const APPROVED_CATEGORIES = [
  'exam-gloves',
  'gloves-nitrile',
  'gloves-latex',
  'gloves-vinyl',
  'gloves-sterile',
  'wound-care',
  'bandages',
  'gauze',
  'sutures',
  'needles-syringes',
  'syringes',
  'needles',
  'iv-therapy',
  'respiratory',
  'oxygen-therapy',
  'diagnostics',
  'surgical',
  'ppe',
  'disposables',
  'personal-care',
  'dme',
  'mobility-aids',
  'emergency',
  'first-aid',
  'exam-room',
  'incontinence',
]

async function main() {
  const data = await storefrontFetch<{ collections: { nodes: { handle: string; title: string }[] } }>(
    GET_COLLECTIONS,
    { first: 250 },
  )
  const liveHandles = new Set(data.collections.nodes.map((c) => c.handle))

  console.log('\n## Approved Category → Shopify Collection Mapping\n')
  console.log('| Approved Category Handle | Shopify Match | Status |')
  console.log('|---|---|---|')

  for (const handle of APPROVED_CATEGORIES) {
    const exists = liveHandles.has(handle)
    console.log(`| ${handle} | ${exists ? handle : '— NOT FOUND —'} | ${exists ? '✅' : '❌ Missing'} |`)
  }

  console.log('\n## All Live Collections\n')
  for (const c of data.collections.nodes) {
    console.log(`- ${c.handle} → "${c.title}"`)
  }
}

main().catch(console.error)
```

- [ ] **Step 10.2 — Run the audit (requires .env.local with valid Shopify token)**

```powershell
npx tsx scripts/audit-collections.ts > docs/category-collection-mapping.md
```

Review the output. For each ❌ Missing row, either:
1. The collection needs to be created in Shopify Admin (data team action), or
2. The approved handle needs to be corrected in the approved list

- [ ] **Step 10.3 — Document the mapping table and exceptions**

Update `docs/category-collection-mapping.md` with:
- Final mapping table (all 26 approved categories → confirmed Shopify handles)
- List of approved categories with no matching collection (flag for data team)
- List of collections that exist in Shopify but are NOT in the approved list (review for unexpected collections)

- [ ] **Step 10.4 — Commit**

```powershell
git add docs/category-collection-mapping.md
git commit -m "docs: add category-to-collection mapping table from Shopify audit"
```

---

## Task 11 — Subcategory naming convention audit

`lib/category-utils.ts:getSubcategories(parentSlug)` derives subcategories by filtering collections whose handles start with `${parentSlug}-`. Verify all intended subcategory collection handles follow this convention.

**Files:**
- Read: `lib/category-utils.ts`
- Create: `docs/subcategory-naming-exceptions.md`

- [ ] **Step 11.1 — Run subcategory audit for each mapped parent category**

For each parent category in the approved list (gloves, wound-care, needles-syringes, etc.), check that subcategory handles start with the parent prefix:

```powershell
npx tsx -e "
const { getSubcategories } = require('./lib/category-utils')
const parents = ['gloves','wound-care','needles-syringes','respiratory','diagnostics','surgical','ppe','iv-therapy','dme','emergency']
Promise.all(parents.map(async (p) => {
  const subs = await getSubcategories(p)
  console.log(p + ':', subs.map(s => s.slug).join(', ') || '(none)')
})).catch(console.error)
"
```

- [ ] **Step 11.2 — Document exceptions**

Create `docs/subcategory-naming-exceptions.md`:

```md
# Subcategory Naming Exceptions

Collections in Shopify whose handles do NOT follow the `{parent}-{sub}` convention.
These need to be renamed in Shopify Admin before getSubcategories() will surface them.

| Parent Category | Subcategory Title | Current Handle | Expected Handle | Action |
|---|---|---|---|---|
| (fill from audit output) | | | | Rename in Shopify |
```

- [ ] **Step 11.3 — Commit**

```powershell
git add docs/subcategory-naming-exceptions.md
git commit -m "docs: subcategory naming exceptions audit"
```

---

## Task 12 — Daily data-gap flag list

Create the running log that devs append to at daily closeout.

**Files:**
- Create: `docs/data-gap-log.md`

- [ ] **Step 12.1 — Create docs/data-gap-log.md**

```md
# Daily Data-Gap Flag Log

Devs append a row whenever a rendered item is missing any required field.
Format: `YYYY-MM-DD | page/component | missing field(s) | action needed`

## Fields that trigger a flag
- product handle (404 on PDP)
- selected-variant price (shows $0 or NaN)
- product image (broken img or placeholder)
- brand/vendor name
- packaging / units info
- return policy text
- shipping badge / lead time
- SEO title or meta description
- category mapping (product renders in wrong or no category)
- partner mapping (vendor not in PARTNERS list)
- industry mapping (collection handle missing in Shopify)

---

## Log

| Date | Page | Component | Missing Field | Action Needed | Resolved |
|------|------|-----------|--------------|---------------|----------|
| 2026-06-11 | /solutions/occ | OCCHubPage | eligibleProducts live prices | Verify Shopify handles in lib/occ.ts | |
```

- [ ] **Step 12.2 — Commit**

```powershell
git add docs/data-gap-log.md
git commit -m "docs: add daily data-gap flag log"
```

---

## Final Verification Checklist

After all tasks are complete, run the full acceptance audit:

- [ ] **lib/mock/ directory is empty and deleted**

```powershell
Get-ChildItem "lib\mock" -Recurse
```

Expected: no output (directory does not exist or is empty). If any files remain, delete them and audit why they weren't caught by a task above.

```powershell
if (Test-Path "lib\mock") { Remove-Item "lib\mock" -Recurse -Force }
```

- [ ] **No lib/mock imports remain in app/**

```powershell
Select-String -Path "app" -Include "*.tsx","*.ts" -Pattern "lib/mock" -Recurse
```

Expected: zero matches.

- [ ] **No /products/ route hrefs remain**

```powershell
Select-String -Path "app","components","lib" -Include "*.tsx","*.ts" -Pattern '`/products/' -Recurse
```

Expected: zero matches.

- [ ] **Build is clean**

```powershell
npm run build
```

Expected: 0 errors.

- [ ] **/partners/drive-medical and /partners/dynarex return 200**

Start `npm run dev` and verify both URLs render their partner detail pages.

- [ ] **Removed categories do not appear on /categories**

Visit `/categories` locally and confirm Pharmaceuticals, Beds, Bariatric Beds, Maternity & Infant Care are absent.

- [ ] **/brands/* returns 404**

Visit `/brands` and `/brands/dynarex` — both should 404 (pages deleted; T4 will add 301s).

---

## Parallelization Notes

Independent task groups that different engineers can own simultaneously:

- **Group A** (Tasks 1–3): URL cleanup, category blocklist, PDP audit — no shared state
- **Group B** (Tasks 4–6): Partners + brands absorption — sequential within group
- **Group C** (Tasks 7–8): Industries + OCC — independent of each other and Group B
- **Group D** (Tasks 9): Blog — independent
- **Group E** (Tasks 10–11): Mapping/audit docs — independent, require live Shopify tokens
- **Group F** (Task 12): Data-gap log — independent
