# Task triage — Bilal's final launch direction + Izzy's blocking question — 2026-08-17

**Prepared by:** Sardor (dev) · **For:** Bilal / Izzy
**Sources:** Bilal's launch-direction message (deadline EOD ET today, Monday
Aug 17), Izzy's two follow-ups (10:57 PM LG-04 build status + field-shape
question, 2:51 AM re-ping), `docs/launch/2026-08-14-status-and-screenshot-checklist.md`,
`docs/launch/2026-08-14-variant-field-contract.md`, current code state.

This maps Bilal's P0.1–P0.7 against what's actually implemented, answers
Izzy's blocking question, and separates what dev can do today from what only
a human (Slack reply, Shopify Admin click, deploy approval) can do.

---

## 1. Answer to Izzy — field shapes (the urgent, blocking question)

Izzy has `order_size` and `units_per_order` (both already-confirmed, already-wired
single-line-text variant metafields) but needs three more numbers to render
the plan's own example line — "Order unit: Case, 8 boxes per case, 100 per
box, Total: 800 syringes" — and currently only has that data embedded as text
inside `units_per_order`.

**Recommendation: new typed fields, don't parse the text field.** Izzy's own
gauze/syringe/pen-needle exceptions (SKU collisions, per-variant case sizes,
missing data on some variants) show the source data is too irregular for
reliable regex parsing, and the plan explicitly warns against deriving
numbers rather than storing verified ones. Store all three as given — don't
compute the total as inner × outer, since "Each" variants (1 Each = 1) and
single-layer packs (Bag/Case) don't decompose into two multiplicands, so a
derived total would need special-casing anyway.

Proposed addendum to `docs/launch/2026-08-14-variant-field-contract.md` (same
owner type and access as the four confirmed fields):

| Merchant-facing name | Namespace.key | Type | Storefront access |
|---|---|---|---|
| Inner Pack Quantity | `custom.inner_pack_quantity` | Number (integer) | PUBLIC_READ |
| Packs Per Case | `custom.packs_per_case` | Number (integer) | PUBLIC_READ |
| Total Order Quantity | `custom.total_order_quantity` | Number (integer) | PUBLIC_READ |

- Scoped to **Product variant**, grouped under Bilal's "Variant Display
  Details" set, same as the four confirmed fields.
- Number (integer), not text — no reparsing, and Shopify enforces the type at
  entry instead of dev discovering a stray non-numeric value at render time.
- Leave null on the two pen-needle variants (and any other variant) that
  genuinely lack this data — `resolveVariantValue` already falls through to
  the product-level value on null, same mechanism as the four confirmed
  fields, so no new resolver logic is needed.
- These three are additive to the four confirmed fields, not a replacement —
  `order_size` and `units_per_order` stay exactly as they are for the
  above-the-fold summary; the three new fields feed the Order Packaging tab's
  detail breakdown only.

**Reply-ready text for Izzy:**
> Field shapes: three new variant metafields, `custom.inner_pack_quantity`,
> `custom.packs_per_case`, `custom.total_order_quantity`, all Number
> (integer), PUBLIC_READ, Product-variant-scoped, grouped under Variant
> Display Details alongside the four confirmed fields. Store all three as
> given, don't derive the total — Each/Bag families won't decompose cleanly.
> Leave blank wherever you have no data; the existing fallback logic handles
> nulls the same as the four confirmed fields already do. Go ahead and
> create these — once you've written real values to a couple of QA products
> I'll wire `GET_PRODUCT` to read them (it's a ~30-minute change matching the
> existing pattern) and confirm the display renders.

Izzy's second question ("tell me when the display works in QA") — **not yet**,
and not just because of this field-shape gap: the AeroWalk pilot itself is
still waiting on Izzy's four confirmed-field metafield definitions existing
with Storefront `PUBLIC_READ` and real data written to the QA product Bilal
named (`9365094531305`, variants `51633171923177`/`51633171955945`/`51633171988713`).
`.env.local` already points this repo at the QA store
(`md-supplies-qa-shipping-and-checkout.myshopify.com`), so the moment that
data lands, verification here is same-day, not a new blocker.

---

## 2. Dev tasks completable now (no Izzy data needed)

1. **Send the field-shape answer above to Izzy** — unblocks LG-04 packaging
   work immediately, highest-leverage thing to do first.
