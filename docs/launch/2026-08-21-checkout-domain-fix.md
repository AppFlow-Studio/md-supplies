# 2026-08-21 — Live checkout broken after apex cutover (RESOLVED)

Status: **Resolved** · Severity: **P0 (checkout down on live)** · Owner: Sardorbek · Fixed by: Temur · DNS: Bilal (GoDaddy)

---

## TL;DR

After `mdsupplies.com` was pointed at the new headless storefront on Vercel, **every checkout link 404'd**. Shopify was still building `cart.checkoutUrl` on `mdsupplies.com` — a domain that now serves Vercel, which has no checkout route. Fixed by giving Shopify its own checkout subdomain (`checkout.mdsupplies.com`) and making it the **Primary domain** in Shopify. **Config-only fix — no code change, no deploy.**

---

## Symptom

Clicking **Proceed to Checkout** on live went to a dead page. The link copied from the cart button was:

```
https://mdsupplies.com/cart/c/hWNFuqFYEAU3d8uV9hyLdoI6?key=…&_s=…&_y=…
        └── host: Vercel ──┘└──── Shopify checkout path ────┘
```

- Host `mdsupplies.com` now resolves to **Vercel** (the headless Next.js store).
- `/cart/c/<token>` is **Shopify's** checkout URL format.
- The app has exactly one cart route — `app/(noindex)/cart/page.tsx` (serves `/cart` only). There is **no** route for `/cart/c/<token>`, so the link hit Vercel and 404'd. (The apex also 308-redirects to `www`, so in practice it 308'd then 404'd — still dead.)

---

## Root cause

This is a **headless Shopify** storefront: the Next.js app on Vercel is the site; Shopify only hosts checkout. The app does a full-page browser navigation to whatever URL Shopify returns and **never constructs the URL itself**:

- `components/store/RxCheckoutGate.tsx:54` → `window.location.href = result.checkoutUrl`
- `components/store/CartPopup.tsx:308`, `components/store/CartPageClient.tsx:257` → `<a href={cart.checkoutUrl}>`
- `app/actions/rx.ts:136` → returns `cart.checkoutUrl` verbatim
- Hard rule: "Checkout must use `cart.checkoutUrl` from Shopify; never construct a URL manually" (`docs/superpowers/plans/2026-06-26-cart-page.md:14`)

Shopify builds `cart.checkoutUrl` from the store's **Primary domain**. When the apex DNS for `mdsupplies.com` was cut over to Vercel, **Shopify's Primary domain was still `mdsupplies.com`** — so `checkoutUrl` kept coming back on a host that no longer points at Shopify. The cart/token was valid; it was just being sent to the wrong server.

---

## Options considered

| Option | What it is | Verdict |
|---|---|---|
| **A — Checkout subdomain** | Give Shopify `checkout.mdsupplies.com` and make it Primary; `checkoutUrl` resolves there automatically | ✅ **Chosen** |
| B — Proxy checkout paths | Rewrite `/cart/*`, `/checkouts/*`, `/cdn/*`, … from the new site through to Shopify | ❌ Rejected |

**Why A fits this build (and B doesn't):**

- The app already does a full top-level navigation to `checkoutUrl`, so a subdomain is a **zero-code** fix — the Storefront API just starts returning the new host.
- `proxy.ts` stamps a **per-request CSP nonce** on every non-static path (`proxy.ts:220`–`338`, matcher `:341`). Proxying Shopify's own checkout HTML/scripts through that layer would run them under our `strict-dynamic` nonce policy and get them blocked — fighting our own security layer on the payment page.
- Proxying puts Vercel functions in the payment path (PCI surface, latency, cost) and means chasing every absolute path Shopify checkout emits (`/checkouts/c/…`, `/wpm`, `/cdn`, Shop Pay, 3DS, gateway callbacks). Shopify does not support proxied checkout.
- The shop-guard locks the whole app to one Shopify shop (`lib/shopify/shop-guard.ts`); Option A keeps that invariant clean.

---

## The fix that was applied

1. **DNS (GoDaddy — the zone is on GoDaddy, nameservers `pdns05/06.domaincontrol.com`, not Vercel):**
   add `CNAME  checkout  →  shops.myshopify.com`  (TTL ½ hr). Additive — the apex `A → 216.150.1.1` and `www` records were left untouched.

2. **Shopify → Settings → Domains → Connect existing domain →** `checkout.mdsupplies.com`; waited for the green SSL / **Connected** status.

3. **Vercel cleanup:** `checkout.mdsupplies.com` had been added to the Vercel **project** by mistake (showed **"Invalid Configuration"** because Vercel wanted it pointed at Vercel). **Removed it from the Vercel project.** Vercel's "update your DNS to match" prompt was deliberately **ignored** — following it would re-point checkout at Vercel and break it again.

4. **Shopify → Settings → Domains → set `checkout.mdsupplies.com` as the Primary domain.** ← *this is the switch that fixed it.* On the next cart fetch, `checkoutUrl` came back on `checkout.mdsupplies.com` and checkout loaded.

---

## Final domain topology

| Host | DNS record (GoDaddy) | Points to | Role |
|---|---|---|---|
| `mdsupplies.com` (apex) | `A @ → 216.150.1.1` | Vercel | 308 → `www` |
| `www.mdsupplies.com` | `CNAME → …vercel-dns-016.com` | Vercel | **canonical storefront** |
| `checkout.mdsupplies.com` | `CNAME → shops.myshopify.com` | Shopify | **checkout (Primary domain in Shopify)** |
| `daebb2-76.myshopify.com` | — | Shopify | production shop / Storefront API origin |

Storefront (browsing) = Vercel on `www`. Checkout (payment) = Shopify on `checkout.`. The two are separate subdomains by design; the cart token is carried inside `checkoutUrl`, so no cross-subdomain cookie sharing is needed for the handoff.

---

## Verification

- Live cart → **Proceed to Checkout** link host flipped from `mdsupplies.com/cart/c/…` to **`checkout.mdsupplies.com/cart/c/…`**.
- Shopify checkout page loads on the branded domain with a valid SSL lock.
- Confirmed on both cart surfaces (mini-cart `CartPopup` and full cart page `CartPageClient`).

---

## Rollback

Config-only, instant, no deploy: in **Shopify → Settings → Domains**, set the Primary domain back. `checkoutUrl` reverts on the next cart fetch.

---

## Gotchas for next time

- **`checkout.mdsupplies.com` must NOT be attached to the Vercel project.** It belongs to Shopify. If it reappears in Vercel as "Invalid Configuration," remove it — do **not** repoint its DNS at Vercel.
- **DNS lives at GoDaddy, not Vercel.** New records for this domain go in the GoDaddy zone. (Vercel only receives traffic; it isn't authoritative.)
- **"Connected" ≠ fixed.** Only the **Primary** domain drives `checkoutUrl`. A checkout subdomain that is merely connected changes nothing until it's Primary.
- **Shop-guard / env:** production must set `SHOPIFY_ALLOWED_SHOP_DOMAIN=daebb2-76.myshopify.com`, or the build fails closed to the QA store (`lib/shopify/shop-guard.ts:63`). The checkout subdomain must belong to that same shop.
- **CSP:** top-level navigation to checkout is a separate document with its own CSP, so no change was needed. If Shop Pay / 3DS framing ever fails, add `https://checkout.mdsupplies.com` to `frame-src` in `lib/csp.ts:30` (that one needs a commit + deploy).
