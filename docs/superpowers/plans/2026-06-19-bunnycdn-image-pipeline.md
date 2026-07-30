# BunnyCDN Image Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire BunnyCDN-hosted category/subcategory banner images and product placeholder images into the existing category/product pages, with a graceful fallback chain so nothing ever renders as a broken image or empty white card — even before real image assets are uploaded.

**Architecture:** The BunnyCDN storage zone (`md-supplies`) only exposes a private Storage API (`ny.storage.bunnycdn.com`) that requires an `AccessKey` header — there is no public Pull Zone yet, so a plain `<img src>` can never hit it directly. We add a same-origin Next.js Route Handler (`/api/bunny/[...path]`) that holds the `AccessKey` server-side, proxies reads from the Storage API, and streams the bytes back with long-lived cache headers. Because the proxy is same-origin, `next/image` can consume it with **zero `remotePatterns`** — we explicitly allowlist the proxy path via `images.localPatterns` instead, which is the literal equivalent of "allowlisting the BunnyCDN domain" given this architecture. New BunnyCDN-sourced images (category banners, product placeholders) render via `next/image`; existing Shopify product photos keep using the codebase's established raw `<img>` convention.

**Tech Stack:** Next.js 16 App Router Route Handlers, `next/image` (local proxy path, no remote allowlisting needed), Vitest for unit tests, TypeScript.

## Global Constraints

- Never commit the BunnyCDN Access Key. It lives only in `.env.local` (gitignored) under `BUNNYCDN_STORAGE_ACCESS_KEY`; `.env.example` gets a blank placeholder, matching the existing `SHOPIFY_ADMIN_ACCESS_TOKEN` pattern.
- BunnyCDN object paths follow §3.4 exactly: `mdsupplies/categories/`, `mdsupplies/subcategories/`, `mdsupplies/category-assets/`, `mdsupplies/placeholders/products/` — nested *inside* the `md-supplies` storage zone. (Flagging once, not blocking: this means the upstream path is `md-supplies/mdsupplies/categories/<handle>.webp` — double "mdsupplies" segment. If the real upload convention turns out to be zone-root-relative instead, it's a one-line fix to `BUNNY_PATH_NAMESPACE` in `lib/bunnycdn.ts`.)
- Product image fallback chain is exactly: real Shopify image → primary-category BunnyCDN placeholder → `medical-supplies-placeholder.webp` global placeholder → (never a broken-image icon or empty white card).
- Category/subcategory hero images: curated BunnyCDN banner first, Shopify `collection.image` as secondary fallback, neutral background div as final fallback (never empty/broken).
- Don't touch existing Shopify product `<img>` usage beyond what's needed to add the fallback chain — keep the codebase's raw-`<img>` convention for real Shopify photos (per existing `eslint-disable @next/next/no-img-element` pattern throughout).
- Don't expand scope into subcategory page filtering/sorting/pagination (it doesn't exist today and isn't part of this ticket's gaps list).
- Follow this repo's existing test convention: Vitest, pure-function unit tests in `__tests__` folders next to the code, `vi.mock`/`vi.mocked` for module mocking (see `lib/__tests__/category-utils.test.ts`).

---

### Task 1: `lib/bunnycdn.ts` — path builders and category-placeholder resolution

**Files:**
- Modify: `lib/category-nav.ts` (add `placeholderSlug` to each `RoadmapCategory`)
- Create: `lib/bunnycdn.ts`
- Test: `lib/__tests__/bunnycdn.test.ts`

**Interfaces:**
- Produces: `getCategoryBannerPath(handle: string): string`, `getSubcategoryBannerPath(handle: string): string`, `getProductPlaceholderPath(categoryHandle?: string | null): string`, `GLOBAL_PRODUCT_PLACEHOLDER: string` — all consumed by Task 3 and Task 4.

- [ ] **Step 1: Add `placeholderSlug` to `RoadmapCategory`**

Edit `lib/category-nav.ts` — extend the type and every entry:

