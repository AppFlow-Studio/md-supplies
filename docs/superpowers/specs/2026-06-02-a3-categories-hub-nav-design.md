# A3 Design Spec — Categories Hub + Header/Footer/Nav + Breadcrumbs + Internal-Linking

**Date:** 2026-06-02  
**Owner:** Sardorbek  
**Track:** A (Discovery)  
**Ticket:** A3  
**Figma:** https://www.figma.com/design/R6H5vMhAzAy0J5FV9F3t7V/MDSupplies-dev-file (frames: `169:110` Homepage, `169:1623` Category, `169:1436` Subcategory)

---

## 1. Architecture & Data Flow

`app/layout.tsx` (server component) adds `GET_COLLECTIONS` (first: 50, fields: `handle + title + description + image`) to the existing `Promise.all` alongside `getCart()` and `GET_LOCALIZATION`. The resolved `collections` array is passed as a prop to both `<Header>` and `<Footer>`. No additional fetches occur downstream — subcategory lists for nav dropdowns are derived client-side from the same collection list using the handle-prefix pattern already established in `lib/category-utils.ts`.

```
layout.tsx (server)
  Promise.all([getCart(), GET_LOCALIZATION, GET_COLLECTIONS])
         ↓               ↓                    ↓
       Header          Footer            Header nav dropdowns
                                         (derived from collections, no extra fetch)
```

**Revalidation:** Per-page `revalidate` values are respected (root layout does not support `export const revalidate`). The `GET_COLLECTIONS` fetch in the layout will be cached at the Next.js fetch level with `next: { revalidate: 3600 }` passed to `storefrontFetch`.

---

## 2. Header

**File:** `components/layout/Header.tsx`  
**Rendering:** stays `'use client'` — adds a `collections` prop.

### Props added
```ts
type SlimCollection = { handle: string; title: string }
interface HeaderProps { collections: SlimCollection[] }
```

### Stats bar (4 items, matches Figma)
| Label | Sublabel | Icon |
|---|---|---|
| 12,000+ | Facilities | Building2 |
| 99.8% | Order Accuracy | ShieldCheck |
| Fast | Shipping | Truck |
| 50,000+ | Products | Package |

### Nav items
| Label | href | Dropdown |
|---|---|---|
| Categories | /categories | Mega-dropdown: 4-col grid of all collections |
| OCC | /solutions/occ | None |
| Home Care | /category/home-care | Small dropdown: subcollections with handle prefix `home-care-*` |
| Mobility | /category/mobility | Small dropdown: subcollections with handle prefix `mobility-*` |
| Needles/Syringes | /category/needles-syringes | Small dropdown: subcollections with handle prefix `needles-syringes-*` |
| Testing | /category/testing | Small dropdown: subcollections with handle prefix `testing-*` |

**Contact Us** button → `/contact`

### Dropdown behavior
- **Desktop:** `onMouseEnter` / `onMouseLeave` with 150 ms delay to prevent flicker. Active nav item highlighted.
- **Mobile:** tap to toggle; chevron rotates 180°. Tap outside or press Escape to close.
- **Keyboard:** `Escape` closes open dropdown; `Tab` moves through links naturally.
- **Semantics:** `<nav>` wrapper; dropdown links are `<a>` inside `<ul>`; no `<h2>`/`<h3>` used for nav.
- **Subcategory fallback:** if `handle-prefix-*` yields zero subcollections, the nav item renders as a plain link (no dropdown, no chevron).

### Mega-dropdown (Categories)
- Full-width panel below header, `position: absolute`, `z-50`
- 4-column grid of collection links: each cell = icon placeholder + title
- "Browse all categories →" link at bottom → `/categories`
- Max 24 collections shown; if more, "View all" link appears

### Small dropdown (subcategory items)
- Narrow popover (~220 px) anchored to the nav item
- Flat list of subcollection links, each → `ROUTES.subcategory(parentSlug, subSlug)`
- First item always: "All [Category Name]" → `ROUTES.category(parentSlug)`

### Mobile nav
- Full-screen drawer (existing pattern preserved)
- Categories expands inline to show all collections
- Home Care / Mobility / etc. expand inline to show subcollections
- Stats shown in 2×2 grid (mobile) instead of row

---

## 3. Footer

**File:** `components/layout/Footer.tsx`  
**Rendering:** server component (no client state — currently already server, no change needed).

### Props added
```ts
interface FooterProps {
  collections: SlimCollection[]      // NEW
  availableCountries?: AvailableCountry[]
  currentCountry?: string
}
```

