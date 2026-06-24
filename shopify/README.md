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
