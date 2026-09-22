# PR body — `catalog-cro-review` → `main`

Ready to paste. Prepared 2026-09-21, updated 2026-09-22 with the vendor
attribution scope gate.

**Suggested title:** `Catalog CRO, storefront improvements, and analytics hardening`

---

## What this is

The accumulated `catalog-cro-review` work since PR #69, plus a full hardening
pass on ecommerce analytics and campaign attribution.

**267 files changed, ~27,400 insertions, ~870 deletions, 39 commits.**

## Contents by area

| Area | What changed |
|---|---|
| **Analytics / tracking** | Full hardening pass — see the dedicated section below |
| **TrustShop reviews** | Product + store reviews integrated; JSON-LD, PDP wiring on both product routes, schema corrections to match the real API contract, zero-review states, evidence-capture specs |
| **Favorites** | Customer favorites — heart a product, saved to the account |
| **Catalog / CRO** | Variant-aware PDP titles, backorder read from the selected variant (not the parent), free-shipping gating, variant descriptions replacing rather than supplementing the parent |
| **Navigation** | Category rows split into a name link + disclosure chevron; PPE/Testing tiles and partner category pills pointed at real collections |
| **Partners** | Removed a broken Figma asset URL and white-on-white brand logos |
| **Redirects** | 1,545 missing headless redirects recovered from the August consolidation; `docs/redirects-ready.json` regenerated from Shopify's live URL Redirect list |
| **SEO** | Trocars & Trocar Kits Tier-1 on-page SEO, SEO-CATEGORY-01 cross-sell brief, legacy-path encoding hardening, OCC metadata drift fixes, backlink inventory sync |
| **Account** | Shipment status wording, Total Orders count, never show "Delivered" for FULFILLED without carrier confirmation, removed token debug logs |
| **CSP / layout** | Split into `(site)` and `(protected)` root layouts so the per-request CSP nonce works on `/account` and `/search` (PPR is incompatible with nonce-based CSP in a shared static shell) |

## Analytics hardening

Four defects were silently losing data. Each was confirmed against a real
`next build && next start` or the live Storefront API — not inferred.

- **Campaign attribution was destroyed at the checkout handoff.** Shopify's
  `cartAttributesUpdate` *replaces* the attributes array; the single-key helper
  sent only its own pair. Verified live: a 6-attribute cart became a
  1-attribute cart. Now read-merge-write.
- **`/product/[slug]` emitted no `page_view` at all.** `useSearchParams()`
  forces its Suspense boundary to client-render, and on a PPR-postponed route
  (`x-nextjs-postponed: 1`) that boundary never resolved. Fully-prerendered
  routes were fine, which is why it went unnoticed — but the PDP is exactly
  where campaign traffic lands. Now reads `window.location`.
- **`/cart` emitted no `view_cart`.** The effect's dependency array was empty,
  so it ran on the mount where `cart` is still `null` (the provider hydrates it
  asynchronously) and the guard was false every time.
- **Every ecommerce event was polluted by the previous one.** GTM merges pushes
  into its model and merges arrays *by index*, so a 24-item `view_item_list`
  left items behind. `track()` now clears `ecommerce` centrally.

Also in this PR:

- **SKU, variant and brand** on every ecommerce item; four duplicated cart-line
  mappers collapsed into one `cartLineToGA4Item`.
- **`add_to_cart` is success-gated** — it fires only after Shopify returns a
  cart actually containing the requested line, never on a button click.
- **`remove_from_cart` and `search`** events added (both were missing).
- **UTM / click-ID capture** — first-touch (`md_attr`) httpOnly cookie, 90
  days, capturing `gclid`/`gbraid`/`wbraid`/`msclkid`/`fbclid` and every
  `utm_*`. A request with no campaign params is a no-op, never a reset. The
  last-touch companion (`md_attr_last`) is **gated** — see the scope section.
- **Shopify order attribution** — ⛔ **gated, off by default.** When enabled,
  the campaign is stamped onto the cart at creation (via `after()`, off the
  critical path) and therefore onto the order. Not active in this merge.
- **GA client/session forwarding** — the purchase pixel now receives
  `ga_client_id` *and* `ga_session`. `client_id` alone starts a new GA4 session,
  which has no campaign parameters and resolves to `(direct)`, detaching revenue
  from the campaign that earned it.
- **PII safeguards** — search terms are redacted for emails and phone numbers
  before reaching GA4; subscriber-level identifiers (`mc_eid`) are excluded from
  order attributes; nothing Rx-related is ever sent.
- **Vendor campaign compatibility** — there is no "Jant tracking system"; Jant
  uses the same infrastructure every campaign uses. Docs in `docs/analytics/`.

`purchase` is deliberately emitted by the Shopify Customer Events pixel only —
the storefront cannot emit one, and a second source would double-count revenue.

## Vendor Attribution Scope Gate

**The branch contains the implementation for persistent vendor/order
attribution, but it is intentionally disabled by default behind
`ENABLE_PERSISTENT_VENDOR_ATTRIBUTION`. This feature remains inactive pending
separate funding/scope approval. Standard GA4/GTM ecommerce tracking remains
active and is not gated.**

The code is here so it does not rot and so activation is a configuration change
rather than a rebuild — not because it is switching on with this merge.

