# Accessibility + prefers-reduced-motion (Track A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the accessibility half of the P1 QA ticket: add `id="main-content"` and proper breadcrumb/button semantics to the Track A templates that `docs/superpowers/plans/2026-06-03-b6-cwv-accessibility-audit.md` (B6) explicitly excluded as "Sardorbek's responsibility," give the cart/filter overlays real dialog semantics, make every menu/dialog/gallery respect `prefers-reduced-motion`, and ship an axe scan script + report across all 8 ticket routes (home, category, PDP, OCC, industry, blog, cart, account).

**Architecture:** Same code-fix pattern as B6 (targeted JSX/markup changes, no new routes), plus two sitewide motion fixes (one CSS media query, one `framer-motion` `MotionConfig`) instead of touching every animated component individually, plus a one-off `npx @axe-core/cli` script (no new project dependency — consistent with B6's `npx lighthouse` precedent; the permanent, CI-integrated axe suite is built in the separate test-infrastructure plan).

**Tech Stack:** Next.js 16 App Router, Tailwind CSS v4, framer-motion, axe-core (via `npx @axe-core/cli`, ad hoc)

## Global Constraints

- Forbidden-element rules from B6 §29 / closeout doc §13.1 still apply — don't reintroduce fake urgency, fake reviews, etc.
- B6 already fixed Track B (`partners`, `industries/[slug]` via `IndustryPage`, `solutions/occ` via `OCCHub`, `blog` hub, `blog/[handle]` — note: `blog/[handle]/page.tsx` has since regressed, see Task 1) — don't re-do Track B's component-level work, only verify it still holds.
- Routes in scope: `/` (home), `/category/[slug]` (category), `/product/[slug]` + `/category/[slug]/[product]` fallback (PDP), `/solutions/occ` (OCC — already done, verify only), `/industries` hub + `/industries/[industry-slug]` (industry), `/blog` hub + `/blog/[handle]` (blog), `/(noindex)/cart` (cart), `/(noindex)/account` (account).
- `app/globals.css` already has the B6 `:focus-visible` rule — don't duplicate it.

---

### Task 1: `id="main-content"` on every Track A/cart/account `<main>`

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/category/[slug]/page.tsx`
- Modify: `app/category/[slug]/[product]/page.tsx` (two `<main>` return paths)
- Modify: `app/product/[slug]/page.tsx`
- Modify: `app/industries/page.tsx`
- Modify: `app/blog/[handle]/page.tsx` (regressed since B6 — class changed from `bg-[#f9fafc]` to `bg-white`, dropping the id)
- Modify: `app/(noindex)/cart/page.tsx`
- Modify: `components/account/AccountView.tsx`
- Test: `__tests__/main-content-id.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/main-content-id.test.ts
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

function read(file: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', file), 'utf-8')
}

const FILES = [
  'app/page.tsx',
  'app/category/[slug]/page.tsx',
  'app/category/[slug]/[product]/page.tsx',
  'app/product/[slug]/page.tsx',
  'app/industries/page.tsx',
  'app/blog/[handle]/page.tsx',
  'app/(noindex)/cart/page.tsx',
  'components/account/AccountView.tsx',
]

describe('every page <main> carries id="main-content" (skip-link target)', () => {
  for (const file of FILES) {
    it(`${file} has at least one <main id="main-content"`, () => {
      const src = read(file)
      const mainTags = src.match(/<main[^>]*>/g) ?? []
      expect(mainTags.length).toBeGreaterThan(0)
      for (const tag of mainTags) {
        expect(tag).toMatch(/id="main-content"/)
      }
    })
  }
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/main-content-id.test.ts`
Expected: FAIL on all 8 files.

- [ ] **Step 3: Fix `app/page.tsx`**

Change:
```tsx
    <main>
```
To:
```tsx
    <main id="main-content">
```

- [ ] **Step 4: Fix `app/category/[slug]/page.tsx`**

Change:
```tsx
    <main className="bg-[#f9fafc] min-h-screen">
```
To:
```tsx
    <main id="main-content" className="bg-[#f9fafc] min-h-screen">
```

- [ ] **Step 5: Fix both `<main>` blocks in `app/category/[slug]/[product]/page.tsx`**

Change:
```tsx
    return (
      <main className="bg-[#f9fafc] min-h-screen">
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-4">
          <Breadcrumb
```
To:
```tsx
    return (
      <main id="main-content" className="bg-[#f9fafc] min-h-screen">
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-4">
          <Breadcrumb
```

Change:
```tsx
  return (
    <main className="bg-[#f9fafc]">
      <ProductView
```
To:
```tsx
  return (
    <main id="main-content" className="bg-[#f9fafc]">
      <ProductView
```

- [ ] **Step 6: Fix `app/product/[slug]/page.tsx`**

Change:
```tsx
  return (
    <main className="bg-[#f9fafc]">
      <ProductSchema {...schemaProps} />
```
To:
```tsx
  return (
    <main id="main-content" className="bg-[#f9fafc]">
      <ProductSchema {...schemaProps} />
```

- [ ] **Step 7: Fix `app/industries/page.tsx`**

Change:
```tsx
  return (
    <main className="bg-neutral-100">
```
To:
```tsx
  return (
    <main id="main-content" className="bg-neutral-100">
```

- [ ] **Step 8: Fix the regression in `app/blog/[handle]/page.tsx`**

Change:
```tsx
  return (
    <main className="bg-white">
```
To:
```tsx
  return (
    <main id="main-content" className="bg-white">
```

- [ ] **Step 9: Fix `app/(noindex)/cart/page.tsx`**

Change:
```tsx
    <main className="bg-[#f9fafc] min-h-screen">
```
To:
```tsx
    <main id="main-content" className="bg-[#f9fafc] min-h-screen">
```

- [ ] **Step 10: Fix `components/account/AccountView.tsx`**

Change:
```tsx
  return (
    <main>
```
To:
```tsx
  return (
    <main id="main-content">
```

- [ ] **Step 11: Run test to verify it passes**

Run: `npx vitest run __tests__/main-content-id.test.ts`
Expected: PASS (8/8)

- [ ] **Step 12: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no output.

- [ ] **Step 13: Commit**

```bash
git add app/page.tsx "app/category/[slug]/page.tsx" "app/category/[slug]/[product]/page.tsx" \
  "app/product/[slug]/page.tsx" app/industries/page.tsx "app/blog/[handle]/page.tsx" \
  "app/(noindex)/cart/page.tsx" components/account/AccountView.tsx __tests__/main-content-id.test.ts
git commit -m "a11y: add id=main-content to all Track A/cart/account <main> elements; fix blog [handle] regression"
```

---

### Task 2: Breadcrumb ARIA fix in `ProductView.tsx`

**Files:**
- Modify: `components/product/ProductView.tsx`

`ProductView` (shared by `/product/[slug]` and the `/category/[slug]/[product]` fallback) renders its own ad hoc breadcrumb `<nav>` with no `aria-label`, plain `<span>` separators, and no `<ol>`/`aria-current` — the exact pattern B6 fixed everywhere else in Track B. The rest of the codebase already has a reusable `components/layout/Breadcrumb.tsx` with the correct pattern; reuse it here instead of hand-rolling markup again.

- [ ] **Step 1: Replace the inline breadcrumb with the shared `Breadcrumb` component**

In `components/product/ProductView.tsx`, add the import near the other component imports:
```tsx
import { Breadcrumb } from '@/components/layout/Breadcrumb'
```

Replace:
```tsx
      {/* Breadcrumb */}
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-5">
        <nav className="flex items-center gap-2 text-[15px] tracking-[0.3px] flex-wrap">
          <Link href="/" className="text-gray-500 hover:text-navy-900 transition-colors">Home</Link>
          {(breadcrumbs ?? []).map((crumb) => (
            <div key={`sep-${crumb.label}`}>
              <span className="text-gray-500">›  </span>
              {crumb.href ? (
                <Link key={crumb.label} href={crumb.href} className="text-gray-500 hover:text-navy-900 transition-colors">
                  {crumb.label}
                </Link>
              ) : (
                <span key={crumb.label} className="text-gray-500">{crumb.label}</span>
              )}
            </div>
          ))}
          <span className="text-gray-500">›</span>
          <span className="text-navy-900 font-semibold line-clamp-1">{product.title}</span>
        </nav>
      </div>
```
With:
```tsx
      {/* Breadcrumb */}
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-5">
        <Breadcrumb
          items={[
            ...(breadcrumbs ?? []),
            { label: product.title },
          ]}
        />
      </div>
```

`Breadcrumb`'s `BreadcrumbItem` type is `{ label: string; href?: string }`, which already matches the shape `breadcrumbs` (the `BreadcrumbItem` interface declared at the top of `ProductView.tsx`) is passed in as — no caller changes needed in `app/product/[slug]/page.tsx` or `app/category/[slug]/[product]/page.tsx`.

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no output. If the local `BreadcrumbItem` interface in `ProductView.tsx` is now unused for anything else, leave it — it's still the prop type for `breadcrumbs`.

- [ ] **Step 3: Visual smoke check**

```bash
npm run dev
```
Open `/product/<any-handle>` and confirm the breadcrumb still renders identically (Home › Category › Product Title), just with `aria-label="Breadcrumb"`, `<ol>/<li>`, `aria-hidden` separators, and `aria-current="page"` on the last item now present in the DOM (inspect via browser devtools).

- [ ] **Step 4: Commit**

```bash
git add components/product/ProductView.tsx
git commit -m "a11y: replace ad hoc PDP breadcrumb with shared Breadcrumb component (proper ARIA)"
```

---

### Task 3: `type="button"` sweep on remaining Track A gaps

**Files:**
- Modify: `components/product/ProductView.tsx` (4 buttons)
- Modify: `components/category/FilterDrawer.tsx` (2 buttons)
- Modify: `components/product/QuickAddContent.tsx` (3 buttons)
- Modify: `components/product/QuickAddModal.tsx` (1 button)

B6's button sweep covered Track B + the shared category filter components, but missed these.

- [ ] **Step 1: `components/product/ProductView.tsx` — gallery thumbnail button**

Change:
```tsx
                  <button
                    key={img.id}
                    onClick={() => setActiveImg(i)}
                    className={`relative size-[80px]
```
To:
```tsx
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setActiveImg(i)}
                    className={`relative size-[80px]
```

- [ ] **Step 2: `components/product/ProductView.tsx` — qty decrease/increase buttons**

Change:
```tsx
                <button
                  onClick={() => setOrderQty((q) => Math.max(1, q - 1))}
                  className="flex-1 flex items-center justify-center text-gray-500 text-[20px] font-semibold hover:bg-neutral-50 transition-colors"
                  aria-label="Decrease quantity"
                >
```
To:
```tsx
                <button
                  type="button"
                  onClick={() => setOrderQty((q) => Math.max(1, q - 1))}
                  className="flex-1 flex items-center justify-center text-gray-500 text-[20px] font-semibold hover:bg-neutral-50 transition-colors"
                  aria-label="Decrease quantity"
                >
```

Change:
```tsx
                <button
                  onClick={() => setOrderQty((q) => q + 1)}
                  className="flex-1 flex items-center justify-center text-gray-500 text-[20px] font-semibold hover:bg-neutral-50 transition-colors"
                  aria-label="Increase quantity"
                >
```
To:
```tsx
                <button
                  type="button"
                  onClick={() => setOrderQty((q) => q + 1)}
                  className="flex-1 flex items-center justify-center text-gray-500 text-[20px] font-semibold hover:bg-neutral-50 transition-colors"
                  aria-label="Increase quantity"
                >
```

- [ ] **Step 3: `components/product/ProductView.tsx` — tab buttons**

Change:
```tsx
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-5 text-[15px] font-semibold tracking-[0.3px] whitespace-nowrap border-b-[3px] transition-colors ${
```
To:
```tsx
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-5 text-[15px] font-semibold tracking-[0.3px] whitespace-nowrap border-b-[3px] transition-colors ${
```

- [ ] **Step 4: `components/category/FilterDrawer.tsx` — trigger and close buttons**

Change:
```tsx
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 border border-navy-900 text-navy-900 text-[14px] font-semibold px-4 h-[40px] hover:bg-neutral-50 transition-colors"
        >
```
To:
```tsx
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 border border-navy-900 text-navy-900 text-[14px] font-semibold px-4 h-[40px] hover:bg-neutral-50 transition-colors"
        >
```

Change:
```tsx
              <button
                onClick={() => setOpen(false)}
                aria-label="Close filters"
              >
```
To:
```tsx
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close filters"
              >
```

- [ ] **Step 5: `components/product/QuickAddContent.tsx` — qty and add-to-cart buttons**

Change:
```tsx
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            aria-label="Decrease quantity"
```
To:
```tsx
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            aria-label="Decrease quantity"
```

Change:
```tsx
          <button
            onClick={() => setQty((q) => q + 1)}
            aria-label="Increase quantity"
```
To:
```tsx
          <button
            type="button"
            onClick={() => setQty((q) => q + 1)}
            aria-label="Increase quantity"
```

Change:
```tsx
      <button
        onClick={handleAdd}
        disabled={!canAdd || added}
```
To:
```tsx
      <button
        type="button"
        onClick={handleAdd}
        disabled={!canAdd || added}
```

- [ ] **Step 6: `components/product/QuickAddModal.tsx` — close button**

Change:
```tsx
          <button
            onClick={onClose}
            aria-label="Close quick add"
```
To:
```tsx
          <button
            type="button"
            onClick={onClose}
            aria-label="Close quick add"
```

- [ ] **Step 7: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no output.

- [ ] **Step 8: Commit**

```bash
git add components/product/ProductView.tsx components/category/FilterDrawer.tsx \
  components/product/QuickAddContent.tsx components/product/QuickAddModal.tsx
git commit -m "a11y: add type=button to remaining non-submit buttons on PDP, filter drawer, and quick add"
```

---

### Task 4: `CartPopup` dialog semantics, focus trap, and Escape handling

**Files:**
- Modify: `components/store/CartPopup.tsx`

`CartPopup` is the actual cart UI (the `/cart` route is a placeholder) — it's rendered globally in `app/layout.tsx` and toggled via `isOpen`, but it stays mounted and its buttons stay in the tab order even while visually translated off-screen (`translate-x-full`). It also has no `role="dialog"`, no `aria-modal`, and no focus trap/Escape handling. This is the cart-specific axe + keyboard finding the ticket calls for.

- [ ] **Step 1: Add dialog role, focus trap, and Escape handling**

In `components/store/CartPopup.tsx`, change the imports and add a ref + effect:

```tsx
'use client'

import { useEffect, useRef } from 'react'
import { X, Plus, Minus, ShoppingCart } from 'lucide-react'
import Link from 'next/link'
import { useCart } from './CartProvider'
import { track } from '@/lib/analytics/track'
import { buildBeginCheckoutEvent } from '@/lib/analytics/events'

export function CartPopup() {
  const { cart, isOpen, closeCart, removeItem, updateItem } = useCart()
  const lines = cart?.lines.nodes ?? []
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const panel = panelRef.current
    if (!panel) return

    const focusable = panel.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea, [tabindex]:not([tabindex="-1"])',
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    first?.focus()

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        closeCart()
        return
      }
      if (e.key === 'Tab' && focusable.length > 0) {
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last?.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first?.focus()
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, closeCart])
```

Then update the panel `<div>` to carry dialog semantics and be hidden from the tab order/AT when closed:

```tsx
      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal={isOpen}
        aria-hidden={!isOpen}
        inert={!isOpen ? true : undefined}
        className={`fixed inset-y-0 right-0 w-full max-w-[440px] bg-white z-50 flex flex-col shadow-xl transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-label="Shopping cart"
      >
```

`inert` (a native HTML attribute, supported in React 19/Next 16's DOM typings) removes the entire subtree from the tab order and AT tree when the cart is closed, which is what actually fixes the "focusable while invisible" bug — `aria-hidden` alone doesn't block keyboard focus.

- [ ] **Step 2: Add `type="button"` to every button in the panel**

Add `type="button"` to: the close button (`aria-label="Close cart"`), the empty-state "Continue Shopping" button, both qty stepper buttons, the remove-item button, and the footer "Continue Shopping" button. Leave the checkout `<a>` as-is (it's a link, not a button).

Example for the close button — change:
```tsx
          <button
            onClick={closeCart}
            className="text-gray-500 hover:text-navy-900 transition-colors"
            aria-label="Close cart"
          >
```
To:
```tsx
          <button
            type="button"
            onClick={closeCart}
            className="text-gray-500 hover:text-navy-900 transition-colors"
            aria-label="Close cart"
          >
```

Apply the same `type="button"` addition to the other 5 buttons in the file (empty-state Continue Shopping, qty decrease, qty increase, remove item, footer Continue Shopping).

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no output. If the TypeScript DOM lib bundled with this Next/React version doesn't yet type `inert` on `HTMLAttributes`, use `{...{ inert: !isOpen ? true : undefined }}` spread instead to bypass the type check without `any`.

- [ ] **Step 4: Manual smoke check**

```bash
npm run dev
```
Open any page, click the cart icon, confirm: focus lands inside the panel, Tab cycles only through panel controls, Shift+Tab wraps backward, Escape closes it and (per existing `CartProvider` behavior) nothing crashes. Then with the cart closed, Tab through the page and confirm cart-panel buttons are skipped entirely.

- [ ] **Step 5: Commit**

```bash
git add components/store/CartPopup.tsx
git commit -m "a11y: give CartPopup real dialog semantics — focus trap, Escape, inert when closed, type=button sweep"
```

---

### Task 5: `FilterDrawer` dialog semantics

**Files:**
- Modify: `components/category/FilterDrawer.tsx`

The mobile filter drawer has a backdrop + slide-over panel but no `role="dialog"`, no focus trap, and no Escape handling — same category of bug as Task 4, smaller surface (it unmounts when closed via `{open && (...)}` so there's no "focusable while hidden" issue, just missing keyboard/AT semantics).

- [ ] **Step 1: Add dialog role, focus trap, and Escape handling**

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { X, SlidersHorizontal } from 'lucide-react'
import type { CollectionFilter } from '@/lib/shopify/types'
import { CategoryFilters } from '@/components/category/CategoryFilters'

interface Props {
  filters: CollectionFilter[]
  activeFilters: string[]
  currentSort?: string
}

export function FilterDrawer({ filters, activeFilters, currentSort }: Props) {
  const [open, setOpen] = useState(false)
  const count = activeFilters.length
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const panel = panelRef.current
    if (!panel) return

    const focusable = panel.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea, [tabindex]:not([tabindex="-1"])',
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    first?.focus()

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
        return
      }
      if (e.key === 'Tab' && focusable.length > 0) {
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last?.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first?.focus()
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open])

  return (
    <>
      {/* Trigger — mobile only */}
      <div className="lg:hidden mb-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 border border-navy-900 text-navy-900 text-[14px] font-semibold px-4 h-[40px] hover:bg-neutral-50 transition-colors"
        >
          <SlidersHorizontal size={15} />
          {count > 0 ? `Filters (${count})` : 'Filters'}
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          {/* Drawer panel */}
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
            className="absolute inset-y-0 left-0 w-full max-w-[320px] bg-white flex flex-col shadow-xl"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <span className="text-navy-900 text-[16px] font-semibold">
                Filters
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close filters"
              >
                <X size={20} className="text-navy-900" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-6">
              <CategoryFilters
                filters={filters}
                activeFilters={activeFilters}
                currentSort={currentSort}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add components/category/FilterDrawer.tsx
git commit -m "a11y: give mobile FilterDrawer dialog role, focus trap, and Escape handling"
```

---

### Task 6: Respect `prefers-reduced-motion` sitewide (menus, dialogs, galleries)

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`
- Test: `__tests__/reduced-motion.test.ts`

Two sitewide fixes cover everything instead of touching every animated component:
1. A global CSS override collapses all Tailwind `transition-*`/`animate-*` durations for users with `prefers-reduced-motion: reduce` — this covers the Header's dropdown chevrons, mobile menu, hover states, `CartPopup`/`FilterDrawer`/`QuickAddModal` slide/fade transitions, and `ProductGallery` border-color transitions.
2. `framer-motion`'s `<MotionConfig reducedMotion="user">` wrapping the app disables/shortens every `motion.*`-driven animation (`FadeIn`, `AnimatedArrow`, `AnimatedOCCHeroSection`, `AnimatedOCCProducts`) for the same users — `framer-motion` animations run via the Web Animations API/JS, so the CSS override alone doesn't reach them.

- [ ] **Step 1: Write the failing tests**

```typescript
// __tests__/reduced-motion.test.ts
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

function read(file: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', file), 'utf-8')
}

describe('prefers-reduced-motion is respected sitewide', () => {
  it('globals.css has a prefers-reduced-motion override', () => {
    expect(read('app/globals.css')).toMatch(/@media \(prefers-reduced-motion: reduce\)/)
  })

  it('root layout wraps the app in MotionConfig reducedMotion="user"', () => {
    const src = read('app/layout.tsx')
    expect(src).toMatch(/MotionConfig/)
    expect(src).toMatch(/reducedMotion=["']user["']/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/reduced-motion.test.ts`
Expected: FAIL (2/2) — neither fix exists yet.

- [ ] **Step 3: Add the CSS override to `app/globals.css`**

Append after the existing `:focus-visible` rule (added in B6):

```css
/* Respect prefers-reduced-motion — WCAG 2.3.3 */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 4: Wrap the app in `MotionConfig` in `app/layout.tsx`**

Add the import:
```typescript
import { MotionConfig } from 'framer-motion'
```

Wrap the existing `<CartProvider>` subtree (the part containing `Header`, `children`, `Footer`, `CartPopup`):

```tsx
        <MotionConfig reducedMotion="user">
          <CartProvider initialCart={initialCart}>
            <Header menuItems={menuItems} collections={collections} />
            {children}
            <Footer
              collections={collections}
              availableCountries={availableCountries}
              currentCountry={currentCountry}
            />
            <CartPopup />
          </CartProvider>
        </MotionConfig>
```

`MotionConfig` is a client-side context provider; `app/layout.tsx` is a server component, but `MotionConfig` (like `CartProvider`) can still be rendered from a server component as long as it doesn't require server-only children to be client components themselves — `framer-motion`'s `MotionConfig` is explicitly designed to wrap arbitrary subtrees this way (same pattern as wrapping with a client-side context provider for theme/locale). If the build reports a server/client boundary error here, add `'use client'` is not an option for `layout.tsx` itself — instead create a tiny wrapper:

```typescript
// components/providers/MotionConfigProvider.tsx
'use client'

import type { ReactNode } from 'react'
import { MotionConfig } from 'framer-motion'

export function MotionConfigProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
```

and use `<MotionConfigProvider>` in place of `<MotionConfig reducedMotion="user">` in `app/layout.tsx`, importing it from `@/components/providers/MotionConfigProvider`. Try the direct `MotionConfig` import first; fall back to the wrapper only if the build fails.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run __tests__/reduced-motion.test.ts`
Expected: PASS (2/2)

- [ ] **Step 6: Verify build**

```bash
npm run build
```
Expected: clean compile.

- [ ] **Step 7: Manual smoke check**

In Chrome DevTools: Rendering tab → "Emulate CSS media feature prefers-reduced-motion: reduce". Reload the homepage and confirm the `FadeIn` hero entrance no longer animates (content appears instantly), and the Header's dropdown/mobile-menu open/close no longer slides/fades.

- [ ] **Step 8: Commit**

```bash
git add app/globals.css app/layout.tsx __tests__/reduced-motion.test.ts
git commit -m "a11y: respect prefers-reduced-motion sitewide via CSS override + framer-motion MotionConfig"
```

(If Step 4's fallback wrapper was needed, also `git add components/providers/MotionConfigProvider.tsx`.)

---

### Task 7: axe scan + manual keyboard/screen-reader checklist across all 8 routes

**Files:**
- Create: `scripts/run-axe-audit.sh`
- Create: `audit/AXE-REPORT.md`

Ad hoc scan via `npx @axe-core/cli` (no new project dependency — mirrors B6's `npx lighthouse` precedent). The committed, CI-integrated axe suite lives in the separate test-infrastructure plan; this script is for the one-time pre-launch sweep the ticket asks for.

- [ ] **Step 1: Create `scripts/run-axe-audit.sh`**

```bash
#!/usr/bin/env bash
# axe-core scan across the 8 ticket routes.
# Usage: npm run dev (in another terminal), then ./scripts/run-axe-audit.sh
# Requires: npx (pulls @axe-core/cli on demand, no project dependency added).

set -e
OUTDIR="audit/axe"
mkdir -p "$OUTDIR"
BASE="${BASE:-http://localhost:3000}"

routes=(
  "/:home"
  "/category/gloves:category"
  "/product/nitrile-exam-gloves-powder-free:pdp"
  "/solutions/occ:occ"
  "/industries/pharmacy:industry"
  "/blog/types-of-needles:blog"
  "/cart:cart"
  "/account:account"
)

for entry in "${routes[@]}"; do
  route="${entry%%:*}"
  slug="${entry##*:}"
  echo "Scanning $BASE$route -> $OUTDIR/$slug.json"
  npx --yes @axe-core/cli "$BASE$route" \
    --save "$OUTDIR/$slug.json" \
    --tags wcag2a,wcag2aa \
    || echo "  WARNING: scan failed or found violations: $route"
done

echo ""
echo "Done. Reports in $OUTDIR/"
```

- [ ] **Step 2: Make it executable and run it locally**

```bash
chmod +x scripts/run-axe-audit.sh
npm run dev &
sleep 5
./scripts/run-axe-audit.sh
```

- [ ] **Step 3: Create `audit/AXE-REPORT.md`, transcribing the script's findings**

```markdown
# Accessibility Audit Report (axe-core) — Track A Routes

**Date:** 2026-06-23
**Scope:** home, category, PDP, OCC, industry, blog, cart, account
**Tool:** `npx @axe-core/cli` against `localhost:3000` (`wcag2a`, `wcag2aa` tags)

## Automated scan results

| Route | Violations | Notes |
|---|---|---|
| `/` (home) | — | Fill in from `audit/axe/home.json` |
| `/category/[slug]` | — | Fill in from `audit/axe/category.json` |
| `/product/[slug]` | — | Fill in from `audit/axe/pdp.json` |
| `/solutions/occ` | — | Fill in from `audit/axe/occ.json` |
| `/industries/[slug]` | — | Fill in from `audit/axe/industry.json` |
| `/blog/[handle]` | — | Fill in from `audit/axe/blog.json` |
| `/cart` | — | Fill in from `audit/axe/cart.json` — note: this route is a placeholder ("Cart coming soon"); the real cart UI is the `CartPopup` slide-over reachable from any page's header, scan that interaction manually (see below). |
| `/account` | — | Fill in from `audit/axe/account.json` |

axe-core cannot drive the `CartPopup`/`QuickAddModal`/`FilterDrawer`/Header-mobile-menu open states from a static page load — those need either the committed Playwright+axe E2E suite (test-infrastructure plan) or the manual pass below.

## Manual keyboard navigation checklist

Run through each on a real keyboard, no mouse:

- [ ] Skip link: press Tab once on page load, "Skip to main content" appears, Enter jumps focus into `<main id="main-content">`.
- [ ] Header: Tab reaches Categories/nav links, Enter/Space opens dropdowns, Escape closes them, focus doesn't get trapped.
- [ ] Mobile menu (resize <768px): hamburger button opens the drawer, Tab cycles through its links, closing returns focus to the hamburger.
- [ ] Search overlay: opening it focuses the input, Escape closes it.
- [ ] Cart panel: open via header cart icon, focus lands inside, Tab/Shift+Tab cycles only within the panel, Escape closes it, and with it closed the panel's buttons are unreachable by Tab (see Task 4).
- [ ] Filter drawer (mobile category page): same focus-trap/Escape checks as cart.
- [ ] Quick add modal (product card hover/click): focus-trap/Escape checks (already implemented pre-ticket — verify still holds).
- [ ] PDP gallery thumbnails: each thumbnail is reachable and selectable via Tab + Enter/Space.
- [ ] FAQ accordion (industry pages): Tab reaches each question, Enter/Space toggles, `aria-expanded` updates.
- [ ] Forms (contact, account login/orders): every field has a visible focus ring (`:focus-visible` teal outline) and a programmatic label.

## Manual screen reader spot-check (at least one of NVDA/VoiceOver/JAWS)

- [ ] Home: landmark navigation announces header, main, footer; H1 announced once.
- [ ] PDP: product title, price, and Add to Cart button are announced clearly; quantity stepper buttons announce "Decrease quantity"/"Increase quantity".
- [ ] Cart panel: opening it is announced (consider adding `aria-live` confirmation on add-to-cart in a follow-up if not already present); line items are announced with product name, quantity, and price.
- [ ] Account: logged-out vs. logged-in states are distinguishable by a screen reader user (form fields labeled, no orphaned buttons).

**This checklist requires a human with a screen reader to execute — flag remaining unchecked items back to Sardorbek before launch sign-off.**
```

- [ ] **Step 4: Fill in the automated table from the JSON output, then work the manual checklist**

Read each `audit/axe/*.json`, transcribe violation counts/descriptions into the table. Walk the manual keyboard checklist yourself in a real browser (this can be done without special hardware) and check off what passes; leave screen-reader items for a human pass and say so explicitly in the report (do not claim screen-reader verification without actually running one).

- [ ] **Step 5: Commit**

```bash
git add scripts/run-axe-audit.sh audit/AXE-REPORT.md audit/axe
git commit -m "a11y: add axe-core audit script + report covering all 8 ticket routes; manual keyboard checklist"
```

---

### Task 8: Final verification

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run
```
Expected: all tests pass, including every test added in Tasks 1, 6.

- [ ] **Step 2: Run full build**

```bash
npm run build
```
Expected: clean compile.

- [ ] **Step 3: TypeScript strict check**

```bash
npx tsc --noEmit
```
Expected: no output.
