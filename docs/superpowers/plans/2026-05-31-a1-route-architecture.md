# A1 Route Architecture Completion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the A1 ticket by adding the typed route map, 7 missing route stubs, 4 noindex utility routes, a branded 404 page, and a 410 proxy hook — without touching any Shopify API or existing template content.

**Architecture:** All new pages are thin stubs that inherit the root layout (`app/layout.tsx`) and call `notFound()` or render a minimal placeholder. The typed route map in `lib/routes.ts` is the single source of truth for all internal URLs. The 410 hook uses Next.js 16's `proxy.ts` convention (renamed from `middleware.ts`).

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Create | `lib/routes.ts` | Typed URL constants — day-1 contract for Munis |
| Create | `app/categories/page.tsx` | Categories hub stub (A3 fills) |
| Create | `app/contact/page.tsx` | Contact page stub |
| Create | `app/returns/page.tsx` | Returns page stub |
| Create | `app/solutions/occ/page.tsx` | OCC page stub (B4 fills) |
| Create | `app/category/[slug]/[sub]/page.tsx` | Subcategory stub (A2 fills) |
| Create | `app/partners/[slug]/page.tsx` | Partner detail stub (B4 fills) |
| Create | `app/policies/[slug]/page.tsx` | Policy page stub |
| Create | `app/(noindex)/cart/page.tsx` | Cart — noindex utility |
| Create | `app/(noindex)/account/page.tsx` | Account — noindex utility |
| Create | `app/(noindex)/account/login/page.tsx` | Login — noindex utility |
| Create | `app/(noindex)/account/orders/page.tsx` | Orders — noindex utility |
| Create | `app/not-found.tsx` | Branded 404 page |
| Create | `proxy.ts` | 410 Gone hook (Next.js 16 convention) |
| Modify | `app/search/page.tsx` | Add `robots: noindex` to `generateMetadata` |
| Modify | `app/industries/page.tsx` | Fix `/occ` link → `/solutions/occ` |

---

## Task 1: Typed Route Map

**Files:**
- Create: `lib/routes.ts`

- [ ] **Step 1: Create `lib/routes.ts`**

```ts
export const ROUTES = {
  home: '/',
  categories: '/categories',
  category: (slug: string) => `/category/${slug}`,
  subcategory: (cat: string, sub: string) => `/category/${cat}/${sub}`,
  product: (slug: string) => `/product/${slug}`,
  partners: '/partners',
  partner: (slug: string) => `/partners/${slug}`,
  brands: '/brands',
  brand: (slug: string) => `/brands/${slug}`,
  industries: '/industries',
  industry: (slug: string) => `/industries/${slug}`,
  solutions: { occ: '/solutions/occ' },
  blog: '/blog',
  article: (slug: string) => `/blog/${slug}`,
  search: '/search',
  cart: '/cart',
  account: '/account',
  accountLogin: '/account/login',
  accountOrders: '/account/orders',
  contact: '/contact',
  returns: '/returns',
  policy: (slug: string) => `/policies/${slug}`,
  about: '/about',
  faq: '/faq',
} as const
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add lib/routes.ts
git commit -m "feat(a1): add typed route map"
```

---

## Task 2: Static Stub Pages

Four pages with no dynamic segments. Each renders a minimal placeholder with a correct `<h1>` and metadata so crawlers see useful content when data eventually lands.

**Files:**
- Create: `app/categories/page.tsx`
- Create: `app/contact/page.tsx`
- Create: `app/returns/page.tsx`
- Create: `app/solutions/occ/page.tsx`

- [ ] **Step 1: Create `app/categories/page.tsx`**

```tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'All Categories | MD Supplies',
  description: 'Browse all medical supply categories at wholesale prices.',
}

export default function CategoriesPage() {
  return (
    <main className="bg-[#f9fafc] min-h-screen">
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-14">
        <h1 className="text-navy-900 text-[32px] font-bold">All Categories</h1>
        <p className="text-gray-500 text-[15px] mt-2">Coming soon.</p>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Create `app/contact/page.tsx`**

```tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact Us | MD Supplies',
  description: 'Get in touch with the MD Supplies team for wholesale inquiries.',
}