```ts
export type RoadmapCategory = {
  displayName: string
  navGroup: 'primary' | 'more'
  matchedHandles: string[]
  placeholderSlug: string
}

// §3.1 approved category structure, checked against the live Shopify
// catalog on 2026-06-18 via scripts/audit-collections.ts. Categories with
// an empty matchedHandles array have no live Shopify collection yet and
// are reported by getUnmappedRoadmapCategories() / the audit script
// instead of being rendered. `placeholderSlug` maps to the §3.5 BunnyCDN
// placeholder filename: `${placeholderSlug}-placeholder.webp`.
export const ROADMAP_CATEGORIES: RoadmapCategory[] = [
  { displayName: 'Gloves', navGroup: 'primary', matchedHandles: ['gloves'], placeholderSlug: 'gloves' },
  { displayName: 'Wound Care', navGroup: 'primary', matchedHandles: ['wound-care'], placeholderSlug: 'wound-care' },
  { displayName: 'Needles & Syringes', navGroup: 'primary', matchedHandles: [], placeholderSlug: 'needles-syringes' },
  { displayName: 'Surgical Sutures', navGroup: 'primary', matchedHandles: [], placeholderSlug: 'surgical-sutures' },
  { displayName: 'Testing', navGroup: 'primary', matchedHandles: ['testing-screening'], placeholderSlug: 'testing' },
  { displayName: 'Exam Room', navGroup: 'primary', matchedHandles: ['exam-room'], placeholderSlug: 'exam-room' },
  { displayName: 'Respiratory', navGroup: 'primary', matchedHandles: [], placeholderSlug: 'respiratory' },
  { displayName: 'Mobility', navGroup: 'primary', matchedHandles: ['mobility'], placeholderSlug: 'mobility' },
  { displayName: 'Patient Therapy & Rehab', navGroup: 'primary', matchedHandles: ['patient-therapy-rehab'], placeholderSlug: 'patient-therapy-rehab' },
  {
    displayName: 'Surgery & Procedure',
    navGroup: 'primary',
    matchedHandles: [
      'trocars-trocar-kits',
      'disposable-3-2mm-3-5mm-trocars',
      'disposable-4-5mm-trocars',
      'reusable-3-2mm-3-5mm-trocars',
      'reusable-4-5mm-trocars',
    ],
    placeholderSlug: 'surgery-procedure',
  },
  {
    displayName: 'Apparel',
    navGroup: 'primary',
    matchedHandles: [
      'capes-gowns',
      'caps-headwear',
      'coats-jackets',
      'footwear',
      'medical-scrubs',
      'pants-shirts',
      'undergarments-wraps',
    ],
    placeholderSlug: 'apparel',
  },
  { displayName: 'Hygiene', navGroup: 'primary', matchedHandles: ['hygiene'], placeholderSlug: 'hygiene' },
  { displayName: 'Disinfectants', navGroup: 'primary', matchedHandles: [], placeholderSlug: 'disinfectants' },
  { displayName: 'Home Care', navGroup: 'more', matchedHandles: ['home-care'], placeholderSlug: 'home-care' },
  { displayName: 'Emergency Supplies', navGroup: 'more', matchedHandles: ['emergency-supplies'], placeholderSlug: 'emergency-supplies' },
  { displayName: 'Incontinence', navGroup: 'more', matchedHandles: ['incontinence'], placeholderSlug: 'incontinence' },
  { displayName: 'IV Therapy', navGroup: 'more', matchedHandles: [], placeholderSlug: 'iv-therapy' },
  { displayName: 'Urology & Ostomy', navGroup: 'more', matchedHandles: [], placeholderSlug: 'urology-ostomy' },
  { displayName: 'Sterilization', navGroup: 'more', matchedHandles: [], placeholderSlug: 'sterilization' },
  { displayName: 'Dental', navGroup: 'more', matchedHandles: ['dental'], placeholderSlug: 'dental' },
  { displayName: 'Housekeeping & Janitorial', navGroup: 'more', matchedHandles: ['housekeeping-janitorial'], placeholderSlug: 'housekeeping-janitorial' },
  { displayName: 'Bariatric', navGroup: 'more', matchedHandles: ['bariatric'], placeholderSlug: 'bariatric' },
  { displayName: 'Room Furniture', navGroup: 'more', matchedHandles: ['seating', 'exam-tables'], placeholderSlug: 'room-furniture' },
  { displayName: 'Face Masks', navGroup: 'more', matchedHandles: ['face-coverings'], placeholderSlug: 'face-masks' },
  { displayName: 'Pharmacy Products', navGroup: 'more', matchedHandles: [], placeholderSlug: 'pharmacy-products' },
]
```

