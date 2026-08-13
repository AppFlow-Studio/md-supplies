# RX Compliance — Verification Record (2026-08-02)

Evidence for the ten points required before moving past RX. Every claim below
was checked against git history or source, not asserted.

| # | Claim | Verdict | Evidence |
|---|---|---|---|
| 1 | Original base required sign-in/account creation **and** document upload for RX carts | **CONFIRMED** | `git show origin/main:lib/rx-gate.ts` → `blocked: input.cartHasRx && (!input.signedIn \|\| !input.hasDocument)` — unconditional, no flag |
| 2 | The remediation work is what made it default-off | **CONFIRMED** | `git log -S"RX_CHECKOUT_ENFORCEMENT === 'true'"` → introduced by **`71e1b65`**, which exists only on `fix/complete-clean-fix-plan-2026-07-30` and this branch — never on `origin/main` |
| 3 | Tag-only **and** `custom.is_rx_only`-only products enter the same gate | **CONFIRMED** | `isRxProduct()` unions both; `rx-compliance-regression.test.ts` asserts both paths reach `isGatedRxProduct` and `cartRequiresRxGate` |
| 4 | Approved exemptions unchanged | **CONFIRMED** | `diff` of the `EXEMPT_VENDORS`→`isExemptProduct` block between `origin/main` and HEAD shows **only** the added `isRxOnly` input field; exemption logic byte-identical (`dynarex`) |
| 5 | No invented or broadened exemptions | **CONFIRMED** | `isInsulinSyringeExempt()` still `return false` — an inert scaffold. A regression test asserts a product titled "Insulin Syringe 1cc" is still gated |
| 6 | Cart popup and full cart both block consistently | **CONFIRMED** | `rxGate.blocked` branch present in both `CartPageClient.tsx` and `CartPopup.tsx`; both render `RxGatePanel` |
| 7 | `prepareCheckout()` still performs the server-side recheck | **CONFIRMED** | `app/actions/rx.ts:100` — `const status = await getRxGateStatus()` then `if (status.blocked) return { ok: false, status }`, before any checkout URL is handed back |
| 8 | Companion Shopify validation app untouched | **CONFIRMED** | `git diff --name-only 8ce74a5..HEAD` over `lib/shopify/admin.ts`, `lib/rx-storage.ts`, `lib/rx-scan.ts`, `app/api/account/rx-document/route.ts`, `components/account/RxDocumentCard.tsx`, `app/actions/rx.ts`, `components/store/RxCheckoutGate.tsx` → **empty**. No file changed |
| 9 | Labels cannot create, remove or override RX status | **CONFIRMED** | `resolveShopifyLabels()` returns display objects only and is never consulted by `rx-gate`. Regression test renders a label literally reading "Rx Only" on a non-RX product and asserts the cart is still not gated |
| 10 | RX badge informational; account/document flow functional | **CONFIRMED** | PDP badge is derived from `isRxProduct()` for display; blocking lives in `resolveGateStatus()` + `prepareCheckout()`. Same union feeds both, so badge and gate cannot disagree |

## Current default

`isRxEnforcementEnabled()` returns **true unless the env var is exactly the
string `"false"`**. Unset, empty, `"0"`, `"no"`, `"off"`, `"FALSE"`, or a typo
all leave the gate **ON**. The failure direction is deliberate: an over-gated
sale is recoverable, an ungated prescription sale is not.

`RX_CHECKOUT_ENFORCEMENT=false` is retained **only** as an emergency kill switch
for a production misfire. It is not a launch toggle and must not be set in
normal operation.

## Scope — stated so it is not overclaimed

This is the **storefront UX gate**. It is not, and must not be described as, a
bypass-proof legal control: a determined user can still reach a checkout URL
directly. The **bypass-resistant** control is the companion Shopify validation
app, which reads `compliance.rx_verified` and is untouched by this work.

## Regression coverage

`lib/__tests__/rx-compliance-regression.test.ts` — 14 tests:
default-ON with no flag set · signed-out RX cart blocked · signed-in without
document blocked · document on file proceeds · non-RX never blocked · tag-only
gated · metafield-only gated (the 40 active products the tag missed) · mixed
cart gated · Dynarex exemption preserved exactly · insulin scaffold still inert ·
labels cannot alter RX · zero-price logic independent of RX · both Storefront
queries select tags **and** `custom.is_rx_only`.

## Not verified here

Real-browser walkthrough of the signed-out → account-creation → upload →
checkout-unblocked sequence. Logic and wiring are proven by tests and source;
the end-to-end UX pass is still outstanding.
