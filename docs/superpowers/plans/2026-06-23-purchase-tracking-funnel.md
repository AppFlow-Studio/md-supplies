# Purchase Tracking & Funnel Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the missing `view_cart` storefront event, bridge the GA `client_id` from storefront into Shopify checkout via a cart attribute, and ship a `checkout_completed` custom pixel that emits exactly one deduped `purchase` to GA4.

**Architecture:** Pure GA4 payload builders stay in `lib/analytics/events.ts` (Vitest-covered). A new `cartAttributesUpdate` server action stamps the storefront's GA `client_id` (parsed from the `_ga` cookie) onto the Shopify cart before handoff. A version-controlled Shopify custom pixel (`shopify/web-pixel-purchase.js`) reads that attribute on `checkout_completed` and sends one `purchase` via gtag.js, keyed on the Shopify order id for dedup.

**Tech Stack:** Next.js 16 App Router, React 19, `@next/third-parties` (`sendGTMEvent`), Shopify Storefront API, Shopify Web Pixels API (`analytics.subscribe`), gtag.js, Vitest.

## Global Constraints

- GTM container ID is `GTM-5BQJLLJV`, read from `NEXT_PUBLIC_GTM_ID` — never hardcode the literal ID outside `.env.example`.
- Storefront analytics use `dataLayer.push` via `track()` only — no `window.gtag` on storefront pages.
- Every GA4 ecommerce event payload follows `{ event, ecommerce: { currency, value, items: [...] } }`.
- Pure event-shaping logic goes in `lib/analytics/events.ts` and is unit-tested with Vitest. Client-component wiring and the pixel file are NOT unit-tested (no jsdom in this repo) — they are verified by build + manual browser/DebugView steps.
- The `purchase` payload must contain NO PII (no email, name, phone, address) — only order id, monetary fields, and line item id/name/price/quantity.
- The pixel's GA4 Measurement ID is the literal placeholder `G-XXXXXXXX` in the committed file; the real id is substituted only when pasting into Shopify Admin.
- `transaction_id` for `purchase` is the Shopify order id — the single dedup key across our pixel and the Google & YouTube app.

---

## File Structure

- `lib/analytics/events.ts` — add `buildViewCartEvent`; extend `GA4EcommerceEvent` event union with `'view_cart'`.
- `lib/analytics/__tests__/events.test.ts` — add `buildViewCartEvent` cases.
- `lib/analytics/clientId.ts` (new) — pure `clientIdFromGaCookie(cookie: string): string | null`.
- `lib/analytics/__tests__/clientId.test.ts` (new) — parser cases.
- `lib/shopify/queries/cart.ts` — add `attributes { key value }` to `CART_FRAGMENT`; add `SET_CART_ATTRIBUTES` mutation.
- `lib/shopify/types.ts` — add `attributes` to `Cart`.
- `app/actions/cart.ts` — add `setCartAttribute` server action.
- `components/store/CartProvider.tsx` — fire `view_cart` from `openCart`.
- `components/store/CartPopup.tsx` — checkout handler: stamp client_id, fire `begin_checkout`, navigate.
- `shopify/web-pixel-purchase.js` (new) — the custom pixel source.
- `shopify/README.md` (new) — paste/runbook instructions.

---

### Task 1: `buildViewCartEvent` pure builder

**Files:**
- Modify: `lib/analytics/events.ts`
- Test: `lib/analytics/__tests__/events.test.ts`

**Interfaces:**
- Consumes: `GA4Item`, `GA4EcommerceEvent` (existing), internal `sumItemValue` (existing, lines ~55).
- Produces: `buildViewCartEvent(params: { currency: string; items: GA4Item[] }): GA4EcommerceEvent`. Consumed by Task 2.

- [ ] **Step 1: Write the failing test**

Append to `lib/analytics/__tests__/events.test.ts` (add `buildViewCartEvent` to the existing import block from `../events`):

```ts
describe('buildViewCartEvent', () => {
  it('sums price * quantity across all items', () => {
    const items = [
      { item_id: 'v1', item_name: 'Gloves', price: 10, quantity: 2 },
      { item_id: 'v2', item_name: 'Masks', price: 5, quantity: 1 },
    ]
    expect(buildViewCartEvent({ currency: 'USD', items })).toEqual({
      event: 'view_cart',
      ecommerce: { currency: 'USD', value: 25, items },
    })
  })

  it('builds an empty cart view with zero value', () => {
    expect(buildViewCartEvent({ currency: 'USD', items: [] })).toEqual({
      event: 'view_cart',
      ecommerce: { currency: 'USD', value: 0, items: [] },
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/analytics/__tests__/events.test.ts`
Expected: FAIL — `buildViewCartEvent is not a function` / not exported.