2. **H-01 Vendor Shipping & Returns — re-scope, it's smaller than the 08-14
   checklist says.** That doc lists it as blocked on "new Admin API scope."
   Checked `lib/shopify/admin.ts`: it's a narrowly-scoped RX-only client, but
   every other `custom.*` field (Rx, Backorder, Free Shipping, ETA) is
   already read through the plain **Storefront** API in `GET_PRODUCT`, not
   Admin. `custom.shipping_returns` only needs Admin API if Izzy leaves it
   without Storefront `PUBLIC_READ` — same "silent null" trap already
   documented for `brand_name`/`free_shipping`. Recommend: add
   `shippingReturns: metafield(namespace: "custom", key: "shipping_returns")`
   to `GET_PRODUCT` now, build the "Vendor Shipping & Returns" section (hide
   when empty, preserve rich text, place under its own heading), and confirm
   with Izzy that Storefront access is enabled — no new Admin scope work
   needed unless that assumption is wrong.
   - **Caution, do not do the obvious thing:** Bilal's P0.5 says "Remove
     'Shipping calculated at checkout' from the custom PDP." That exact
     string is *also* `SHIPPING_FALLBACK_MESSAGE` in
     `lib/shipping-resolver/copy.ts` — the tested, intentional fallback copy
     for the unrelated Free Shipping resolver (H-02), used across
     `ShippingBlock`, `CartPopup`, `CartPageClient`, product cards, etc. Bilal
     almost certainly means a *different*, stale line from the old
     hand-written vendor-shipping section of the PDP, not the resolver's
     fallback. Removing the resolver's constant would break H-02. Worth one
     line back to Bilal to confirm which occurrence he means before touching
     `lib/shipping-resolver/copy.ts`.
3. **P0.2 pricing safety — confirm the code side needs nothing.**
   `lib/purchasability.ts#resolvePurchasable` already fails closed on
   `availableForSale === false` (price-unavailable is even checked *first*,
   so it never misreads as generic "Out of Stock"). Once Izzy flips the four
   sharps Case variants (8699265450200/110385, 8699265745112/110327,
   8699266105560/110328, 8699265974488/110388) to unavailable in Admin, the
   storefront will correctly disable them with no code change. Nothing to
   build here — just a QA check once Izzy confirms the Admin-side flip.
4. **Draft the LG-03 AeroWalk verification runbook against the real IDs.**
   Bilal's message supplies the actual QA product/variant IDs for the first
   time (previously the contract doc only had placeholder Blue/White/Grey
   handles). Worth pre-writing the exact Storefront queries / URLs to hit the
   moment Izzy confirms the metafield definitions + data are live, so
   verification isn't blocked on writing test steps after the fact.
5. **Re-verify the H-04 ETA display question is actually resolved.** Bilal's
   message names `custom.estimated_back_order_restock_date` as authoritative
   and says "a missing ETA must not hide a valid Backorder label" — but
   doesn't explicitly say whether a *present* ETA should render alongside
   "Backorder" (the original ask) or stay hidden (current shipped behavior).
   Current behavior is compatible with what Bilal wrote either way, since it
   never shows a date at all. This is technically still unconfirmed, not
   contradicted — low-priority one-line check back to Bilal, not a code task.

## 3. New tasks discovered (not on the 08-14 checklist)

- **Field-shape addendum** to `docs/launch/2026-08-14-variant-field-contract.md`
  for the three packaging-breakdown fields (§1 above) — needs writing once
  Izzy confirms the names/types, then `GET_PRODUCT` (`lib/shopify/queries/products.ts`
  ~line 99) and `types.ts` need the three new lines, same pattern as the
  existing four.
- **H-01 re-scope** — likely just a Storefront query + component, not new
  Admin API work (§2.2). Checklist should be corrected once confirmed.
- **P0.5 string-collision risk** between Bilal's literal instruction and the
  Free Shipping resolver's fallback copy (§2.2) — needs one clarifying
  question back to Bilal before implementation, so it doesn't silently break
  H-02 during H-01 work.
- **AeroWalk QA runbook against real IDs** (§2.4) — not previously possible
  since no real IDs existed before this message.

## 4. Tasks that need a human, not code (yours to do manually)

- **Reply to Izzy in Slack** with the field-shape answer in §1 — this is the
  single highest-priority action item; Izzy is blocked until this lands.
- **Ask Bilal to disambiguate the "Shipping calculated at checkout" removal**
  (§2.2) before H-01 work touches anything shipping-copy-related.
- **Confirm with Bilal/Juliette** (low priority, can wait) whether a present
  ETA should ever render alongside "Backorder," or whether always-plain
  "Backorder" is the final answer (§2.5).
- **Wait on Izzy** for: the four AeroWalk metafield definitions + QA data
  written against the real IDs Bilal supplied; `custom.shipping_returns`
  Storefront `PUBLIC_READ` confirmation; the three new packaging fields once
  created; the sharps Case variants flipped to unavailable in Admin; Free
  Shipping (`custom.free_shipping`) writes staying on hold per P0.4 until
  Juliette's workbook lands.
