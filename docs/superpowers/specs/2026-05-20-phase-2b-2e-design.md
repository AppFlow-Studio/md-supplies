# Phase 2B–2E Design Spec
**Date:** 2026-05-20  
**Stack:** Next.js 16 · React 19 · Tailwind CSS v4 · TypeScript · Shopify Storefront API 2026-04

---

## 1. Scope

Build the four remaining Phase 2 features on top of the completed foundation (1A–1E) and homepage (2A):

| Phase | Feature | Route |
|-------|---------|-------|
| 2B | Category page | `/category/[slug]` |
| 2C | Product detail page | `/product/[slug]` |
| 2D | Cart (popup + server actions) | all pages |
| 2E | Search results | `/search` |

Existing `/shop` and `/shop/[slug]` routes (mock data) are left untouched.

---

## 2. Shared Decisions

- **Filter state:** URL search params (`?sort=&after=&filter=` repeatable). Enables SSR, shareable URLs, and Shopify's native faceted filter API.
- **Cart state:** React Context (`CartProvider`) wrapping the app; server actions mutate the HTTP-only cookie and return the updated `Cart` object to the client.
- **Route grouping:** No route groups added; new pages sit at `app/category/`, `app/product/`, `app/search/` alongside existing routes.
- **Data:** All new routes use live Shopify Storefront API. Mock data in `lib/products.ts` and `components/shop/` is untouched.

---

## 3. 2B — Category Page (`/category/[slug]`)

### Rendering
Server Component with `export const revalidate = 30` (ISR).

### Data
```ts
storefrontFetch(GET_COLLECTION, {
  handle: slug,
  first: 24,
  after: searchParams.after ?? null,
  sortKey: searchParams.sort ?? 'COLLECTION_DEFAULT',
  reverse: searchParams.sort === 'PRICE_DESC',
  filters: parseFilters(searchParams.filter),  // string[] → ProductFilter[]
})
```

`parseFilters` decodes each `filter` param (JSON string, e.g. `{"productVendor":"Medline"}`) into a `ProductFilter` object for the Shopify query.

### Components

| Component | Type | Responsibility |
|-----------|------|----------------|
| `app/category/[slug]/page.tsx` | Server | Fetches collection, composes page |
| `components/category/CategoryFilters.tsx` | `'use client'` | Renders Shopify native filter values; calls `router.push` on change |
| `components/category/CategorySort.tsx` | `'use client'` | Sort dropdown; pushes `?sort=` to URL |
| Product grid | server-rendered | Maps `collection.products.nodes` → `ShopifyProductCard` |
| Pagination | `'use client'` | Prev/Next cursor buttons, reads `pageInfo` |

### Page Sections (top → bottom)
1. Breadcrumb nav
2. Hero: collection image + title + product count
3. Two-column layout: `CategoryFilters` sidebar (desktop) / drawer (mobile) | product grid
4. Sort bar above grid
5. Cursor pagination below grid
6. About section: `collection.descriptionHtml` (dangerouslySetInnerHTML, sanitised by Shopify)

### Filter URL format
- One `filter` param per active filter, value = `JSON.stringify(ProductFilter)`
- Example: `/category/exam-gloves?sort=PRICE_ASC&filter={"available":true}&filter={"productVendor":"Medline"}`
- Client sidebar reads `useSearchParams()` to know which filters are active; toggles them via `router.push`

---

## 4. 2C — Product Page (`/product/[slug]`)

### Rendering
Server Component with `export const revalidate = 30`.

### Data
```ts
storefrontFetch(GET_PRODUCT, { handle: slug })
```
Returns full product: images (up to 20), variants, options, metafields (`specs.datasheet_url`, `specs.dimensions`).

### Components

| Component | Type | Responsibility |
|-----------|------|----------------|
| `app/product/[slug]/page.tsx` | Server | Fetches product, generates metadata, renders page |
| `components/product/ProductView.tsx` | `'use client'` | Full product UI; owns `selectedVariant` and `qty` state |
| `components/product/VariantSelector.tsx` | `'use client'` | Renders option groups (Size, Type, etc.); emits selected variant |
| `components/product/AddToCartButton.tsx` | `'use client'` | Calls `useCart().addItem(variantId, qty)`; shows loading state |

### Page Sections (top → bottom)
1. Breadcrumb
2. Hero (two-column on desktop):
   - **Left:** Image gallery — main image + up to 5 thumbnails
   - **Right:** Brand, title, SKU, availability badge, variant selector, price (with compareAtPrice strikethrough), qty stepper, Add to Cart, Request a Quote, trust badges