- [ ] **Step 3: Extend the event union and add the builder**

In `lib/analytics/events.ts`, change the `GA4EcommerceEvent` event union to include `view_cart`:

```ts
export interface GA4EcommerceEvent {
  event: 'view_item' | 'view_item_list' | 'select_item' | 'add_to_cart' | 'view_cart' | 'begin_checkout'
  ecommerce: {
    currency: string
    value: number
    items: GA4Item[]
  }
}
```

Add the builder next to `buildBeginCheckoutEvent`:

```ts
export function buildViewCartEvent(params: { currency: string; items: GA4Item[] }): GA4EcommerceEvent {
  return {
    event: 'view_cart',
    ecommerce: { currency: params.currency, value: sumItemValue(params.items), items: params.items },
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/analytics/__tests__/events.test.ts`
Expected: PASS — all cases green.

- [ ] **Step 5: Commit**

```bash
git add lib/analytics/events.ts lib/analytics/__tests__/events.test.ts
git commit -m "feat: add buildViewCartEvent GA4 builder"
```

---

### Task 2: Fire `view_cart` on explicit cart open

**Files:**
- Modify: `components/store/CartProvider.tsx`

**Interfaces:**
- Consumes: `track` (`@/lib/analytics/track`), `buildViewCartEvent` (Task 1).
- Produces: `view_cart` pushed to `dataLayer` when `openCart()` is called with a non-empty cart. No new exports.

> Fire only from `openCart` (the cart-icon path), NOT from the `setIsOpen(true)` inside `addItem` — that auto-open already emits `add_to_cart`, and adding `view_cart` there would double-count the funnel step.

- [ ] **Step 1: Add the import**

In `components/store/CartProvider.tsx`, change the events import (currently line 13) to:

```tsx
import { buildAddToCartEvent, buildViewCartEvent } from '@/lib/analytics/events'
```

- [ ] **Step 2: Replace the inline `openCart` with a tracking callback**

In the context value object (currently lines 81–95), the field is `openCart: () => setIsOpen(true)`. Add a `useCallback` above the `return` (after `updateItem`, around line 79) and reference it in the value object.

Add this callback:

```tsx
  const openCart = useCallback(() => {
    setIsOpen(true)
    if (cart && cart.lines.nodes.length > 0) {
      track(
        buildViewCartEvent({
          currency: cart.cost.subtotalAmount.currencyCode,
          items: cart.lines.nodes.map((line) => ({
            item_id: line.merchandise.id,
            item_name: line.merchandise.product.title,
            price: parseFloat(line.cost.totalAmount.amount) / line.quantity,
            quantity: line.quantity,
          })),
        }),
      )
    }
  }, [cart])
```

Then in the context value object change `openCart: () => setIsOpen(true),` to `openCart,`.

(`track` is already imported on line 12. `useCallback` is already imported on line 6.)

- [ ] **Step 3: Build**

Run: `npx next build`
Expected: succeeds, no type errors.

- [ ] **Step 4: Commit**

```bash
git add components/store/CartProvider.tsx
git commit -m "feat: track view_cart on explicit cart open"
```

---

### Task 3: `_ga` cookie → client_id parser

**Files:**
- Create: `lib/analytics/clientId.ts`
- Test: `lib/analytics/__tests__/clientId.test.ts`

**Interfaces:**
- Produces: `clientIdFromGaCookie(cookie: string): string | null`. Consumed by Task 5.

> GA4's `_ga` cookie value looks like `GA1.1.1234567890.1700000000`. The client_id is the last two dotted segments: `1234567890.1700000000`. The leading `GA1.<n>.` is a version/depth prefix that varies, so we take everything after the second dot.

- [ ] **Step 1: Write the failing test**

Create `lib/analytics/__tests__/clientId.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { clientIdFromGaCookie } from '../clientId'

describe('clientIdFromGaCookie', () => {
  it('extracts the client_id from a standard _ga cookie value', () => {
    expect(clientIdFromGaCookie('GA1.1.1234567890.1700000000')).toBe('1234567890.1700000000')
  })

  it('handles a different version/depth prefix', () => {
    expect(clientIdFromGaCookie('GA1.2.987654321.1699999999')).toBe('987654321.1699999999')
  })

  it('returns null for an empty string', () => {
    expect(clientIdFromGaCookie('')).toBeNull()
  })

  it('returns null when the value has too few segments', () => {
    expect(clientIdFromGaCookie('GA1.1')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/analytics/__tests__/clientId.test.ts`
