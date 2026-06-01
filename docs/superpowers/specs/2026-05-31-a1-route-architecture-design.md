# A1 · Route Architecture Completion — Design Spec

**Date:** 2026-05-31  
**Owner:** Sardorbek  
**Ticket:** A1 — Route Architecture + Layout Shell + Noindex Utility Routes + 404/410  
**Status:** Approved for implementation

---

## Context

The A1 ticket is partially complete. The root layout shell, home page, category/product/blog/partners/industries routes, and search page all exist. Six gaps remain before A1 acceptance criteria are met.

---

## Gap Summary

| Gap | Status |
|-----|--------|
| Typed route map (`lib/routes.ts`) | Missing |
| `/categories`, `/category/[cat]/[sub]`, `/partners/[slug]`, `/solutions/occ`, `/contact`, `/returns`, `/policies/[slug]` | Missing |
| Noindex utility routes (`/cart`, `/account`, `/account/login`, `/account/orders`) | Missing |
| `/search` noindex robots meta | Missing |
| 404 page (`app/not-found.tsx`) | Missing |
| 410 middleware hook (`middleware.ts`) | Missing |
| `/occ` link in industries page | Wrong URL (should be `/solutions/occ`) |

---

## Design

### 1. Typed Route Map — `lib/routes.ts`

Single exported `ROUTES` object with typed helper functions for every path in the sitemap. All internal `<Link href={...}>` calls across the codebase should reference this module. Munis imports it on day 1 for B1/B2/B4 work.

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

### 2. Missing Route Stubs

Each stub is a minimal page component: correct `<h1>`, correct `generateMetadata`, `notFound()` where applicable for dynamic segments. No decorative content — that belongs to later tickets (A2, A3, B4).

| Route | File | Owner (fills content) |
|-------|------|-----------------------|
| `/categories` | `app/categories/page.tsx` | Sardorbek (A3) |
| `/category/[category-slug]/[subcategory-slug]` | `app/category/[category-slug]/[subcategory-slug]/page.tsx` | Sardorbek (A2) |
| `/partners/[slug]` | `app/partners/[slug]/page.tsx` | Munis (B4) |
| `/solutions/occ` | `app/solutions/occ/page.tsx` | Munis (B4) |
| `/contact` | `app/contact/page.tsx` | TBD |
| `/returns` | `app/returns/page.tsx` | TBD |
| `/policies/[slug]` | `app/policies/[slug]/page.tsx` | TBD |

Dynamic stubs (`[subcategory-slug]`, `[slug]`) call `notFound()` immediately — they render nothing until A2/B4 fills them in. Static stubs (`/contact`, `/returns`, `/categories`, `/solutions/occ`) render a minimal placeholder with correct title and `<h1>`.

### 3. Noindex Utility Routes

Use a Next.js route group `app/(noindex)/` — the parentheses keep the group name out of the URL. Each page exports:

```ts
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}
```

Pages:
- `app/(noindex)/cart/page.tsx` — "Your Cart" placeholder
- `app/(noindex)/account/page.tsx` — "My Account" placeholder  
- `app/(noindex)/account/login/page.tsx` — "Sign In" placeholder
- `app/(noindex)/account/orders/page.tsx` — "Order History" placeholder

Also add the same `robots` export to the existing `app/search/page.tsx` `generateMetadata` function.

### 4. 404 Page — `app/not-found.tsx`

Branded page matching the site's design system:
- Large "404" number in navy
- Short message: "Page not found"
- Two CTAs: "Go Home" → `/` and "Browse Categories" → `/categories`
- Inherits root layout (header/footer present)

### 5. 410 Proxy Hook — `proxy.ts`

**Note:** In Next.js 16, `middleware.ts` is deprecated and renamed to `proxy.ts`. The exported function is `proxy`, not `middleware`. Located at the project root (same level as `next.config.ts`).

```ts
import type { NextRequest } from 'next/server'

const GONE_PATHS: string[] = [
  // Add permanently removed URLs here — data team populates
]

export function proxy(request: NextRequest) {
  if (GONE_PATHS.includes(request.nextUrl.pathname)) {
    return new Response(null, { status: 410 })
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)'],
}
```

Empty array for now. No actual URL mappings until the data team provides the redirect/gone list.

### 6. Inconsistency Fix

- `app/industries/page.tsx` line 81: change `href="/occ"` → `href="/solutions/occ"`

---

## Out of Scope

- Renaming `/product/[slug]` → `/products/[slug]` — existing links would break; separate URL decision
- Actual content for stub pages — owned by A2, A3, B4 tickets
- 410 URL mappings — data team responsibility
- Any Shopify API integration

---

## Acceptance Criteria (from ticket)

- [ ] Every route in §5 resolves with the shared layout shell
- [ ] Utility routes (`/search`, `/cart`, `/account/*`) render and are noindex-ready
- [ ] 404 page exists; 410 hook exists
- [ ] Typed route map exported and documented for Munis
- [ ] Slugs are lowercase + hyphenated; product route stays stable
- [ ] No removed categories appear anywhere in routing