No test needed for this step alone — it's pure data, exercised by Task 1 Step 2's tests.

- [ ] **Step 2: Write the failing tests for `lib/bunnycdn.ts`**

Create `lib/__tests__/bunnycdn.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  getCategoryBannerPath,
  getSubcategoryBannerPath,
  getProductPlaceholderPath,
  GLOBAL_PRODUCT_PLACEHOLDER,
} from '../bunnycdn'

describe('getCategoryBannerPath', () => {
  it('builds the proxy path for a top-level category handle', () => {
    expect(getCategoryBannerPath('gloves')).toBe('/api/bunny/mdsupplies/categories/gloves.webp')
  })
})

describe('getSubcategoryBannerPath', () => {
  it('builds the proxy path for a full subcategory handle', () => {
    expect(getSubcategoryBannerPath('gloves-nitrile')).toBe('/api/bunny/mdsupplies/subcategories/gloves-nitrile.webp')
  })
})

describe('getProductPlaceholderPath', () => {
  it('resolves a top-level category handle to its placeholder', () => {
    expect(getProductPlaceholderPath('gloves')).toBe(
      '/api/bunny/mdsupplies/placeholders/products/gloves-placeholder.webp',
    )
  })

  it('resolves a subcategory handle to its parent placeholder', () => {
    expect(getProductPlaceholderPath('gloves-nitrile')).toBe(
      '/api/bunny/mdsupplies/placeholders/products/gloves-placeholder.webp',
    )
  })

  it('falls back to the global placeholder when no category handle is given', () => {
    expect(getProductPlaceholderPath(undefined)).toBe(GLOBAL_PRODUCT_PLACEHOLDER)
    expect(getProductPlaceholderPath(null)).toBe(GLOBAL_PRODUCT_PLACEHOLDER)
  })

  it('falls back to the global placeholder when the handle matches no roadmap category', () => {
    expect(getProductPlaceholderPath('totally-unknown-handle')).toBe(GLOBAL_PRODUCT_PLACEHOLDER)
  })

  it('falls back to the global placeholder for a category with no live matchedHandles', () => {
    // "Respiratory" has matchedHandles: [] today, so nothing can match it.
    expect(getProductPlaceholderPath('respiratory')).toBe(GLOBAL_PRODUCT_PLACEHOLDER)
  })
})
```

- [ ] **Step 2b: Run the tests to verify they fail**

Run: `npx vitest run lib/__tests__/bunnycdn.test.ts`
Expected: FAIL with "Cannot find module '../bunnycdn'"

- [ ] **Step 3: Implement `lib/bunnycdn.ts`**

Create `lib/bunnycdn.ts`:

