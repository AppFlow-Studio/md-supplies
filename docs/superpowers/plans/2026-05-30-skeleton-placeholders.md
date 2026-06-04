# Skeleton Placeholders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `loading.tsx` skeleton screens to all five routes that fetch live Shopify API data, so users see a pulsing gray placeholder layout instead of a blank page while the server fetches data.

**Architecture:** One `loading.tsx` per route — Next.js App Router automatically wraps each in Suspense and shows the skeleton while the page's async function runs. A shared `Skeleton` primitive (`components/ui/Skeleton.tsx`) powers all five files. No changes to existing page components.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS 4, TypeScript

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `components/ui/Skeleton.tsx` | Create | Base `animate-pulse bg-gray-200` block used by all loaders |
| `app/loading.tsx` | Create | Home page skeleton (PopularCategories + PopularProducts) |
| `app/product/[slug]/loading.tsx` | Create | Product detail skeleton (gallery + info + related) |
| `app/blog/loading.tsx` | Create | Blog listing skeleton (9-card grid) |
| `app/blog/[handle]/loading.tsx` | Create | Blog article skeleton (hero + body + more articles) |
| `app/category/[slug]/loading.tsx` | Create | Category page skeleton (sidebar + 12-product grid) |

---

## Task 1: Base Skeleton primitive

**Files:**
- Create: `components/ui/Skeleton.tsx`

- [ ] **Step 1: Create the file**

```tsx
interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`animate-pulse bg-gray-200 ${className}`} />;
}
```

- [ ] **Step 2: Verify TypeScript is happy**

```bash
cd /Users/munistursunov/Projects/APPFLOW_STUDIO/md-supplies && npx tsc --noEmit
```

Expected: no errors (or only pre-existing errors unrelated to Skeleton.tsx).

- [ ] **Step 3: Commit**

```bash
git add components/ui/Skeleton.tsx
git commit -m "feat: add base Skeleton primitive"
```

---

## Task 2: Home page skeleton

**Files:**
- Create: `app/loading.tsx`

The home page fetches 4 best-selling products and 8 collections. Static sections (HeroSection, TrustedBrands, ShopByIndustry, WhyChooseUs, WholesalePricing) take no props and are rendered as-is. Only PopularCategories and PopularProducts are skeletonised.

- [ ] **Step 1: Create `app/loading.tsx`**

```tsx
import { HeroSection }      from "@/components/home/HeroSection";
import { TrustedBrands }    from "@/components/home/TrustedBrands";
import { ShopByIndustry }   from "@/components/home/ShopByIndustry";
import { WhyChooseUs }      from "@/components/home/WhyChooseUs";
import { WholesalePricing } from "@/components/home/WholesalePricing";
import { Skeleton }         from "@/components/ui/Skeleton";

export default function HomeLoading() {
  return (
    <main>
      <HeroSection />
      <TrustedBrands />
      <ShopByIndustry />

      {/* PopularCategories skeleton */}
      <section className="w-full bg-white">
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-14 md:py-16">
          <div className="flex items-center justify-between mb-8">
            <Skeleton className="h-8 w-52" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-[1px] border border-[rgba(0,0,0,0.08)] bg-[rgba(0,0,0,0.08)]">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white flex flex-col items-center justify-center gap-4 py-10 px-4">
                <Skeleton className="w-[50px] h-[50px] rounded-xl" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PopularProducts skeleton */}
      <section className="w-full bg-neutral-50">
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-14 md:py-16">
          <Skeleton className="h-8 w-52 mb-8" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white flex flex-col">
                <Skeleton className="aspect-square w-full" />
                <div className="flex flex-col gap-2 p-3">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-6 w-20 mt-1" />
                  <Skeleton className="h-9 w-full mt-2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <WhyChooseUs />
      <WholesalePricing />
    </main>
  );
}
```

- [ ] **Step 2: Run dev and verify**

```bash
npm run dev
```

Navigate to `http://localhost:3000`. On a slow connection (DevTools → Network → Slow 3G) or by temporarily adding `await new Promise(r => setTimeout(r, 3000))` at the top of `app/page.tsx`'s `Home` function, you should see the skeleton appear before the real content loads.

Expected: HeroSection, TrustedBrands, ShopByIndustry render immediately; below them, pulsing gray boxes appear for the categories grid (8 cells) and products grid (4 cards); then WhyChooseUs and WholesalePricing render.

- [ ] **Step 3: Commit**