### Category columns (dynamic)
- **TOP CATEGORIES:** `collections.slice(0, 8)` → each linked to `ROUTES.category(handle)`
- **MORE CATEGORIES:** `collections.slice(8, 16)` → each linked to `ROUTES.category(handle)`
- If Shopify returns fewer than 8 collections the columns render however many exist (no empty state needed).

### COMPANY & HELP column (hardcoded — static pages)
About Us · Blog · FAQ · Contact Us · Wholesale/B2B · My Account · Order Tracking · Privacy Policy · Terms of Service · Shipping Policy

### Unchanged
Newsletter input, social icons, bottom bar with copyright + currency switcher + "Get 10% OFF" CTA.

---

## 4. Breadcrumb Component

**File:** `components/layout/Breadcrumb.tsx` (new)  
**Rendering:** server-compatible (no hooks, no `'use client'`).

### Interface
```ts
type BreadcrumbItem = { label: string; href?: string }
// href present  → <Link> (clickable ancestor)
// href absent   → <span aria-current="page"> (current page)
interface BreadcrumbProps { items: BreadcrumbItem[] }
```

### Rendered HTML
```html
<nav aria-label="Breadcrumb">
  <ol class="flex items-center gap-2 flex-wrap text-[15px] tracking-[0.3px]">
    <li><a href="/">Home</a></li>
    <li aria-hidden="true">›</li>
    <li><a href="/category/gloves">Gloves</a></li>
    <li aria-hidden="true">›</li>
    <li><span aria-current="page">Exam Gloves</span></li>
  </ol>
</nav>
```

- Ancestors: `text-gray-500 hover:text-navy-900 transition-colors`
- Current: `text-navy-900 font-semibold`
- Separator `›`: `text-gray-500`, `aria-hidden="true"`

### Pages updated (inline breadcrumb replaced)
| Page | Breadcrumb items |
|---|---|
| `app/categories/page.tsx` | Home › All Categories |
| `app/category/[slug]/page.tsx` | Home › {collection.title} |
| `app/category/[slug]/[sub]/page.tsx` | Home › {parent.title} › {sub.title} |
| `app/product/[slug]/page.tsx` | Home › {category} › {product.title} (if category known) |

---

## 5. Categories Hub (`/categories`)

**File:** `app/categories/page.tsx` (redesigned)  
**Rendering:** server component, `revalidate = 60`.

### Page structure (top to bottom)
1. **Breadcrumb** — `<Breadcrumb items={[{ label: 'All Categories' }]} />`
2. **Hero** — H1 "All Medical Supply Categories" + subtitle paragraph
3. **Popular Categories strip** — first 8 collections as icon tiles (label centered), links to `ROUTES.category(handle)`. Matches the visual style of `PopularCategories` on the homepage.
4. **Main grid** — all collections: 2→3→4 column responsive grid. Each card: image (4:3 aspect) + title + 2-line description + hover border. Full card is `<Link>` to `ROUTES.category(handle)`.
5. **Shop by Industry strip** — reuses `<ShopByIndustry />` component (links to `ROUTES.industry(slug)`)

### SEO
- `<h1>` for page title only; section headings use `<h2>`
- All links are canonical `/category/{handle}` — no filtered URLs
- `metadata.title` = "All Medical Supply Categories | MD Supplies"
- `metadata.description` = "Browse all 26+ medical supply categories at wholesale prices…"

---

## 6. Internal Linking Modules (Audit & Fix)

All existing modules — no new components created. Work is: replace any `#` or hardcoded string hrefs with `ROUTES.*` constants and verify no filtered/noindex URLs are linked.

| Component | File | Action |
|---|---|---|
| RelatedCategories | `components/product/RelatedCategories.tsx` | Audit hrefs → use `ROUTES.category()` |
| RelatedProducts | `components/product/RelatedProducts.tsx` | Audit hrefs → use `ROUTES.product()` |
| PopularCategories | `components/home/PopularCategories.tsx` | Audit hrefs → use `ROUTES.category()` |
| ShopByIndustry | `components/home/ShopByIndustry.tsx` | Audit hrefs → use `ROUTES.industry()` |

---

## Acceptance Criteria

- [ ] `/categories` links to all collections with crawlable anchors; no `#` hrefs
- [ ] Header/footer expose all required links; **no phone number, no live chat**
- [ ] Nav uses semantic `<nav>` + real `<a>`; no heading tags used for nav links
- [ ] Breadcrumbs accessible + keyboard navigable (real anchors, `aria-current`)
- [ ] Internal-link modules point only to canonical URLs (never filtered/noindex)
- [ ] Mobile nav works and is accessible
- [ ] Footer category columns sourced from Shopify API
- [ ] Stats bar shows 4 items matching Figma
- [ ] Subcategory dropdowns fall back to plain link when no subcollections found
