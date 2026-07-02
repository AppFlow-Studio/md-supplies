# Product-card quick-add hover behavior Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the category/collection-grid quick-add plus button from an awkward top-right overlay to a bottom-right, hover-revealed control on desktop, with a permanently visible fallback on mobile — without overlapping the image, title, vendor, or price, and without breaking card click-through.

**Architecture:** Split `ShopifyProductCard.tsx`'s single card-wide `<Link>` into two anchors (image, info) so the image box becomes an independent `relative` positioning context. Move `<ShopifyQuickAddButton>` into that image box as a DOM sibling of the image `<Link>` (not nested inside an `<a>`). Update `ShopifyQuickAddButton.tsx`'s classes to anchor `bottom-2 right-2`, stay hidden until hover only at `sm:` and above, and add a fade+scale transition.

**Tech Stack:** Next.js (App Router), React, Tailwind CSS, Vitest + @testing-library/react.

## Global Constraints

- Scope is `components/store/ShopifyProductCard.tsx` and `components/store/ShopifyQuickAddButton.tsx` only. Do not touch `components/product/ProductCard.tsx`, `ProductCardClient.tsx`, or `components/home/PopularProducts.tsx` — see `docs/superpowers/specs/2026-07-02-product-card-hover-quick-add-design.md` for why those are out of scope.
- Desktop/mobile split uses the `sm:` breakpoint (640px), matching `ProductGrid.tsx`'s existing `sm:grid-cols-2`.
- The quick-add `<button>` must never be a DOM descendant of an `<a>` tag (avoids invalid nested-interactive-element markup).
- Test runner: `npx vitest run <path>` (project test script is `vitest run`).

---

### Task 1: Restructure ShopifyProductCard.tsx — split the Link, move the button out of card-level positioning

**Files:**
- Modify: `components/store/ShopifyProductCard.tsx`
- Test: `components/store/__tests__/ShopifyProductCard.test.tsx` (new file)

**Interfaces:**
- Consumes: `ShopifyQuickAddButton` from `./ShopifyQuickAddButton` (existing export, unchanged signature: `{ product: CollectionProduct }`), `ProductImage` from `@/components/shared/ProductImage`, `CollectionProduct` type from `@/lib/shopify/types`.
- Produces: `ShopifyProductCard` component, same public props as today (`{ product: CollectionProduct; categorySlug?: string; itemListId?: string; itemListName?: string; index?: number }`) — no signature change, only internal DOM structure changes. Later tasks (Task 2) rely on the quick-add button being rendered inside a `<div className="relative overflow-hidden bg-white aspect-square">` that is *not* a descendant of an `<a>`.

- [ ] **Step 1: Write the failing test**

Create `components/store/__tests__/ShopifyProductCard.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { ShopifyProductCard } from '../ShopifyProductCard'
import type { CollectionProduct } from '@/lib/shopify/types'

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string
    children: React.ReactNode
    [key: string]: unknown
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

const trackMock = vi.fn()
vi.mock('@/lib/analytics/track', () => ({ track: (...args: unknown[]) => trackMock(...args) }))
vi.mock('@/lib/analytics/events', () => ({
  buildSelectItemEvent: vi.fn(() => ({})),
  toGA4Item: vi.fn(() => ({})),
  currencyOf: vi.fn(() => 'USD'),
}))
vi.mock('@/components/product/QuickAddModal', () => ({
  QuickAddModal: () => <div data-testid="quick-add-modal" />,
}))

afterEach(() => {
  cleanup()
  trackMock.mockClear()
})

function makeProduct(overrides: Partial<CollectionProduct> = {}): CollectionProduct {
  return {
    id: 'gid://shopify/Product/1',
    title: 'Nitrile Exam Gloves',
    handle: 'nitrile-exam-gloves',
    vendor: 'MedSupply Co',
    availableForSale: true,
    tags: [],
    priceRange: {
      minVariantPrice: { amount: '12.99', currencyCode: 'USD' },
      maxVariantPrice: { amount: '12.99', currencyCode: 'USD' },
    },
    images: {
      nodes: [
        { id: 'img1', url: 'https://example.com/gloves.jpg', altText: 'Gloves', width: 800, height: 800 },
      ],
    },
    variants: {
      nodes: [
        {
          id: 'gid://shopify/ProductVariant/1',
          title: 'Default',
          price: { amount: '12.99', currencyCode: 'USD' },
          compareAtPrice: null,
          availableForSale: true,
          quantityAvailable: 10,
        },
      ],
    },
    ...overrides,
  }
}

describe('ShopifyProductCard', () => {
  it('renders the quick-add button outside any anchor element', () => {
    const product = makeProduct()
    render(
      <ShopifyProductCard
        product={product}
        categorySlug="gloves"
        itemListId="list"
        itemListName="Gloves"
      />,
    )

    const button = screen.getByRole('button', { name: `Quick add ${product.title}` })
    expect(button.closest('a')).toBeNull()
  })

  it('renders two links to the product page (image + info) for click-through', () => {
    const product = makeProduct()
    render(
      <ShopifyProductCard
        product={product}
        categorySlug="gloves"
        itemListId="list"
        itemListName="Gloves"
      />,
    )

    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(2)
    links.forEach((link) => {
      expect(link).toHaveAttribute('href', '/category/gloves/nitrile-exam-gloves')
    })
  })

  it('clicking the quick-add button does not fire the card select-item tracking', () => {
    const product = makeProduct()
    render(
      <ShopifyProductCard
        product={product}
        categorySlug="gloves"
        itemListId="list"
        itemListName="Gloves"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: `Quick add ${product.title}` }))
    expect(trackMock).not.toHaveBeenCalled()
    expect(screen.getByTestId('quick-add-modal')).toBeInTheDocument()
  })

  it('clicking a product link fires the card select-item tracking', () => {
    const product = makeProduct()
    render(
      <ShopifyProductCard
        product={product}
        categorySlug="gloves"
        itemListId="list"
        itemListName="Gloves"
      />,
    )

    fireEvent.click(screen.getAllByRole('link')[0])
    expect(trackMock).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run components/store/__tests__/ShopifyProductCard.test.tsx`