export default function ContactPage() {
  return (
    <main className="bg-[#f9fafc] min-h-screen">
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-14">
        <h1 className="text-navy-900 text-[32px] font-bold">Contact Us</h1>
        <p className="text-gray-500 text-[15px] mt-2">Coming soon.</p>
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Create `app/returns/page.tsx`**

```tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Returns | MD Supplies',
  description: 'MD Supplies return policy and return request instructions.',
}

export default function ReturnsPage() {
  return (
    <main className="bg-[#f9fafc] min-h-screen">
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-14">
        <h1 className="text-navy-900 text-[32px] font-bold">Returns</h1>
        <p className="text-gray-500 text-[15px] mt-2">Coming soon.</p>
      </div>
    </main>
  )
}
```

- [ ] **Step 4: Create `app/solutions/occ/page.tsx`**

Note: Next.js will create `/solutions/occ` from this file. No `app/solutions/page.tsx` is needed — the `/solutions` path itself is not in the route map.

```tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'OCC Program | MD Supplies',
  description: 'Free shipping on all OCC-eligible medical supplies for qualifying facilities.',
}

export default function OccPage() {
  return (
    <main className="bg-[#f9fafc] min-h-screen">
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-14">
        <h1 className="text-navy-900 text-[32px] font-bold">OCC Program</h1>
        <p className="text-gray-500 text-[15px] mt-2">Coming soon.</p>
      </div>
    </main>
  )
}
```

- [ ] **Step 5: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add app/categories/page.tsx app/contact/page.tsx app/returns/page.tsx app/solutions/occ/page.tsx
git commit -m "feat(a1): add static stub pages (categories, contact, returns, solutions/occ)"
```

---

## Task 3: Dynamic Route Stubs

Three pages with URL params. They call `notFound()` immediately — the route exists and is crawlable, but serves a 404 until A2 or B4 fills the real content.

**Files:**
- Create: `app/category/[slug]/[sub]/page.tsx`
- Create: `app/partners/[slug]/page.tsx`
- Create: `app/policies/[slug]/page.tsx`

**Note on naming:** The existing parent folder is `app/category/[slug]/`. The subcategory level uses `[sub]` so the combined params are `{ slug: string; sub: string }` — clean TypeScript without bracket-escaped keys.

- [ ] **Step 1: Create `app/category/[slug]/[sub]/page.tsx`**

```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ slug: string; sub: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, sub } = await params
  return {
    title: `${sub} — ${slug} | MD Supplies`,
  }
}

export default async function SubcategoryPage({ params }: Props) {
  await params
  notFound()
}
```

- [ ] **Step 2: Create `app/partners/[slug]/page.tsx`**

```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  return {
    title: `${slug} | Partners | MD Supplies`,
  }
}

export default async function PartnerPage({ params }: Props) {
  await params
  notFound()
}
```

- [ ] **Step 3: Create `app/policies/[slug]/page.tsx`**

```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  return {
    title: `${slug} | MD Supplies`,
  }
}

export default async function PolicyPage({ params }: Props) {
  await params
  notFound()
}
```

- [ ] **Step 4: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add "app/category/[slug]/[sub]/page.tsx" "app/partners/[slug]/page.tsx" "app/policies/[slug]/page.tsx"
git commit -m "feat(a1): add dynamic route stubs (subcategory, partners/[slug], policies/[slug])"
```

---

## Task 4: Noindex Utility Routes + Fix /search

Four utility pages that must never appear in search results. They live in `app/(noindex)/` — a Next.js route group. The parentheses are part of the folder name but are **excluded from the URL**. `/cart`, `/account`, `/account/login`, and `/account/orders` all inherit the root layout automatically.

Also fix the existing `/search` page to export `robots: noindex`.

**Files:**
- Create: `app/(noindex)/cart/page.tsx`
- Create: `app/(noindex)/account/page.tsx`
- Create: `app/(noindex)/account/login/page.tsx`
- Create: `app/(noindex)/account/orders/page.tsx`
- Modify: `app/search/page.tsx` (add robots to `generateMetadata`)

- [ ] **Step 1: Create `app/(noindex)/cart/page.tsx`**

```tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cart | MD Supplies',
  robots: { index: false, follow: false },
}

export default function CartPage() {
  return (
    <main className="bg-[#f9fafc] min-h-screen">
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-14">
        <h1 className="text-navy-900 text-[32px] font-bold">Your Cart</h1>
        <p className="text-gray-500 text-[15px] mt-2">Cart coming soon.</p>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Create `app/(noindex)/account/page.tsx`**

```tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'My Account | MD Supplies',
  robots: { index: false, follow: false },
}

