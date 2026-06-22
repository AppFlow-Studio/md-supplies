# GTM / GA4 Storefront Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Install GTM container `GTM-5BQJLLJV` globally and wire up `dataLayer` events (`page_view`, `view_item`, `view_item_list`, `select_item`, `add_to_cart`, `begin_checkout`, `form_submit`) across the storefront so GA4 (configured inside GTM) can measure the funnel.

**Architecture:** Use the official `@next/third-parties/google` package (`GoogleTagManager` + `sendGTMEvent`) instead of hand-rolled `<script>` tags — it's the version-compatible, documented way to load GTM in this Next.js release (confirmed against `node_modules/next/dist/docs/01-app/02-guides/third-party-libraries.md`). All GA4 ecommerce payload shaping lives in pure, unit-tested builder functions in `lib/analytics/events.ts`; components call a one-line `track()` wrapper to push events. Page views are tracked manually (`usePathname`/`useSearchParams` + `useEffect`) since route changes are client-side soft navigations that GTM's default history-change trigger does not reliably cover end-to-end with a custom payload.

**Tech Stack:** Next.js 16 App Router, React 19, `@next/third-parties` (new dependency), Vitest (existing).

## Global Constraints

- GTM container ID is `GTM-5BQJLLJV`, read from `NEXT_PUBLIC_GTM_ID` — never hardcode the literal ID outside `.env.example`.
- Do not add `window.gtag` calls anywhere — this container only uses `dataLayer.push()`. (Two existing call sites already wrongly assume `gtag` exists; this plan fixes them — see Task 6.)
- Every GA4 ecommerce event payload must follow the `{ event, ecommerce: { currency, value, items: [...] } }` shape (GA4 standard ecommerce schema).
- Pure event-shaping logic goes in `lib/analytics/events.ts` and is unit tested with Vitest, matching this repo's existing convention (`lib/schema/*.ts`, `lib/seo/canonical.ts`) of testing pure functions, not DOM/browser side effects.
- `track()` (the one-line `sendGTMEvent` wrapper) and the wiring inside client components (`useEffect`, `onClick`) are **not** unit tested — there is no jsdom/RTL setup in this repo (`vitest.config.ts` uses `environment: 'node'`) and adding one is out of scope. These are verified manually in the browser (Task 10).
- **Out of scope for this plan** (flagged to the user, explicitly excluded):
  - `account_signup` / `account_creation` — Shopify's hosted OAuth login and "Create Account" buttons both hit `/api/auth/login` with no signal distinguishing a new signup from a returning login. Building this would require either guessing (and mislabeling data) or changing the OAuth contract. Skipped per explicit decision.
  - `purchase` / `add_payment_info` — these fire from a **Shopify Customer Events custom pixel**, which is a different runtime (sandboxed iframe with no `window.dataLayer` access, configured in Shopify Admin, not deployed from this repo) and a separate security/architecture decision (embedding a GA4 Measurement Protocol secret in a pixel that ships to every customer's browser vs. using Shopify's "Google & YouTube" sales channel app). Needs its own follow-up plan once that decision is made.
  - Cross-domain attribution config (Next.js → `checkout.shopify.com`) and GA4 "no duplicate page_view" tag configuration — these are GTM/GA4 **container UI** configuration steps (creating tags/triggers in the GTM web console), not code changes in this repo. Documented as manual steps at the end of this plan.
  - SEO crawlability acceptance items (sitemap.xml, robots.txt, canonical tags, noindex on staging) are already implemented in `lib/seo/*` (see recent commits `9888e65`, `3d31fd2`) — not part of this plan.

---

### Task 1: Add `@next/third-parties` dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the package**

Run: `npm install @next/third-parties@16.2.9`