Expected: FAIL — the current implementation renders a single card-wide `<Link>`, so `screen.getAllByRole('link')` returns 1 element (not 2), and the quick-add button is a sibling of that single `<Link>` at the card level, not nested inside the image box (so the "outside any anchor" test may pass already, but the "two links" and structural tests will fail).

- [ ] **Step 3: Restructure the component**

Replace the full contents of `components/store/ShopifyProductCard.tsx`:

```tsx
import Link from 'next/link'
import type { CollectionProduct } from '@/lib/shopify/types'
import { ShopifyQuickAddButton } from './ShopifyQuickAddButton'
import { ProductImage } from '@/components/shared/ProductImage'
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

  const href = categorySlug
    ? `/category/${categorySlug}/${product.handle}`
    : `/product/${product.handle}`

  function handleSelect() {
    track({
      ...buildSelectItemEvent({
        currency: currencyOf(product),
        itemListId: itemListId ?? 'unknown',
        itemListName: itemListName ?? 'unknown',
        item: toGA4Item(product),
        index,
      }),
    })
  }

  return (
    <div className="group relative bg-white flex flex-col">
      {/* Image */}
      <div className="relative overflow-hidden bg-white aspect-square">
        <Link href={href} onClick={handleSelect} className="block w-full h-full">
          <ProductImage
            src={image?.url}
            alt={image?.altText ?? product.title}
            categoryHandle={categorySlug}
          />

          {/* Stock badge — top-left corner */}
          {!product.availableForSale && (
            <span className="absolute top-2 left-2 bg-gray-500 text-white text-[10px] font-bold px-2 py-0.5 tracking-[0.2px] uppercase">
              Out of Stock
            </span>
          )}

          {!product.availableForSale && (
            <div className="absolute inset-0 bg-white/60" />
          )}
        </Link>

        {/* Quick add — sibling of the image link, not nested inside it, so clicks never navigate */}
        <ShopifyQuickAddButton product={product} />
      </div>

      {/* Info */}
      <Link href={href} onClick={handleSelect} className="px-[22px] pt-[19px] pb-[22px] flex flex-col">
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
      </Link>
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run components/store/__tests__/ShopifyProductCard.test.tsx`
Expected: PASS (all 4 tests)

- [ ] **Step 5: Commit**

```bash
git add components/store/ShopifyProductCard.tsx components/store/__tests__/ShopifyProductCard.test.tsx
git commit -m "refactor: split product-card link so quick-add button anchors to the image box"
```

---

### Task 2: Reposition and restyle the quick-add button — bottom-right, hover-reveal on desktop, always-visible on mobile

**Files:**
- Modify: `components/store/ShopifyQuickAddButton.tsx`
- Test: `components/store/__tests__/ShopifyProductCard.test.tsx` (extend from Task 1)

**Interfaces:**
- Consumes: nothing new — same `{ product: CollectionProduct }` prop as today.
- Produces: no signature change. The `<button>` element's `className` now contains `bottom-2`, `right-2`, `opacity-100`, `sm:opacity-0`, `sm:group-hover:opacity-100` (asserted by this task's tests; no other task depends on these exact strings).

- [ ] **Step 1: Write the failing tests**

Add to `components/store/__tests__/ShopifyProductCard.test.tsx`, inside the existing `describe('ShopifyProductCard', ...)` block:

