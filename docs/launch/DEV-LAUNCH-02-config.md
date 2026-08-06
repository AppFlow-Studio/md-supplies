# DEV-LAUNCH-02 — Final Launch Configuration

**Ticket:** DEV-LAUNCH-02 (Final Launch Configuration & Implementation Plan, 2026-08-05)
**Owner:** Developers · **Priority:** P0 launch gate
**Builds on:** [DEV-LAUNCH-01-baseline.md](./DEV-LAUNCH-01-baseline.md)

- **SHA at completion:** `f8c2fac7586ffdbde31ab3ccfa4e2064d7b22dcc`
- **Branch:** `catalog-cro-review-sardor-dev`

## Decisions flagged to and confirmed by the user

**1. API version stays pinned to 2026-04.** The ticket's own API version note
(verified against shopify.dev 2026-08-05) recommends staying on 2026-04 for
this launch cycle and logging any bump as post-launch work. A separately
forwarded message in this same request listed `QA_SHOPIFY_API_VERSION 2026-07`
— a direct contradiction. DEV-LAUNCH-01 already confirmed empirically that the
QA public Storefront token authenticates fine on 2026-04, so there is no
technical need to move. Per user decision: **kept at 2026-04**
(`lib/shopify/storefront.ts`, `lib/shopify/admin.ts`, `lib/shopify/customer.ts`
unchanged). The "2026-07" value in the forwarded message should be treated as
stale, not a directive.

**2. `SHOPIFY_ADMIN_ACCESS_TOKEN` — resolved via `client_credentials`, wired
properly (superseded the initial "left unresolved" call below the same
session).** Two candidate values from the forwarded credentials were
curl-tested directly against
`POST https://md-supplies-qa-shipping-and-checkout.myshopify.com/admin/api/2026-04/graphql.json`
with `X-Shopify-Access-Token`, both failed:

| Candidate | Result |
|---|---|
| `QA_ADMIN_APP_AUTOMATION_TOKEN` (`atkn_...`) | `401 Invalid API key or access token` |
| `QA_ADMIN_API_CLIENT_SECRET` (`shpss_...`) | `401 Invalid API key or access token` |

A broader test matrix (`Authorization: Bearer`, REST instead of GraphQL,
client-id-as-token, 2026-07) also failed the same way. What worked:
`QA_ADMIN_API_CLIENT_ID`/`QA_ADMIN_API_CLIENT_SECRET` are a real OAuth client
pair — not a drop-in static token — used with the **`client_credentials`
grant** against `QA_ADMIN_TOKEN_ENDPOINT`:

```
curl -d "grant_type=client_credentials&client_id=<id>&client_secret=<secret>" \
  https://md-supplies-qa-shipping-and-checkout.myshopify.com/admin/oauth/access_token
```

returns a working, short-lived token (`shpua_...`-prefixed, `expires_in:
86399` ≈ 24h). Verified live: `200` with the correct QA
`myshopifyDomain`, and a customer-metafield read in the exact shape
`getCustomerRxState()` uses returns cleanly with no permission error.

**Implication:** this is not a static secret that belongs in an env var by
itself — it decays in ~24h, so pasting a snapshot into `.env.local` would
have silently gone stale. Wired properly instead:

- `lib/shopify/admin-token.ts` (new) — exchanges `SHOPIFY_ADMIN_CLIENT_ID` +
  `SHOPIFY_ADMIN_CLIENT_SECRET` for an access token via the
  `client_credentials` grant, caches it in-process with a 60s expiry safety
  margin, dedupes concurrent callers into one in-flight exchange, and never
  caches a failed exchange (so a transient error is recoverable on retry).
  Built test-first: `lib/shopify/__tests__/admin-token.test.ts` (5 tests).
- `lib/env.server.ts` — `shopifyAdminToken` (required `SHOPIFY_ADMIN_ACCESS_TOKEN`)
  replaced with `shopifyAdminClientId`/`shopifyAdminClientSecret` (required
  `SHOPIFY_ADMIN_CLIENT_ID`/`SHOPIFY_ADMIN_CLIENT_SECRET`).
- `lib/shopify/admin.ts` — `adminFetch` now calls `getAdminAccessToken()`
  instead of reading a static token. `lib/shopify/__tests__/admin-rx.test.ts`
  updated (and extended with 2 new cases) to assert the exchange happens
  before the first Admin call and that the exchanged token is sent as
  `X-Shopify-Access-Token`; the pre-existing shop-identity-gate tests
  (production rejection, no-identity refusal, failure-not-cached-so-retry-
  succeeds) still pass unchanged in substance, just re-sequenced for the
  extra call.
- `.env.local` now carries the real, live-verified
  `SHOPIFY_ADMIN_CLIENT_ID=<redacted-rotate-before-relying-on-this-doc>` and
  `SHOPIFY_ADMIN_CLIENT_SECRET=<redacted-rotate-before-relying-on-this-doc>`.