Expected: FAIL — `Cannot find module '../clientId'`.

- [ ] **Step 3: Implement the parser**

Create `lib/analytics/clientId.ts`:

```ts
/**
 * Extract the GA4 client_id from a `_ga` cookie value.
 *
 * `_ga` looks like `GA1.<depth>.<clientId>` where clientId is itself two
 * dotted segments (`1234567890.1700000000`). The `GA1.<depth>.` prefix
 * varies, so we drop the first two segments and keep the rest.
 * Returns null when the value is missing or malformed.
 */
export function clientIdFromGaCookie(cookie: string): string | null {
  if (!cookie) return null
  const parts = cookie.split('.')
  if (parts.length < 4) return null
  return parts.slice(2).join('.')
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/analytics/__tests__/clientId.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/analytics/clientId.ts lib/analytics/__tests__/clientId.test.ts
git commit -m "feat: add _ga cookie client_id parser"
```

---

### Task 4: Cart attributes — query, type, server action

**Files:**
- Modify: `lib/shopify/queries/cart.ts`
- Modify: `lib/shopify/types.ts:153-159`
- Modify: `app/actions/cart.ts`

**Interfaces:**
- Consumes: `storefrontFetch`, `assertNoUserErrors`, `CART_COOKIE` (existing in `app/actions/cart.ts`).
- Produces: `setCartAttribute(key: string, value: string): Promise<Cart>` exported from `app/actions/cart.ts`. `Cart.attributes: { key: string; value: string }[]`. `SET_CART_ATTRIBUTES` query export. Consumed by Task 5.

- [ ] **Step 1: Add `attributes` to the cart fragment**

In `lib/shopify/queries/cart.ts`, inside `CART_FRAGMENT` after the `id`/`checkoutUrl`/`totalQuantity` lines (after line 4), add:

```graphql
    attributes { key value }
```

- [ ] **Step 2: Add the `SET_CART_ATTRIBUTES` mutation**

Append to `lib/shopify/queries/cart.ts`:

```ts
export const SET_CART_ATTRIBUTES = `#graphql
  ${CART_FRAGMENT}
  mutation SetCartAttributes($cartId: ID!, $attributes: [AttributeInput!]!) {
    cartAttributesUpdate(cartId: $cartId, attributes: $attributes) {
      cart { ...CartFields }
      userErrors { field message }
    }
  }
`;
```

- [ ] **Step 3: Add `attributes` to the `Cart` type**

In `lib/shopify/types.ts`, change the `Cart` type (lines 153–159) to include:

```ts
export type Cart = {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  attributes: { key: string; value: string }[];
  lines: { nodes: CartLine[] };
  cost: CartCost;
};
```

- [ ] **Step 4: Add the `setCartAttribute` server action**

In `app/actions/cart.ts`, add `SET_CART_ATTRIBUTES` to the import block from `@/lib/shopify/queries/cart` (after `GET_CART,` on line 11), then append this action:

```ts
export async function setCartAttribute(key: string, value: string): Promise<Cart> {
  const cartId = (await cookies()).get(CART_COOKIE)?.value
  if (!cartId) throw new Error('No cart')
  const data = await storefrontFetch<{ cartAttributesUpdate: { cart: Cart; userErrors: UserError[] } }>(
    SET_CART_ATTRIBUTES,
    { cartId, attributes: [{ key, value }] },
  )
  assertNoUserErrors(data.cartAttributesUpdate.userErrors, 'cartAttributesUpdate')
  return data.cartAttributesUpdate.cart
}
```

- [ ] **Step 5: Build**

Run: `npx next build`
Expected: succeeds. (Existing code that constructs `Cart` objects comes only from Storefront responses, which now include `attributes` — no other call site needs changes.)

- [ ] **Step 6: Commit**

```bash
git add lib/shopify/queries/cart.ts lib/shopify/types.ts app/actions/cart.ts
git commit -m "feat: add cart attributes query, type, and setCartAttribute action"
```

---

### Task 5: Stamp `client_id` on the cart at checkout handoff

**Files:**
- Modify: `components/store/CartPopup.tsx`

