# Izzy Production Handoff — 2026-07-30

Production Shopify/app actions required to unblock the remaining launch items.
Developers made **no** Admin writes, app-config changes, rate changes, or
deployments. Each task below states the target, the change, the expected result,
the evidence to capture, and the rollback.

Change-control standard (plan §6.1) applies to every item: resolve exact
targets → dated export/screenshot of current value → smallest safe batch →
record IDs/counts/errors → provide the inverse → restore controlled test
changes after evidence is captured. Never put customer names, addresses,
prescriptions/licenses, payment data, or credentials in tickets or artifacts.

---

## IZ-01 — Confirm the canonical OCC collection (unblocks DEV-OCC-01 count)

- **Target:** Shopify Admin → Collections.
- **Developer finding:** handle `occ` **exists live** and returns the expected
  shoebox assortment (backpacks, combs, toothbrushes, hygiene items). The app
  now uses it as the single canonical source; `OCC_COLLECTION_HANDLE` can
  override per environment without a code change.
- **Required:** confirm `occ` is the intended canonical collection, record its
  **GID** and its **exact product count** (active/draft/archived split).
- **Expected result:** the count reconciles with the storefront's "All OCC
  Products" total after documented exclusions.
- **Evidence:** collection GID, dated product count, screenshot.
- **Rollback:** none (read-only confirmation).

## IZ-02 — Confirm the intended gifts/toys OCC category

- **Target:** Shopify Admin → Collections.
- **Finding:** `gifts-toys` does **not** exist; the OCC page linked to it and
  404'd. The link was removed.
- **Required:** supply the correct handle, or confirm the category is retired.
- **Evidence:** handle + GID, or written confirmation of retirement.
- **Rollback:** re-add the entry to `OCC_HUB.eligibleCategories`.

## IZ-03 — Fordeer headless path (unblocks DEV-LABEL-01)

- **Target:** Fordeer Product Labels & Badges app + Fordeer support.
- **Finding:** public materials document **theme** injection only; no public
  API/app-proxy/metafield/webhook path was found in the sources reviewed.
  Scraping theme DOM and undocumented admin calls are prohibited and were not
  implemented.
- **Required (one of):**
  1. Written vendor confirmation of a supported retrieval method (API, app
     proxy, metafield/metaobject output, webhook, or export), **or**
  2. Client approval of the synchronization fallback: mirror approved campaigns
     into dedicated Shopify metafields/metaobjects, with Fordeer remaining the
     single staff workflow and a documented sync interval.
- **Also required:** export the active campaign inventory — Rx Only, Free
  Shipping!, BackOrder ETA — with assignment conditions, variant scope,
  priority, schedule, placement, and target pages.
- **Proof of round-trip:** change one controlled label in Fordeer, confirm the
  storefront reflects it after the documented sync/cache interval, then restore.
- **Evidence:** vendor response, campaign export, test product/variant GIDs,
  cache/sync timing, before/change/after screenshots.
- **Rollback:** restore the original label state (record it before changing).

### Fordeer support request template

> We run a headless storefront (Next.js) against our Shopify store and use
> Fordeer Product Labels & Badges. Our storefront does not render the Shopify
> theme, so theme/script injection cannot deliver labels to our customers.
> Please confirm whether Fordeer supports any of the following for reading our
> active label/campaign assignments server-side: (1) a public REST/GraphQL API,
> (2) an app proxy endpoint, (3) writing label state to Shopify
> metafields/metaobjects we can read via the Storefront API, (4) webhooks on
> label assignment changes, or (5) a scheduled export. If none exist, please
> confirm that in writing so we can plan a supported alternative.

## IZ-04 — Canonical backorder + RX sources

- **Target:** product metafields.
- **Current app behavior:** backorder reads
  `custom.estimated_back_order_restock_date` as the single source for both card
  and PDP; a past date is suppressed as stale.
- **Required:** confirm this is the authoritative operational field and state
  the expiry rule. Confirm the canonical **RX** tag — the catalog currently
  carries both `rx-required` (display) and `compliance:rx-only` (gate); one
  should be retired.
- **Evidence:** field/app source, update workflow, expiry rule, representative
  product GIDs. Verify SKU 10932's current status before using it as a fixture.
- **Rollback:** n/a (confirmation + optional tag cleanup with a recorded before state).

## IZ-05 — Vendor/product return policy data (completes DEV-POLICY-01)

- **Target:** product/vendor return-policy source.
- **Current app behavior:** every PDP shows a RETURNS tab rendering the approved
  general policy (never empty, no invented vendor rules).
  `resolveReturnPolicy()` already accepts approved vendor text.
- **Required:** populate/normalize the approved per-vendor policy source and
  tell us the exact metafield namespace/key so it can be wired.
- **Evidence:** coverage report + sample product GIDs per vendor/policy/fallback;
  flag missing vendors rather than inventing policy.
- **Rollback:** the general fallback continues to render.

## IZ-06 — Controlled partial-shipment fixture (verifies DEV-ACCOUNT-01)

- **Target:** a controlled, non-sensitive test order.
- **Required:** create an order with **one line of quantity 10**, then fulfil
  **4** and later **3**, each with tracking. Include a second line fulfilled in
  full, and if possible one refunded/canceled quantity.
- **Expected storefront result:** two shipment cards with exact quantities and
  their own tracking numbers; a Pending section showing **3 remaining**;
  refunded units shown as canceled/refunded and **never** as pending.
- **Evidence:** order + fulfillment GIDs, exact line quantities, tracking
  numbers, redacted expected state.
- **Rollback:** cancel/refund the fixture as approved after evidence capture.

## IZ-07 — Claims evidence (unblocks the claims register)

- **Target:** written client approval + source data.
- **Current app behavior:** "12,000+ Facilities", "99.8% Order Accuracy",
  "Fast Shipping", and "8,000+ Products" are registered in `lib/claims.ts` and
  render **nothing** until approved. Related unsourced copy ("1,000+ Active
  Accounts", "24-48 hr Fast Support", "Ships in X", ISO certification,
  "respond in hours") was removed.
- **Required:** a dated catalog census (active/draft/archived) and written
  approval with exact wording and evidence date for any claim to be restored.
  The plan forbids treating 7,384 / 7,385 / 8,000+ / 10,000+ / 12,000+ as
  interchangeable.
- **To enable a claim:** set `approved: true` plus `source` and `evidenceDate`
  in `lib/claims.ts`. All three are required — the guard test enforces it.

## IZ-08 — Shipping verification (DEV-SHIP-01 stays flagged off)

- **Required:** verify the documented Dukal $30 threshold and representative
  checkout behavior using production-safe procedures approved by the client.
  Do not create freight/Canada rules or change rates.
- **Evidence:** cart lines/GIDs, destination, subtotal, expected vs actual rate,
  screenshots, PASS/FAIL/BLOCKED.
- **Note:** `SHIPPING_RESOLVER_ENABLED` remains **off** until wording, data, and
  QA are approved.

## IZ-09 — RX compliance decision (gates enforcement)

- **Required:** written client/compliance decision covering affected
  products/states, acceptable documents, verification owner, expiry, guest
  flow, storage/access/retention/deletion, and the exact checkout rule.
- **Current app behavior:** enforcement is behind `RX_CHECKOUT_ENFORCEMENT`,
  **disabled by default**, and tests prove a disabled default cannot block
  checkout. Upload, private storage, malware scanning, and the RX Only label all
  still work.
- **To enable:** record the written approval in the repo, then set
  `RX_CHECKOUT_ENFORCEMENT=true` in the target environment.