**Flagging, not blocking:** the scope this app actually grants is wider than
the code comment's "`read_customers` + `write_customers` only" — the
`client_credentials` response's `scope` field also includes
`write_discounts, write_draft_orders, write_fulfillments, write_inventory,
write_locations, write_markets,
write_merchant_managed_fulfillment_orders, write_orders,
read_product_listings, write_products, write_publications, write_shipping`.
This module only ever calls the two RX metafield operations, so nothing in
this codebase exercises the extra scope — but the QA custom app itself is
over-provisioned relative to what the RX gate needs. Worth narrowing with
whoever owns the QA store's custom app, independent of this ticket.

## Resolved from DEV-LAUNCH-01 (previously unresolved)

**`SHOPIFY_CUSTOMER_ACCOUNT_URL`.** DEV-LAUNCH-01 flagged that the manager's
`QA_CUSTOMER_AUTH_DISCOVERY_URL` (`.well-known/openid-configuration`) is a
different OAuth surface from the `https://shopify.com/authentication/<shop-id>`
form `lib/shopify/customer.ts` requires, and left it unresolved rather than
guess. Resolved this pass by reading the QA store's own public discovery
document (no secret needed):

```
curl https://md-supplies-qa-shipping-and-checkout.myshopify.com/.well-known/openid-configuration
```

returns `"issuer": "https://shopify.com/authentication/82109890793"` — exactly
the required form. `.env.local` now carries
`SHOPIFY_CUSTOMER_ACCOUNT_URL=https://shopify.com/authentication/82109890793`,
replacing the old (production-shop-id) value.

## Customer Account callback / origin / logout — already configurable, no code change

`lib/site-config.ts` derives `SITE_ORIGIN` from `NEXT_PUBLIC_SITE_URL`, and
`lib/shopify/customer.ts` / `app/api/auth/{login,callback,logout,refresh}/route.ts`
build every redirect/callback/logout URL from that one value plus
`SHOPIFY_CUSTOMER_ACCOUNT_URL`/`SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID`. Nothing
is hardcoded. `.env.local` keeps the existing local HTTPS tunnel
(`NEXT_PUBLIC_SITE_URL=https://ovary-panoramic-stack.ngrok-free.dev`) as
Izzy's JavaScript Origin for local QA login testing — swapping it for a
different HTTPS origin is an env-var change only.

## Mock-catalog / production-fallback audit

Searched `lib/` and `app/` (tracked source, excluding tests/docs) for
`mock`/`MOCK` and `fallback`/`FALLBACK`. All matches are unrelated defensive
fallbacks already scoped to a single concern (BunnyCDN image failure, brand
display-name fallback, CSP nonce fallback, safe-redirect fallback, etc.) —
none reach toward production or a mock catalog. The only shop-domain
resolution path in the app is `lib/shopify/shop-guard.ts`, gated as below.
No mock-catalog or production-fallback code paths exist outside test
fixtures.

## Environment-variable inventory (names only — see ticket requirement, no values)

`.env.local` (gitignored, never committed):

```
SHOPIFY_STORE_DOMAIN
SHOPIFY_STOREFRONT_ACCESS_TOKEN
SHOPIFY_ADMIN_CLIENT_ID           # exchanged at runtime for a short-lived Admin token
SHOPIFY_ADMIN_CLIENT_SECRET       # see lib/shopify/admin-token.ts
SHOPIFY_CUSTOMER_ACCOUNT_URL
SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID
NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_GTM_ID
RESEND_API_KEY                   # dev placeholder, unrelated to this ticket
BUNNYCDN_STORAGE_ACCESS_KEY
BUNNYCDN_STORAGE_HOSTNAME
BUNNYCDN_STORAGE_ZONE
```

`SHOPIFY_ALLOWED_SHOP_DOMAIN` is intentionally left **unset** —
`allowedShopDomain()` in `lib/shopify/shop-guard.ts` defaults to
`QA_SHOP_DOMAIN` when unset, so a forgotten declaration cannot fall through
to production.

Dropped as unused legacy cruft (grepped, zero references anywhere in tracked
`.ts` source): `SHOPIFY_CLIENT_SECRET`, `NEXT_PUBLIC_SHOPIFY_KEY`,
`NEXT_PUBLIC_CUSTOMER_API`, `SHOPIFY_PRIVATE_TOKEN`, bare `SHOPIFY_ADMIN_TOKEN`.

The store access password (to bypass the storefront password wall in a
browser) was provided but is not consumed anywhere in this codebase — the
Storefront API used for prerendering doesn't go through the password-protected
HTML storefront. Not wired as an env var; kept out of this doc's value-bearing
scope entirely per "no secret values committed or logged."

## Shop-guard test results

```
npx vitest run lib/shopify/__tests__/shop-guard.test.ts

 Test Files  1 passed (1)
      Tests  12 passed (12)
```

Covers, among others:
- accepts the QA store by default (positive)
- rejects the production store by default, in every presentation variant —
  scheme, case, trailing slash, path, port, userinfo (negative)
- rejects any third shop, not just production
- fails closed on a missing/empty declared host
- allows production only when `SHOPIFY_ALLOWED_SHOP_DOMAIN` names it on
  purpose, and then rejects QA — proving the rule is agreement, not an
  allowlist of "anything but production"