```bash
git add app/loading.tsx
git commit -m "feat: add home page skeleton loading state"
```

---

## Task 3: Product detail skeleton

**Files:**
- Create: `app/product/[slug]/loading.tsx`

Mirrors the two-column ProductView layout: image gallery on the left, product info on the right, tabs section below, related products strip at the bottom.

- [ ] **Step 1: Create `app/product/[slug]/loading.tsx`**

```tsx
import { Skeleton } from "@/components/ui/Skeleton";

export default function ProductLoading() {
  return (
    <main className="bg-[#f9fafc]">
      {/* Breadcrumb */}
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-5">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-10" />
          <span className="text-gray-300">›</span>
          <Skeleton className="h-4 w-28" />
        </div>
      </div>

      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-8">
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Left: image gallery */}
          <div className="w-full lg:w-[520px] shrink-0 flex flex-col gap-3">
            <Skeleton className="aspect-square w-full" />
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="w-[70px] h-[70px]" />
              ))}
            </div>
          </div>

          {/* Right: product info */}
          <div className="flex-1 flex flex-col gap-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-9 w-3/4" />
            <Skeleton className="h-9 w-32" />
            <div className="flex gap-2 mt-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-20" />
              ))}
            </div>
            <div className="flex gap-3 mt-4">
              <Skeleton className="h-12 w-32" />
              <Skeleton className="h-12 flex-1" />
            </div>
            <div className="flex gap-6 mt-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-24" />
              ))}
            </div>
          </div>
        </div>

        {/* Tabs bar */}
        <div className="flex gap-8 mt-12 border-b border-gray-200">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-28 mb-3" />
          ))}
        </div>

        {/* Tab body */}
        <div className="mt-6 flex flex-col gap-3 max-w-[760px]">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className={`h-4 ${i % 4 === 3 ? 'w-2/3' : 'w-full'}`} />
          ))}
        </div>
      </div>

      {/* Related products */}
      <section className="bg-white border-t border-gray-200 mt-10">
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-14">
          <Skeleton className="h-7 w-48 mb-8" />
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col bg-neutral-50 flex-1 min-w-[160px]">
                <Skeleton className="aspect-square w-full" />
                <div className="px-4 pt-3 pb-4 flex flex-col gap-2">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Verify visually**

Navigate to any product URL, e.g. `http://localhost:3000/product/[any-handle]`. On Slow 3G or with a temporary delay in `app/product/[slug]/page.tsx`, verify the two-column skeleton appears with a large image square on the left and info stubs on the right.

- [ ] **Step 3: Commit**

```bash
git add app/product/\[slug\]/loading.tsx
git commit -m "feat: add product detail skeleton loading state"
```

---

## Task 4: Blog listing skeleton

**Files:**
- Create: `app/blog/loading.tsx`

The page header (teal label, "Blog" h1, description text) is static HTML — reproduce it exactly so there's no flash. Skeleton only covers the article grid.

- [ ] **Step 1: Create `app/blog/loading.tsx`**

```tsx
import { WholesalePricing } from "@/components/home/WholesalePricing";
import { Skeleton }         from "@/components/ui/Skeleton";

export default function BlogLoading() {
  return (
    <main>
      {/* Static page header — identical to real page, no API dependency */}
      <section className="w-full bg-neutral-100">
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 pt-16 md:pt-20 lg:pt-24 pb-12 md:pb-16">
          <p className="text-teal-500 text-[13px] sm:text-[15px] font-semibold tracking-[0.75px] uppercase mb-4">
            Resources &amp; Insights
          </p>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <h1 className="text-[40px] sm:text-[50px] font-semibold text-navy-900 leading-[1.1] tracking-tight">
              Blog
            </h1>
            <p className="text-gray-500 text-[15px] leading-[1.65] max-w-[420px]">
              Tips, guides, and industry updates for healthcare professionals and facility managers.
            </p>
          </div>
        </div>
      </section>

      {/* Blog grid skeleton */}
      <section className="w-full bg-neutral-100">
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 pb-20 md:pb-24">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-[22px]">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-3 mb-10">
                <Skeleton className="aspect-[16/9] w-full" />
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <WholesalePricing />
    </main>
  );
}
```

- [ ] **Step 2: Verify visually**

Navigate to `http://localhost:3000/blog`. Verify: the Blog header renders immediately with real text, and below it 9 card skeletons (16:9 image + 3 text lines) pulse in a 3-column grid.