export default function AccountPage() {
  return (
    <main className="bg-[#f9fafc] min-h-screen">
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-14">
        <h1 className="text-navy-900 text-[32px] font-bold">My Account</h1>
        <p className="text-gray-500 text-[15px] mt-2">Account coming soon.</p>
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Create `app/(noindex)/account/login/page.tsx`**

```tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In | MD Supplies',
  robots: { index: false, follow: false },
}

export default function AccountLoginPage() {
  return (
    <main className="bg-[#f9fafc] min-h-screen">
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-14">
        <h1 className="text-navy-900 text-[32px] font-bold">Sign In</h1>
        <p className="text-gray-500 text-[15px] mt-2">Account login coming soon.</p>
      </div>
    </main>
  )
}
```

- [ ] **Step 4: Create `app/(noindex)/account/orders/page.tsx`**

```tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Order History | MD Supplies',
  robots: { index: false, follow: false },
}

export default function AccountOrdersPage() {
  return (
    <main className="bg-[#f9fafc] min-h-screen">
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-14">
        <h1 className="text-navy-900 text-[32px] font-bold">Order History</h1>
        <p className="text-gray-500 text-[15px] mt-2">Order history coming soon.</p>
      </div>
    </main>
  )
}
```

- [ ] **Step 5: Fix `/search` noindex — modify `app/search/page.tsx`**

Find the `generateMetadata` function (currently lines 22–27) and add `robots`:

```tsx
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams
  return {
    title: q ? `"${q}" — Search | MD Supplies` : 'Search | MD Supplies',
    robots: { index: false, follow: false },
  }
}
```

- [ ] **Step 6: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add "app/(noindex)/cart/page.tsx" "app/(noindex)/account/page.tsx" "app/(noindex)/account/login/page.tsx" "app/(noindex)/account/orders/page.tsx" app/search/page.tsx
git commit -m "feat(a1): add noindex utility routes and fix search robots meta"
```

---

## Task 5: Branded 404 Page

**Files:**
- Create: `app/not-found.tsx`

The root `app/not-found.tsx` handles both explicit `notFound()` throws from any route segment AND any URL that doesn't match a route. It inherits the root layout (Header/Footer present).

- [ ] **Step 1: Create `app/not-found.tsx`**

```tsx
import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="bg-[#f9fafc] min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <p className="text-teal-500 text-[15px] font-semibold tracking-[0.75px] uppercase mb-4">
        Error 404
      </p>
      <h1 className="text-navy-900 text-[60px] sm:text-[80px] font-bold leading-none mb-4">
        Page Not Found
      </h1>
      <p className="text-gray-500 text-[18px] max-w-[480px] leading-[1.65] mb-10">
        The page you&#39;re looking for doesn&#39;t exist or has been moved.
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href="/"
          className="bg-navy-900 text-white text-[18px] font-semibold px-8 h-[56px] flex items-center justify-center hover:bg-navy-950 transition-colors"
        >
          Go Home
        </Link>
        <Link
          href="/categories"
          className="border border-navy-900 text-navy-900 text-[18px] font-semibold px-8 h-[56px] flex items-center justify-center hover:bg-neutral-50 transition-colors"
        >
          Browse Categories
        </Link>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add app/not-found.tsx
git commit -m "feat(a1): add branded 404 page"
```

---

## Task 6: 410 Proxy Hook

**Files:**
- Create: `proxy.ts` (project root, same level as `next.config.ts`)

In Next.js 16, `middleware.ts` is deprecated. The file is now `proxy.ts` and the exported function is named `proxy`. Returning a plain `Response` with status 410 is valid — no `NextResponse` needed for a raw status response.

- [ ] **Step 1: Create `proxy.ts` at the project root**

```ts
import type { NextRequest } from 'next/server'

const GONE_PATHS: string[] = [
  // Permanently removed URLs — data team adds entries here
]

export function proxy(request: NextRequest) {
  if (GONE_PATHS.includes(request.nextUrl.pathname)) {
    return new Response(null, { status: 410 })
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add proxy.ts
git commit -m "feat(a1): add 410 proxy hook skeleton"
```

---

## Task 7: Fix Industries Page Link + Final Build

**Files:**
- Modify: `app/industries/page.tsx` (line 81)

- [ ] **Step 1: Fix `/occ` → `/solutions/occ` in `app/industries/page.tsx`**

Find line 81 (the OCC Program banner `<Link>`). Change:

```tsx
<Link href="/occ" className="ml-auto text-teal-500 text-[15px] font-semibold whitespace-nowrap hover:underline">
```

to:

```tsx
<Link href="/solutions/occ" className="ml-auto text-teal-500 text-[15px] font-semibold whitespace-nowrap hover:underline">
```

- [ ] **Step 2: Run the full build**

Run: `npm run build`
Expected: Build completes with no errors. Any TypeScript or linting failures must be fixed before proceeding.

- [ ] **Step 3: Commit**

```bash
git add app/industries/page.tsx
git commit -m "fix(a1): correct /occ link to /solutions/occ in industries page"
```

---

## Acceptance Criteria Checklist

After all tasks complete, verify against the ticket:

- [ ] Every route in the spec resolves with the shared layout shell (`npm run build` passes)
- [ ] Utility routes (`/search`, `/cart`, `/account/*`) export `robots: { index: false }` metadata
- [ ] `app/not-found.tsx` exists and renders with Header/Footer
- [ ] `proxy.ts` exists at project root with `GONE_PATHS` hook
- [ ] `lib/routes.ts` is exported and covers every path in the spec
- [ ] `/solutions/occ` is the correct URL (industries page fixed)
- [ ] No removed product categories appear in routing
