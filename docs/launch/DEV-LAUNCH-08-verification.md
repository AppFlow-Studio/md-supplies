# DEV-LAUNCH-08 — RX Compliance Consistency

**Ticket:** DEV-LAUNCH-08 (2026-08-05) · **Priority:** P0 launch gate · **Owner:** Developers
**Builds on:** [DEV-LAUNCH-07-verification.md](./DEV-LAUNCH-07-verification.md)
**Branch:** `catalog-cro-review-sardor-dev`

## Starting position

RX detection and the gate itself were already solid: `lib/rx-gate.ts`
(tag ∪ `custom.is_rx_only` union, Dynarex exemption, enforcement ON by
default), `app/actions/rx.ts` (`prepareCheckout()` re-checks server-side and
runs `cartBuyerIdentityUpdate` before every handoff), and 57+ passing unit
assertions (`lib/__tests__/rx-gate.test.ts`,
`rx-compliance-regression.test.ts`) already proved the tag-only,
metafield-only, dual-signal, non-RX, and exemption logic paths, plus the
enforcement-default regression. `docs/audits/.../rx-compliance-verification.md`
recorded 10/10 confirmed claims on 2026-08-02, with one explicit gap: **"Not
verified here: real-browser walkthrough."** This pass closed that gap where
it's actually closable today, fixed real display-consistency gaps, and
documents precisely what's still blocked on Izzy/Munis.

## Defects found and fixed this pass

### 1. Quick add showed no RX indicator at all

`ShopifyQuickAddButton.tsx`'s `toCardData()` already computed
`isRx: isRxProduct(...)` — the same union the card and PDP use — but nothing
in `QuickAddContent.tsx` ever rendered it. A shopper opening quick add on an
RX product saw no warning at all until the cart gate blocked checkout later.
Fixed: `QuickAddContent.tsx` now renders the same "RX Only" badge as the card
and PDP whenever `product.isRx` is true. Extracted the badge copy
(`RX_ONLY_LABEL_TEXT` / `RX_ONLY_ACCESSIBLE_TEXT`) out of `resolveRxLabel()`
into shared constants in `lib/labels/labels.ts` so a surface with only the
boolean flag (not the raw tags/metafield) still shows byte-identical wording.

### 2. Cart popup and cart page showed no per-line RX indicator

Both `CartPopup.tsx` and `CartPageClient.tsx` already render `RxGatePanel`
when the cart is blocked, but neither showed which *line* was the RX one —
only useful once already blocked, and invisible on a cart with a document on
file (where the panel never renders, so an RX line looked identical to any
other). Fixed: both now call `resolveRxLabel(line.merchandise.product.tags,
line.merchandise.product.isRxOnly)` per line and render the badge — same
union, same component, both cart surfaces agree with the card/PDP/quick add.

### 3. Stale comment claiming enforcement is OFF by default

`RxCheckoutGate.tsx`'s file-level comment still said "gated by
`RX_CHECKOUT_ENFORCEMENT` and OFF by default — the compliance decision is
still blocked in the execution plan (§9.1)." This has been wrong since
DEV-LAUNCH-02 corrected `lib/rx-gate.ts`'s actual default to ON (Bilal
confirmed 2026-08-02) — the *code* was already correct, only this comment
still claimed the old, more dangerous default. A future reader trusting the
comment over `lib/rx-gate.ts` would conclude RX enforcement is off when it is
on — the same class of doc/code mismatch DEV-LAUNCH-02 fixed in
`docs/env-feature-flag-register.md`. Fixed to match current behavior.

None of the three affects the gate's actual blocking decision — all are
display-consistency or documentation-accuracy gaps, not new ways to bypass
checkout.

## New test coverage this pass