3. Tabs: **Description** (`descriptionHtml`), **Specifications** (metafields + variant options table), **Ordering Info** (static copy), **Reviews** (rating + count)
4. Commonly Purchased With — fetch first 5 products from the same collection (via handle extracted from URL), exclude current product, show up to 4 cards
5. You May Also Need — static placeholder section for Phase 2 (no metafield defined yet); shows the same 4 related products in a horizontal strip

### Variant Selection Logic
- Default selected variant: first `availableForSale` variant, or first variant if none in stock.
- Selecting an option combination resolves the matching variant from `product.variants.nodes`.
- Price and availability badge update reactively.
- `AddToCartButton` passes `selectedVariant.id` to the cart action.
- "Request a Quote" button is visual-only in Phase 2 (no modal/form). Phase 4B adds the quote modal.

---

## 5. 2D — Cart

### Storage
Cart ID stored in an HTTP-only cookie named `cart_id`. Never exposed to client JS.

### Server Actions (`app/actions/cart.ts`)

```ts
'use server'
addToCart(variantId: string, quantity: number): Promise<Cart>
removeFromCart(lineId: string): Promise<Cart>
updateCartLine(lineId: string, quantity: number): Promise<Cart>
getCart(): Promise<Cart | null>
```

Each action reads `cart_id` cookie, calls Shopify (cartCreate / cartLinesAdd / cartLinesUpdate / cartLinesRemove / cart query), sets updated cookie, returns `Cart`.

### CartProvider (`components/store/CartProvider.tsx`)
```ts
'use client'
interface CartContextValue {
  cart: Cart | null
  isOpen: boolean
  addItem(variantId: string, qty: number): Promise<void>
  removeItem(lineId: string): Promise<void>
  updateItem(lineId: string, qty: number): Promise<void>
  openCart(): void
  closeCart(): void
}
```
- Receives `initialCart: Cart | null` prop from the server layout.
- Calls server actions, then updates local state with the returned `Cart`.
- `addItem` sets `isOpen = true` after a successful add.

### Layout Integration (`app/layout.tsx`)
```ts
// server component reads cookie + fetches cart
const cartId = (await cookies()).get('cart_id')?.value
const initialCart = cartId ? await getCart() : null
// wraps children
<CartProvider initialCart={initialCart}>{children}</CartProvider>
```

### CartPopup (`components/store/CartPopup.tsx`)
- `'use client'` — subscribes to `useCart()`
- Slide-in panel from the right (`translate-x` transition)
- Shows: line items (image, title, variant, qty stepper, remove), subtotal, "Proceed to Checkout" button → `window.location.href = cart.checkoutUrl`
- Empty state with "Continue Shopping" link

### Header Changes
- Cart icon reads `useCart().cart?.totalQuantity` for badge count
- Cart icon `onClick` → `useCart().openCart()`
- Search icon → opens an inline search bar (controlled state); on submit navigates to `/search?q=query`

---

## 6. 2E — Search (`/search`)

### Rendering
`export const dynamic = 'force-dynamic'` — no cache, per-request.

### Data
```ts
storefrontFetch(SEARCH_PRODUCTS, {
  query: searchParams.q ?? '',
  first: 12,
})
```

### Page Sections
1. Search input (pre-filled with `q`; submits GET to `/search?q=`)
2. Result count (`{totalCount} results for "{q}"`)
3. Product grid — 12 cards using `ShopifyProductCard` (Shopify data version)
4. Empty state — "No results for X" + suggested category links (hardcoded top 4 categories)

### Header Search
Search icon toggles an inline search bar overlay in the header. Submitting navigates to `/search?q=query`.

---

## 7. New Files Summary

```
app/
  category/[slug]/page.tsx
  product/[slug]/page.tsx
  search/page.tsx
  actions/cart.ts

components/
  category/
    CategoryFilters.tsx
    CategorySort.tsx
  product/
    ProductView.tsx
    VariantSelector.tsx
    AddToCartButton.tsx
  store/
    CartProvider.tsx
    CartPopup.tsx
```

### Modified Files
```
app/layout.tsx                    — CartProvider wrap + initialCart
components/layout/Header.tsx      — cart badge, open cart, search nav
```

---

## 8. Out of Scope

- `/shop` and `/shop/[slug]` mock routes (left as-is)
- Phase 3 (account/OAuth)
- Phase 4 (B2B features)
- Phase 5 (blog/FAQ/about Shopify CMS integration)
- `industry/[slug]` page