```tsx
  it('positions the quick-add button bottom-right and hides it behind a desktop hover reveal', () => {
    const product = makeProduct()
    render(
      <ShopifyProductCard
        product={product}
        categorySlug="gloves"
        itemListId="list"
        itemListName="Gloves"
      />,
    )

    const button = screen.getByRole('button', { name: `Quick add ${product.title}` })
    expect(button.className).toContain('bottom-2')
    expect(button.className).toContain('right-2')
    expect(button.className).not.toContain('top-2')
    // Mobile: visible by default
    expect(button.className).toContain('opacity-100')
    // Desktop (sm:+): hidden until hover
    expect(button.className).toContain('sm:opacity-0')
    expect(button.className).toContain('sm:group-hover:opacity-100')
  })

  it('renders no quick-add button for an unavailable product', () => {
    const product = makeProduct({ availableForSale: false })
    render(
      <ShopifyProductCard
        product={product}
        categorySlug="gloves"
        itemListId="list"
        itemListName="Gloves"
      />,
    )

    expect(screen.queryByRole('button', { name: `Quick add ${product.title}` })).not.toBeInTheDocument()
  })
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run components/store/__tests__/ShopifyProductCard.test.tsx`
Expected: FAIL on the new "positions the quick-add button" test — current classes are `top-2 right-2 ... opacity-0 group-hover:opacity-100` (no `bottom-2`, no `opacity-100` base, no `sm:` prefix). The "unavailable product" test should already PASS (existing `if (!product.availableForSale) return null` guard) — confirm it still passes so Task 2 doesn't regress it.

- [ ] **Step 3: Update the button's classes**

In `components/store/ShopifyQuickAddButton.tsx`, replace the `<button>`'s `className`:

```tsx
        className="absolute bottom-2 right-2 z-10 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center opacity-100 scale-100 sm:opacity-0 sm:scale-90 sm:group-hover:opacity-100 sm:group-hover:scale-100 transition-[opacity,transform] duration-200 ease-out hover:bg-navy-900 hover:text-white text-navy-900"
```

(This is the only change in the file — replaces the previous `absolute top-2 right-2 z-10 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-navy-900 hover:text-white text-navy-900` string.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run components/store/__tests__/ShopifyProductCard.test.tsx`
Expected: PASS (all 6 tests)

- [ ] **Step 5: Run the full test suite to check for regressions**

Run: `npx vitest run`
Expected: PASS — no other test references `ShopifyQuickAddButton` or `ShopifyProductCard` classNames (confirmed: no existing test files for either component prior to Task 1).

- [ ] **Step 6: Commit**

```bash
git add components/store/ShopifyQuickAddButton.tsx components/store/__tests__/ShopifyProductCard.test.tsx
git commit -m "fix: move product-card quick-add button to bottom-right hover reveal, visible on mobile"
```

---

### Task 3: Manual verification in the browser

**Files:** none (manual QA step, no code changes)

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`

- [ ] **Step 2: Verify desktop hover behavior**

Open a category page (e.g. `/category/<any-existing-category-slug>`) in a desktop-width browser window (≥640px). Confirm:
- The plus button is not visible on page load.
- Hovering anywhere over a product card fades + scales in the plus button in the image's bottom-right corner.
- The button does not overlap the vendor, title, or price text.
- Moving the mouse away fades it back out.
- Clicking the plus button opens the quick-add modal and does not navigate.
- Clicking the image or the title/price text navigates to the product page.

- [ ] **Step 3: Verify mobile behavior**

Resize the browser below 640px (or use device emulation). Confirm:
- The plus button is visible without any hover/tap, in the same bottom-right position.
- It still doesn't overlap any text.
- Tapping it opens the quick-add modal; tapping elsewhere on the card navigates.

- [ ] **Step 4: Spot-check the partner products page**

Open `/partners/<any-existing-partner-slug>/products` (also renders `ShopifyProductCard`) and repeat the desktop hover check to confirm the fix applies there too.

No commit for this task — it's verification only.

---

## Self-Review Notes

- **Spec coverage:** hide-by-default+hover-reveal on desktop (Task 2), bottom-right position without overlap (Tasks 1+2, verified structurally in Task 1's "two links" test and visually in Task 3), mobile always-visible fallback (Task 2), smooth animation via fade+scale (Task 2), click-through preserved (Task 1's tracking tests + Task 3 manual check), out-of-homepage-scope documented in Global Constraints — all covered.
- **Placeholder scan:** none found.
- **Type consistency:** `ShopifyQuickAddButton`'s prop type (`{ product: CollectionProduct }`) is unchanged across both tasks; `ShopifyProductCard`'s public `Props` interface is unchanged. Test helper `makeProduct()` matches the exact `CollectionProduct` shape from `lib/shopify/types.ts:91-101`.