```ts
import { ROADMAP_CATEGORIES } from '@/lib/category-nav'

// All BunnyCDN reads go through the same-origin proxy route (app/api/bunny/[...path]/route.ts)
// because the storage zone has no public Pull Zone — only the private Storage API, which
// requires an AccessKey header a plain <img>/next/image src can never send. The proxy keeps
// that key server-side and lets next/image treat these as ordinary local paths (no remotePatterns).
const PROXY_PREFIX = '/api/bunny'

// §3.4 — path layout inside the md-supplies storage zone.
const PATH_NAMESPACE = 'mdsupplies'
const CATEGORIES_PATH = `${PATH_NAMESPACE}/categories`
const SUBCATEGORIES_PATH = `${PATH_NAMESPACE}/subcategories`
const PRODUCT_PLACEHOLDERS_PATH = `${PATH_NAMESPACE}/placeholders/products`

export const GLOBAL_PRODUCT_PLACEHOLDER = `${PROXY_PREFIX}/${PRODUCT_PLACEHOLDERS_PATH}/medical-supplies-placeholder.webp`

export function getCategoryBannerPath(handle: string): string {
  return `${PROXY_PREFIX}/${CATEGORIES_PATH}/${handle}.webp`
}

export function getSubcategoryBannerPath(handle: string): string {
  return `${PROXY_PREFIX}/${SUBCATEGORIES_PATH}/${handle}.webp`
}

function findRoadmapCategory(handle: string) {
  return ROADMAP_CATEGORIES.find((category) =>
    category.matchedHandles.some((h) => handle === h || handle.startsWith(`${h}-`)),
  )
}

export function getProductPlaceholderPath(categoryHandle?: string | null): string {
  if (!categoryHandle) return GLOBAL_PRODUCT_PLACEHOLDER
  const category = findRoadmapCategory(categoryHandle)
  if (!category) return GLOBAL_PRODUCT_PLACEHOLDER
  return `${PROXY_PREFIX}/${PRODUCT_PLACEHOLDERS_PATH}/${category.placeholderSlug}-placeholder.webp`
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run lib/__tests__/bunnycdn.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/bunnycdn.ts lib/__tests__/bunnycdn.test.ts lib/category-nav.ts
git commit -m "feat: add BunnyCDN path builders and category placeholder resolution"
```

---

### Task 2: BunnyCDN storage proxy route handler

**Files:**
- Create: `app/api/bunny/[...path]/route.ts`
- Test: `app/api/bunny/[...path]/__tests__/route.test.ts`
- Modify: `.env.example`
- Modify: `.env.local`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: `GET /api/bunny/<path...>` — the URL shape every path returned by `lib/bunnycdn.ts` resolves to. Task 3 and Task 4 only ever reference these paths as opaque strings; this task makes them actually serve bytes.

- [ ] **Step 1: Add env vars**

Edit `.env.example`, add after the Resend block:

```
# ── BunnyCDN (category/subcategory/product imagery) ──────────────────────────
# The md-supplies storage zone has no public Pull Zone, so reads go through the
# server-side proxy at app/api/bunny/[...path]/route.ts using the private
# Storage API. SECRET. BunnyCDN dashboard → Storage → md-supplies → FTP & API Access.
BUNNYCDN_STORAGE_ACCESS_KEY=
# Non-secret. Storage API host for the zone (BunnyCDN dashboard → Storage → md-supplies).
BUNNYCDN_STORAGE_HOSTNAME=ny.storage.bunnycdn.com
# Non-secret. The storage zone name.
BUNNYCDN_STORAGE_ZONE=md-supplies
```

Edit `.env.local`, add at the end:

```
# BunnyCDN storage proxy
BUNNYCDN_STORAGE_ACCESS_KEY=<your-storage-zone-access-key>  # REDACTED — the real key was committed here historically and has been rotated; never commit it
BUNNYCDN_STORAGE_HOSTNAME=ny.storage.bunnycdn.com
BUNNYCDN_STORAGE_ZONE=md-supplies
```

- [ ] **Step 2: Write the failing tests for the route handler**

Create `app/api/bunny/[...path]/__tests__/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '../route'

function makeRequest(path: string) {
  return new NextRequest(new URL(`http://localhost/api/bunny/${path}`))
}

function makeParams(path: string) {
  return { params: Promise.resolve({ path: path.split('/') }) }
}

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  process.env.BUNNYCDN_STORAGE_ACCESS_KEY = 'test-key'
  process.env.BUNNYCDN_STORAGE_HOSTNAME = 'ny.storage.bunnycdn.com'
  process.env.BUNNYCDN_STORAGE_ZONE = 'md-supplies'
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
  vi.unstubAllGlobals()
})

