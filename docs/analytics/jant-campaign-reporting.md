# Vendor campaign reporting (Jant, and any other vendor)

> ## SCOPE STATUS (updated 2026-09-22)
>
> ### Available under the current MDSupplies scope
>
> - Jant may send UTM-tagged product links today; nothing needs registering.
> - Standard GA4 campaign traffic (source / medium / campaign / content) can be
>   measured.
> - Product-page views, add-to-cart, cart and checkout activity can be measured.
> - Standard purchase activity can be measured.
> - SKU, variant, price, quantity and currency are on every ecommerce event.
>
> ### Pending separate scope / funding approval
>
> The following are **built and tested but switched off** behind
> `ENABLE_PERSISTENT_VENDOR_ATTRIBUTION` (default `false`). They are **not
> active** and must not be described to the vendor as though they were:
>
> - custom multi-day first-touch persistence for vendor campaigns
> - vendor attribution surviving later return visits independently of GA4
> - campaign metadata stamped directly onto Shopify cart/orders
> - deterministic vendor-campaign → order linkage ("which Jant email sold this
>   order?")
> - specialised vendor order-level reporting built on that metadata
>
> ### Also still outstanding (unrelated to scope)
>
> This branch is not yet deployed, so production currently emits `page_view`
> only. The GTM container itself is done — `GTM-5BQJLLJV` **Version 2** is
> published with Google Tag `G-GSMEPRM9RX` (`send_page_view=false`), 9 GA4
> event tags and 9 Data Layer variables, and GA4 DebugView has confirmed
> receipt.

There is no "Jant tracking system". Jant uses the same GA4/GTM ecommerce
measurement every other campaign on the site uses. This document states exactly
what that measurement can answer, and where each answer comes from.

Companion: [`README.md`](./README.md) for how the plumbing works.

## The link Jant sends

```
https://mdsupplies.com/product/{handle}?utm_source=jant&utm_medium=email&utm_campaign={campaign}&utm_content={content}
```

Nothing needs to be built, registered or allow-listed for a new vendor. Any URL
on the site accepts UTMs; the proxy captures them on arrival.

## Reporting matrix

**Read this as "once the storefront deploy lands".** The "Emitted by the site?"
column describes what the storefront code sends into the dataLayer — all of it
verified working against a real production build. The GTM container forwards
these to GA4, so each row becomes retrievable as soon as the deployed code
emits the event.

Rows marked **⛔ GATED** depend on the persistent vendor-attribution layer and
stay unavailable until that scope is funded — see the status box above.

| Metric | Source | Emitted by the site? | Reliable? | Changed in this pass? | Where to retrieve it (after GTM build) |
|---|---|---|---|---|---|
| Sessions from `utm_source=jant` | GA4 | Yes | Yes | No | Reports → Acquisition → Traffic acquisition, filter Session source = `jant` |
| Campaign (`utm_campaign`) | GA4 | Yes | Yes | No | Same report, dimension Session campaign |
| Email version (`utm_content`) | GA4 | Yes | Yes | No | Explore, dimension Session manual ad content |
| Landing pages | GA4 | Yes | Yes | No | Reports → Engagement → Landing page |
| Product-page views (`view_item`) | GA4 | Yes | **Improved** | Yes — SKU + variant added; PDP `page_view` was missing entirely and is fixed | Explore: event `view_item` × Session source |
| Add-to-carts | GA4 | Yes | **Improved** | Yes — SKU + variant added; never fires on a failed add | Explore: event `add_to_cart` × Session source |
| Cart views | GA4 | **Was broken** | Now yes | Yes — `/cart` emitted no `view_cart` at all | Explore: event `view_cart` |
| Checkout starts | GA4 | Yes | Yes | Yes — payload enriched | Explore: event `begin_checkout` |
| Searches | GA4 | **No** | Now yes | Yes — `search` event added | Explore: event `search`, dimension `search_term` |
| Purchases (count) | GA4 (Shopify pixel) | Yes | **Improved** | Yes — session bridged, so revenue stays on the campaign | Reports → Monetization |
| Campaign conversion rate | GA4 | Yes | Yes | Indirectly | Traffic acquisition → Session key event rate |
| Products & quantities purchased | **Shopify** | Yes | Yes | No | Shopify Admin → Orders (also GA4 item reports, less authoritative) |
| Order revenue | **Shopify** | Yes | Yes | No | Shopify Admin → Orders |
| Coupon / discount code used | **Shopify** | Yes | Yes | Yes — also now on the GA4 `purchase` as `coupon` | Shopify Admin → Orders |
| Order-level campaign attribution | **Shopify** | ⛔ **GATED** | n/a while off | Implemented, disabled pending funding | Shopify Admin → Order → Additional details (**only once enabled**) |

## Which system answers what

**GA4 answers behaviour.** Sessions, landing pages, product views,
add-to-carts, checkout starts, conversion rate. It is the right tool for "how
did the campaign perform".

**Shopify answers money.** Which SKUs, what quantity, what the order was worth,
which discount code. Shopify is the system of record; GA4's revenue is a
measurement of it, not the truth of it.

**Order-level campaign attribution is the gated capability.** Shopify has no
idea a visit came from a campaign, so answering "what did Jant's October email
actually sell" means exporting GA4 and Shopify separately and reconciling by
timestamp — approximate at best. That is the position today, and it is what the
funded work would change.

⛔ **Not active.** Once `ENABLE_PERSISTENT_VENDOR_ATTRIBUTION=true`, every cart
would carry its campaign onto the order:

```
md_utm_source     = jant
md_utm_medium     = email
md_utm_campaign   = h_pylori_gi_clinics_q4_2026
md_utm_content    = email_2_follow_up      ← last touch
md_first_utm_content = email_1_main_cta    ← first touch
```

…making "every order attributable to Jant, with line items and revenue" a
single Shopify query, independent of cookies, consent, ad blockers and GA4
sampling. **Until the feature is enabled, that query returns nothing** — the
attributes are not written.

### For Juliette — pulling Jant orders from Shopify (once enabled)

Shopify Admin → Orders does not filter on cart attributes in the UI. Use the
Admin API:

```graphql
{
  orders(first: 100, query: "created_at:>2026-10-01") {
    nodes {
      name
      createdAt
      totalPriceSet { shopMoney { amount currencyCode } }
      discountCodes
      customAttributes { key value }
      lineItems(first: 50) {
        nodes { title quantity sku originalTotalSet { shopMoney { amount } } }
      }
    }
  }
}
```

Filter client-side on `customAttributes` where `key == "md_utm_source"` and
`value == "jant"`. A saved report or a small script is the practical way to run
this monthly.

## Attribution windows — what is and is not true

| Scenario | What happens |
|---|---|
| Click → browse → buy, same session | GA4 attributes the purchase to `jant / email`. Order carries the campaign. Fully reliable. |
| Click → navigate around the site → buy | Same. Internal navigation never clears attribution. |
| Click → refresh the page → buy | Same. A refresh carries no UTMs and is a no-op, not a reset. |
| Leave, return **direct** the same day | Within the 30-minute session timeout it is the same session. After it, GA4 opens a new `(direct)` session but its default last-non-direct-click model still credits `jant / email` for the conversion. The order still carries the campaign. |
| Leave, return **days later**, buy | GA4 credits `jant` for up to its acquisition lookback (default 90 days) **provided the GA4 cookie survives** — same browser, cookies not cleared, ITP not having expired it (Safari caps client-side cookies at 7 days). Our `md_attr` cookie is server-set and survives 90 days regardless, so the **order** keeps the campaign even where GA4 has lost it. This is the one place the two systems can legitimately disagree, and Shopify is the more durable of the two. |
| Arrive via Jant campaign **A**, later via campaign **B**, then buy | GA4 credits **B** (last non-direct click). The order records `md_utm_content=email_2_follow_up` and `md_first_utm_content=email_1_main_cta`. Deliberate and reconcilable. |
| Arrive via Google Ads after an email click | GA4 credits the Google Ads click. `gclid` is preserved and written to the order. Adding UTM support did not change Google Ads behaviour. |
| Different device / different browser | Not attributable without a login-based identity graph. Out of scope, and no amount of tagging fixes it. |

## What is NOT supported without further work

0. **Everything in the "pending funding approval" list above.** It is built and
   tested, but disabled. Enabling it is a configuration change, not new
   engineering.
1. **Cross-device attribution.** Opening the email on a phone and buying on a
   desktop breaks the chain. Would require GA4 User-ID wired to the logged-in
   customer, which is only possible for signed-in purchases.
2. **Attribution beyond 90 days.** Both the GA4 lookback and our cookie cap at
   90 days.
3. **Attribution for consent-refused or cookie-cleared visitors in GA4.** The
   Shopify order attribute still works for the visit that created the cart.
4. **A real-time vendor dashboard.** Everything above is a GA4 report or a
   Shopify query. A self-serve vendor-facing dashboard would be a separate
   build.
5. **Per-email-recipient attribution.** `utm_content` identifies the email
   *version*, not the person. Recipient-level identifiers are deliberately not
   written onto orders.


---

# For Juliette — the Jant reporting workflow in plain language

## What happens, step by step

1. **Jant sends a campaign link.** They add the tags to any MDSupplies URL —
   usually a product page. Nothing needs to be set up on our side for a new
   campaign; the tags are read automatically on arrival.

2. **A customer clicks it.** The moment they land, our server records the
   campaign in two private cookies on their browser: the *first* campaign that
   ever brought them to us, and the *most recent* one. These last 90 days and
   cannot be read by anything on the page — only by our own server.

3. **They browse.** Every product view, add-to-cart, cart view and checkout
   start is recorded as an analytics event carrying the product, SKU, variant,
   price and quantity. Moving around the site, refreshing the page, or coming
   back later does **not** erase the campaign.

4. **They add something to the cart.** At that moment the campaign is written
   onto the Shopify cart itself. This is the important part: it means the
   campaign travels with the order, not just with the browsing session.

5. **They check out.** The campaign details are already attached to the cart,
   so they land on the finished order permanently.

6. **The order appears in Shopify** with the campaign stamped on it, alongside
   the products, quantities, revenue and any discount code used.

## Where to find each number

### Campaign traffic and behaviour → **GA4**

Go to **Reports → Acquisition → Traffic acquisition**, then filter
*Session source* = `jant`.

- **Visits** — the "Sessions" column
- **Which campaign** — add *Session campaign* as a secondary dimension
- **Which email version** — add *Session manual ad content* (this is
  `utm_content`, e.g. `email_1_main_cta` vs `email_2_follow_up`)
- **Which pages they landed on** — Reports → Engagement → Landing page
- **Product views / add-to-carts / checkouts** — Explore → free-form
  exploration, with *Event name* as a row and *Session source* as a filter
- **Conversion rate** — the "Session key event rate" column in Traffic
  acquisition

### Orders, products, revenue and coupons → **Shopify**

Shopify is the system of record for anything involving money. GA4 measures
money; Shopify *is* the money.

Open any order in Shopify Admin and look at **Additional details** — the
campaign fields appear there:

```
md_utm_source        jant
md_utm_medium        email
md_utm_campaign      h_pylori_gi_clinics_q4_2026
md_utm_content       email_2_follow_up     ← the most recent email they clicked
md_first_utm_content email_1_main_cta      ← the first email that ever brought them
```

### Pulling a month of Jant orders

Shopify's order list cannot filter on these fields in the UI. The practical
options are:

- **Ask a developer to run a one-off export** using the query in the section
  above — quickest for a one-time question.
- **Set up a monthly export** if this becomes routine. Worth doing once the
  volume justifies it.

## What to be careful about

- **Tags must be lowercase.** GA4 treats `Jant` and `jant` as two different
  sources, which silently splits a campaign's numbers in half.
- **GA4 and Shopify will not match exactly.** GA4 misses people who block
  cookies or decline tracking; Shopify sees every order. Treat Shopify as
  correct for revenue and GA4 as correct for behaviour.
- **`utm_content` identifies the email, not the person.** We deliberately do
  not record anything that identifies an individual recipient on an order.
- **Someone who buys on a different device** than the one they clicked the
  email on cannot be connected to the campaign. No tracking setup fixes this.
