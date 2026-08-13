# DEV-LAUNCH-09 — Cart-Line Integrity (Missing/Unshippable Lines, No False Free Shipping)

**Ticket:** DEV-LAUNCH-09 (Final Launch Configuration & Implementation Plan, 2026-08-05) · **Priority:** P0 launch gate · **Owner:** Developers
**Builds on:** [DEV-LAUNCH-07-verification.md](./DEV-LAUNCH-07-verification.md), [DEV-LAUNCH-08-verification.md](./DEV-LAUNCH-08-verification.md)
**Branch:** `catalog-cro-review-sardor-dev` @ base `8521ed1`

## Starting position

Most of the raw detection machinery already existed on this branch:
`findMissingMerchandise()` and `findUnshippableLines()`
(`lib/shopify/cart-lines.ts`) were already wired into `createCart()`/
`addToCart()` (`app/actions/cart.ts`) and surfaced as a 5-second toast via
`CartToast`. The resolver-only shipping-copy pipeline
(`lib/shipping-resolver/`) already refuses to source a shipping claim from a
raw tag or promotional label, with a regression test locking that in
(`CartPageClient.test.tsx`: *"never claims free shipping from a
free-shipping product tag alone"*). `SHIPPING_RESOLVER_ENABLED` was already
off and stays off — nothing in this pass touches that flag or the blocked
`DEV-SHIP-01` dependency.

Two real defects were found underneath that already-solid surface, both
around the parts of the ticket that ask for accurate messaging and no
silent line loss.

## Defects found and fixed this pass

### 1. The persistent checkout-block panel mislabeled unshippable lines as a pricing problem

`blockedCartLines()` (`lib/purchasability.ts`), the function both
`CartPopup.tsx` and `CartPageClient.tsx` call to decide whether to block
"Proceed to Checkout", read the cart line's `cost.totalAmount` — the same
field `findUnshippableLines()` documents as **zeroed out by Shopify for a
normally-priced product that has no shipping rate to the destination**
(measured on the QA store 2026-07-28, see the existing comment in
`cart-lines.ts`). Every zero-total line, regardless of cause, was reported
with reason `'price-unavailable'` and the customer was told *"…is priced on
request. Please remove it or contact us for pricing…"` — a guessed,
incorrect cause for a line that is actually undeliverable to the address,
not unpriced. `findUnshippableLines()`'s own correct detection existed but
was only ever invoked for the one-time add-mutation toast, never
re-evaluated for the standing checkout-block panel — so a cart reloaded
later, or one whose unshippable line was added before this pass, would
never see the accurate message at all.

This directly contradicts the ticket's own acceptance criteria: *"Ensure
customer messages are accurate and do not guess an unsupported cause"* and
*"Detect present-but-unshippable lines and stop checkout from presenting
them as fulfilled"* (checkout WAS stopped, just with the wrong reason
given).

**Fix:**
- Added the variant's own unit `price { amount currencyCode }` to the cart
  GraphQL fragment (`lib/shopify/queries/cart.ts`) and `CartLine` type
  (`lib/shopify/types.ts`) — a field distinct from the line's destination-
  adjusted `cost.totalAmount`.
- `blockedCartLines()` now reads that unit price, not the line cost, so it
  only fires for a genuinely zero/missing-priced product.
- Extracted a pure, log-free `unshippableCartLines(cart)` from
  `lib/shopify/cart-lines.ts` (requiring quantity > 0, a *usable* unit
  price, and a *zero* line cost — the AND of both signals is what makes it
  distinct from price-unavailable) so cart UI can call it on every render,
  not just after a mutation. `findUnshippableLines()` (the logging,
  server-diagnostics version used post-mutation) now delegates to the same
  predicate, so the two can never drift apart.
- `CartPopup.tsx` / `CartPageClient.tsx` now block checkout on *either*
  condition and render the correct, distinct, already-approved copy for
  each — `blockedCheckoutMessage()` for price-unavailable,
  `CART_LINE_UNSHIPPABLE_MESSAGE` for unshippable, both together (headed
  "Action needed before checkout") for a mixed cart holding one of each.

### 2. `addToCart` silently discarded the whole existing cart on any transient failure

