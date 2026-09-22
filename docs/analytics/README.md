# Analytics & campaign attribution

How measurement works on MDSupplies, what it can and cannot answer, and how to
verify it. Written after the 2026-09-21 forensic audit (DEV-TRACK-01).

The short version for a vendor conversation:

> Send properly tagged campaign links to any page on mdsupplies.com. Our
> existing GA4/GTM ecommerce measurement will attribute the resulting session,
> product views, add-to-carts, checkouts and purchases to that campaign, and the
> campaign is additionally recorded on the Shopify order itself.

---

## 1. Architecture

| Layer | Where | Notes |
|---|---|---|
| Tag manager | `GoogleTagManager` from `@next/third-parties/google` | Exactly one container. Rendered in `app/(site)/layout.tsx` for public routes and in `components/layout/SiteChrome.tsx` (`strict`) for `/account` + `/search`, which are a separate root layout under a nonce CSP. The two are mutually exclusive — never both. |
| GA4 | Inside the GTM container | Measurement ID is **not** in this repo. |
| Event emission | `lib/analytics/track.ts` → `dataLayer.push` | Single push point for the whole storefront. |
| Event construction | `lib/analytics/events.ts` | Every ecommerce payload is built here. Nothing constructs a payload inline. |
| Campaign capture | `proxy.ts` → `lib/analytics/attribution.ts` | First-touch + last-touch, httpOnly cookies, 90 days. |
| Checkout identity bridge | `lib/analytics/checkout-handoff.ts` | Carries GA4 client_id + session_id into Shopify via cart attributes. |
| Purchase | `shopify/web-pixel-purchase.js` | Shopify Customer Events pixel. **The only** source of `purchase`. |

`NEXT_PUBLIC_GTM_ID` gates all of it; `IS_STAGING` suppresses it on preview
deploys so staging traffic never reaches the production property.

## 2. Events

| Event | Trigger | Source file | Dedup |
|---|---|---|---|
| `page_view` | Every URL change, incl. query-only | `components/analytics/PageViewTracker.tsx` | Ref compare on full URL |
| `view_item` | PDP load | `components/product/ProductView.tsx` | Once per `product.id` |
| `view_item_list` | Product grid render | `components/category/ViewItemListTracker.tsx` | Once per product-id set |
| `select_item` | Product card click | `components/store/ShopifyProductCard.tsx` | Per click |
| `search` | Search results render | `components/search/SearchEventTracker.tsx` | Once per term+count |
| `add_to_cart` | Shopify **confirmed** the line | `components/store/CartProvider.tsx` | Success-gated |
| `remove_from_cart` | Shopify confirmed removal / qty decrease | `components/store/CartProvider.tsx` | Success-gated |
| `view_cart` | `/cart` load, or cart drawer opened deliberately | `CartPageClient.tsx`, `CartProvider.openCart` | Ref keyed on cart id |
| `purchase` | `checkout_completed` | `shopify/web-pixel-purchase.js` | Order id, in-memory + `localStorage` |

Rules this implementation holds to:

* **`add_to_cart` is never fired on a button click.** `CartProvider.addItem`
  fires only after Shopify returns a cart that actually contains the requested
  line. A failed or silently-dropped add produces no event.
* **`ecommerce` is cleared before every ecommerce push.** GTM merges pushes into
  its model and merges arrays *by index*, so without a preceding
  `{ecommerce: null}` a 24-item `view_item_list` leaves items behind and the
  next single-item event reports all 24. `track()` does this centrally.
* **`item_id` is the Shopify ProductVariant GID everywhere**, storefront and
  purchase pixel alike, so the funnel joins. SKU rides along as `item_sku`.
* The cart drawer auto-opening after an add does **not** fire `view_cart` —
  only a deliberate cart open does. This avoids a mechanical
  `add_to_cart` + `view_cart` pair on every single add.
* `begin_checkout` fires immediately before the handoff, not after it resolves,
  because the handoff ends in a `window.location` assignment and a push after
  that point races the unload. A server-side RX refusal after the event is
  therefore a possible (rare) over-count; it is not a Google Ads conversion
  action, and the CTA is already replaced by the RX panel whenever the gate is
  known to be blocking.

### `item_sku` is a custom dimension

`item_sku` is not a GA4 standard parameter. To report on it, register it in
**GA4 Admin → Custom definitions → Custom dimensions**, scope *Item*, parameter
`item_sku`. Until that is done the value is sent but not reportable.

