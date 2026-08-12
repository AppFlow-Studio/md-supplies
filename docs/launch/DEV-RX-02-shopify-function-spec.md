# DEV-RX-02 — Shopify-side checkout validation: status and implementation spec

**Ticket:** DEV-RX-02 (Shopify-side checkout validation for the RX flow) ·
**Priority:** P1 — the one remaining bypass-resistant control for a P0
compliance flow · **Blocks:** Izzy's QA-080, QA-081, QA-082 sign-off items.

## What this is and isn't

Two layers exist for the RX gate:

1. **Storefront UX gate** (`lib/rx-gate.ts`, `app/actions/rx.ts`,
   `RxCheckoutGate.tsx`) — blocks the "Proceed to Checkout" CTA in this
   Next.js app, and `prepareCheckout()` re-checks server-side before handing
   off to Shopify. This layer is **done and tested** (see below).
2. **Shopify-side checkout validation** — a Shopify Function (Cart &
   Checkout Validation extension) that runs *inside Shopify's own checkout*,
   so it still blocks a prescription item even if someone reaches a raw
   Shopify checkout URL without ever going through this storefront (a shared
   link, a scripted Storefront API cart, a browser that skips the JS gate).
   **This layer does not exist yet.** It cannot be built and deployed from
   this repository — it requires a Shopify Partners app connected to the
   store and `shopify app deploy` access, which is Izzy's side, not this
   codebase's. This has been the status since DEV-LAUNCH-08
   (`docs/launch/DEV-LAUNCH-08-verification.md`) and is unchanged by this
   pass — flagging it again here rather than silently re-stating "done."

**Guardrail (already in the task register, repeating it because it matters
here specifically): never describe the frontend/server recheck as
bypass-proof.** It closes the normal customer path. It does not close a
direct-checkout-URL path. Only the Function below does that.

## What's already done (verified this pass, no changes needed)

- `prepareCheckout()` (`app/actions/rx.ts`) re-checks `getRxGateStatus()`
  server-side on every checkout handoff from both cart surfaces (popup and
  `/cart`), and refuses to return a checkout URL for a blocked cart —
  unit-verified in `app/actions/__tests__/rx.test.ts`.
- It also runs `cartBuyerIdentityUpdate` before handoff, associating the
  signed-in customer with the cart. This is the hinge a Shopify Function
  needs: without it, the Function has no reliable way to read the *buyer's*
  compliance metafields from inside checkout, only the cart's.
- RX detection is centralized in `lib/rx-gate.ts` — a tag ∪ metafield union,
  fail-open only in the sense that it can widen the RX set, never narrow it.
  Whatever implements the Function below must import this same policy, not
  re-derive it, or the two will drift.

## Exact spec for the Function (so implementation is fast, not exploratory)

Target: a **Cart and Checkout Validation** Shopify Function
(`purchase.cart-checkout-validation.run` in current API versions — confirm
the exact target/export name against the Shopify CLI's generated scaffold
for the API version in use; do not guess it from this doc, generate it with
`shopify app generate extension` and fill in the logic below).

**Per RX-flagged, non-exempt cart line, block checkout unless the buyer's
`compliance.rx_verified` customer metafield is true.**

Reuse these exact constants/rules from `lib/rx-gate.ts` — every field name
and the union-not-intersection logic must match exactly, or the Function and
the storefront gate will disagree on which carts are RX:

| Concern | Source of truth in this repo |
|---|---|
| RX tag (canonical) | `RX_TAG = 'compliance:rx-only'` |
| RX tag (legacy, still recognized) | `RX_LEGACY_TAG = 'rx-required'` |
| RX metafield | `RX_PRODUCT_METAFIELD = { namespace: 'custom', key: 'is_rx_only' }`, truthy on `"true"`/`"1"`/`"yes"` (case/whitespace-insensitive) |
| RX-flagged rule | tag **OR** metafield (union — see `isRxProduct()`) |
| Exemption | vendor is `dynarex` (case-insensitive) — see `EXEMPT_VENDORS` in `lib/rx-gate.ts`; **do not** wire the insulin-syringe exemption (`isInsulinSyringeExempt`) until Izzy confirms its data expression, per that function's own TODO |
| Gated rule | RX-flagged **and not** exempt — see `isGatedRxProduct()` |
| Buyer verification signal | customer metafield `compliance.rx_verified` (`RX_METAFIELDS` in `lib/rx-gate.ts`) — written server-side via the Admin API in `lib/shopify/admin.ts`, never from the storefront |

Function input query needs, per cart line: `merchandise.product.tags`,
`merchandise.product.vendor`, `merchandise.product.metafield(namespace:
"custom", key: "is_rx_only")`; and on the buyer:
`cart.buyerIdentity.customer.metafield(namespace: "compliance", key:
"rx_verified")`.

On a gated, unverified line: return a validation error targeting the cart
(not a specific line — the gate is cart-level in the storefront UX too) with
a clear, non-legal-sounding customer message, e.g. *"One or more items in
your cart require a verified prescription. Please sign in and upload your
prescription document, then return to checkout."* — matching the tone of
`RxGatePanel`'s existing copy (`components/store/RxCheckoutGate.tsx`), not
inventing new wording.

## Deployment (Izzy, or a dev with Shopify Partners access — not from this repo)

1. `shopify app generate extension` (Cart and Checkout Validation) inside a
   Shopify Partners app connected to the store — this repo has no Partners
   app scaffold (`shopify.app.toml`, `extensions/`) today, confirmed absent.
2. Implement the logic above against the scaffold's actual generated
   GraphQL types for the API version selected (do not hand-copy field names
   from this doc into the Function without checking them against the
   generated schema — Shopify Functions API versions do rename fields).
3. `shopify app deploy`, then activate it under Shopify Admin → Settings →
   Checkout → Checkout Rules (or the app's own configuration UI).
4. Verify against the same fixture set DEV-LAUNCH-08 already established on
   the QA store (`qa-rx-tag-only`, `qa-rx-legacy-tag-only`,
   `qa-rx-metafield-only`, `qa-rx-both`, `qa-rx-exempt-dynarex`) — this
   closes **D-09** (direct checkout URL while blocked) for real, which is
   currently the one acceptance row in `DEV-LAUNCH-08-verification.md`
   marked ⚠️ rather than ✅.
5. Once live, QA-080/081/082 (Izzy's blocked sign-off items) can run against
   the real Function instead of being blocked on its absence.

## What this pass did NOT do, and why

Did not hand-write the Function's JS/GraphQL inside this repo. This repo has
no Shopify Partners app scaffold, no Shopify CLI project, and no way to
compile or validate Function code against the real Cart/Checkout Validation
schema from here — writing it blind risks shipping code that looks
plausible but doesn't compile against the actual API version, which is worse
than clearly specifying it (a broken "bypass-proof control" nobody notices
is broken is a worse outcome than an honestly-documented gap). The spec
above is written so implementation, once someone has Partners/CLI access, is
a translation exercise against the existing policy in `lib/rx-gate.ts`, not
a design exercise.