`addToCart()`'s `cartLinesAdd` call was wrapped in a bare `catch` that
treated **any** thrown error — a network blip, a non-2xx response, a
GraphQL-level error, not just a genuinely expired cart — as proof the cart
was gone: it deleted the `cart_id` cookie and called `createCart()`, which
creates a **brand-new cart containing only the item just being added**. Any
customer with other items already in their cart who hit a transient failure
on their next add would silently lose every other line with no error shown
(the flow "succeeds" from the UI's point of view — a new cart with the new
item exists). This is exactly the failure the ticket opens with: *"A cart
that drops a line… is a direct customer and fulfillment liability"* and
*"Preserve cart contents when one add/update/remove action fails."*

**Fix:** removed the catch-all. A thrown error now propagates to the
caller, where `CartProvider.addItem`'s existing `catch` already handles it
correctly — sets `lastError` ("Failed to add item. Please try again.") and
leaves `cart` state untouched, so the previously-displayed cart (with all
its lines) stays exactly as it was. The only remaining path that creates a
fresh cart is Shopify's actual, non-throwing signal for an unresolvable
cart id — `cartLinesAdd` returning `cart: null` with no `userErrors` — which
genuinely has nothing left to preserve.

## What was already correct, re-verified

- **Missing-line detection on add** (`findMissingMerchandise`, wired into
  both `createCart` and `addToCart`) — unaffected by this pass, still
  reports the dropped merchandise GID and shows
  `CART_LINE_MISSING_MESSAGE` without guessing a cause, per its own
  existing regression tests (`CART_LINE_MISSING_MESSAGE` must not match
  `/out of stock|unavailable|sold out|shipping|inventory/i` or `/try
  again/i`).