- **Deploy/access steps for P0.7** — pushing the branch, confirming
  production environment variables (`SHIPPING_RESOLVER_ENABLED=true` in
  Vercel Preview *and* Production, not just `.env.local`), and the final
  production smoke test are explicitly human-confirmed steps per the plan,
  not something to automate away — do these once LG-01/02/04/05 have
  actually landed in Shopify, per LG-06's stated dependency.
- **Screenshot checklist** in `2026-08-14-status-and-screenshot-checklist.md`
  §4 — still correct as written, still gated on Izzy's AeroWalk write
  landing first; nothing to change there except substituting the real
  handle once Izzy provides it.

---

## 5. Same-day update — H-01 built, AeroWalk QA write confirmed live, one real bug found and fixed

**H-01 (Vendor Shipping & Returns) is implemented and TDD'd**, `GET_PRODUCT` →
`types.ts` → `normalizeProduct` → `ProductView.tsx` RETURNS tab, hidden when
empty, general return policy (IZ-05, a separate still-unconfirmed field)
untouched. 5 new tests, full suite still green (146/146 files, 1484/1484
tests), `tsc` and lint clean. Did **not** touch the "Shipping calculated at
checkout" string pending your disambiguation (§2.2).

**The AeroWalk QA pilot data is already live** — queried the QA store
directly (`scripts/verify-aerowalk-qa-pilot.ts`, read-only) against the IDs
Bilal supplied:

- Handle: `aerowalk-ultra-lite-rollator-rolling-walker-blue`
- Blue/White/Grey each have their own image, manufacturer number
  (`10277BL`/`10277WT`/`10277GY`), order size (`Each`), and units per order
  (`1 Each`).
- `custom.shipping_returns` is also already populated with real Drive
  Medical shipping/return terms, and Storefront `PUBLIC_READ` is confirmed
  enabled (we got real text back, not a silent null).

**Real bug found via that same query, now fixed:** `custom.variant_description`
was created as Shopify's **Rich text** metafield type, not the "Multi-line
text" type the field contract proposed — its raw value is JSON
(`{"type":"root","children":[...]}`), not display text. Unfixed, the PDP's
Variant Details block would have printed that JSON verbatim for all three
AeroWalk colors. `custom.shipping_returns` carries the same shape (confirmed
against the real data above) — Bilal's message calls it "rich text"
directly, so this wasn't a guess.

Fixed with a shared parser, `lib/product/rich-text-to-plain.ts` (9 unit
tests), wired into `normalizeVariant` (description) and `normalizeProduct`
(shippingReturns). Falls back to returning the raw string unchanged when it
isn't JSON, so a field Izzy did create as genuine Multi-line text is never
mangled. Verified against the real Drive Medical text above — it parses to
clean, correctly-paragraphed plain text, not raw JSON.

**Net effect:** LG-03's AeroWalk pilot and H-01 are both substantially
verifiable right now, ahead of the checklist's assumption that both were
still blocked on Izzy. Recommend running the full screenshot checklist
(§4 of the 08-14 doc) against `aerowalk-ultra-lite-rollator-rolling-walker-blue`
today rather than waiting further.

## 6. Second same-day update — LG-04 packaging breakdown wired and verified

Izzy created the three fields from §1's proposal exactly as specified —
`custom.inner_pack_quantity` / `custom.packs_per_case` / `custom.total_order_quantity`,
Number integer, variant-scoped, PUBLIC_READ, pinned — and wrote 458 values
across 117 products in QA. Wired the full path (query → types → normalize →
`ORDER PACKAGING` tab, three new independently-optional rows, no
product-level fallback for any of them) via TDD, 12 new tests, still
146/146 files green (1493/1493 tests), `tsc`/lint clean.

Verified against 2 of Izzy's 3 named test products
(`scripts/verify-lg04-packaging-breakdown.ts`, read-only):

- `3cc-23g-x-1-1-2-im-thin-wall-luer-lok-tip-box-309589` — Box variant has
  inner+total, no packs; Case variant has inner+packs, blank total. Both
  combinations render correctly (each of the three rows is independently
  gated, not an all-or-nothing group).
- `1cc-27g-x-1-2-luer-lok-syringe-detachable-needle-box-305789` — Case
  variant is total-only as described; Box variant actually carries both
  inner and total (50/50), not "nothing else" — a data nuance, not a bug,
  and it renders fine.
- `pen-needle-4mm-depth-32g-x-5-32-box-9543` — **404s via the Storefront
  API**, could not verify the "two variants with nothing at all" fallback
  case at all. Either the handle differs from what's in QA, or this product
  isn't published to the Storefront/Headless sales channel. Needs Izzy to
  confirm the exact handle or its publication status — flag back to them
  rather than guessing.