**Interfaces:**
- Consumes: `clientIdFromGaCookie` (Task 3), `setCartAttribute` (Task 4), `track` + `buildBeginCheckoutEvent` (existing).
- Produces: a checkout click handler that persists `ga_client_id` then navigates. No new exports.

> The current checkout control is `<a href={cart.checkoutUrl} onClick={handleCheckoutClick}>`. We convert it to a button-style handler so we can `await` the attribute write before navigation. The write is best-effort: any failure logs and still navigates — checkout must never be blocked by analytics.

- [ ] **Step 1: Update imports**

In `components/store/CartPopup.tsx`, add after the existing analytics import (line 7):

```tsx
import { type MouseEvent } from 'react'
import { clientIdFromGaCookie } from '@/lib/analytics/clientId'
import { setCartAttribute } from '@/app/actions/cart'
```

- [ ] **Step 2: Replace `handleCheckoutClick` with an async handler**

Replace the existing `handleCheckoutClick` function (currently lines 13–26) with:

```tsx
  async function handleCheckoutClick(e: MouseEvent<HTMLAnchorElement>) {
    if (!cart) return
    e.preventDefault()

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

    // Bridge the storefront GA client_id into Shopify checkout for the pixel.
    // Best-effort: never block the handoff on analytics.
    try {
      const match = document.cookie.match(/(?:^|;\s*)_ga=([^;]+)/)
      const clientId = match ? clientIdFromGaCookie(decodeURIComponent(match[1])) : null
      if (clientId) await setCartAttribute('ga_client_id', clientId)
    } catch (err) {
      console.error('[CartPopup] failed to stamp ga_client_id:', err)
    }

    window.location.href = cart.checkoutUrl
  }
```

- [ ] **Step 3: Wire the handler onto the checkout link**

The checkout `<a>` (currently lines 166–172) already has `href={cart.checkoutUrl}` and `onClick={handleCheckoutClick}`. Leave the markup as-is — `handleCheckoutClick` now calls `e.preventDefault()` and navigates itself after the await. Confirm the `onClick` is present; no other change needed.

- [ ] **Step 4: Build**

Run: `npx next build`
Expected: succeeds, no type errors.

- [ ] **Step 5: Manual verification**

Run: `npm run dev`. Add an item, open the cart, click Proceed to Checkout. In DevTools: confirm a `begin_checkout` entry in `window.dataLayer`, then a network call to the `cartAttributesUpdate` action, then navigation to the Shopify checkout URL. On the checkout page, the cart's custom attributes should include `ga_client_id`.

- [ ] **Step 6: Commit**

```bash
git add components/store/CartPopup.tsx
git commit -m "feat: bridge GA client_id to Shopify checkout via cart attribute"
```

---

### Task 6: The Shopify custom pixel + runbook

**Files:**
- Create: `shopify/web-pixel-purchase.js`
- Create: `shopify/README.md`