## 3. Campaign attribution

`proxy.ts` captures marketing params on any request that carries them, into two
httpOnly cookies (90 days, `SameSite=Lax`):

| Cookie | Semantics |
|---|---|
| `md_attr` | **First touch.** Written once, never overwritten. |
| `md_attr_last` | **Last touch.** Overwritten by every later campaign arrival. |

Captured keys: every `utm_*`, plus `gclid`, `gbraid`, `wbraid`, `dclid`,
`msclkid`, `fbclid`, `ttclid`, `twclid`, `li_fat_id`, `yclid`, `igshid`,
`mc_cid`, `mc_eid` (`lib/analytics/tracking-params.ts`).

A request with **no** campaign params is a no-op, never a reset — so internal
navigation, a refresh, or a direct return can never erase attribution.

Both cookies are `httpOnly`: campaign data is never exposed to page JavaScript.

UTMs are **not** appended to internal links. They are echoed only within
same-page discovery navigation (filter/sort/search/pagination) by
`withTrackingParams`, so a filter click does not look like a new session.
Canonical URLs strip them (`lib/seo/canonical.ts`).

### Onto the Shopify order

At cart creation (`app/actions/cart.ts` → `stampCartAttribution`, via `after()`
so it never delays the customer), an allow-listed subset is written onto the
Shopify cart and therefore onto the **order**:

```
md_utm_source  md_utm_medium  md_utm_campaign  md_utm_content  md_utm_term
md_gclid  md_gbraid  md_wbraid  md_msclkid  md_fbclid
md_first_*   (same keys, first-touch)
```

Unprefixed = last touch, matching GA4's last-non-direct-click default, so the
obvious-looking `md_utm_source` agrees with GA4 rather than contradicting it.
`mc_eid` and similar subscriber-level identifiers are deliberately **excluded** —
they identify an individual and must not land on a staff-visible order record.

> `cartAttributesUpdate` **replaces** the whole attributes array. Always write
> through `writeCartAttributes` (read-merge-write), never a bare single-key
> mutation. Verified against the live store: a naive single-key update reduced a
> 6-attribute cart to 1.

## 4. Checkout handoff

Storefront is `mdsupplies.com`; checkout is `checkout.mdsupplies.com` — a
**subdomain**, so GA4's `_ga` cookie (scoped to the registrable domain) spans
both and no cross-domain linker is required. What does *not* carry is the tag
context: Shopify checkout runs its own Customer Events sandbox, and a Web Pixel
executes in an isolated iframe that cannot read the top-level document's
cookies. That is why identity is bridged through cart attributes:

| Attribute | Value |
|---|---|
| `ga_client_id` | GA4 client id from `_ga` |
| `ga_session` | `cid=…&sid=…&sct=…` from `_ga_<MEASUREMENT_ID>` |

The pixel replays both into its `gtag('config', …)`. **Both matter**:
`client_id` alone attaches the purchase to the right user but starts a *new*
GA4 session, which carries no campaign parameters and therefore resolves to
`(direct)` — detaching revenue from the `utm_source=jant` session that produced
it. Replaying `session_id` puts the purchase back in the originating session, so
it inherits that session's source / medium / campaign.

The whole bridge is best-effort and never blocks checkout.

## 5. Consent

**There is no consent-management platform in this repository.** No banner, no
`gtag('consent', …)` call, no Consent Mode default state. If Consent Mode v2 is
configured it exists only inside the GTM container and cannot be verified from
source. See the external checklist below.

## 6. RX vs non-RX

RX products require an account and a document on file. The flow is
PDP → cart → RX gate → `/account` (login / upload) → cart → checkout.

`/account` and `/search` live in a **separate root layout** under a strict
nonce CSP, so moving between them and the rest of the site is a full page load
rather than a client transition. Measurement is unaffected: GTM is rendered in
both roots, and the attribution cookies are server-side and path-scoped `/`, so
they survive the reload and the login redirect intact. A blocked RX checkout
produces no `purchase` because no order exists.

Nothing RX-specific is ever sent to analytics — no document, no prescription, no
licence state, no customer identifier. The RX gate's outcome is not tracked.

## 7. PII

Analytics carry commerce identifiers only. The one free-text field a customer
controls that reaches GA4 is the search term, which is normalized and redacted
(`lib/analytics/redact.ts`) before it becomes `search_term` — emails and phone
numbers are replaced with `[redacted]`, catalogue codes and SKUs are preserved.

