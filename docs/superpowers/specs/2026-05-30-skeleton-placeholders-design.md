# Skeleton Placeholders Design

**Date:** 2026-05-30
**Status:** Approved

## Summary

Add `loading.tsx` skeleton screens to all routes that fetch live Shopify API data. Next.js App Router automatically shows each `loading.tsx` while the server async function runs, replacing it with the real page once data arrives. No changes to existing page components required.

## Scope

Five routes have real API data (Shopify Storefront GraphQL):

| Route | API calls |
|---|---|
| `/` | 4 best-selling products + 8 collections |
| `/product/[slug]` | product detail + 8 related products |
| `/blog` | all articles (up to 50) |
| `/blog/[handle]` | article content + 3 more articles |
| `/category/[slug]` | collection + up to 24 products + filters |

## Architecture

### Shared primitive

`components/ui/Skeleton.tsx` — a single `<div>` with `animate-pulse bg-gray-200` and optional `className` prop. All five `loading.tsx` files import from here. No external library.

### Files to create

1. `components/ui/Skeleton.tsx`
2. `app/loading.tsx`
3. `app/product/[slug]/loading.tsx`
4. `app/blog/loading.tsx`
5. `app/blog/[handle]/loading.tsx`
6. `app/category/[slug]/loading.tsx`

## Skeleton designs

### Home (`app/loading.tsx`)

- **PopularCategories section:** white bg, heading skeleton + 8-cell grid (2 cols mobile / 4 cols desktop). Each cell: square icon placeholder + text line below.
- **PopularProducts section:** neutral-50 bg, heading skeleton + 4-card grid (2 cols / 4 cols). Each card: square aspect-ratio image block + 3 text lines + button bar.
- Static sections (HeroSection, TrustedBrands, etc.) are not skeleton-ified — they render from static markup and don't wait on API data. The skeleton only covers the two dynamic sections.

### Product detail (`app/product/[slug]/loading.tsx`)

- Breadcrumb: 2 short text skeleton pills.
- Two-column layout (matches real page):
  - **Left (images):** large square + 4 thumbnail squares in a row below.
  - **Right (info):** vendor pill, title (2 lines), price block, variant selector row, qty + add-to-cart button, trust badges row.
- Tabs bar: 4 pill skeletons.
- Related products: heading + 4-card horizontal row (same card shape as PopularProducts).

### Blog listing (`app/blog/loading.tsx`)

- Static page header (teal label + "Blog" h1 + description) is kept — it's not API-driven.
- Blog grid area: 9-card grid (1 col / 2 cols / 3 cols). Each card: 16:9 image block + date pill + title line + 2 excerpt lines.

### Blog article (`app/blog/[handle]/loading.tsx`)

- Breadcrumb: 3 short pills.
- Hero banner: full-width dark rectangle (`h-[280px] sm:h-[380px]`) with a title line at the bottom.
- Article body: meta row (2 short pills) + 12–15 text lines of varying width.
- More articles: heading + 3-card grid (16:9 image + date pill + title line each).

### Category (`app/category/[slug]/loading.tsx`)

- Breadcrumb: 2 pills.
- Hero banner: dark rectangle `h-[220px] sm:h-[280px]` with title + subtitle lines.
- Main layout (sidebar + grid):
  - **Sidebar (desktop only):** heading + 5 filter group stubs (label + 3 checkbox rows each).
  - **Product grid:** 24 cards in 1/2/3-col grid. Each card: square image + vendor pill + title line + price line.

## Styling rules

- **Skeleton color:** `bg-gray-200` — standard, no brand colors.
- **Animation:** `animate-pulse` (Tailwind built-in).
- **Spacing/padding:** mirrors the real page exactly so there is no layout shift when the real content loads.
- **Backgrounds:** match the real page's section backgrounds (`bg-neutral-50`, `bg-white`, `bg-[#f9fafc]`) so the skeleton blends in.

## Out of scope

- `/shop/page.tsx` — uses mock data, no live API calls.
- `/search/page.tsx` — to be added later if search API is wired up.
- Client-side loading states (cart, currency switcher) — not covered here.