**Interfaces:**
- Consumes: nothing from the app at runtime (runs in Shopify's sandbox). Reads the `ga_client_id` cart attribute set in Task 5.
- Produces: one GA4 `purchase` event per `checkout_completed`.

> Not imported or bundled by Next.js — it is pasted into Shopify Admin. Committing it keeps it diffable/reviewable. `transaction_id` = Shopify order id is the dedup key (GA4 dedups repeat purchases with the same id, including any sent by the Google & YouTube app).

- [ ] **Step 1: Create the pixel**

Create `shopify/web-pixel-purchase.js`:

```js
// MD Supplies — Shopify Customer Events custom pixel.
// Paste into Shopify Admin → Settings → Customer events → Add custom pixel.
// Replace G-XXXXXXXX with the real GA4 Measurement ID before saving.
// Emits exactly one GA4 `purchase` per checkout_completed. No PII is sent.

const GA4_MEASUREMENT_ID = 'G-XXXXXXXX'; // <-- replace on paste

// Load gtag.js once inside the pixel sandbox.
const s = document.createElement('script');
s.async = true;
s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA4_MEASUREMENT_ID;
document.head.appendChild(s);
window.dataLayer = window.dataLayer || [];
function gtag() { window.dataLayer.push(arguments); }
gtag('js', new Date());

analytics.subscribe('checkout_completed', (event) => {
  const checkout = event.data && event.data.checkout;
  if (!checkout) return;

  const attrs = checkout.attributes || [];
  const clientIdAttr = attrs.find((a) => a.key === 'ga_client_id');
  const clientId = clientIdAttr ? clientIdAttr.value : undefined;

  gtag('config', GA4_MEASUREMENT_ID, Object.assign(
    { send_page_view: false },
    clientId ? { client_id: clientId } : {},
  ));

  const order = checkout.order || {};
  const items = (checkout.lineItems || []).map((li, i) => ({
    item_id: (li.variant && li.variant.id) || li.id,
    item_name: li.title,
    price: li.variant && li.variant.price ? li.variant.price.amount : undefined,
    quantity: li.quantity,
    index: i,
  }));

  // No PII: only order id, money, and line items are sent.
  gtag('event', 'purchase', {
    transaction_id: String(order.id),
    value: checkout.totalPrice ? checkout.totalPrice.amount : undefined,
    currency: checkout.currencyCode,
    tax: checkout.totalTax ? checkout.totalTax.amount : undefined,
    shipping: checkout.shippingLine && checkout.shippingLine.price
      ? checkout.shippingLine.price.amount : undefined,
    items: items,
  });
});
```

- [ ] **Step 2: Create the runbook**

Create `shopify/README.md`:

```markdown
# Shopify custom pixel — GA4 purchase

`web-pixel-purchase.js` runs inside Shopify's Customer Events sandbox and sends
one GA4 `purchase` per completed checkout. It is NOT bundled by the Next.js app.

## Install / update

1. Copy `web-pixel-purchase.js` and replace `G-XXXXXXXX` with the live GA4
   Measurement ID (GA4 Admin → Data streams → Web → Measurement ID).
2. Shopify Admin → Settings → Customer events → Add custom pixel → paste → Save → Connect.

## Verify (live test order)

1. Place a real test order through the storefront cart → checkout.
2. GA4 Admin → DebugView: confirm exactly ONE `purchase` with `transaction_id`
   = the Shopify order id, and the same `client_id` as the pre-checkout session.
3. Pixel-iframe console (checkout/thank-you page): confirm the pixel ran and read
   `ga_client_id`.

## Dedup across integrations

`transaction_id` is the Shopify order id. GA4 dedups repeat `purchase` hits with
the same `transaction_id` — including any sent by the Google & YouTube sales
channel app. If that app also reports purchases to the same GA4 property, no code
change is needed; otherwise disable its GA4 conversion link. Record the decision
here once the app status is confirmed (deadline 2026-08-26).

## No-duplicate page_view (GTM)

The storefront sends its own `page_view` (PageViewTracker). In GTM `GTM-5BQJLLJV`,
ensure the GA4 Configuration tag does NOT also fire `page_view` on "All Pages".
Verify in GTM Preview + GA4 DebugView: one `page_view` per navigation.
```

- [ ] **Step 3: Lint + full test suite (no regressions)**

Run: `npm run lint && npx vitest run`
Expected: lint 0 errors; all tests pass (the `shopify/` JS is not part of the TS project or eslint storefront globs — confirm it is not picked up; if eslint flags it, add `shopify/**` to the `globalIgnores` list in `eslint.config.mjs` in this same commit).

- [ ] **Step 4: Commit**

```bash
git add shopify/web-pixel-purchase.js shopify/README.md
git commit -m "feat: add Shopify checkout_completed purchase pixel + runbook"
```

---

### Task 7: Final verification + PR

**Files:** none (verification only).

- [ ] **Step 1: Full local gates**

Run: `npm run lint && npx tsc --noEmit && npx vitest run && npx next build`
Expected: 0 lint errors, tsc clean, all tests pass, build green.

- [ ] **Step 2: Manual funnel smoke (dev server)**

Run: `npm run dev`. Confirm in `window.dataLayer`: one `page_view` per soft navigation; `view_item_list`/`select_item` on a category grid; `view_item` on a product; `add_to_cart` after adding; `view_cart` ONLY when opening the cart via the cart icon (NOT on the post-add auto-open); `begin_checkout` on checkout click. Confirm no payload contains email/name/address.

- [ ] **Step 3: Open PR**

Push the branch and open a PR (base `munis`). Body: summarize the code changes and link this plan + the spec. Note the dashboard runbook in `shopify/README.md` and the pending live-order verification.

- [ ] **Step 4: Live order verification (after pixel is pasted)**

Per `shopify/README.md` → "Verify (live test order)": exactly one `purchase` in GA4 DebugView with `transaction_id` = order id and matching `client_id`.
```
