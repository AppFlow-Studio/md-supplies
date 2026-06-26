# Cart Page — Design Spec
**Date:** 2026-06-26  
**Ticket:** DEV-10  
**Branch:** sardor-dev  

---

## Problem

`app/(noindex)/cart/page.tsx` renders a placeholder "Cart coming soon." The mini-cart (`CartPopup`) and `CartProvider` are fully functional, but there is no full-page cart destination. Users who navigate directly to `/cart` see nothing useful.

---

## Scope

- Replace the stub with a real `/cart` page bound to the existing `CartProvider`
- Add SKU to the cart GQL fragment (currently absent)
- Surface mutation errors visibly via toast (currently console-only)
- Emit `view_cart` / `begin_checkout` analytics events on the full page

**Out of scope:** Changes to `CartPopup`, quick-add, PDP add-to-cart, or cart persistence mechanism (already correct via httpOnly `cart_id` cookie shared across all routes).

---

## Architecture

`CartProvider` already wraps the root layout, so the cart context is live on every page. The `/cart` page needs only a client component that calls `useCart()` — no additional wiring or data-fetching required.

```
app/layout.tsx
  └─ CartProvider (initialCart from getCart() server-side)
       ├─ CartPopup          ← unchanged
       └─ app/(noindex)/cart/page.tsx
            └─ CartPageClient   ← new, uses useCart()
                 └─ CartToast   ← new, reads lastError from useCart()
```

---

## Section 1: Data Layer Changes

### 1A — SKU in GQL fragment (`lib/shopify/queries/cart.ts`)

Add `sku` to the `ProductVariant` spread inside `CART_FRAGMENT`:

```graphql
merchandise {
  ... on ProductVariant {
    id
    title
    sku          # ← add
    selectedOptions { name value }
    product { ... }
  }
}
```

### 1B — CartLine type (`lib/shopify/types.ts`)

Add `sku: string | null` to the `merchandise` object on `CartLine`:

```ts
export type CartLine = {
  id: string
  quantity: number
  merchandise: {
    id: string
    title: string
    sku: string | null    // ← add
    selectedOptions: SelectedOption[]
    product: { id: string; title: string; handle: string; images: { nodes: ProductImage[] } }
  }
  cost: { totalAmount: Money }
}
```

### 1C — Error state in CartProvider (`components/store/CartProvider.tsx`)

Add to `CartContextValue`:
```ts
lastError: string | null
clearError(): void
```

Add `const [lastError, setLastError] = useState<string | null>(null)` to state.

In each mutation callback, update the catch block:
```ts
} catch (err) {
  console.error('[CartProvider] removeItem failed:', err)
  setLastError('Failed to remove item. Please try again.')
}
```

Expose `lastError` and `clearError: () => setLastError(null)` via the context value.

---

## Section 2: `CartPageClient` Component

**File:** `components/store/CartPageClient.tsx`  
**Type:** `'use client'`

### Render states

| State | Condition | UI |
|---|---|---|
| Skeleton | `cart === null` | 3 placeholder rows (gray rounded rects, matching item row height) |
| Empty | `cart.lines.nodes.length === 0` | Centered cart icon + "Your cart is empty" + "Continue Shopping" link to `/` |
| Populated | `lines.length > 0` | Two-column layout (see below) |

### Layout (populated)

Desktop (`lg+`): CSS grid, two columns.
- **Left column** — scrollable line items list
- **Right column** — sticky order summary sidebar

Mobile (below `lg`): single column, summary below items.

### Line item row

Each `CartLine` renders:
- Product image: 72×72px `<img>` (same pattern as CartPopup; `object-contain`)
- Product title: `<Link href="/product/{handle}">` with hover color
- Variant title: shown only when `merchandise.title !== 'Default Title'`
- SKU: shown only when `merchandise.sku` is non-null, formatted as `SKU: {sku}`
- Qty stepper: identical to CartPopup (`−` / count / `+` buttons, remove at qty=1 on `−`)
- Line total: `${cost.totalAmount.amount}` right-aligned
- Remove button: `<X>` icon, `aria-label="Remove {product.title}"`