## Feature-flag documentation diff

`docs/env-feature-flag-register.md` previously described
`RX_CHECKOUT_ENFORCEMENT` as **disabled by default, opt-in via `"true"`** —
this did not match `lib/rx-gate.ts`'s `isRxEnforcementEnabled()`, which is
**enabled by default, opt-out only via the exact string `"false"`**
(a kill-switch, per the in-code history comment: Bilal confirmed 2026-08-02
the RX account/document compliance flow must stay active by default). Also
corrected the doc's blanket "fails safe = disabled" claim, which no longer
held once the RX row was fixed — RX's safe-failure direction is enabled, not
disabled, and the doc now says so explicitly.

```diff
 Names and behavior only — **no values**. Every flag fails safe: an unset or
-invalid value resolves to the disabled/neutral state, never to a customer-facing
-claim or a checkout block.
+invalid value resolves to the disabled/neutral state, never to a customer-facing
+claim. `RX_CHECKOUT_ENFORCEMENT` fails safe the other way — an unset or
+invalid value leaves the compliance gate ON, because for a prescription
+control the lower-risk failure is over-gating, not under-gating.

-| Flag | Default | Enabled when | Safe-failure behavior | Production activation requires |
+| Flag | Default | Disabled when | Safe-failure behavior | Production activation requires |
-| `RX_CHECKOUT_ENFORCEMENT` | **disabled** | exactly `"true"` | ... |
+| `RX_CHECKOUT_ENFORCEMENT` | **enabled** | exactly `"false"` | Kill-switch only. ... |
```

(Full diff: `git diff docs/env-feature-flag-register.md` at this SHA.)

No implementation change was made to `lib/rx-gate.ts` — the code was already
correct; only the documentation was wrong.

## Claim-flag verification (SHIPPING_RESOLVER_ENABLED, FORDEER_LABELS_ENABLED)

Both remain **disabled** — unset in `.env.local`, and both read as
`=== 'true'` (opt-in) in `lib/shipping-resolver/flag.ts` and
`lib/labels/fordeer-provider.ts`. Their unit suites pass:

```
npx vitest run lib/shipping-resolver/__tests__/ lib/labels/__tests__/

 Test Files  9 passed (9)
      Tests  76 passed (76)
```

Passing unit tests alone do not satisfy the doc's "Production activation
requires" column (wording/data/QA approval for shipping; a confirmed Fordeer
retrieval path for labels — both still outstanding, IZ-08 / IZ-03). Neither
flag is enabled by this ticket.

## Build log — proof the build reads QA data

```
rm -rf .next && npm run build

▲ Next.js 16.2.12 (Turbopack)
- Environments: .env.local
✓ Compiled successfully in 9.3s
✓ Generating static pages using 7 workers (67/67) in 2.4s
```

Exit `0`. Zero Storefront/Admin API errors or 401s anywhere in the log (67/67
pages generated). Most app routes render `ƒ` (server-rendered on demand) by
design — this build produced **no fetch-failure output of any kind**, unlike
DEV-LAUNCH-01's placeholder-token run, which logged repeated
`Storefront API HTTP 401` during static generation. Absence of that signature
here is the evidence the build is reading real QA data, not silently failing
into a dynamic fallback.

## Acceptance criteria status

| Criterion | Status |
|---|---|
| Production build can read QA products, collections, filters, and carts | ✅ build exit 0, zero API errors |
| QA build refuses the production shop domain | ✅ 12/12 shop-guard tests pass, including production-rejection in every presentation form |
| No secret values committed or logged | ✅ `.env.local` gitignored (confirmed via `git status`); this doc and all commits contain names only |
| Environment documentation and runtime behavior agree | ✅ `RX_CHECKOUT_ENFORCEMENT` doc corrected to match `lib/rx-gate.ts` |
| Customer Account URLs can be changed without a code edit | ✅ callback/origin/logout fully derived from `NEXT_PUBLIC_SITE_URL` + two Customer Account env vars |
| `SHOPIFY_ADMIN_ACCESS_TOKEN` resolved | ✅ resolved as a `client_credentials` exchange (`SHOPIFY_ADMIN_CLIENT_ID`/`SHOPIFY_ADMIN_CLIENT_SECRET` → `lib/shopify/admin-token.ts`), live-verified against the QA store |

## Verification run for this pass

```
npx tsc --noEmit                          # clean
npx eslint . --max-warnings 0             # clean on tracked source (qa-sweep.js noise pre-dates this ticket, see DEV-LAUNCH-01 finding 2)
npx vitest run                            # 121 files, 1156 tests passed
rm -rf .next && npm run build             # exit 0, 67/67 pages, zero API errors
```

## Follow-up items for later tickets

- Ask the QA custom app's owner to narrow its Admin API scope down to
  `read_customers` + `write_customers` — it currently grants several
  unrelated write scopes (discounts, orders, products, fulfillment, etc.)
  that nothing in this codebase uses.
- `SHIPPING_RESOLVER_ENABLED` / `FORDEER_LABELS_ENABLED`: still blocked on
  business approval (IZ-08 / IZ-03), independent of test status.
