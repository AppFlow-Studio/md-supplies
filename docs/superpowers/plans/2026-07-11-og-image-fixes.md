# OG Image Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop category and marketing pages from sharing the single stock OG placeholder, and stop the product OG image from declaring a fake 1200×630 size for files that aren't that shape.

**Architecture:** `buildOg`/`buildMetadata` (`lib/seo/`) already accept an optional `image` string but hardcode `width`/`height` to the site default and never resolve root-relative paths to absolute URLs. Add `imageWidth`/`imageHeight` passthrough plus absolute-URL resolution once, centrally, in `buildOg`. Then wire real images into each caller: the category page already fetches `collection.image` for schema but drops it before `buildMetadata`; the product page already has per-image `width`/`height` from Shopify but never passes them; about/industries pages already render local hero images but never pass them to metadata either.

**Tech Stack:** Next.js App Router `Metadata` API, TypeScript, Vitest.

## Global Constraints

- Ticket ref: `lib/seo/og.ts:28` · Audit M3, M22.
- Hero images for about/faq/industries are **blocked on Deepika** per the ticket. Per user decision: about and industries already have local placeholder art (`IMG_HERO`, `HERO_IMAGE`, per-industry `image`) — wire those in now as an interim OG image; **FAQ has no image asset at all and is out of scope for this plan** — leave it on the default OG image.
- Do not build an `ImageResponse`/`next/og` composition pipeline for product OG images — ticket frames this as a cheap P2 win; emitting the real declared dimensions (already returned by Shopify) is the correct-sized effort.
- `SITE_URL` (from `lib/seo/constants.ts`, no trailing slash) is the existing helper for building absolute URLs from root-relative paths — reuse it, don't invent a second one.

---

### Task 1: `buildOg` — real image dimensions + absolute-URL resolution

**Files:**
- Modify: `lib/seo/types.ts`
- Modify: `lib/seo/og.ts`
- Modify: `lib/seo/metadata.ts`
- Test: `lib/seo/__tests__/metadata.test.ts`

**Interfaces:**
- Produces: `MetadataInput.imageWidth?: number`, `MetadataInput.imageHeight?: number` — later tasks (product page) pass these through `buildMetadata`.
- Produces: `buildOg` resolves any `image` starting with `/` to `${SITE_URL}${image}` — later tasks (about/industries pages) rely on this instead of concatenating `SITE_URL` themselves.

- [ ] **Step 1: Write the failing tests**

Add to `lib/seo/__tests__/metadata.test.ts`, inside the existing `describe('buildMetadata — og:type'` block's neighboring OG section (right after the existing `'OG image uses provided URL when given'` test, still inside the first `describe` block that starts around line 60):

```ts
  it('OG image uses custom width/height when provided', () => {
    const m = buildMetadata({
      pageType: 'product',
      title: 'Syringe',
      image: 'https://cdn.example.com/img.jpg',
      imageWidth: 1600,
      imageHeight: 900,
    })
    const images = (m.openGraph as { images?: { width: number; height: number }[] })?.images
    expect(images![0].width).toBe(1600)
    expect(images![0].height).toBe(900)
  })

  it('OG image falls back to 1200x630 when no dimensions given', () => {
    const m = buildMetadata({ pageType: 'product', title: 'Syringe', image: 'https://cdn.example.com/img.jpg' })
    const images = (m.openGraph as { images?: { width: number; height: number }[] })?.images
    expect(images![0].width).toBe(1200)
    expect(images![0].height).toBe(630)
  })

  it('OG image resolves a root-relative path to an absolute URL', () => {
    const m = buildMetadata({ pageType: 'static', title: 'About', image: '/images/about/HERO.png' })
    const images = (m.openGraph as { images?: { url: string }[] })?.images
    expect(images![0].url).toBe(`${BASE}/images/about/HERO.png`)
  })

  it('OG image leaves an already-absolute URL untouched', () => {
    const m = buildMetadata({ pageType: 'product', title: 'Syringe', image: 'https://cdn.shopify.com/img.jpg' })
    const images = (m.openGraph as { images?: { url: string }[] })?.images
    expect(images![0].url).toBe('https://cdn.shopify.com/img.jpg')
  })
```

