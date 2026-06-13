# T5 · Shopify App QA — Pass/Fail Table

Last updated: 2026-06-12
Tester: (fill in)

| App | Check | Result | Notes |
|-----|-------|--------|-------|
| **Meteor Mega Menu** | `main-menu` has 26 approved categories | MANUAL | Check Shopify admin → Navigation |
| **Meteor Mega Menu** | No item points at a removed/renamed collection (e.g. `brands/*`) | MANUAL | Look for any `brands` URLs in menu items |
| **Meteor Mega Menu** | Menu renders correctly on frontend | MANUAL | Visit homepage, open nav |
| **Fordeer Product Labels** | Star rating + review count NOT shown when reviewCount = 0 | ✅ FIXED | Guarded with `reviewCount > 0` in `ProductDetail.tsx` |
| **Fordeer Product Labels** | Free Shipping badge shows only when product has `free-shipping` tag | ✅ FIXED | Mapped from `product.tags.includes('free-shipping')` in `toProductDetailData` + `ShopifyQuickAddButton.toCardData`; `tags` field added to all relevant Shopify queries |
| **Fordeer Product Labels** | RX label renders only when RX condition exists | MANUAL | Test on an RX product page |
| **Fordeer Product Labels** | Backorder/leadTime badge driven by live data | ✅ PASS | `leadTime` prop comes from Shopify metafield |
| **Fordeer Product Labels** | `customBadge1/2/3` metafields render when set | MANUAL | Load a product with custom badges set in Shopify admin |
| **TrustShop Reviews** | No external review script in `layout.tsx` | ✅ PASS | Confirmed: zero external scripts in root layout |
| **TrustShop Reviews** | No `aggregateRating` schema injected by app | MANUAL | Check page source / DevTools for `aggregateRating` JSON-LD on a PDP |
| **TrustShop Reviews** | Review widget does not break layout | MANUAL | Visit PDP, check for layout shift |
| **Shopify Forms** | Contact form submits successfully (success state shows) | MANUAL | `/contact` — fill and submit |
| **Shopify Forms** | B2B form submits successfully | MANUAL | `/b2b` — fill and submit |
| **Shopify Forms** | General inquiry form submits successfully | MANUAL | Find general inquiry embed location |
| **Shopify Forms** | Error/validation state is clean | MANUAL | Submit with empty required fields on each form |
| **Upload-Lift RX** | RX upload flow works on RX product path | MANUAL | Find an RX product, test upload |
| **Upload-Lift RX** | Non-RX product paths unblocked by Upload-Lift | MANUAL | Visit standard product, confirm no upload prompt |
| **Search & Discovery** | No conflict with `app/api/search/predictive/route.ts` | ✅ PASS | Route uses Storefront API `predictiveSearch` directly, self-contained |
| **Search & Discovery** | No duplicate results in predictive search | MANUAL | Type in search bar, verify result count is reasonable |
| **Search & Discovery** | Category filters work without double-handling | MANUAL | Apply a filter on a category page |
| **Sitemap NoIndex Pro** | T2 owns robots.txt (`/robots.txt` served by Next.js) | ✅ PASS | `app/robots.ts` exists and is authoritative |
| **Sitemap NoIndex Pro** | T2 owns sitemap.xml (`/sitemap.xml` served by Next.js) | ✅ PASS | `app/sitemap.ts` exists and is authoritative |
| **Sitemap NoIndex Pro** | App does not override/conflict with Next.js sitemap | MANUAL | `curl -sI https://<domain>/sitemap.xml` — confirm Next.js serves it post-cutover |
| **Messaging widget** | No chat/messaging script in `layout.tsx` | ✅ PASS | Zero external scripts confirmed in root layout |
| **Messaging widget** | No widget visible on storefront | MANUAL | Visit homepage in browser, confirm no chat bubble in any corner |
