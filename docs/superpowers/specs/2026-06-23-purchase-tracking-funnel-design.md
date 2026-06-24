# Purchase Tracking & Funnel Completion — Design

> **Status:** Approved design, pending implementation plan.
> **Priority:** P0 · **Owner:** Munis · **Ref:** §14, prior plan `docs/superpowers/plans/2026-06-18-gtm-ga4-tracking.md`, Shopify Customer Events docs.

## Goal

Complete the GA4 ecommerce funnel so that: exactly one `page_view` fires per navigation; the full storefront funnel (`view_item_list`, `select_item`, `view_item`, `add_to_cart`, `view_cart`, `begin_checkout`) is present in `dataLayer` with **no PII**; and **exactly one `purchase`** event is recorded per order, verified by a live test order.

## Background — what already exists

The prior plan (`2026-06-18-gtm-ga4-tracking.md`, Tasks 1–9) already shipped, all via `dataLayer.push` (no `window.gtag`), with payloads shaped by pure, unit-tested builders in `lib/analytics/events.ts`:

- `page_view` — `components/analytics/PageViewTracker.tsx`, one per soft navigation (`usePathname`/`useSearchParams` effect).
- `view_item` — `components/product/ProductView.tsx`.
- `view_item_list` + `select_item` — `components/category/ViewItemListTracker.tsx`, `components/store/ShopifyProductCard.tsx`.
- `add_to_cart` — `components/store/CartProvider.tsx`, fired **after** the cart mutation resolves.
- `begin_checkout` — `components/store/CartPopup.tsx`, on the checkout click.
- `form_submit` — contact + sourcing forms.

The prior plan **explicitly deferred** (its lines 18–21, 1148): `purchase`/`add_payment_info`, cross-domain `client_id` continuity, the no-duplicate `page_view` GA4 config, and the Google & YouTube app decision. This design picks up exactly those deferred items.

## Scope

### In this repository (code, reviewable, testable)

1. **`view_cart` event** — the only missing storefront funnel event (no builder, no call site today).
2. **`client_id` bridge** — `cartAttributesUpdate` mutation + server action, plus checkout-click wiring that stamps the storefront GA `client_id` onto the cart before handoff.
3. **The Shopify custom pixel source** — committed at `shopify/web-pixel-purchase.js`. It is pasted into Shopify Admin to run; keeping it in-repo makes it diffable and reviewable rather than living only in a dashboard text box.

### Dashboard / manual (documented here as a runbook; cannot be executed from the repo)

4. Paste the pixel into **Settings → Customer events → Add custom pixel**.
5. In GTM `GTM-5BQJLLJV`: ensure the GA4 Configuration tag does **not** also auto-fire `page_view` on the built-in "All Pages" trigger (the storefront sends its own `page_view`). This is the no-duplicate check.
6. Confirm the **Google & YouTube app** status and migration path (deadline **2026-08-26**).
7. **Live test order** → verify exactly one `purchase` in GA4 DebugView and in the pixel-iframe console.

## Design

### Component 1 — `view_cart`

