# Sardor — status report: corrections from the 2026-09-17 follow-up, plus the Orders #3435/#3436 delivery-status fix

**From:** Sardor (dev) · **Date:** 2026-09-18

## Summary

Item 1 (variant description) was a genuine correction to the prior report —
the "Variant Details supplement" behavior is gone; the variant description
now replaces the Description section outright, rich text preserved rather
than flattened. Items 2–4 needed no further code change (confirmed below).
Item 5: SHA is at the bottom of this report. Separately, the Orders
#3435/#3436 "shows Delivered but UPS says Label Created" bug is fixed
site-wide with a single centralized resolver — this was a real bug, not a
data-population gap, so it didn't need to wait on Izzy.

## 1. Variant description now replaces the parent Description — done

Reverted the "Variant Details supplement underneath the parent description"
behavior from the last report (that was built to match Izzy's
`variant-field-mapping-2026-09-16.md` note at the time; this correction
supersedes it). `custom.variant_description`, when the selected variant has
one, is now what renders under the "Description" heading — not an addition
below the parent description. Falls back to the parent product description
only when the selected variant's value is blank. Switching Blue → White →
Blue now can never leave the wrong SKU's description on screen, since only
one of the two is ever rendered.

Rich text is no longer flattened to plain paragraphs for this field: added
`shopifyRichTextToHtml` (`lib/policy/rich-text.ts`), which converts Shopify's
`rich_text_field` AST straight to HTML — paragraphs, headings (clamped to
h3–h6 so an archived h1/h2 can't outrank the page's own "Description"
heading), ordered/unordered lists, bold/italic, and links (href
protocol-checked; `javascript:` etc. degrade to `#` rather than being
trusted into `dangerouslySetInnerHTML`) — instead of degrading archived
formatting to flat text. `plainTextToHtml` is the fallback for a
non-JSON/plain-text value, so the field keeps working if the metafield
definition type ever changes. All text content is HTML-escaped before
insertion.

Removed `resolveVariantSupplement` (`lib/product/resolve-variant-value.ts`)
— its "no duplicate display" rule was specific to the old supplement
behavior and has no caller left.

Tests: `lib/policy/__tests__/rich-text.test.ts` (new coverage for
`shopifyRichTextToHtml`/`plainTextToHtml`, including bold/italic/list
preservation, link href sanitization, and HTML-escaping of hostile text
content), `components/product/__tests__/ProductView.test.tsx` (replace-not-
supplement behavior, including a variant→variant switch that proves the
stale-description issue can't recur, and a bold/italic/list preservation
check against the rendered DOM).

## 2. Packaging logic — no change

Confirmed still correct, no code touched.

## 3. Backorder wording — already correct, one open question for Izzy

`lib/labels/labels.ts` already reads `"Backorder, ETA {date}"` (not "ships
{date}") — this was fixed in the same session as the prior report, before
this round of feedback arrived, so no further change was needed here.

Per your note: I can't determine from this repo alone whether
`estimated_back_order_restock_date` is ever variant-specific. Confirmed the
current code only ever reads it at `Product.estimatedRestockDate`
(`components/product/ProductView.tsx` → `resolveProductLabels`) — there is
no variant-scoped equivalent field even defined in `lib/shopify/types.ts`'s
`VariantMetafields`, unlike `custom.backorder`, which IS variant-scoped
there. So today the boolean can differ per variant but the ETA date cannot.
**Needs Izzy:** confirm in Shopify Admin whether restock ETAs are ever
authored per-variant; if so, this needs a new variant-scoped field added to
the query/types before the ETA can follow variant selection.

## 4. HB01/HB02 — no change, left with Izzy per your note

## 5. Push / state

All of the above, plus item 6 below, are committed on `catalog-cro-review`
at the SHA noted at the end of this report — pushed to
`origin/catalog-cro-review`.

## 6. Orders #3435/#3436 — "Delivered" shown while UPS is still at Label Created (fixed)

**Root cause**, confirmed by reading the code: three separate
`getFulfillmentDisplay(order.fulfillmentStatus)` implementations
(`components/account/AccountView.tsx` dashboard "Recent Orders",
`app/(noindex)/account/orders/page.tsx`, and the header in
`app/(noindex)/account/orders/[number]/page.tsx`) each mapped Shopify's
order-level `fulfillmentStatus === 'FULFILLED'` directly to `"Delivered"`.
`FULFILLED` only means every line item has been fulfilled (a warehouse/label
fact) — it says nothing about carrier delivery. The shipment cards further
down the detail page already read real delivery progress correctly from
each fulfillment's `latestShipmentStatus` (`shipmentStatusLabel` in
`lib/fulfillment.ts`), so the header and the cards underneath it could — and
did — disagree.