- [ ] **Step 3: Commit**

```bash
git add app/blog/loading.tsx
git commit -m "feat: add blog listing skeleton loading state"
```

---

## Task 5: Blog article skeleton

**Files:**
- Create: `app/blog/[handle]/loading.tsx`

Mirrors: breadcrumb → full-width hero banner → article meta + body text lines → "More Articles" 3-card grid.

- [ ] **Step 1: Create `app/blog/[handle]/loading.tsx`**

```tsx
import { WholesalePricing } from "@/components/home/WholesalePricing";
import { Skeleton }         from "@/components/ui/Skeleton";

export default function ArticleLoading() {
  return (
    <main className="bg-[#f9fafc]">
      {/* Breadcrumb */}
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-5">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-10" />
          <span className="text-gray-300">›</span>
          <Skeleton className="h-4 w-10" />
          <span className="text-gray-300">›</span>
          <Skeleton className="h-4 w-48" />
        </div>
      </div>

      {/* Hero banner */}
      <Skeleton className="w-full h-[280px] sm:h-[380px]" />

      {/* Article content */}
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-12">
        <div className="max-w-[760px]">
          {/* Meta row: date + author */}
          <div className="flex items-center gap-5 mb-8 flex-wrap">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-28" />
          </div>
          {/* Body text lines — every 5th line is shorter to look natural */}
          <div className="flex flex-col gap-3">
            {Array.from({ length: 14 }).map((_, i) => (
              <Skeleton key={i} className={`h-4 ${i % 5 === 4 ? 'w-2/3' : 'w-full'}`} />
            ))}
          </div>
        </div>
      </div>

      {/* More articles */}
      <section className="bg-white border-t border-gray-200">
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-14">
          <Skeleton className="h-7 w-36 mb-8" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-[22px] gap-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-3">
                <Skeleton className="aspect-[16/9] w-full" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <WholesalePricing />
    </main>
  );
}
```

- [ ] **Step 2: Verify visually**

Navigate to any blog article, e.g. `http://localhost:3000/blog/[any-handle]`. Verify: breadcrumb pills → dark hero rectangle → date/author stubs → 14 text lines → 3 more-article cards all pulse gray.

- [ ] **Step 3: Commit**

```bash
git add "app/blog/[handle]/loading.tsx"
git commit -m "feat: add blog article skeleton loading state"
```

---

## Task 6: Category page skeleton

**Files:**
- Create: `app/category/[slug]/loading.tsx`

Mirrors: breadcrumb → full-width hero banner → sidebar (desktop) with 5 filter groups → product grid (12 cards, 3 cols on xl).

- [ ] **Step 1: Create `app/category/[slug]/loading.tsx`**

```tsx
import { Skeleton } from "@/components/ui/Skeleton";

export default function CategoryLoading() {
  return (
    <main className="bg-[#f9fafc] min-h-screen">
      {/* Breadcrumb */}
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-5">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-10" />
          <span className="text-gray-300">›</span>
          <Skeleton className="h-4 w-32" />
        </div>
      </div>

      {/* Hero banner */}
      <Skeleton className="w-full h-[220px] sm:h-[280px]" />

      {/* Main layout */}
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-8 flex gap-0 items-start">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-[280px] shrink-0 pr-10">
          <Skeleton className="h-5 w-20 mb-6" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="mb-7">
              <Skeleton className="h-4 w-28 mb-3" />
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="flex items-center gap-2 mb-2.5">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          ))}
        </aside>

        {/* Product grid */}
        <div className="flex-1 min-w-0">
          {/* Sort bar */}
          <div className="flex justify-end mb-6">
            <Skeleton className="h-9 w-40" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-[23px]">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="flex flex-col bg-neutral-50">
                <Skeleton className="aspect-square w-full" />
                <div className="px-4 pt-3 pb-4 flex flex-col gap-2">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify visually**

Navigate to any category, e.g. `http://localhost:3000/category/[any-handle]`. Verify: breadcrumb pills → dark banner → on desktop a sidebar with 5 filter groups → 12 product card skeletons in a 3-column grid.

- [ ] **Step 3: Commit**

```bash
git add "app/category/[slug]/loading.tsx"
git commit -m "feat: add category page skeleton loading state"
```

---

## Final check

- [ ] Run `npx tsc --noEmit` — confirm zero new TypeScript errors.
- [ ] Test all five routes with Slow 3G in Chrome DevTools — confirm skeletons appear on every route before real content loads.