- **Resolver-only shipping copy.** Grepped every customer-facing "Free
  Shipping"/"free shipping" string in `components/` and `lib/`: the only
  live source is `SHIPPING_CLASS_COPY`/`SHIPPING_CLASS_BADGE_LABEL`
  (`lib/shipping-resolver/copy.ts`), read exclusively through
  `ShippingBadge`/`ShippingBlock`, which key off
  `shippingDisplay.class` — itself only ever set by
  `attachCartShippingDisplay`/`attachCardShippingDisplay`, which are no-ops
  while `SHIPPING_RESOLVER_ENABLED` is off. The one other static
  "free shipping" string in the codebase (`lib/occ-copy.ts`'s
  `OCC_PANEL_SUBHEAD`) is deliberately qualified ("available on qualifying
  OCC orders"), documented Phase-10 approved copy, and explicitly never
  gates a rate, threshold, or badge — not a regression target for this
  ticket.
- **`FORDEER_LABELS_ENABLED`** stays off; `fetchFordeerLabels()` throws
  loudly rather than inventing a label if ever enabled without an
  implemented retrieval path, so promotional labels cannot leak a shipping
  claim by accident.
- **`SHIPPING_RESOLVER_ENABLED`** confirmed still unset in `.env.local` —
  untouched by this pass, per the ticket's own dependency note (blocked on
  `DEV-SHIP-01`'s approved dataset/wording/QA).

## Test evidence

```
npx tsc --noEmit                          # clean
npx eslint . --max-warnings 0             # clean
npx vitest run                            # 125 files, 1208 tests passed
rm -rf .next && npm run build             # exit 0, 67/67 pages, zero API errors
```

New/extended coverage this pass:
- `lib/__tests__/purchasability.test.ts` — `blockedCartLines` fixtures
  switched to unit price; new regression: a priced line with a zero
  *cost* (the unshippable shape) is **not** blocked as price-unavailable.
- `lib/shopify/__tests__/cart-lines.test.ts` — `cartWithCosts` fixture
  carries a unit price; new regression: a genuinely zero-*price* line is
  **not** reported as unshippable; new `unshippableCartLines` coverage
  (same detection as `findUnshippableLines`, silent, named).
- `lib/shipping-resolver/__tests__/cart.test.ts` — fixture updated for the
  new required `merchandise.price` field.
- `components/store/__tests__/CartPopup.test.tsx` /
  `CartPageClient.test.tsx` (new `describe('checkout blocking')` in each,
  8 tests total) — unshippable line blocks checkout with the shipping
  message and *not* the pricing message; price-unavailable line does the
  reverse; a mixed cart shows both under "Action needed before checkout";
  a normal cart is never blocked.
- `app/actions/__tests__/cart.test.ts` (new, 6 tests) — the thing the pure
  detection tests can't cover: `addToCart()` actually wires in missing/
  unshippable detection end to end; a transient request failure
  propagates without touching the cart cookie or calling `cartCreate`
  (the fixed defect); a `cart: null` response is the only thing that
  triggers a fresh cart; a `userErrors` failure also leaves the cookie
  alone.

### Live verification against the QA store (this pass)

Ran the dev server against `.env.local`
(`md-supplies-qa-shipping-and-checkout.myshopify.com`) and drove it with
browser automation, reusing a pre-existing real cart from earlier
ticket work (2 RX lines + 1 gloves line, all normally priced/shippable):

| Check | Observed |
|---|---|
| `/cart` page load with the new `merchandise.price` field in the query | Renders correctly — subtotal, RX gate panel, all three lines with correct prices. No "Pricing needed" / "Shipping unavailable" panel incorrectly triggered on a normal cart (confirms `blockedCartLines`/`unshippableCartLines` both correctly resolve empty against real Storefront API data, not just mocks) |
| Quantity increment/decrement on a real line (`updateCartLine`) | Line quantity and subtotal update correctly (1→3→2 across two rounds), cart total recalculates, RX gate panel persists unaffected |
| Browser console | No errors at any point (checked via `read_console_messages`, `onlyErrors: true`) |

**Not verified live**: a genuinely unshippable (priced, no delivery-profile
rate to destination) or a silently-dropped-on-add QA fixture. No such
fixture is known to exist on the QA store — the closest named fixture,
`qa-no-rate` (referenced in `DEV-LAUNCH-07-verification.md`), is actually
the **zero-price** ("Contact for pricing") fixture, not a no-rate-to-
destination one; the real no-rate behavior this ticket's detection is built
around was observed directly against a live cart mutation on 2026-07-28
(documented in the pre-existing `cart-lines.ts` comment), not against a
named, reusable fixture. Reproducing it requires a product whose delivery
profile genuinely excludes the test destination, which is store
configuration, not app code — flagging this the same way
`DEV-LAUNCH-07`/`08` flagged their own fixture gaps, rather than claiming a
live check that didn't happen. The unit and component test suites above
cover every one of these states directly against the exact data shapes
Shopify returns (documented in the pre-existing code comments) with regression
guards in both directions (price-unavailable never labeled unshippable and
vice versa).

## Acceptance criteria status

| Criterion | Status |
|---|---|
| No missing or unshippable line is silent | ✅ missing: pre-existing, re-verified; unshippable: now blocks checkout on every render (previously only a 5s toast at add time) |
| No unknown rate is displayed as free shipping | ✅ resolver-only pipeline confirmed exclusive source of "Free Shipping" copy; static OCC panel copy is separately qualified and does not gate anything |
| A failure on one line does not erase the remaining cart | ✅ fixed (defect #2) — transient `addToCart` failures no longer recreate the cart |
| Mixed-cart behavior matches the QA fixture expectations | ✅ unit/component-tested for price-unavailable + unshippable in the same cart, both messages shown, neither suppresses the other |
| Checkout is blocked or clearly prevented when merchandise cannot be shipped | ✅ fixed (defect #1) — now blocked with the correct, accurate reason on every render, not just immediately after the add that caused it |

## Dependencies status

- **`SHIPPING_RESOLVER_ENABLED`**: unchanged, still off. Not enabled by
  this ticket; remains blocked on `DEV-SHIP-01`'s approved dataset/tests
  per the ticket's own instruction.
- **Cross-ticket `DEV-SHIP-01`**: unaffected. This pass's fixes operate
  entirely on Shopify's own cart-mutation response shape (`cost`, variant
  `price`), never on `public_display_class`/`effective_rate_class` or the
  resolver's data file.
- **Blocked on Bilal — free/threshold/paid display copy**: unaffected.
  `CART_LINE_UNSHIPPABLE_MESSAGE` and `blockedCheckoutMessage()` are
  pre-existing, already-approved, centrally-defined strings
  (`lib/shopify/cart-lines.ts`, `lib/purchasability.ts`); this pass reused
  them rather than writing new customer-facing wording.
- **Blocked on DEV-LAUNCH-02 (flag configuration)**: done, see
  `DEV-LAUNCH-02-config.md`.
- **Real no-rate-to-destination and dropped-on-add QA fixtures**: not
  available on the QA store today (see live-verification note above).
  Recommend the same ask made in `DEV-LAUNCH-07`/`08` — a dedicated fixture
  from Izzy (a product/variant with a delivery-profile gap for the test
  destination) would let `e2e/axe-states.spec.ts`-style live Playwright
  coverage be added on top of the unit/component suite that already exists.