describe('GET /api/bunny/[...path]', () => {
  it('proxies the request to the BunnyCDN storage API with the AccessKey header', async () => {
    const body = new ReadableStream()
    vi.mocked(fetch).mockResolvedValue(
      new Response(body, { status: 200, headers: { 'content-type': 'image/webp' } }),
    )

    const res = await GET(makeRequest('mdsupplies/categories/gloves.webp'), makeParams('mdsupplies/categories/gloves.webp'))

    expect(fetch).toHaveBeenCalledWith(
      'https://ny.storage.bunnycdn.com/md-supplies/mdsupplies/categories/gloves.webp',
      { headers: { AccessKey: 'test-key' } },
    )
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('image/webp')
    expect(res.headers.get('cache-control')).toBe('public, max-age=31536000, immutable')
  })

  it('returns 404 when the upstream object is missing', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 404 }))

    const res = await GET(
      makeRequest('mdsupplies/placeholders/products/missing.webp'),
      makeParams('mdsupplies/placeholders/products/missing.webp'),
    )

    expect(res.status).toBe(404)
  })

  it('returns 404 without calling fetch when env vars are not configured', async () => {
    delete process.env.BUNNYCDN_STORAGE_ACCESS_KEY

    const res = await GET(makeRequest('mdsupplies/categories/gloves.webp'), makeParams('mdsupplies/categories/gloves.webp'))

    expect(res.status).toBe(404)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('rejects path traversal segments with 400', async () => {
    const res = await GET(makeRequest('mdsupplies/..%2F..%2Fsecrets'), makeParams('mdsupplies/../../secrets'))

    expect(res.status).toBe(400)
    expect(fetch).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2b: Run the tests to verify they fail**

Run: `npx vitest run app/api/bunny`
Expected: FAIL with "Cannot find module '../route'"

- [ ] **Step 3: Implement the route handler**

Create `app/api/bunny/[...path]/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params

  if (path.some((segment) => segment === '..' || segment === '.' || segment === '')) {
    return new NextResponse(null, { status: 400 })
  }

  const accessKey = process.env.BUNNYCDN_STORAGE_ACCESS_KEY
  const hostname = process.env.BUNNYCDN_STORAGE_HOSTNAME
  const zone = process.env.BUNNYCDN_STORAGE_ZONE

  if (!accessKey || !hostname || !zone) {
    return new NextResponse(null, { status: 404 })
  }

  const upstreamUrl = `https://${hostname}/${zone}/${path.map(encodeURIComponent).join('/')}`
  const upstream = await fetch(upstreamUrl, { headers: { AccessKey: accessKey } })

  if (!upstream.ok || !upstream.body) {
    return new NextResponse(null, { status: 404 })
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': upstream.headers.get('content-type') ?? 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run app/api/bunny`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add app/api/bunny .env.example
git commit -m "feat: add BunnyCDN storage proxy route handler"
```

Note: `.env.local` is gitignored and won't be staged — confirm with `git status` that it doesn't appear.

---

### Task 3: `ProductImage` component — product fallback chain

**Files:**
- Create: `components/shared/ProductImage.tsx`
- Modify: `components/store/ShopifyProductCard.tsx`
- Modify: `components/product/ProductView.tsx`

**Interfaces:**
- Consumes: `getProductPlaceholderPath`, `GLOBAL_PRODUCT_PLACEHOLDER` from `lib/bunnycdn.ts` (Task 1).
- Produces: `<ProductImage src={string|null|undefined} alt={string} categoryHandle?={string|null} className?={string} sizes?={string} priority?={boolean} />`, consumed by every product image call site in this task.

- [ ] **Step 1: Create `ProductImage`**

Create `components/shared/ProductImage.tsx`:

```tsx
'use client'

import { useState } from 'react'
import Image from 'next/image'
import { getProductPlaceholderPath, GLOBAL_PRODUCT_PLACEHOLDER } from '@/lib/bunnycdn'

interface Props {
  src?: string | null
  alt: string
  categoryHandle?: string | null
  className?: string
  sizes?: string
  priority?: boolean
}

// Fallback chain (§3.6): real Shopify image → primary-category BunnyCDN
// placeholder → global medical-supplies placeholder. Never a broken-image
// icon or empty white card — the global placeholder is the floor.
export function ProductImage({
  src,
  alt,
  categoryHandle,
  className = 'size-full object-contain',
  sizes = '(max-width: 768px) 50vw, 25vw',
  priority = false,
}: Props) {
  const [realImageFailed, setRealImageFailed] = useState(false)
  const [categoryPlaceholderFailed, setCategoryPlaceholderFailed] = useState(false)

  if (src && !realImageFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        className={className}
        onError={() => setRealImageFailed(true)}
      />
    )
  }

  const placeholderSrc = categoryPlaceholderFailed
    ? GLOBAL_PRODUCT_PLACEHOLDER
    : getProductPlaceholderPath(categoryHandle)

  return (
    <Image
      src={placeholderSrc}
      alt={alt}
      fill
      sizes={sizes}
      className={className}
      onError={() => setCategoryPlaceholderFailed(true)}
    />
  )
}
```

- [ ] **Step 2: Wire into `ShopifyProductCard`**

Edit `components/store/ShopifyProductCard.tsx` — replace the image block (lines 50–62) and drop the now-unused `ShoppingCart` icon import if nothing else uses it (it's still used nowhere else in this file, so remove the import):

```tsx
import Link from 'next/link'
import type { CollectionProduct } from '@/lib/shopify/types'
import { ShopifyQuickAddButton } from './ShopifyQuickAddButton'
import { ProductImage } from '@/components/shared/ProductImage'
import { track } from '@/lib/analytics/track'
import { buildSelectItemEvent, toGA4Item, currencyOf } from '@/lib/analytics/events'
```

```tsx
        {/* Image */}
        <div className="relative overflow-hidden bg-white aspect-square">
          <ProductImage
            src={image?.url}
            alt={image?.altText ?? product.title}
            categoryHandle={categorySlug}
          />
```

(Keep everything else in that `<div>` — the stock badges and the out-of-stock overlay — unchanged; only the `image ? ... : ...` block is replaced by the single `<ProductImage>` call.)

- [ ] **Step 3: Wire into `ProductView`**

Edit `components/product/ProductView.tsx`:

Add the import:

```tsx
import { ProductImage } from '@/components/shared/ProductImage'
```

Replace the `RelatedProductCard` image block (lines 29–35):

```tsx
      <div className="relative overflow-hidden bg-neutral-50 aspect-square">
        <ProductImage src={image?.url} alt={image?.altText ?? product.title} />
      </div>
```

Replace the main gallery image block (lines 166–177):

```tsx
            <div className="relative bg-[#f9faf9] aspect-square overflow-hidden">
              <ProductImage
                src={images[activeImg]?.url}
                alt={images[activeImg]?.altText ?? product.title}
                priority
              />
            </div>
```

Replace the thumbnail image (line 184, add `relative` to the button's className since `ProductImage`'s placeholder branch uses `fill`; line 190–191 is replaced):

```tsx
                  <button
                    key={img.id}
                    onClick={() => setActiveImg(i)}
                    className={`relative size-[80px] sm:size-[100px] lg:size-[120px] shrink-0 overflow-hidden bg-[#f9faf9] transition-colors ${
                      activeImg === i
                        ? 'border-[3px] border-navy-900'
                        : 'border border-gray-200 hover:border-navy-900'
                    }`}
                  >
                    <ProductImage src={img.url} alt={img.altText ?? product.title} />
                  </button>
```

Replace the "more products" overflow row image block (lines 553–562; add `relative` to the wrapper div since it currently has no positioning context):

```tsx
                  <div className="relative bg-neutral-50 h-[160px] sm:h-[185px] overflow-hidden flex items-center justify-center">
                    <ProductImage src={item.images.nodes[0]?.url} alt={item.images.nodes[0]?.altText ?? item.title} />
                  </div>
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add components/shared/ProductImage.tsx components/store/ShopifyProductCard.tsx components/product/ProductView.tsx
git commit -m "feat: wire product image fallback chain (Shopify -> category placeholder -> global placeholder)"
```

---

### Task 4: `CategoryImage` component — category/subcategory hero banners + `next.config.ts`

**Files:**
- Create: `components/shared/CategoryImage.tsx`
- Modify: `app/category/[slug]/page.tsx`
- Modify: `app/category/[slug]/[product]/page.tsx`
- Modify: `next.config.ts`

**Interfaces:**
- Consumes: `getCategoryBannerPath`, `getSubcategoryBannerPath` from `lib/bunnycdn.ts` (Task 1).
- Produces: `<CategoryImage bannerPath={string} fallbackUrl?={string|null} alt={string} />`.

- [ ] **Step 1: Create `CategoryImage`**

Create `components/shared/CategoryImage.tsx`:

```tsx
'use client'

import { useState } from 'react'
import Image from 'next/image'

interface Props {
  bannerPath: string
  fallbackUrl?: string | null
  alt: string
}

// Hero/banner fallback (§3.3): curated BunnyCDN banner first, Shopify
// collection.image second, neutral panel last — never an empty/broken slot.
export function CategoryImage({ bannerPath, fallbackUrl, alt }: Props) {
  const [bannerFailed, setBannerFailed] = useState(false)
  const [fallbackFailed, setFallbackFailed] = useState(false)

  if (!bannerFailed) {
    return (
      <Image
        src={bannerPath}
        alt={alt}
        fill
        sizes="55vw"
        className="object-cover"
        onError={() => setBannerFailed(true)}
      />
    )
  }

  if (fallbackUrl && !fallbackFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={fallbackUrl}
        alt={alt}
        className="absolute inset-0 w-full h-full object-cover"
        onError={() => setFallbackFailed(true)}
      />
    )
  }

  return <div className="absolute inset-0 bg-navy-900/5" />
}
```

- [ ] **Step 2: Wire into the category page hero**

Edit `app/category/[slug]/page.tsx`. Add the import:

```tsx
import { CategoryImage } from '@/components/shared/CategoryImage'
import { getCategoryBannerPath } from '@/lib/bunnycdn'
```

Replace the hero IIFE block (lines 165–210) — the hero now always renders the split layout, with `CategoryImage` deciding what fills the right panel:

```tsx
      {/* ── Hero — banner image always present (BunnyCDN → Shopify → neutral panel) ── */}
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 pb-8">
        <div className="relative bg-white overflow-hidden flex min-h-[320px] sm:min-h-[380px]">
          {/* Text content */}
          <div className="relative z-10 flex flex-col justify-center px-8 sm:px-12 py-10 max-w-[560px]">
            <div className="inline-flex self-start items-center bg-[rgba(0,193,255,0.2)] rounded-full px-4 py-1.5 mb-5">
              <span className="text-[#0086b1] text-[13px] font-semibold tracking-[0.3px]">
                CERTIFIED MEDICAL SUPPLIER
              </span>
            </div>

            <h1 className="text-navy-900 text-[40px] sm:text-[50px] font-semibold leading-[1.2] tracking-[-0.01em] mb-4">
              {collection.title}
            </h1>

            {collection.description && (
              <p className="text-gray-500 text-[15px] leading-[1.75] mb-8 max-w-[500px]">
                {collection.description}
              </p>
            )}

            <Link
              href={ROUTES.category(slug)}
              className="self-start border border-navy-900 text-navy-900 text-[14px] font-semibold px-6 h-[52px] flex items-center hover:bg-navy-900 hover:text-white transition-colors"
            >
              View All {collection.title}
            </Link>
          </div>

          {/* Right: banner image — only on larger screens, matching the existing layout */}
          <div className="hidden lg:block absolute right-0 top-0 bottom-0 w-[55%]">
            <CategoryImage
              bannerPath={getCategoryBannerPath(slug)}
              fallbackUrl={collection.image?.url}
              alt={collection.image?.altText ?? collection.title}
            />
          </div>
        </div>
      </div>
```

- [ ] **Step 3: Wire into the subcategory page hero**

Edit `app/category/[slug]/[product]/page.tsx`. Add the import:

```tsx
import { CategoryImage } from '@/components/shared/CategoryImage'
import { getSubcategoryBannerPath } from '@/lib/bunnycdn'
```

Replace the subcategory hero block (lines 96–107) — it currently has no image slot at all:

```tsx
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 pb-8">
          <div className="relative bg-white overflow-hidden flex min-h-[260px] sm:min-h-[300px]">
            <div className="relative z-10 flex flex-col justify-center px-8 sm:px-12 py-10 max-w-[560px]">
              <h1 className="text-navy-900 text-[36px] sm:text-[44px] font-semibold leading-[1.2] tracking-[-0.01em] mb-4">
                {collection.title}
              </h1>
              {collection.description && (
                <p className="text-gray-500 text-[15px] leading-[1.75] max-w-[500px]">
                  {collection.description}
                </p>
              )}
            </div>

            <div className="hidden lg:block absolute right-0 top-0 bottom-0 w-[55%]">
              <CategoryImage
                bannerPath={getSubcategoryBannerPath(subHandle)}
                fallbackUrl={collection.image?.url}
                alt={collection.image?.altText ?? collection.title}
              />
            </div>
          </div>
        </div>
```

- [ ] **Step 4: Allowlist the proxy path in `next.config.ts`**

Edit `next.config.ts`:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the dev server to be reached through ngrok. Next blocks cross-origin
  // dev requests by default, which breaks the HMR WebSocket and hydration when
  // the app is loaded from a tunnel host instead of localhost. The wildcards
  // cover any teammate's free ngrok tunnel (free domains come in both flavours).
  allowedDevOrigins: ["*.ngrok-free.dev", "*.ngrok-free.app"],
  images: {
    // BunnyCDN images are served through the same-origin proxy at
    // app/api/bunny/[...path]/route.ts (the storage zone has no public Pull
    // Zone), so no remotePatterns are needed — only this local path is
    // allowed through next/image's optimizer.
    localPatterns: [{ pathname: "/api/bunny/**" }],
  },
};

export default nextConfig;
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add components/shared/CategoryImage.tsx "app/category/[slug]/page.tsx" "app/category/[slug]/[product]/page.tsx" next.config.ts
git commit -m "feat: add curated BunnyCDN hero banners to category and subcategory pages"
```

---

### Task 5: Verify §9.3 filtered/sorted noindex + canonical

This is a verification task — no new code is expected. `app/category/[slug]/page.tsx`'s `generateMetadata` already sets `noIndex: true` when filters/sort are active and self-canonicalizes paginated URLs. The subcategory route (`app/category/[slug]/[product]/page.tsx`) has no filter/sort/pagination UI at all today, so there's nothing to noindex there.

- [ ] **Step 1: Run the existing SEO test suite**

Run: `npx vitest run lib/seo`
Expected: PASS (all existing canonical/robots/metadata tests green, unchanged)

- [ ] **Step 2: Manual confirmation (no commit — read-only check)**

Re-read `app/category/[slug]/page.tsx` `generateMetadata` (lines 60–107) and confirm:
- `isFiltered` (any `filter` param or `sort` param) → `noIndex: true`. ✓ already true.
- `currentPage > 1` with `sp.after` present → canonical self-references the paginated URL (correct per current Google pagination guidance — no `rel=next/prev` needed). ✓ already true.
- No changes required. If a future ticket adds filter/sort to the subcategory page, this same `isFiltered` pattern should be copied there.

---

## Self-Review Notes

- **Spec coverage:** BunnyCDN config (Task 2/4) ✓, placeholder set naming/mapping (Task 1, code-side; actual 28 image files are a content/design deliverable outside this plan — see summary) ✓, product fallback chain (Task 3) ✓, category/subcategory hero images (Task 4) ✓, §9.3 noindex/canonical (Task 5, verified pre-existing) ✓, §12.3 performance — `next/image` gives lazy-load-below-fold by default and `priority`/`loading="eager"` is used for the above-the-fold gallery hero and category banners; aspect-ratio wrapper divs (already in the codebase) prevent layout shift ✓.
- **Out of scope, flagged not silently dropped:** uploading the actual 28 placeholder webp files and category/subcategory banner photography to BunnyCDN — that's a content/design task, not engineering, and is explicitly called out as blocked in the source ticket (§14).
