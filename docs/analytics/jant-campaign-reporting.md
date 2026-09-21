# Vendor campaign reporting (Jant, and any other vendor)

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

| Metric | Source | Tracked today? | Reliable? | Changed in this pass? | Where to retrieve it |
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
| Order-level campaign attribution | **Shopify** | **No** | Now yes | Yes — campaign written onto the order as attributes | Shopify Admin → Order → Additional details |

## Which system answers what

**GA4 answers behaviour.** Sessions, landing pages, product views,
add-to-carts, checkout starts, conversion rate. It is the right tool for "how
did the campaign perform".

**Shopify answers money.** Which SKUs, what quantity, what the order was worth,
which discount code. Shopify is the system of record; GA4's revenue is a
measurement of it, not the truth of it.

**They no longer need a manual join for campaign attribution.** Before this
pass, Shopify had no idea a visit came from a campaign, so answering "what did
Jant's October email actually sell" meant exporting GA4 and Shopify separately
and reconciling by timestamp — approximate at best. Every cart now carries its
campaign onto the order:

```
md_utm_source     = jant
md_utm_medium     = email
md_utm_campaign   = h_pylori_gi_clinics_q4_2026
md_utm_content    = email_2_follow_up      ← last touch
md_first_utm_content = email_1_main_cta    ← first touch
```

So "every order attributable to Jant, with line items and revenue" is now a
single Shopify query, independent of cookies, consent, ad blockers and GA4
sampling.

### For Juliette — pulling Jant orders from Shopify

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