### Order summary sidebar

- Label "Subtotal" + `${cart.cost.subtotalAmount.amount}`
- `"Shipping calculated at checkout"` (no invented estimates)
- Checkout `<a>` button → `handleCheckoutClick`

### `handleCheckoutClick`

Mirrors `CartPopup.handleCheckoutClick` exactly:
1. `e.preventDefault()`
2. `track(buildBeginCheckoutEvent(...))`
3. Best-effort: read `_ga` cookie → `clientIdFromGaCookie` → `setCartAttribute('ga_client_id', clientId)`
4. `window.location.href = cart.checkoutUrl`

### Analytics (`useEffect` on mount)

```ts
useEffect(() => {
  if (cart && cart.lines.nodes.length > 0) {
    track(buildViewCartEvent({ currency, items }))
  }
}, []) // intentionally runs only on mount
```

`view_cart` fires once on page load when the cart is populated. `begin_checkout` fires inside `handleCheckoutClick` after the event succeeds, before the redirect.

### Error toast

`<CartToast />` rendered at the bottom of `CartPageClient`'s return. Reads `lastError` / `clearError` from `useCart()`.

---

## Section 3: `CartToast` Component

**File:** `components/store/CartToast.tsx`  
**Type:** `'use client'`

- Reads `lastError` and `clearError` from `useCart()`
- Fixed position, bottom-right
- `role="alert"` — screen reader announces immediately on appearance
- When `lastError` is set: visible panel with error message + X dismiss button
- When null: `opacity-0 pointer-events-none` (not rendered to DOM)
- Auto-clears: `useEffect` starts a 5 s timeout when `lastError` changes; clears on unmount

---

## Section 4: Page File Update

**File:** `app/(noindex)/cart/page.tsx`

Stays a Server Component. Replace the stub body with `<CartPageClient />`:

```tsx
import type { Metadata } from 'next'
import { CartPageClient } from '@/components/store/CartPageClient'

export const metadata: Metadata = {
  title: 'Cart | MD Supplies',
  robots: { index: false, follow: false },
}

export default function CartPage() {
  return (
    <main id="main-content" className="bg-[#f9fafc] min-h-screen">
      <CartPageClient />
    </main>
  )
}
```

---

## Accessibility

- Toast uses `role="alert"` — no aria-live needed
- Qty stepper buttons: `aria-label="Decrease quantity"` / `aria-label="Increase quantity"` (same as CartPopup)
- Remove buttons: `aria-label="Remove {product.title}"` (more specific than CartPopup's generic "Remove item")
- Skeleton rows: `aria-busy="true"` on the container, skeleton divs have `aria-hidden="true"`
- All interactive controls are native elements (buttons, links) — keyboard accessible by default
- Checkout link is a native `<a>` — Enter key works without extra handling

---

## Files Changed

| File | Change |
|---|---|
| `lib/shopify/queries/cart.ts` | Add `sku` to `CART_FRAGMENT` |
| `lib/shopify/types.ts` | Add `sku: string \| null` to `CartLine.merchandise` |
| `components/store/CartProvider.tsx` | Add `lastError`, `clearError` to context + catch blocks |
| `components/store/CartPageClient.tsx` | New — full cart page client component |
| `components/store/CartToast.tsx` | New — toast for mutation errors |
| `app/(noindex)/cart/page.tsx` | Replace stub with `<CartPageClient />` |

---

## Acceptance Criteria

- [ ] No placeholder copy; `/cart` shows real cart state consistent with mini-cart
- [ ] Image, title, selected options (variant title), SKU (when present), qty, remove, line price, subtotal all visible
- [ ] Checkout button uses `cart.checkoutUrl` with exact variant IDs + quantities
- [ ] Mutation failures (remove, qty update) surface as toast; not console-only
- [ ] `view_cart` fires on page load (populated cart only)
- [ ] `begin_checkout` fires on checkout button click
- [ ] All controls keyboard accessible; toast announced by screen reader
- [ ] Empty state shown when cart has no items; skeleton shown before cart loads
- [ ] "Shipping calculated at checkout" — no invented estimates