**Fix:** added `resolveOrderStatus` to `lib/fulfillment.ts`, the single
resolver all three surfaces now call. It aggregates every active
fulfillment's shipment stage (LABEL_PRINTED/LABEL_PURCHASED → "Label
Created", IN_TRANSIT → "In Transit", OUT_FOR_DELIVERY → "Out for Delivery",
DELIVERED → "Delivered", ATTEMPTED_DELIVERY → "Delivery Attempted",
FAILURE → "Delivery Issue", fulfilled-with-no-shipment-event →
"Shipped") plus a synthetic "Partial" stage whenever `fulfillmentStatus`
isn't `FULFILLED`, and always displays the **least-advanced** stage present
— so the badge can never read more complete than the order's actual weakest
link, whether that's an unfulfilled remainder or a shipment still short of
delivery. Canceled fulfillment records are excluded so they can't gate the
badge on the shipments that did go out.

**Surfaces fixed:**
- Account dashboard "Recent Orders" (`components/account/AccountView.tsx`)
- `/account/orders` (`app/(noindex)/account/orders/page.tsx`)
- `/account/orders/[number]` header (`app/(noindex)/account/orders/[number]/page.tsx`)
  — now calls the same resolver the shipment cards below it are built on, so
  the two can't disagree anymore.

**Query change:** `GET_CUSTOMER_ORDERS`
(`lib/shopify/queries/customer.ts`, shared by the dashboard and the orders
list — one query, both surfaces) now also fetches
`fulfillments(first: 10) { status latestShipmentStatus isPickedUp }`. No
tracking numbers, no line items — minimal payload increase, just enough
for the resolver. The detail page's query already had everything it needed.

**Regression tests** (`lib/__tests__/fulfillment.test.ts`,
`components/account/__tests__/AccountView.test.tsx`): FULFILLED +
LABEL_PRINTED/LABEL_PURCHASED does not equal Delivered (the exact #3435/
#3436 defect); FULFILLED + IN_TRANSIT → In Transit; actual DELIVERED →
Delivered; a mix of a delivered shipment and a still-in-transit/
still-preparing one never shows Delivered; no shipment event available
falls back to "Shipped", never "Delivered"; unfulfilled → Processing;
partial orders stay "Partial" even when the shipped portion already
delivered; a component-level test on the dashboard's Recent Orders table
proves the wiring, not just the resolver in isolation.

**Needs Izzy — please verify against live Shopify/Admin and send me the
actual response for Orders #3435 and #3436:**
- `order.fulfillmentStatus`
- each fulfillment's `status`
- each fulfillment's `latestShipmentStatus`
- tracking company/number
- whether either order has multiple fulfillments

One thing worth double-checking on your end while you're in there: the
client's written message gives tracking `1ZV56J320311548011`, but the UPS
screenshot in the same message appears to show `1ZV56J320311547905` — please
confirm which number is actually attached to which order (or if both are
correct across the two orders) so we test the right fulfillment against the
right order number.

Once you send the live values, I'll verify #3435/#3436 render the correct
badge in the account against them.