## 8. Vendor UTM template

```
https://mdsupplies.com/product/{handle}?utm_source={vendor}&utm_medium=email&utm_campaign={campaign}&utm_content={content}
```

Example:

```
https://mdsupplies.com/product/h-pylori-rapid-test?utm_source=jant&utm_medium=email&utm_campaign=h_pylori_gi_clinics_q4_2026&utm_content=email_1_main_cta
```

| Param | Convention |
|---|---|
| `utm_source` | lowercase vendor/platform id — `jant`, `google`, `meta` |
| `utm_medium` | channel — `email`, `cpc`, `paid_social` |
| `utm_campaign` | lowercase `snake_case`, e.g. `h_pylori_gi_clinics_q4_2026` |
| `utm_content` | the specific email/version/CTA — `email_1_main_cta`, `email_2_follow_up` |
| `utm_term` | paid keyword only |

Keep values lowercase: GA4 treats `Jant` and `jant` as different sources.
Do not add UTMs to internal links. Never put personal data in a URL.

## 9. Debugging

Development only:

```
npm run dev
open http://localhost:3000/?debug_analytics=1
```

An overlay lists every `dataLayer` event, its payload, and the GA4 client/session
ids currently recognised. It is compiled out of production builds entirely
(`process.env.NODE_ENV` is statically known), not merely hidden.

For production, use GTM Preview mode and GA4 DebugView.

Campaign capture can be checked without a browser:

```bash
curl -s -D - -o /dev/null "http://localhost:3000/?utm_source=jant&utm_medium=email" | grep -i set-cookie
```

## 10. Testing

```bash
npm test                       # unit: parsing, attribution, payloads, dedup
npx vitest run lib/analytics   # analytics only
npm run test:e2e               # Playwright
```

Analytics-specific suites: `lib/analytics/__tests__/`,
`app/actions/__tests__/cart.test.ts`, `__tests__/proxy.test.ts`,
`components/store/__tests__/`.

## 11. External configuration — lives outside Git

Everything below lives outside Git. Status as of **2026-09-21**:

**Done.** Items 1 and 5 are verified. GTM container `GTM-5BQJLLJV` **Version 2**
is published — Google Tag `G-GSMEPRM9RX` with `send_page_view=false`, 9 GA4
event tags on matching custom-event triggers with *Send Ecommerce data → Data
Layer*, 9 Data Layer variables, and deliberately no purchase tag. GA4 DebugView
has confirmed event receipt.

**Note on a false alarm:** every `/g/collect` request appears as HTTP **503** in
Chrome-extension network logs. That is an observation artefact of GTM's
`sendBeacon`/keepalive transport — a direct `fetch` to the same endpoint and
property returns **204**, and DebugView shows the events. Do not chase it.

**Still open.** Everything else below is unverified and must be checked in the
relevant UI.

| # | Item | Where | What to confirm |
|---|---|---|---|
| 1 | GA4 Measurement ID | GTM container `GTM-5BQJLLJV` | One GA4 config tag, correct ID |
| 2 | Purchase pixel installed | Shopify Admin → Settings → Customer events | `shopify/web-pixel-purchase.js` pasted **with `G-XXXXXXXX` replaced** |
| 3 | No second purchase source | Shopify + GTM + Google & YouTube app | Exactly one thing sends `purchase`. The Google & YouTube channel app also sends conversions — if it is enabled, this pixel double-counts |
| 4 | `page_view` trigger | GTM | The GA4 config tag must not *also* fire on the custom `page_view` event, or every pageview doubles |
| 5 | Ecommerce tags read the `ecommerce` object | GTM | Tags use "Use Data Layer" / the `ecommerce` variable |
| 6 | Google Ads conversions | Google Ads + GTM | Purchase conversion imported from GA4 **or** a direct tag — not both |
| 7 | Conversion Linker | GTM | Enabled, so `gclid` persists into `_gcl_*` first-party cookies |
| 8 | Enhanced conversions | Google Ads | If enabled, confirm what is being sent from checkout |
| 9 | Consent Mode v2 | GTM | Default state and whether tags queue before consent |
| 10 | Referral exclusions | GA4 Admin → Data streams | `checkout.mdsupplies.com` and any payment provider (PayPal, Shop Pay) excluded |
| 11 | `item_sku` custom dimension | GA4 Admin | Registered, item-scoped |
| 12 | Internal traffic filter | GA4 Admin | `localhost` / office IPs excluded |