Expected: `package.json` gains `"@next/third-parties": "16.2.9"` under `dependencies`, and `package-lock.json` updates. (16.2.9 is the latest published version and its `peerDependencies` declare `next: "^13.0.0 || ^14.0.0 || ^15.0.0 || ^16.0.0-beta.0"` and `react: "^18.2.0 || ... || ^19.0.0"`, matching this repo's `next@16.2.6` / `react@19.2.4`.)

- [ ] **Step 2: Verify the install**

Run: `npm ls @next/third-parties`
Expected: prints `@next/third-parties@16.2.9` with no `UNMET PEER DEPENDENCY` warnings.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @next/third-parties for GTM integration"
```

---

### Task 2: Add the GTM env var

**Files:**
- Modify: `.env.example`

**Interfaces:**
- Produces: `NEXT_PUBLIC_GTM_ID` env var, consumed by Task 4 (`app/layout.tsx`).

- [ ] **Step 1: Add the variable**

In `.env.example`, after the `NEXT_PUBLIC_SITE_URL` block (currently ending around line 39) and before the Resend section, add:

```bash
# ── Google Tag Manager ───────────────────────────────────────────────────────
# Non-secret container ID (same for every environment/developer).
NEXT_PUBLIC_GTM_ID=GTM-5BQJLLJV
```

- [ ] **Step 2: Add the same line to your local `.env.local`**

Run (PowerShell): `Add-Content .env.local "`nNEXT_PUBLIC_GTM_ID=GTM-5BQJLLJV"`
Expected: `.env.local` now contains the line (verify with `Get-Content .env.local | Select-String GTM`).

- [ ] **Step 3: Commit**

```bash
git add .env.example
git commit -m "chore: document NEXT_PUBLIC_GTM_ID env var"
```

(`.env.local` is gitignored — do not add it.)

---

### Task 3: Pure GA4 event builders + tests

**Files:**
- Create: `lib/analytics/events.ts`
- Test: `lib/analytics/__tests__/events.test.ts`

**Interfaces:**
- Produces: `GA4Item`, `GA4EcommerceEvent`, `PageViewEvent`, `FormSubmitEvent` types; `toGA4Item(product: CollectionProduct): GA4Item`; `currencyOf(product: CollectionProduct): string`; `buildPageViewEvent`, `buildViewItemEvent`, `buildViewItemListEvent`, `buildSelectItemEvent`, `buildAddToCartEvent`, `buildBeginCheckoutEvent`, `buildFormSubmitEvent`. Consumed by Tasks 5–9.

- [ ] **Step 1: Write the failing tests**

Create `lib/analytics/__tests__/events.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import type { CollectionProduct } from '@/lib/shopify/types'
import {
  toGA4Item,
  currencyOf,
  buildPageViewEvent,
  buildViewItemEvent,
  buildViewItemListEvent,
  buildSelectItemEvent,
  buildAddToCartEvent,
  buildBeginCheckoutEvent,
  buildFormSubmitEvent,
} from '../events'

function makeProduct(overrides: Partial<CollectionProduct> = {}): CollectionProduct {
  return {
    id: 'gid://shopify/Product/1',
    title: 'Nitrile Exam Gloves',
    handle: 'nitrile-exam-gloves',
    vendor: 'MedBrand',
    availableForSale: true,
    tags: [],
    priceRange: {
      minVariantPrice: { amount: '19.99', currencyCode: 'USD' },
      maxVariantPrice: { amount: '19.99', currencyCode: 'USD' },
    },
    images: { nodes: [] },
    variants: {
      nodes: [
        {
          id: 'gid://shopify/ProductVariant/10',
          price: { amount: '19.99', currencyCode: 'USD' },
          compareAtPrice: null,
          availableForSale: true,
          quantityAvailable: 50,
        },
      ],
    },
    ...overrides,
  }
}

describe('toGA4Item', () => {
  it('maps a CollectionProduct to a GA4 item using the first variant price', () => {
    expect(toGA4Item(makeProduct())).toEqual({
      item_id: 'gid://shopify/ProductVariant/10',
      item_name: 'Nitrile Exam Gloves',
      price: 19.99,
      item_brand: 'MedBrand',
    })
  })

  it('falls back to priceRange and product id when there is no variant', () => {
    const product = makeProduct({ variants: { nodes: [] } })
    expect(toGA4Item(product)).toEqual({
      item_id: 'gid://shopify/Product/1',
      item_name: 'Nitrile Exam Gloves',
      price: 19.99,
      item_brand: 'MedBrand',
    })
  })
})

describe('currencyOf', () => {
  it('reads currency from the first variant', () => {
    expect(currencyOf(makeProduct())).toBe('USD')
  })

  it('falls back to priceRange currency when there is no variant', () => {
    expect(currencyOf(makeProduct({ variants: { nodes: [] } }))).toBe('USD')
  })
})

describe('buildPageViewEvent', () => {
  it('builds a page_view event from path/location/title', () => {
    expect(
      buildPageViewEvent({ path: '/category/gloves?sort=PRICE_ASC', location: 'https://mdsupplies.com/category/gloves?sort=PRICE_ASC', title: 'Gloves | MD Supplies' }),
    ).toEqual({
      event: 'page_view',
      page_path: '/category/gloves?sort=PRICE_ASC',
      page_location: 'https://mdsupplies.com/category/gloves?sort=PRICE_ASC',
      page_title: 'Gloves | MD Supplies',
    })
  })
})

describe('buildViewItemEvent', () => {
  it('wraps a single item with currency and value', () => {
    expect(
      buildViewItemEvent({ currency: 'USD', item: { item_id: 'v1', item_name: 'Gloves', price: 19.99 } }),
    ).toEqual({
      event: 'view_item',
      ecommerce: { currency: 'USD', value: 19.99, items: [{ item_id: 'v1', item_name: 'Gloves', price: 19.99 }] },
    })
  })
})

describe('buildViewItemListEvent', () => {
  it('stamps index and list metadata onto every item and sums value', () => {
    const items = [
      { item_id: 'v1', item_name: 'Gloves', price: 10 },
      { item_id: 'v2', item_name: 'Masks', price: 5 },
    ]
    expect(
      buildViewItemListEvent({ currency: 'USD', itemListId: 'gloves', itemListName: 'Gloves', items }),
    ).toEqual({
      event: 'view_item_list',
      ecommerce: {
        currency: 'USD',
        value: 15,
        items: [
          { item_id: 'v1', item_name: 'Gloves', price: 10, index: 0, item_list_id: 'gloves', item_list_name: 'Gloves' },
          { item_id: 'v2', item_name: 'Masks', price: 5, index: 1, item_list_id: 'gloves', item_list_name: 'Gloves' },
        ],
      },
    })
  })
})

describe('buildSelectItemEvent', () => {
  it('stamps index and list metadata onto the selected item', () => {
    expect(
      buildSelectItemEvent({
        currency: 'USD',
        itemListId: 'gloves',
        itemListName: 'Gloves',
        item: { item_id: 'v1', item_name: 'Gloves', price: 10 },
        index: 2,
      }),
    ).toEqual({
      event: 'select_item',
      ecommerce: {
        currency: 'USD',
        value: 10,
        items: [{ item_id: 'v1', item_name: 'Gloves', price: 10, index: 2, item_list_id: 'gloves', item_list_name: 'Gloves' }],
      },
    })
  })
})

describe('buildAddToCartEvent', () => {
  it('multiplies unit price by quantity for value', () => {
    expect(
      buildAddToCartEvent({ currency: 'USD', item: { item_id: 'v1', item_name: 'Gloves', price: 10, quantity: 3 } }),
    ).toEqual({
      event: 'add_to_cart',
      ecommerce: { currency: 'USD', value: 30, items: [{ item_id: 'v1', item_name: 'Gloves', price: 10, quantity: 3 }] },
    })
  })

  it('defaults quantity to 1 when omitted', () => {
    expect(
      buildAddToCartEvent({ currency: 'USD', item: { item_id: 'v1', item_name: 'Gloves', price: 10 } }),
    ).toMatchObject({ ecommerce: { value: 10 } })
  })
})

describe('buildBeginCheckoutEvent', () => {
  it('sums price * quantity across all items', () => {
    const items = [
      { item_id: 'v1', item_name: 'Gloves', price: 10, quantity: 2 },
      { item_id: 'v2', item_name: 'Masks', price: 5, quantity: 1 },
    ]
    expect(buildBeginCheckoutEvent({ currency: 'USD', items })).toEqual({
      event: 'begin_checkout',
      ecommerce: { currency: 'USD', value: 25, items },
    })
  })
})

describe('buildFormSubmitEvent', () => {
  it('builds a form_submit event with extra details merged in', () => {
    expect(buildFormSubmitEvent({ formName: 'contact', details: { subject: 'General inquiry' } })).toEqual({
      event: 'form_submit',
      form_name: 'contact',
      subject: 'General inquiry',
    })
  })

  it('works with no details', () => {
    expect(buildFormSubmitEvent({ formName: 'sourcing_request' })).toEqual({
      event: 'form_submit',
      form_name: 'sourcing_request',
    })
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run lib/analytics/__tests__/events.test.ts`
Expected: FAIL — `Cannot find module '../events'` (file doesn't exist yet).

- [ ] **Step 3: Implement `lib/analytics/events.ts`**

```ts
import type { CollectionProduct } from '@/lib/shopify/types'

export interface GA4Item {
  item_id: string
  item_name: string
  price: number
  item_brand?: string
  quantity?: number
  index?: number
  item_list_id?: string
  item_list_name?: string
}

export interface GA4EcommerceEvent {
  event: 'view_item' | 'view_item_list' | 'select_item' | 'add_to_cart' | 'begin_checkout'
  ecommerce: {
    currency: string
    value: number
    items: GA4Item[]
  }
}

export interface PageViewEvent {
  event: 'page_view'
  page_path: string
  page_location: string
  page_title: string
}

export interface FormSubmitEvent {
  event: 'form_submit'
  form_name: string
  [key: string]: unknown
}

function firstVariant(product: CollectionProduct) {
  return product.variants.nodes[0]
}

export function toGA4Item(product: CollectionProduct): GA4Item {
  const variant = firstVariant(product)
  return {
    item_id: variant?.id ?? product.id,
    item_name: product.title,
    price: parseFloat(variant?.price.amount ?? product.priceRange.minVariantPrice.amount),
    item_brand: product.vendor,
  }
}

export function currencyOf(product: CollectionProduct): string {
  const variant = firstVariant(product)
  return variant?.price.currencyCode ?? product.priceRange.minVariantPrice.currencyCode
}

function sumItemValue(items: GA4Item[]): number {
  return items.reduce((sum, item) => sum + item.price * (item.quantity ?? 1), 0)
}

export function buildPageViewEvent(params: { path: string; location: string; title: string }): PageViewEvent {
  return {
    event: 'page_view',
    page_path: params.path,
    page_location: params.location,
    page_title: params.title,
  }
}

export function buildViewItemEvent(params: { currency: string; item: GA4Item }): GA4EcommerceEvent {
  return {
    event: 'view_item',
    ecommerce: { currency: params.currency, value: params.item.price, items: [params.item] },
  }
}

export function buildViewItemListEvent(params: {
  currency: string
  itemListId: string
  itemListName: string
  items: GA4Item[]
}): GA4EcommerceEvent {
  const items = params.items.map((item, index) => ({
    ...item,
    index,
    item_list_id: params.itemListId,
    item_list_name: params.itemListName,
  }))
  return {
    event: 'view_item_list',
    ecommerce: { currency: params.currency, value: sumItemValue(items), items },
  }
}

export function buildSelectItemEvent(params: {
  currency: string
  itemListId: string
  itemListName: string
  item: GA4Item
  index: number
}): GA4EcommerceEvent {
  const item: GA4Item = {
    ...params.item,
    index: params.index,
    item_list_id: params.itemListId,
    item_list_name: params.itemListName,
  }
  return {
    event: 'select_item',
    ecommerce: { currency: params.currency, value: item.price, items: [item] },
  }
}

export function buildAddToCartEvent(params: { currency: string; item: GA4Item }): GA4EcommerceEvent {
  return {
    event: 'add_to_cart',
    ecommerce: {
      currency: params.currency,
      value: params.item.price * (params.item.quantity ?? 1),
      items: [params.item],
    },
  }
}

export function buildBeginCheckoutEvent(params: { currency: string; items: GA4Item[] }): GA4EcommerceEvent {
  return {
    event: 'begin_checkout',
    ecommerce: { currency: params.currency, value: sumItemValue(params.items), items: params.items },
  }
}

export function buildFormSubmitEvent(params: { formName: string; details?: Record<string, string> }): FormSubmitEvent {
  return { event: 'form_submit', form_name: params.formName, ...(params.details ?? {}) }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run lib/analytics/__tests__/events.test.ts`
Expected: PASS — all cases green.

- [ ] **Step 5: Commit**

```bash
git add lib/analytics/events.ts lib/analytics/__tests__/events.test.ts
git commit -m "feat: add pure GA4 ecommerce event builders"
```

---

### Task 4: `track()` wrapper + GTM install in root layout + page_view tracking

**Files:**
- Create: `lib/analytics/track.ts`
- Create: `components/analytics/PageViewTracker.tsx`
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: `buildPageViewEvent` from `lib/analytics/events.ts` (Task 3).
- Produces: `track(event: Record<string, unknown>): void`, exported from `lib/analytics/track.ts`. Every later task (5, 6, 7, 8, 9) imports `track` from here.

- [ ] **Step 1: Create the `track()` wrapper**

Create `lib/analytics/track.ts`:

```ts
import { sendGTMEvent } from '@next/third-parties/google'

export function track(event: Record<string, unknown>): void {
  sendGTMEvent(event)
}
```

- [ ] **Step 2: Create `PageViewTracker`**

Create `components/analytics/PageViewTracker.tsx`:

```tsx
'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { track } from '@/lib/analytics/track'
import { buildPageViewEvent } from '@/lib/analytics/events'

export function PageViewTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    const search = searchParams.toString()
    const path = search ? `${pathname}?${search}` : pathname
    track(
      buildPageViewEvent({
        path,
        location: `${window.location.origin}${path}`,
        title: document.title,
      }),
    )
  }, [pathname, searchParams])

  return null
}
```

- [ ] **Step 3: Install GTM + the tracker in the root layout**

In `app/layout.tsx`, add imports (after the existing `Footer`/`CartPopup` imports around line 8):

```tsx
import { Suspense } from 'react'
import { GoogleTagManager } from '@next/third-parties/google'
import { PageViewTracker } from '@/components/analytics/PageViewTracker'
```

Then change the return statement (currently starting at line 55):

```tsx
  return (
    <html lang="en" className={`${manrope.variable} h-full antialiased`}>
      {process.env.NEXT_PUBLIC_GTM_ID && (
        <GoogleTagManager gtmId={process.env.NEXT_PUBLIC_GTM_ID} />
      )}
      <body className="min-h-full flex flex-col">
        <Suspense fallback={null}>
          <PageViewTracker />
        </Suspense>
        <SkipLink />
```

(Leave everything from `<SkipLink />` onward unchanged.)

> Placement matches the documented pattern in `node_modules/next/dist/docs/01-app/02-guides/third-party-libraries.md` (`<GoogleTagManager>` as a sibling of `<body>`, inside `<html>`). The package injects both the `gtm.js` script and the `<noscript>` iframe fallback itself. `PageViewTracker` is wrapped in `<Suspense>` because it calls `useSearchParams()`, which requires a Suspense boundary on statically/ISR-rendered routes (category/product pages use `revalidate = 30`, not `force-dynamic`) per `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-search-params.md`.

- [ ] **Step 4: Type-check and build**

Run: `npm run build`
Expected: build succeeds with no "Missing Suspense boundary" or type errors.

- [ ] **Step 5: Commit**

```bash
git add lib/analytics/track.ts components/analytics/PageViewTracker.tsx app/layout.tsx
git commit -m "feat: install GTM container and track page_view on every route"
```

---

### Task 5: `view_item` on the product page

**Files:**
- Modify: `components/product/ProductView.tsx`

**Interfaces:**
- Consumes: `track` (Task 4), `buildViewItemEvent` (Task 3).

- [ ] **Step 1: Add the import and effect**

In `components/product/ProductView.tsx`, add to the imports (near line 8):

```tsx
import { useEffect, useState } from 'react'
import { track } from '@/lib/analytics/track'
import { buildViewItemEvent } from '@/lib/analytics/events'
```

(`useState` is already imported on line 3 — merge into a single `react` import line rather than duplicating it.)

Inside `ProductView`, after the `selectedVariant` state declaration (currently lines 60–62), add:

```tsx
  useEffect(() => {
    track(
      buildViewItemEvent({
        currency: selectedVariant.price.currencyCode,
        item: {
          item_id: selectedVariant.id,
          item_name: product.title,
          price: parseFloat(selectedVariant.price.amount),
          item_brand: product.vendor,
        },
      }),
    )
    // Fire once per product page visit, not on every variant switch — App Router
    // reuses this client component instance across product-to-product navigation,
    // so `product.id` (not `[]`) is the dependency that makes this refire correctly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id])
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: succeeds, no type errors.

- [ ] **Step 3: Commit**

```bash
git add components/product/ProductView.tsx
git commit -m "feat: track view_item on product page"
```

---

### Task 6: Fix `form_submit` on contact + sourcing forms

**Files:**
- Modify: `app/contact/ContactForm.tsx`
- Modify: `components/home/WholesalePricing.tsx`

**Interfaces:**
- Consumes: `track` (Task 4), `buildFormSubmitEvent` (Task 3).

- [ ] **Step 1: Fix `ContactForm.tsx`**

In `app/contact/ContactForm.tsx`, add to imports (top of file, after line 3):

```tsx
import { track } from '@/lib/analytics/track'
import { buildFormSubmitEvent } from '@/lib/analytics/events'
```

Replace the broken `gtag` block (currently lines 37–40):

```tsx
      const w = window as unknown as { gtag?: (...args: unknown[]) => void }
      if (typeof w.gtag === 'function') {
        w.gtag('event', 'form_submit', { form_name: 'contact', subject: form.subject || 'none' })
      }
```

with:

```tsx
      track(buildFormSubmitEvent({ formName: 'contact', details: { subject: form.subject || 'none' } }))
```

- [ ] **Step 2: Fix `WholesalePricing.tsx`**

In `components/home/WholesalePricing.tsx`, add to imports (top of file, after line 5):

```tsx
import { track } from '@/lib/analytics/track'
import { buildFormSubmitEvent } from '@/lib/analytics/events'
```

Replace the broken `gtag` block (currently lines 60–63):

```tsx
      const w = window as unknown as { gtag?: (...args: unknown[]) => void }
      if (typeof w.gtag === 'function') {
        w.gtag('event', 'form_submit', { form_name: 'sourcing_request', faculty_type: form.facultyType })
      }
```

with:

```tsx
      track(buildFormSubmitEvent({ formName: 'sourcing_request', details: { faculty_type: form.facultyType } }))
```

> Both forms previously checked `typeof window.gtag === 'function'`, which was always `false` since this container only ever defines `window.dataLayer` — these calls were silent no-ops. This fixes that bug as part of standardizing on `dataLayer.push`.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add app/contact/ContactForm.tsx components/home/WholesalePricing.tsx
git commit -m "fix: send form_submit via dataLayer instead of dead gtag calls"
```

---

### Task 7: `view_item_list` + `select_item` on category/search product grids

**Files:**
- Create: `components/category/ViewItemListTracker.tsx`
- Modify: `components/category/ProductGrid.tsx`
- Modify: `components/store/ShopifyProductCard.tsx`
- Modify: `app/category/[slug]/page.tsx`
- Modify: `app/category/[slug]/[product]/page.tsx` (the subcategory listing route — despite the folder name, this renders a product grid for a subcategory, not a single product)
- Modify: `components/search/SearchResultsSection.tsx`

**Interfaces:**
- Consumes: `track` (Task 4), `buildViewItemListEvent`, `buildSelectItemEvent`, `toGA4Item`, `currencyOf` (Task 3).
- Produces: `ProductGrid` now requires `itemListId: string` and `itemListName: string` props. `ShopifyProductCard` now accepts optional `itemListId?: string`, `itemListName?: string`, `index?: number`.

- [ ] **Step 1: Create `ViewItemListTracker`**

Create `components/category/ViewItemListTracker.tsx`:

```tsx
'use client'

import { useEffect } from 'react'
import type { CollectionProduct } from '@/lib/shopify/types'
import { track } from '@/lib/analytics/track'
import { buildViewItemListEvent, toGA4Item, currencyOf } from '@/lib/analytics/events'

interface Props {
  products: CollectionProduct[]
  itemListId: string
  itemListName: string
}

export function ViewItemListTracker({ products, itemListId, itemListName }: Props) {
  const idsKey = products.map((p) => p.id).join(',')

  useEffect(() => {
    if (products.length === 0) return
    track(
      buildViewItemListEvent({
        currency: currencyOf(products[0]),
        itemListId,
        itemListName,
        items: products.map(toGA4Item),
      }),
    )
    // idsKey, not `products` (a new array reference every render), is the real dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, itemListId, itemListName])

  return null
}
```

- [ ] **Step 2: Wire it into `ProductGrid` and thread list metadata to each card**

In `components/category/ProductGrid.tsx`, update:

```tsx
import Link from 'next/link'
import type { CollectionProduct } from '@/lib/shopify/types'
import { ShopifyProductCard } from '@/components/store/ShopifyProductCard'
import { ViewItemListTracker } from './ViewItemListTracker'

interface Props {
    products: CollectionProduct[]
    emptyStateHref: string
    emptyStateMessage?: string
    categorySlug?: string
    itemListId: string
    itemListName: string
}

export function ProductGrid({
    products,
    emptyStateHref,
    emptyStateMessage = 'No products found.',
    categorySlug,
    itemListId,
    itemListName,
}: Props) {

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-navy-900 text-[20px] font-semibold">
          {emptyStateMessage}
        </p>
        <p className="text-gray-500 text-[15px]">
          Try adjusting or clearing your filters.
        </p>
        <Link
          href={emptyStateHref}
          className="mt-2 border border-navy-900 text-navy-900 text-[15px] font-semibold px-6 h-[44px] flex items-center hover:bg-neutral-50 transition-colors"
        >
          Clear all filters
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-[23px]">
      <ViewItemListTracker products={products} itemListId={itemListId} itemListName={itemListName} />
      {products.map((product, index) => (
        <ShopifyProductCard
          key={product.id}
          product={product}
          categorySlug={categorySlug}
          itemListId={itemListId}
          itemListName={itemListName}
          index={index}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Make `ShopifyProductCard` fire `select_item` on click**

Replace the full contents of `components/store/ShopifyProductCard.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { ShoppingCart } from 'lucide-react'
import type { CollectionProduct } from '@/lib/shopify/types'
import { ShopifyQuickAddButton } from './ShopifyQuickAddButton'
import { track } from '@/lib/analytics/track'
import { buildSelectItemEvent, toGA4Item, currencyOf } from '@/lib/analytics/events'

interface Props {
  product: CollectionProduct
  categorySlug?: string
  itemListId?: string
  itemListName?: string
  index?: number
}

export function ShopifyProductCard({ product, categorySlug, itemListId, itemListName, index = 0 }: Props) {
  const variant = product.variants.nodes[0]
  const price = parseFloat(variant?.price.amount ?? product.priceRange.minVariantPrice.amount)
  const compareAt = variant?.compareAtPrice
    ? parseFloat(variant.compareAtPrice.amount)
    : null
  const image = product.images.nodes[0]
  const hasDiscount = compareAt !== null && compareAt > price

  const stockQty = variant?.quantityAvailable ?? null
  const isLowStock = product.availableForSale && stockQty !== null && stockQty <= 9 && stockQty > 0

  const href = categorySlug
    ? `/category/${categorySlug}/${product.handle}`
    : `/product/${product.handle}`

  function handleSelect() {
    track(
      buildSelectItemEvent({
        currency: currencyOf(product),
        itemListId: itemListId ?? 'unknown',
        itemListName: itemListName ?? 'unknown',
        item: toGA4Item(product),
        index,
      }),
    )
  }

  return (
    <div className="group relative bg-white flex flex-col">
      <Link href={href} onClick={handleSelect} className="flex flex-col">
        {/* Image */}
        <div className="relative overflow-hidden bg-white aspect-square">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image.url}
              alt={image.altText ?? product.title}
              className="size-full object-contain"
            />
          ) : (
            <div className="size-full bg-gray-100 flex items-center justify-center">
              <ShoppingCart size={32} className="text-gray-300" />
            </div>
          )}

          {/* Stock badge — top-left corner */}
          {isLowStock && (
            <span className="absolute top-2 left-2 bg-amber-400 text-white text-[10px] font-bold px-2 py-0.5 tracking-[0.2px] uppercase">
              Low Stock
            </span>
          )}
          {!product.availableForSale && (
            <span className="absolute top-2 left-2 bg-gray-500 text-white text-[10px] font-bold px-2 py-0.5 tracking-[0.2px] uppercase">
              Out of Stock
            </span>
          )}

          {!product.availableForSale && (
            <div className="absolute inset-0 bg-white/60" />
          )}
        </div>

        {/* Info */}
        <div className="px-[22px] pt-[19px] pb-[22px] flex flex-col">
          <span className="text-[#0086b1] text-[13px] font-semibold tracking-[0.26px] uppercase leading-[25px]">
            {product.vendor}
          </span>
          <p className="text-black text-[14px] font-semibold tracking-[0.28px] leading-5 line-clamp-2 mb-[30px]">
            {product.title}
          </p>
          {(product.tags.includes('free-shipping') || product.tags.includes('rx-required')) && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {product.tags.includes('free-shipping') && (
                <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded bg-teal-500 text-white">
                  Free Shipping
                </span>
              )}
              {product.tags.includes('rx-required') && (
                <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded bg-amber-600 text-white">
                  RX Only
                </span>
              )}
            </div>
          )}
          <div className="flex items-baseline gap-2">
            <span className="text-black text-[18px] font-bold tracking-[0.36px]">
              ${price.toFixed(2)}
            </span>
            {hasDiscount && (
              <span className="text-gray-500 text-[14px] line-through tracking-[0.28px]">
                ${compareAt!.toFixed(2)}
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* Quick add button — sibling to <Link>, not inside it, so clicks never navigate */}
      <ShopifyQuickAddButton product={product} />
    </div>
  )
}
```

(Only changes from the original: added `'use client'`, the two new imports, `itemListId`/`itemListName`/`index` props, `handleSelect`, and `onClick={handleSelect}` on the `<Link>`.)

- [ ] **Step 4: Pass list metadata from the category page**

In `app/category/[slug]/page.tsx`, update the `<ProductGrid>` call (currently lines 294–298):

```tsx
          <ProductGrid
            products={products}
            emptyStateHref={ROUTES.category(slug)}
            categorySlug={data.collection.handle}
            itemListId={data.collection.handle}
            itemListName={collection.title}
          />
```

- [ ] **Step 5: Pass list metadata from the subcategory listing route**

In `app/category/[slug]/[product]/page.tsx`, update the `<ProductGrid>` call (currently lines 135–139):

```tsx
          <ProductGrid
            products={collection.products.nodes}
            emptyStateHref={ROUTES.category(slug)}
            categorySlug={subHandle}
            itemListId={subHandle}
            itemListName={collection.title}
          />
```

- [ ] **Step 6: Pass list metadata from search results**

In `components/search/SearchResultsSection.tsx`, update the `<ProductGrid>` call (currently lines 97–101):

```tsx
      <ProductGrid
        products={products}
        emptyStateHref={clearFiltersUrl}
        emptyStateMessage={`No results for "${q}"`}
        itemListId="search-results"
        itemListName={`Search results for "${q}"`}
      />
```

- [ ] **Step 7: Build**

Run: `npm run build`
Expected: succeeds with no type errors (the two new required `ProductGrid` props are satisfied at all three call sites).

- [ ] **Step 8: Commit**

```bash
git add components/category/ViewItemListTracker.tsx components/category/ProductGrid.tsx \
  components/store/ShopifyProductCard.tsx app/category/[slug]/page.tsx \
  app/category/[slug]/[product]/page.tsx components/search/SearchResultsSection.tsx
git commit -m "feat: track view_item_list and select_item on category/search grids"
```

---

### Task 8: `add_to_cart` when a cart mutation actually succeeds

**Files:**
- Modify: `components/store/CartProvider.tsx`

**Interfaces:**
- Consumes: `track` (Task 4), `buildAddToCartEvent` (Task 3).

> Tracked from inside `CartProvider.addItem` — the single chokepoint all real cart mutations go through — rather than from `AddToCartButton`'s `onClick`. `QuickAddModal`/`QuickAddContent` (the category-grid "quick add" flow) call a `console.log` placeholder instead of `useCart().addItem` (cart integration there is explicitly unfinished, per the existing `// Cart integration hook point` comment in `QuickAddContent.tsx`) — tracking from `addItem` means we never record a fake `add_to_cart` for an item that wasn't actually added, and we'll get the event for free once that flow is wired up for real.

- [ ] **Step 1: Add the import and event push**

In `components/store/CartProvider.tsx`, add to imports (after line 10):

```tsx
import { track } from '@/lib/analytics/track'
import { buildAddToCartEvent } from '@/lib/analytics/events'
```

Replace the `addItem` callback (currently lines 35–43):

```tsx
  const addItem = useCallback(async (variantId: string, qty: number) => {
    try {
      const updated = await addToCart(variantId, qty)
      setCart(updated)
      setIsOpen(true)
      const line = updated.lines.nodes.find((l) => l.merchandise.id === variantId)
      if (line) {
        track(
          buildAddToCartEvent({
            currency: line.cost.totalAmount.currencyCode,
            item: {
              item_id: line.merchandise.id,
              item_name: line.merchandise.product.title,
              price: parseFloat(line.cost.totalAmount.amount) / line.quantity,
              quantity: qty,
            },
          }),
        )
      }
    } catch (err) {
      console.error('[CartProvider] addItem failed:', err)
    }
  }, [])
```

> `line.cost.totalAmount` is the line's running total (price × current line quantity, which can be larger than `qty` if this variant was already in the cart). Dividing by `line.quantity` recovers the per-unit price, which the event then multiplies by `qty` — the quantity just added, not the line's cumulative quantity.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: succeeds, no type errors.

- [ ] **Step 3: Commit**

```bash
git add components/store/CartProvider.tsx
git commit -m "feat: track add_to_cart on successful cart mutation"
```

---

### Task 9: `begin_checkout` when the user proceeds to Shopify checkout

**Files:**
- Modify: `components/store/CartPopup.tsx`

**Interfaces:**
- Consumes: `track` (Task 4), `buildBeginCheckoutEvent` (Task 3).

- [ ] **Step 1: Add the import and click handler**

In `components/store/CartPopup.tsx`, add to imports (after line 5):

```tsx
import { track } from '@/lib/analytics/track'
import { buildBeginCheckoutEvent } from '@/lib/analytics/events'
```

Inside `CartPopup`, after `const lines = cart?.lines.nodes ?? []` (and removing the stray `console.log(cart)` debug line right after it — currently line 10), add:

```tsx
  function handleCheckoutClick() {
    if (!cart) return
    track(
      buildBeginCheckoutEvent({
        currency: cart.cost.subtotalAmount.currencyCode,
        items: lines.map((line) => ({
          item_id: line.merchandise.id,
          item_name: line.merchandise.product.title,
          price: parseFloat(line.cost.totalAmount.amount) / line.quantity,
          quantity: line.quantity,
        })),
      }),
    )
  }
```

Then add the handler to the checkout link (currently lines 149–154):

```tsx
            <a
              href={cart.checkoutUrl}
              onClick={handleCheckoutClick}
              className="bg-navy-900 text-white h-[52px] flex items-center justify-center text-[15px] font-semibold tracking-[0.3px] uppercase hover:bg-navy-950 transition-colors"
            >
              Proceed to Checkout
            </a>
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/store/CartPopup.tsx
git commit -m "feat: track begin_checkout before handoff to Shopify checkout"
```

---

### Task 10: Manual browser verification (no automated coverage exists for this)

**Files:** none — verification only.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`

- [ ] **Step 2: Verify GTM loads and page_view fires**

Open the site in a browser, open DevTools console, run `window.dataLayer`. Expected: an array containing a `gtm.js` init entry and a `page_view` event with the current `page_path`.

Navigate to a different route via an in-app `<Link>` (no full reload). Expected: a **new** `page_view` entry appears in `window.dataLayer` with the new path (confirms client-side route changes are tracked, not just the first load).

- [ ] **Step 3: Verify view_item / view_item_list / select_item**

Visit `/category/<any-category-slug>`. Expected: `view_item_list` entry in `dataLayer` with `ecommerce.items` matching the rendered grid, each item carrying the correct `index`.

Click a product card. Expected: `select_item` entry fires before navigation, with matching `item_list_id`/`item_list_name`/`index`; then the product page loads and a `view_item` entry appears.

Navigate from that product page to a different product (via "You May Also Like"). Expected: a fresh `view_item` fires for the new product (confirms the `[product.id]` dependency re-fires correctly across client-side navigation, per the note in Task 5).

- [ ] **Step 4: Verify add_to_cart / begin_checkout**

On a product page, click "Add to Cart". Expected: `add_to_cart` entry in `dataLayer` with the correct `item_id`, `price`, and `quantity`.

Open the cart and click "Proceed to Checkout". Expected: `begin_checkout` entry fires with all cart line items and a `value` matching the cart subtotal, and the browser still navigates to the Shopify checkout URL afterward.

- [ ] **Step 5: Verify form_submit**

Submit the contact form (`/contact`) and the sourcing form (homepage "Need Help Sourcing Medical Supplies?" section). Expected: a `form_submit` entry in `dataLayer` for each, with `form_name: 'contact'` / `form_name: 'sourcing_request'` respectively.

- [ ] **Step 6: Run the full test suite and lint**

Run: `npx vitest run`
Expected: all tests pass, including the new `lib/analytics/__tests__/events.test.ts`.

Run: `npm run lint`
Expected: no errors.

---

## Manual setup required outside this repo (not code — do not skip)

These are GTM/GA4 container configuration and Shopify Admin steps. They cannot be done from this codebase:

1. **In the GTM container UI** (`GTM-5BQJLLJV`): create a GA4 Configuration tag and Event tags listening for the `page_view`, `view_item`, `view_item_list`, `select_item`, `add_to_cart`, `begin_checkout`, `form_submit` custom events now arriving in `dataLayer`. Set the GA4 Configuration tag to **not** auto-fire on the built-in "All Pages" trigger if you want only the manual `page_view` events from `PageViewTracker` — otherwise you will get duplicate pageviews (see `closeout doc §8.3`: "No duplicate GA4 page_view events").
2. **Cross-domain measurement**: in the GA4 Configuration tag's "Configure your domains" field (or the GA4 Admin → Data Streams → "Configure tag settings" → "Configure your domains"), add `checkout.shopify.com` so attribution survives the handoff to hosted checkout.
3. **Purchase / add_payment_info tracking**: decide between (a) a Shopify Customer Events custom pixel that sends hits via the GA4 Measurement Protocol (requires deciding how to handle the Measurement Protocol API secret being shipped to every customer's browser), or (b) Shopify's built-in "Google & YouTube" sales channel app, which handles GA4 conversion tracking server-side without that exposure. This needs its own decision and follow-up plan — flagged, not solved, here.
4. **GTM Preview**: verify Preview Mode connects on the storefront (confirms Task 4's install). Preview Mode will **not** show the checkout iframe — purchase/add_payment_info from item 3 above must be validated via GA4 DebugView or the pixel's network requests instead, per the closeout doc's validation notes.