- `app/actions/__tests__/rx.test.ts` (new, 5 tests) — the one thing the
  existing pure-function tests couldn't cover: that `prepareCheckout()`
  *actually* calls the recheck before returning a checkout URL, and never
  runs `cartBuyerIdentityUpdate` for a cart the gate just blocked. Covers
  signed-out block, signed-in-no-document block, **metafield-only block with
  no tag at all** (the case the ticket calls "the easiest case to miss"),
  successful handoff once a document is on file, and a non-RX cart never
  blocking.
- `components/product/__tests__/QuickAddContent.test.tsx` (extended) — RX
  badge shows/hides correctly.
- `components/store/__tests__/CartPageClient.test.tsx` /
  `CartPopup.test.tsx` (extended) — per-line RX badge for tag-only and
  metafield-only lines, absent for non-RX lines.

```
npx tsc --noEmit                          # clean
npx eslint . --max-warnings 0             # clean
npx vitest run                            # 124 files, 1191 tests passed
rm -rf .next && npm run build              # exit 0, all routes generated, zero API errors
```

## Live verification against the QA store (this pass)

**Correction to the task register:** `docs/TASK-REGISTER-2026-08-03.md`'s
A-03 states "The QA store contains no RX-flagged product at all." That was
true on 2026-08-02/03. It is **no longer true** — this pass found **20
metafield-only RX products** on the QA store today (search syringes, e.g.
`10cc-syringe-slip-tip-case`), via `custom.is_rx_only = true` with **no RX
tag on any of them**. This is exactly the metafield-only case the ticket
flags as the one most likely to be missed, and it is now live-verifiable.
No tag-only or dual-signal fixture was found — see "Still needed from Izzy"
below.

**Ran `scripts/rx-metafield-access-check.mjs` (new, read-only) against the
QA store** — this is the "both Storefront-access gates" proof the ticket's
evidence section asks for:

```
Shop: md-supplies-qa-shipping-and-checkout.myshopify.com (read-only)

== Gate #2: custom.is_rx_only definition — Storefront access ==
  access.storefront = PUBLIC_READ  → OPEN

== Candidate RX products found via Admin (tag or metafield) ==
  20 found

== Gate #1: Storefront token scope (unauthenticated_read_metafields) ==
  [20/20 products: admin value == storefront value, all "ok"]

RESULT: gate #2 (definition access) OPEN, gate #1 (token scope) OPEN
Both gates OPEN — custom.is_rx_only is safely readable via the Storefront API.
```