| | |
|---|---|
| Flag | `ENABLE_PERSISTENT_VENDOR_ATTRIBUTION` (server-only, not `NEXT_PUBLIC_`) |
| Default | `false` — fails closed on unset, blank, `0`, `false`, `TRUE`, typos |
| Helper | `lib/analytics/vendor-attribution-flag.ts` |
| Gate points | `proxy.ts` (last-touch cookie) · `app/actions/cart.ts` (Shopify stamping, gated at the call site **and** inside the server action) |

**Inactive until funded:** the `md_attr_last` cookie; multi-session persistence
of vendor campaign identity independent of GA4; `md_utm_*` / `md_first_utm_*` /
`md_<clickid>` fields stamped onto the Shopify cart and order; deterministic
"which vendor email sold this order" linkage; vendor order-level reporting.

**Explicitly NOT gated — all still active:** UTM intake and GA4
source/medium/campaign; `page_view`, `view_item`, `view_item_list`,
`select_item`, `search`, `add_to_cart`, `remove_from_cart`, `view_cart`,
`begin_checkout`; standard Shopify → GA4 `purchase`; SKU/variant/brand/price/
quantity/currency; Google Ads click ids; PII redaction; duplicate-conversion
protection.

Three deliberate carve-outs reviewers should check:

1. **`md_attr` (first touch) is NOT gated.** It predates this work
   (DEV-LAUNCH-12) and is in scope — `app/api/contact` and `app/api/sourcing`
   read it so a rep sees which campaign produced a lead. Gating it would remove
   shipped, agreed functionality.
2. **`ga_client_id` / `ga_session` are NOT gated.** They exist so a Shopify
   purchase lands in its originating GA4 session; without them it starts a new
   session, resolves to `(direct)`, and standard revenue attribution breaks.
   Core analytics, not the vendor layer.
3. **The `cartAttributesUpdate` read-merge-write fix is NOT gated.** It is a
   general correctness fix — Shopify *replaces* the attributes array, so the
   old single-key write silently destroyed existing attributes.

Enforcement is server-side at both points, so the boundary cannot be flipped
from a URL, the console, or browser storage.

Proven at runtime against real production builds:

| | `md_attr` (in scope) | `md_attr_last` (gated) |
|---|---|---|
| Flag unset (production default) | written | **not written** |
| Flag `=true` | written | written |

…with `page_view`, `view_item` (SKU `2655`, brand, price, currency) and
`add_to_cart` (qty 1, SKU, value 106) all firing normally in **both** states.

**To activate after approval:** set `ENABLE_PERSISTENT_VENDOR_ATTRIBUTION=true`
in the approved environment and redeploy. No code change.

## Quality gates

| Gate | Result |
|---|---|
| **Tests** | **PASS** — 2216 passed, 195 files (was 2186/194; **+30** scope-gate tests covering flag on, flag off, and the unset-variable safety case) |
| **Build** | **PASS** — `next build` compiles clean |
| **Typecheck** | 1 **pre-existing** error in `app/api/catalog/__tests__/route.test.ts`; no new errors from this branch |
| **Lint** | 18 **pre-existing** errors in `CategoryFilterableGrid.tsx` (16), `FavoriteButton.tsx` (1), `useSelectedVariant.ts` (1); **zero** in any analytics file |

`useSelectedVariant.ts` is byte-identical on `main` and already carries its
error, so CI lint is red independently of this branch. Both failures predate
the analytics work — confirmed by stashing it and re-running.

## External configuration (outside this repo)

Already done: GTM container `GTM-5BQJLLJV` **Version 2** is published — Google
Tag `G-GSMEPRM9RX` with `send_page_view=false`, 9 GA4 event tags on matching
custom-event triggers with *Send Ecommerce data → Data Layer*, 9 Data Layer
variables, no purchase tag. GA4 DebugView has confirmed event receipt.

Still open, and **not** claimed by this PR:

1. The live Shopify Customer Events pixel has never been inspected — the audit
   account lacks permission. The repo copy still carries the `G-XXXXXXXX`
   placeholder; the real value is `G-GSMEPRM9RX`.
2. No controlled test order has been placed, so `purchase` is unproven
   end-to-end.
3. `item_sku` is not yet registered as an item-scoped custom dimension in GA4
   (custom dimensions are not retroactive).
4. The Google & YouTube sales channel is installed and Active with 0 extensions
   — a latent double-count if its conversion tracking is ever enabled.
5. No consent-management platform exists in the repo or the container.

## After merge

Deploy → verify live `view_item`/`add_to_cart` on production → confirm the
Shopify pixel carries `G-GSMEPRM9RX` → one controlled test order → validate the
GA4 `purchase` and the Shopify order attributes.

---

## Blocker (why this PR is not open yet)

`BilalA99` has **read-only** access to `AppFlow-Studio/md-supplies`:

```
permissions: { admin: false, maintain: false, push: false, triage: false, pull: true }
```

`git push upstream catalog-cro-review` returns:

```
remote: Permission to AppFlow-Studio/md-supplies.git denied to BilalA99.
fatal: ... The requested URL returned error: 403
```

The push is a clean fast-forward (remote `9e4ca71` is an ancestor of local
`822d044`, 0 behind / 3 ahead), so it will succeed as soon as write access
exists. Nothing else is required.
