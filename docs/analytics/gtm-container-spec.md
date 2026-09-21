# GTM container build specification — GTM-5BQJLLJV

**Status: NOT BUILT.** As of 2026-09-21 the container is an *Empty Container*
(version 1, published 2026-06-15 by seo@appflowstudio.io): 0 tags, 0 triggers,
0 variables. The storefront pushes a complete, correct dataLayer and GTM loads
on every page — but there is nothing in the container to act on it, so **no
storefront data has ever reached GA4**.

This file is the exact build needed to close that gap. It is written so it can
be executed by whoever is authorised to publish this container, and so the
result is reviewable.

## Verified identifiers

| System | Name | ID | Verified |
|---|---|---|---|
| GTM account | MDSupplies | 6361044054 | ✅ |
| GTM container | mdsupplies.com/ | **GTM-5BQJLLJV** (container 255574666, workspace 2) | ✅ matches `NEXT_PUBLIC_GTM_ID` |
| GA4 account | MDSupplies & Partners | 360431375 | ✅ |
| GA4 property | MDSupplies | 495518004 | ✅ |
| GA4 data stream | My Website — https://www.mdsupplies.com | 11436130221 | ✅ |
| GA4 Measurement ID | — | **G-GSMEPRM9RX** | ✅ |
| Google Ads | MDSupplies | 155-214-8399 | ✅ |
| Storefront domain | — | mdsupplies.com | ✅ |
| Checkout domain | — | checkout.mdsupplies.com | ✅ |

> The GA4 stream URL is `https://www.mdsupplies.com` but the live site serves
> `https://mdsupplies.com` (no `www`). This is cosmetic — the stream URL is a
> label, not a filter — but worth correcting for clarity.

## 1. Variables — Data Layer Variables

All type **Data Layer Variable**, Version 2, default empty.

| Variable name | Data layer key |
|---|---|
| `DLV - ecommerce` | `ecommerce` |
| `DLV - ecommerce.currency` | `ecommerce.currency` |
| `DLV - ecommerce.value` | `ecommerce.value` |
| `DLV - ecommerce.items` | `ecommerce.items` |
| `DLV - page_path` | `page_path` |
| `DLV - page_location` | `page_location` |
| `DLV - page_title` | `page_title` |
| `DLV - search_term` | `search_term` |
| `DLV - results` | `results` |
| `DLV - form_name` | `form_name` |
| `DLV - item_id` | `item_id` |
| `DLV - list` | `list` |

Also enable the built-in variables: **Page URL, Page Path, Page Hostname,
Referrer, Event**.

## 2. Tags

### 2.1 Google Tag (GA4 configuration)

- **Type:** Google Tag
- **Tag ID:** `G-GSMEPRM9RX`
- **Trigger:** Initialization — All Pages
- **Configuration parameter:** `send_page_view` = `false`

> **`send_page_view` MUST be false.** The storefront emits its own `page_view`
> on every route change (`components/analytics/PageViewTracker.tsx`) because
> it is a single-page app — GTM's automatic pageview only fires on hard loads
> and would miss client-side navigation. Leaving both on double-counts every
> hard-loaded page. This is the single most important setting in the container.

### 2.2 GA4 Event — page_view

- **Type:** Google Analytics: GA4 Event
- **Measurement ID:** `G-GSMEPRM9RX`
- **Event Name:** `page_view`
- **Parameters:** `page_path` = `{{DLV - page_path}}`, `page_location` =
  `{{DLV - page_location}}`, `page_title` = `{{DLV - page_title}}`
- **Trigger:** Custom Event — `page_view`

### 2.3 GA4 Event — ecommerce events (one tag each)

Create one tag per event: **view_item, view_item_list, select_item,
add_to_cart, remove_from_cart, view_cart, begin_checkout**.

For each:

- **Type:** Google Analytics: GA4 Event
- **Measurement ID:** `G-GSMEPRM9RX`
- **Event Name:** the event name
- **More Settings → Ecommerce → Send Ecommerce data: ON**, Data source:
  **Data Layer**
- **Trigger:** Custom Event matching that event name

> Ticking "Send Ecommerce data / Data Layer" is what makes GTM read the
> `ecommerce` object the site already builds. Without it the events arrive with
> no items, no value and no currency — which looks like working tracking in
> Realtime and produces empty ecommerce reports.

### 2.4 GA4 Event — search

- **Event Name:** `search`
- **Parameters:** `search_term` = `{{DLV - search_term}}`, `results` =
  `{{DLV - results}}`
- **Trigger:** Custom Event — `search`

### 2.5 Do NOT create a purchase tag

`purchase` is emitted by the Shopify Customer Events pixel
(`shopify/web-pixel-purchase.js`), which runs inside Shopify checkout on
`checkout.mdsupplies.com`. The storefront cannot emit one — the order is
created after the storefront is gone. **A purchase tag in this container would
have nothing to fire on, and any second purchase source double-counts revenue.**

## 3. Triggers

One **Custom Event** trigger per event name, "All Custom Events", event name
matching exactly:

`page_view`, `view_item`, `view_item_list`, `select_item`, `add_to_cart`,
`remove_from_cart`, `view_cart`, `begin_checkout`, `search`

Plus the built-in **Initialization — All Pages** for the Google Tag.

## 4. Consent

There is no consent-management platform in the repository and none configured
in this container. If Consent Mode v2 is required, it must be added here —
Admin → Container Settings → **Enable consent overview**, then set default
states and per-tag consent requirements. That is a policy decision, not a
technical one, and is deliberately out of scope for this spec.

## 5. Google Ads

Google Ads account 155-214-8399 currently has:

- **0 campaigns**
- one conversion action, **Purchase**, with the status *"a conversion action
  has been created, but the tag is not yet verified"* — i.e. it has never
  received a conversion

The recommended path once GA4 is collecting: **import the GA4 `purchase` key
event into Google Ads** rather than adding a direct Google Ads conversion tag.
One path, no deduplication problem. Do not do both.

Do not create additional conversion actions. Do not change bidding or campaign
settings.

## 6. Verification after publishing

1. GTM **Preview** against mdsupplies.com — confirm each tag fires once on its
   event and no tag fires twice.
2. GA4 **DebugView** — confirm `page_view` appears exactly once per navigation,
   and ecommerce events arrive with populated `items`, `value` and `currency`.
3. Walk the funnel: campaign URL → PDP → add to cart → cart → begin checkout.
4. Confirm `page_view` count equals navigation count (the `send_page_view:false`
   check).
5. Only then place a controlled test order to validate `purchase`.

## 7. Blocking dependency — the Shopify pixel

`purchase` cannot be validated until the Customer Events pixel is confirmed
installed **with a real Measurement ID**. The repository copy still contains the
placeholder `G-XXXXXXXX`; the real value is `G-GSMEPRM9RX`.

The account used for this audit (seo@appflowstudio.io) **does not have
permission** to view Shopify → Settings → Customer events, so the live pixel
could not be inspected. Someone with that permission must confirm:

- the pixel exists and contains `G-GSMEPRM9RX`, not the placeholder
- it forwards `ga_client_id` **and** `ga_session`
- no second pixel or app also emits `purchase`

### Related risk: the Google & YouTube channel

The **Google & YouTube** sales channel is installed and **Active** (installed
2024-09-16, 1 market). Its **Extensions show "0 active"**, so it does not
currently appear to inject a conversion pixel — consistent with Google Ads
showing zero recorded conversions. If that channel's conversion tracking is
ever enabled while the custom pixel is live, purchases will be counted twice.