Both gates are open on the QA store today. (Deliberately **not** wired into
`instrumentation.ts` as a boot-time network assertion — see "Decision not
made" below.)

**Manual browser walkthrough** (dev server against `.env.local`, real QA
data), the exact thing the 2026-08-02 verification doc flagged as
unverified:

| Step | Observed |
|---|---|
| PDP for a metafield-only RX product (`10cc-syringe-slip-tip-case`, no tag) | Amber "RX Only" badge renders correctly — proves the badge path also reads the 40-product-gap signal, not just the tag |
| Add to cart, signed out | Cart popup shows the line with its own "RX Only" badge, plus a mixed cart (added a non-RX glove product from an earlier session) |
| Cart popup, signed out, RX line present | "Prescription required" panel renders in place of the checkout button; "Sign In / Create Account" CTA shown — checkout is not reachable |
| Full cart page (`/cart`), same cart | Same per-line RX badge, same gate panel, same block — cart popup and cart page agree |

This confirms D-02 (signed-out RX blocks), D-03 (metafield-only gates
identically to tag-only), D-07 (mixed cart gates), and D-08 (popup and page
block consistently) from `docs/TASK-REGISTER-2026-08-03.md` §D1, against
real QA data, for the first time.

**Not verified live**: the signed-in states (D-04 upload-required, D-05
document-on-file proceeds) and the exemption flow (D-06). These require a
real QA customer account with a session, which this pass did not have
credentials for. Logic is covered by the automated suite
(`rx-compliance-regression.test.ts`, `app/actions/__tests__/rx.test.ts`);
the live walkthrough of those specific states remains open.

## Decision not made: wiring the metafield check into app startup

The ticket asks to "add a startup assertion that fails loudly if the
metafield resolves null across the whole fixture set." I built the
diagnostic (`scripts/rx-metafield-access-check.mjs`) but deliberately did
**not** wire a live Shopify network call into `instrumentation.ts` (this
repo's existing startup-assertion hook, currently used only for env-var
presence checks). Reasoning, flagged here rather than decided silently:

- A live GraphQL round trip on every cold start adds latency and a new
  failure mode — if Shopify's API is briefly slow or unavailable, the whole
  site fails to boot, not just the RX badge degrading.
- The check needs a "whole fixture set" to iterate, and that fixture set is
  itself the open Izzy dependency below — there's nothing stable to hardcode
  yet.

Recommend running the script manually in CI (a scheduled job, not the
request path) once Izzy's fixture set exists, rather than gating app startup
on it. Open to reconsidering if the team wants boot-time enforcement anyway.

## Acceptance criteria status

| Criterion | Status |
|---|---|
| Tag-only, metafield-only, dual-signal behave identically | ✅ unit-verified (all three); ✅ metafield-only additionally live-verified; ⚠️ tag-only and dual-signal not live-verified — no such fixture exists on the QA store |
| Non-RX and approved exemption products are not incorrectly blocked | ✅ unit-verified; exemption (Dynarex) not live-verified — no exempt fixture on QA store |
| Frontend gate never claims to be the Shopify validation control | ✅ — `RxGatePanel` copy makes no legal/compliance claim; code comments corrected this pass (defect #3) to stop overstating the frontend's role in the other direction (silently *understating* enforcement is also a misstatement, just a different one) |
| Mixed RX/non-RX carts follow the RX-required path | ✅ unit-verified + ✅ live-verified this pass |
| Direct checkout cannot bypass the required Shopify validation behavior | ⚠️ our own server code re-checks and refuses a checkout URL for a blocked cart (✅ unit-verified, `app/actions/__tests__/rx.test.ts`) — but the bypass-resistant control for someone who already has a raw Shopify checkout URL is the companion validation app, which does not exist yet (blocked on DEV-RX-02) |

## Dependencies status

- **Blocked on Izzy — validation app selection (DEV-RX-02).** Unaffected by
  this pass; still the only bypass-resistant control, still not built. This
  ticket's frontend work cannot substitute for it and does not claim to.
- **Blocked on Munis — prescription document storage decision:** per
  `docs/security/2026-07-19-secret-containment-rx-storage.md` §3 and §5,
  **this decision was already confirmed by Munis on 2026-07-19** (private
  BunnyCDN zone, authenticated proxy, no public Pull Zone). The ticket's
  dependency line appears to predate that confirmation, or refers to
  something more specific that isn't written down. Two *related* items in
  that same doc are still open and read as more likely what's actually
  meant: **ClamAV malware-scanner deployment** (chosen: self-hosted scan,
  "Option B", by Munis 2026-07-19; code integration complete in
  `lib/rx-scan.ts`, but `RX_SCAN_CLAMAV_URL`/`RX_SCAN_REQUIRED` are unset in
  `.env.local` — uploads currently scan-skip, fail-open, not launch-ready),
  and **security/privacy owner sign-off** on the upload/access/retention
  procedure (unchecked in that doc's own checklist). Worth confirming with
  Munis which of these three is the actual open item before treating this
  as blocked on a decision that may already exist.
- **Needs from Izzy — the five RX fixture classes:** partially satisfied,
  newly discovered this pass. Metafield-only exists (20 products, real).
  Tag-only, dual-signal, and a documented exemption fixture do not appear to
  exist on the QA store as of this pass (a tag search for
  `compliance:rx-only` / `rx-required` returned zero products). Non-RX is
  trivially satisfied by any ordinary product.