`BASE` is already defined at the top of this test file as `'https://mdsupplies.com'`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/seo/__tests__/metadata.test.ts`
Expected: FAIL — the two new dimension tests fail because `width`/`height` are always `1200`/`630`; the absolute-URL test fails because the returned url is the literal `/images/about/HERO.png` (no `SITE_URL` prefix).

- [ ] **Step 3: Add `imageWidth`/`imageHeight` to `MetadataInput`**

In `lib/seo/types.ts`, in the `MetadataInput` interface, right after the existing `image` field (currently line 27-28):

```ts
  /** Absolute OG image URL; falls back to the default site-wide OG image. */
  image?: string
  /** Actual pixel width of `image`, if known — overrides the 1200×630 default declared size. */
  imageWidth?: number
  /** Actual pixel height of `image`, if known — overrides the 1200×630 default declared size. */
  imageHeight?: number
```

- [ ] **Step 4: Add dimension override + absolute-URL resolution to `buildOg`**

Replace the full contents of `lib/seo/og.ts` with:

```ts
import {
  SITE_NAME,
  SITE_URL,
  DEFAULT_OG_IMAGE,
  OG_IMAGE_WIDTH,
  OG_IMAGE_HEIGHT,
} from './constants'
import type { PageType } from './types'

function ogType(pageType: PageType): 'website' | 'article' {
  if (pageType === 'blog-article') return 'article'
  return 'website'
}

interface OgInput {
  pageType: PageType
  title: string
  description: string
  url: string
  image?: string
  imageWidth?: number
  imageHeight?: number
}

/** Resolves a root-relative path (e.g. `/api/bunny/...`) to an absolute URL; leaves absolute URLs untouched. */
function resolveImageUrl(image: string): string {
  return image.startsWith('/') ? `${SITE_URL}${image}` : image
}

/**
 * Builds the `openGraph` and `twitter` sections for a Next.js Metadata object.
 * The OG image slot is always populated — falls back to the default site OG image.
 */
export function buildOg(input: OgInput) {
  const { pageType, title, description, url, image, imageWidth, imageHeight } = input
  const trimmed = image?.trim()
  const imageUrl = trimmed ? resolveImageUrl(trimmed) : DEFAULT_OG_IMAGE

  return {
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      images: [{
        url: imageUrl,
        width: imageWidth ?? OG_IMAGE_WIDTH,
        height: imageHeight ?? OG_IMAGE_HEIGHT,
        alt: title,
      }],
      type: ogType(pageType),
    },
    twitter: {
      card: 'summary_large_image' as const,
      title,
      description,
      images: [imageUrl],
    },
  }
}
```

- [ ] **Step 5: Pass `imageWidth`/`imageHeight` through `buildMetadata`**

In `lib/seo/metadata.ts`, update the destructuring and the `buildOg` call (currently lines 109-130):

```ts
  const {
    pageType,
    title,
    description,
    slug,
    parentSlug,
    image,
    imageWidth,
    imageHeight,
    noIndex = false,
  } = input

  const resolvedTitle = resolveTitle(pageType, title, parentSlug)
  const resolvedDescription = description?.trim() || DEFAULT_DESCRIPTION
  const path = resolvePath(pageType, slug, parentSlug)
  const canonical = input.canonical ?? buildCanonical({ path, strategy: 'self' })
  const robots = buildRobots({ pageType, noIndex, isStaging: STAGING_GUARD })
  const og = buildOg({
    pageType,
    title: resolvedTitle,
    description: resolvedDescription,
    url: canonical,
    image,
    imageWidth,
    imageHeight,
  })
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run lib/seo/__tests__/metadata.test.ts`
Expected: PASS — all tests including the 4 new ones.

- [ ] **Step 7: Commit**

```bash
git add lib/seo/types.ts lib/seo/og.ts lib/seo/metadata.ts lib/seo/__tests__/metadata.test.ts
git commit -m "feat(seo): support real OG image dimensions and absolute-URL resolution"
```

---

### Task 2: Category pages — pass the already-fetched collection image into OG

**Files:**
- Modify: `components/category/CategoryPageView.tsx`
- Test: `components/category/__tests__/buildCategoryMetadata.test.ts` (new)

**Interfaces:**
- Consumes: `buildMetadata({ ...,  image?: string })` from Task 1.
- Consumes: `CollectionHero.image: ProductImage | null` (already fetched by `GET_COLLECTION_HERO`, `lib/shopify/queries/collections.ts` — confirmed it already selects `image { id url altText width height }`).

- [ ] **Step 1: Write the failing test**

Create `components/category/__tests__/buildCategoryMetadata.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/shopify/storefront', () => ({
  storefrontFetch: vi.fn(),
}))