- **What:** New pure builder `buildViewCartEvent({ currency, items }): GA4EcommerceEvent` in `lib/analytics/events.ts`, mirroring `buildBeginCheckoutEvent` (sums `price × quantity` for `value`). The `GA4EcommerceEvent` `event` union gains `'view_cart'`.
- **How used:** Fired from `CartProvider` **only on explicit cart open** (`openCart()`, i.e. the cart-icon click), **not** the auto-open triggered by `add_to_cart`. Rationale: firing on the post-add auto-open would emit `add_to_cart` + `view_cart` together on every add, polluting the funnel. `openCart` builds the event from the current `cart` lines; if the cart is empty/null it does nothing.
- **Tested:** `buildViewCartEvent` gets Vitest cases in `lib/analytics/__tests__/events.test.ts` (value summing, empty items). The `openCart` wiring is manual-verified (no jsdom in this repo, per the prior plan's convention).

### Component 2 — `client_id` bridge (storefront → checkout)

The pixel runs in a sandboxed iframe on the checkout domain and cannot read the storefront's `_ga` cookie. We carry the id explicitly through the cart:

- **Mutation:** Add `SET_CART_ATTRIBUTES` (`cartAttributesUpdate(cartId, attributes: [{key, value}])`) to `lib/shopify/queries/cart.ts`.
- **Server action:** `setCartAttribute(key: string, value: string): Promise<Cart>` in `app/actions/cart.ts`, following the existing `assertNoUserErrors` pattern; reads `cart_id` from the cookie, no-ops/throws consistently with siblings if absent.
- **Type:** `Cart` (and `GET_CART`) gain `attributes: { key: string; value: string }[]` so the value is observable.
- **Checkout wiring (`CartPopup`):** The "Proceed to Checkout" `<a href={checkoutUrl}>` becomes a button/handler that:
  1. Reads the GA `client_id` **primarily by parsing the `_ga` cookie** (`GA1.1.<cid>.<ts>` → `<cid>.<ts>`), since the storefront loads GA4 through GTM and does not reliably expose a global `window.gtag` on the page. (`gtag('get', …)` is used opportunistically only if `window.gtag` happens to exist.) The `_ga` cookie is set by GTM's GA4 Configuration tag, so it is the dependable source.
  2. `await setCartAttribute('ga_client_id', clientId)` (best-effort; wrapped so a failure never blocks checkout).
  3. Fires `begin_checkout` (unchanged).
  4. Navigates to `cart.checkoutUrl` (`window.location.href`).
- **Degradation:** If the client_id can't be read or the mutation fails, we log and still navigate. The pixel falls back to gtag's own client_id (continuity lost for that order, purchase still recorded).

### Component 3 — the pixel (`shopify/web-pixel-purchase.js`)

Subscribes to `checkout_completed` and sends one `purchase` straight to GA4 via gtag (bypassing GTM, which can't run reliably in the checkout sandbox):

```js
analytics.subscribe('checkout_completed', (event) => {
  const checkout = event.data.checkout;
  const clientId = (checkout.attributes || []).find(a => a.key === 'ga_client_id')?.value;
  // load gtag/js?id=G-XXXXXXXX (once), then:
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXX', { send_page_view: false, ...(clientId ? { client_id: clientId } : {}) });
  gtag('event', 'purchase', {
    transaction_id: String(checkout.order.id),   // dedup key
    value: checkout.totalPrice.amount,
    currency: checkout.currencyCode,
    tax: checkout.totalTax?.amount,
    shipping: checkout.shippingLine?.price?.amount,
    items: checkout.lineItems.map((li, i) => ({
      item_id: li.variant?.id ?? li.id,
      item_name: li.title,
      price: li.variant?.price?.amount,
      quantity: li.quantity,
      index: i,
    })),
  });
});
```

- **`G-XXXXXXXX`** is a clearly marked placeholder; the real GA4 Measurement ID is substituted when pasting into Admin.
- **Dedup:** `transaction_id = Shopify order id`. GA4 dedups repeat `purchase` hits sharing a `transaction_id` (e.g. a thank-you-page refresh), and — crucially — also dedups against the **Google & YouTube app** if it is also sending purchases keyed on the same order id. This satisfies "dedupe across integrations" without modifying the app.
- **No PII:** only order id, monetary fields, and line item id/name/price/quantity are sent. Email, name, phone, and address are deliberately omitted even though the pixel can access them.

### Component 4 — exactly one `page_view`

No code change: `PageViewTracker` already emits one `page_view` per soft navigation, and the codebase has no stray `window.gtag`/direct GA4 config. The only duplicate risk is a GTM-side GA4 Configuration tag firing `page_view` on "All Pages" in addition to the custom event. Captured as a runbook verification step (§Runbook), confirmed in GTM Preview + GA4 DebugView.

## Data flow (purchase path)

```
Storefront cart  --(checkout click)-->  setCartAttribute('ga_client_id', cid)  -->  Shopify cart
      |                                                                                   |
      | begin_checkout -> dataLayer -> GTM -> GA4                                          |
      v                                                                                   v
cart.checkoutUrl (checkout.shopify.com)  ----------------------------------->  checkout_completed
                                                                                          |
                                                              custom pixel reads attributes.ga_client_id
                                                                                          |
                                                       gtag('config', {client_id}); gtag('event','purchase')
                                                                                          v
                                                                            GA4 (transaction_id = order id, deduped)
```

## Testing

- **Automated (Vitest):** `buildViewCartEvent` builder cases added to `lib/analytics/__tests__/events.test.ts`. (If a small pure `buildPurchaseEvent` helper is extracted to mirror the pixel's payload shaping, it is unit-tested too; the pixel file itself is not, as it runs only in Shopify's sandbox.)
- **Manual / live:**
  - GA4 DebugView + `dataLayer` console: one `page_view` per navigation; `view_cart` only on explicit cart open; full funnel payloads carry no PII.
  - Pixel-iframe console on the checkout/thank-you page: pixel runs, reads `ga_client_id`, fires one `purchase`.
  - **Live test order:** exactly one `purchase` in GA4 with the order id as `transaction_id` and the same `client_id` as the pre-checkout session.

## Runbook (manual steps, outside the repo)

1. Substitute the real `G-XXXXXXXX` into the pixel and paste it at **Settings → Customer events → Add custom pixel**; set permissions and connect.
2. GTM `GTM-5BQJLLJV`: confirm the GA4 Configuration tag is **not** firing `page_view` on "All Pages" (rely on the storefront's custom `page_view`). Verify in Preview.
3. Google & YouTube app: confirm install status, which GA4 property it feeds, and the migration path before **2026-08-26**. If it is sending purchases to the same property, rely on `transaction_id` dedup (no change) or disable its GA4 conversion link — decision recorded at confirmation time.
4. Place a live test order; verify one `purchase` in DebugView and the pixel console.

## Out of scope

- `add_payment_info` (checkout-internal step; not required by the DoD).
- `account_signup` (unchanged from prior plan's exclusion).
- GTM tag/trigger authoring beyond the no-duplicate-`page_view` verification.
- Any change to the Google & YouTube app's own configuration beyond confirming status/path.