import { storefrontFetch } from '@/lib/shopify/storefront'
import { buildCategoryMetadata } from '../CategoryPageView'
import type { CollectionHero } from '@/lib/shopify/types'

const mockFetch = vi.mocked(storefrontFetch)

const collection: CollectionHero = {
  id: 'gid://shopify/Collection/1',
  title: 'Exam Gloves',
  handle: 'exam-gloves',
  description: 'Nitrile and latex exam gloves.',
  descriptionHtml: '<p>Nitrile and latex exam gloves.</p>',
  image: { id: 'img1', url: 'https://cdn.shopify.com/exam-gloves.jpg', altText: null, width: 800, height: 800 },
  seo: { title: null, description: null },
}

beforeEach(() => {
  mockFetch.mockReset()
})

function ogImageUrl(m: Awaited<ReturnType<typeof buildCategoryMetadata>>): string | undefined {
  return (m.openGraph as { images?: { url: string }[] })?.images?.[0]?.url
}

describe('buildCategoryMetadata — OG image', () => {
  it('passes the collection image through on the canonical (unfiltered, page 1) branch', async () => {
    mockFetch.mockResolvedValue({ collection })
    const m = await buildCategoryMetadata('exam-gloves', {})
    expect(ogImageUrl(m)).toBe('https://cdn.shopify.com/exam-gloves.jpg')
  })

  it('passes the collection image through on the filtered/sorted branch', async () => {
    mockFetch.mockResolvedValue({ collection })
    const m = await buildCategoryMetadata('exam-gloves', { sort: 'PRICE_ASC' })
    expect(ogImageUrl(m)).toBe('https://cdn.shopify.com/exam-gloves.jpg')
  })

  it('passes the collection image through on the paginated branch', async () => {
    mockFetch.mockResolvedValue({ collection })
    const m = await buildCategoryMetadata('exam-gloves', { page: '2' })
    expect(ogImageUrl(m)).toBe('https://cdn.shopify.com/exam-gloves.jpg')
  })

  it('falls back to the default OG image when the collection has no image', async () => {
    mockFetch.mockResolvedValue({ collection: { ...collection, image: null } })
    const m = await buildCategoryMetadata('exam-gloves', {})
    expect(ogImageUrl(m)).not.toBe('https://cdn.shopify.com/exam-gloves.jpg')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/category/__tests__/buildCategoryMetadata.test.ts`
Expected: FAIL — the first three assertions fail because none of the three `buildMetadata` calls in `buildCategoryMetadata` currently pass `image`.

- [ ] **Step 3: Pass `image` through all three branches**

In `components/category/CategoryPageView.tsx`, update the three `buildMetadata` calls inside `buildCategoryMetadata` (currently lines 87-111):

```ts
    if (isFiltered) {
      return buildMetadata({
        pageType: 'category',
        title: metaTitle,
        description: metaDescription,
        canonical: `${base}/category/${slug}`,
        noIndex: true,
        image: data.collection.image?.url,
      })
    }

    if (currentPage > 1) {
      return buildMetadata({
        pageType: 'category',
        title: metaTitle,
        description: metaDescription,
        canonical: `${base}/category/${slug}?page=${currentPage}`,
        image: data.collection.image?.url,
      })
    }

    return buildMetadata({
      pageType: 'category',
      title: metaTitle,
      slug,
      description: metaDescription,
      image: data.collection.image?.url,
    })
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/category/__tests__/buildCategoryMetadata.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/category/CategoryPageView.tsx components/category/__tests__/buildCategoryMetadata.test.ts
git commit -m "feat(seo): give category pages a distinct OG image from the collection"
```

---

### Task 3: Product page — emit true OG image dimensions

**Files:**
- Modify: `app/product/[slug]/page.tsx`
- Test: `app/product/__tests__/generateMetadata.test.ts` (new)

**Interfaces:**
- Consumes: `buildMetadata({ ..., imageWidth?: number, imageHeight?: number })` from Task 1.
- Consumes: `product.images.nodes[0].width` / `.height` — already returned by `GET_PRODUCT` (`lib/shopify/queries/products.ts:50`: `nodes { id url altText width height }`).

- [ ] **Step 1: Write the failing test**

Create `app/product/__tests__/generateMetadata.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/shopify/storefront', () => ({
  storefrontFetch: vi.fn(),
}))

import { storefrontFetch } from '@/lib/shopify/storefront'
import { generateMetadata } from '../[slug]/page'

const mockFetch = vi.mocked(storefrontFetch)

const rawProduct = {
  id: 'gid://shopify/Product/1',
  title: 'Nitrile Exam Gloves',
  handle: 'nitrile-exam-gloves',
  description: 'Durable exam gloves.',
  descriptionHtml: '<p>Durable exam gloves.</p>',
  vendor: 'AcmeMed',
  availableForSale: true,
  tags: [],
  priceRange: {
    minVariantPrice: { amount: '9.99', currencyCode: 'USD' },
    maxVariantPrice: { amount: '9.99', currencyCode: 'USD' },
  },
  images: { nodes: [{ id: 'img1', url: 'https://cdn.shopify.com/gloves.jpg', altText: 'Gloves', width: 1600, height: 900 }] },
  variants: { nodes: [] },
  options: [],
  seo: { title: null, description: null },
  brandName: null,
  unitsPerOrder: null,
  quantityOfUnits: null,
  orderSize: null,
  material: null,
  use: null,
  features: null,
  color: null,
  sterility: null,
  thickness: null,
  gloveSize: null,
  needleGauge: null,
  needleLength: null,
  sizeLength: null,
  estimatedRestockDate: null,
  testsFor: null,
  detectableDrugs: null,
  adulterants: null,
  otherFeatures: null,
  typeList: null,
  customBadge1: null,
  customBadge2: null,
  customBadge3: null,
}

beforeEach(() => {
  mockFetch.mockReset()
})

describe('product generateMetadata — OG image dimensions', () => {
  it('emits the true pixel dimensions from the Shopify image', async () => {
    mockFetch.mockResolvedValue({ product: rawProduct })
    const m = await generateMetadata({ params: Promise.resolve({ slug: 'nitrile-exam-gloves' }) })
    const images = (m.openGraph as { images?: { url: string; width: number; height: number }[] })?.images
    expect(images![0].url).toBe('https://cdn.shopify.com/gloves.jpg')
    expect(images![0].width).toBe(1600)
    expect(images![0].height).toBe(900)
  })

  it('falls back to the 1200x630 default when the product has no image', async () => {
    mockFetch.mockResolvedValue({ product: { ...rawProduct, images: { nodes: [] } } })
    const m = await generateMetadata({ params: Promise.resolve({ slug: 'nitrile-exam-gloves' }) })
    const images = (m.openGraph as { images?: { width: number; height: number }[] })?.images
    expect(images![0].width).toBe(1200)
    expect(images![0].height).toBe(630)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/product/__tests__/generateMetadata.test.ts`
Expected: FAIL — declared width/height are always `1200`/`630` regardless of the product image's real size.

- [ ] **Step 3: Pass `imageWidth`/`imageHeight` in `generateMetadata`**

In `app/product/[slug]/page.tsx`, update the `buildMetadata` call inside `generateMetadata` (currently lines 81-87):

```ts
    return buildMetadata({
      pageType: 'product',
      title: product.seo?.title || product.title,
      description: product.seo?.description || trimDescription(`${brand} — ${product.description}`, 155),
      slug,
      image: product.images.nodes[0]?.url,
      imageWidth: product.images.nodes[0]?.width,
      imageHeight: product.images.nodes[0]?.height,
    })
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/product/__tests__/generateMetadata.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/product/\[slug\]/page.tsx app/product/__tests__/generateMetadata.test.ts
git commit -m "feat(seo): emit true OG image dimensions for product pages"
```

---

### Task 4: About page — interim hero OG image (fixes a latent case-sensitivity bug too)

**Files:**
- Modify: `app/about/page.tsx`
- Test: `app/about/__tests__/metadata.test.ts` (new)

**Context:** `IMG_HERO` is declared as `/images/about/hero.png`, but the committed file is `public/images/about/HERO.png` (capital `HERO`). This already silently 404s on case-sensitive filesystems (Linux/Vercel prod) for the on-page `<Image>` — and would do the same for the new OG image. Fix the casing as part of wiring this in, since shipping a *second* broken reference to the same bad path defeats the point of this task.

- [ ] **Step 1: Write the failing test**

Create `app/about/__tests__/metadata.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { metadata } from '../page'

describe('about page metadata — OG image', () => {
  it('uses the about hero image as an absolute URL', () => {
    const images = (metadata.openGraph as { images?: { url: string }[] })?.images
    expect(images?.[0]?.url).toBe('https://mdsupplies.com/images/about/HERO.png')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/about/__tests__/metadata.test.ts`
Expected: FAIL — `metadata` currently has no `image`, so `openGraph.images[0].url` is the default OG placeholder, not the hero image.

- [ ] **Step 3: Fix the casing bug and wire the hero image into metadata**

In `app/about/page.tsx`, update the imports and the `IMG_HERO` constant and `metadata` export (currently lines 1-17):

```ts
import Link from "next/link";
import { buildMetadata } from '@/lib/seo'
import { SITE_URL } from '@/lib/seo/constants'
import { ShieldCheck, Package, Headphones } from "lucide-react";
import { FadeIn } from "@/components/ui/FadeIn";
import { AnimatedArrow } from "@/components/ui/AnimatedArrow";

const IMG_HERO      = "/images/about/HERO.png";
const IMG_BRANDS    = "/images/about/brands.png";
const IMG_WAREHOUSE = "/images/about/warehouse.png";
const IMG_PRODUCTS  = "/images/about/products.png";

export const metadata = buildMetadata({
  pageType: 'static',
  title: 'About Us',
  description: 'MDSupplies serves clinics, urgent care centers, HRT practices, and first responders with trusted brands and fast fulfillment.',
  slug: 'about',
  image: `${SITE_URL}${IMG_HERO}`,
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/about/__tests__/metadata.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/about/page.tsx app/about/__tests__/metadata.test.ts
git commit -m "fix(seo): give the about page a distinct OG image, fix hero.png casing bug"
```

---

### Task 5: Industries pages — interim hub hero + distinct per-industry OG images

**Files:**
- Modify: `app/industries/page.tsx`
- Modify: `app/industries/[industry-slug]/page.tsx`
- Test: `app/industries/__tests__/metadata.test.ts` (new)

**Context:** The industries hub already renders a hero image (`HERO_IMAGE`, currently declared *after* `metadata` — needs reordering to be usable there). More valuably, each individual industry in `lib/industries.ts` already carries its own distinct `image` (e.g. `industry-urgent-care.jpeg`, `industry-dental.jpeg`, ...) that isn't blocked on Deepika at all — wiring that into the `[industry-slug]` detail page gets genuinely distinct OG images per industry, which is a stronger match for the acceptance criterion ("distinct OG images, not the shared placeholder") than reusing one hub-wide hero.

- [ ] **Step 1: Write the failing tests**

Create `app/industries/__tests__/metadata.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { metadata as hubMetadata } from '../page'
import { generateMetadata as generateDetailMetadata } from '../[industry-slug]/page'

function ogImageUrl(m: { openGraph?: unknown }): string | undefined {
  return (m.openGraph as { images?: { url: string }[] })?.images?.[0]?.url
}

describe('industries hub metadata — OG image', () => {
  it('uses the hub hero image as an absolute URL', () => {
    expect(ogImageUrl(hubMetadata)).toBe(
      "https://mdsupplies.com/api/bunny/industries/industry-clinics-&-doctor's-offices.jpeg",
    )
  })
})

describe('industry detail metadata — OG image', () => {
  it('uses the distinct per-industry image', async () => {
    const m = await generateDetailMetadata({ params: Promise.resolve({ 'industry-slug': 'urgent-care' }) })
    expect(ogImageUrl(m)).toBe('https://mdsupplies.com/api/bunny/industries/industry-urgent-care.jpeg')
  })

  it('a different industry gets a different image', async () => {
    const m = await generateDetailMetadata({ params: Promise.resolve({ 'industry-slug': 'dental' }) })
    expect(ogImageUrl(m)).toBe('https://mdsupplies.com/api/bunny/industries/industry-dental.jpeg')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run app/industries/__tests__/metadata.test.ts`
Expected: FAIL — neither the hub `metadata` nor the detail `generateMetadata` currently pass an `image`.

- [ ] **Step 3: Wire the hub hero image into metadata**

In `app/industries/page.tsx`, move the `HERO_IMAGE` declaration above `metadata` and pass it in (currently lines 1-17):

```ts
import Link from 'next/link'
import { INDUSTRIES } from '@/lib/industries'
import { buildMetadata } from '@/lib/seo'
import { SITE_URL } from '@/lib/seo/constants'
import {BadgeCheck, FileText, Headset, MapPin, Truck} from "lucide-react";
import { AnimatedArrow } from '@/components/ui/AnimatedArrow'
import { getIndustryImagePath } from '@/lib/bunnycdn'

export const revalidate = 3600

const HERO_IMAGE = getIndustryImagePath("industry-clinics-&-doctor's-offices.jpeg")

export const metadata = buildMetadata({
  pageType: 'static',
  title: 'Shop by Industry',
  description: 'Medical supplies curated for your specialty — urgent care, EMS, pharmacy, physical therapy, and more.',
  slug: 'industries',
  image: `${SITE_URL}${HERO_IMAGE}`,
})
```

(Note: `getIndustryImagePath` already returns a root-relative path like `/api/bunny/industries/...`; `buildOg`'s absolute-URL resolution from Task 1 would handle it either way, but prefixing `SITE_URL` here matches the existing about-page convention and keeps `image` visibly absolute at the call site.)

- [ ] **Step 4: Wire the per-industry image into the detail page's `generateMetadata`**

In `app/industries/[industry-slug]/page.tsx`, update the `buildMetadata` call (currently lines 26-33):

```ts
  return buildMetadata({
    pageType: 'industry',
    title: `${industry.name} Medical Supplies — MDSupplies`,
    description: industry.description,
    slug: industry.slug,
    image: `${SITE_URL}${industry.image}`,
    // Thin pages (awaiting client FAQ copy) stay out of the index until complete.
    noIndex: !isIndustryComplete(industry),
  })
```

This requires importing `SITE_URL` — add it to the existing import block at the top of the file:

```ts
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { buildMetadata } from '@/lib/seo'
import { SITE_URL } from '@/lib/seo/constants'
import { INDUSTRIES, isIndustryComplete } from '@/lib/industries'
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run app/industries/__tests__/metadata.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/industries/page.tsx app/industries/\[industry-slug\]/page.tsx app/industries/__tests__/metadata.test.ts
git commit -m "feat(seo): give industries hub and detail pages distinct OG images"
```

---

### Task 6: Full-suite sanity check

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: PASS — no regressions in `lib/seo/__tests__/route-guardrails.test.ts` or elsewhere (that file only scans page source for `noIndex`/redirect patterns, which none of these edits touch).

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

---

## What's intentionally left out of this plan

- **FAQ hero OG image** — no image asset exists in the codebase for this page and it is explicitly blocked on Deepika; wiring in a placeholder would need to be redone once real art lands. Revisit when the asset is delivered.
- **Product OG image composition (real 1200×630 renders)** — the ticket offers this as an alternative to true dimensions; true dimensions is the correct-sized fix for a P2 "cheap win" ticket and avoids standing up an `ImageResponse` pipeline for no additional stated requirement.
